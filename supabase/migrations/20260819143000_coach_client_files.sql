create table if not exists private.coach_client_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid unique references private.beta_invites(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  coach_data_consent boolean not null default false,
  consent_updated_at timestamptz,
  assigned_at timestamptz not null default now(),
  unique (coach_id, client_id),
  check (coach_id <> client_id)
);

create table if not exists private.coach_client_updates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists coach_client_assignments_client_idx
  on private.coach_client_assignments(client_id, status);
create index if not exists coach_client_assignments_coach_idx
  on private.coach_client_assignments(coach_id, status);
create index if not exists coach_client_updates_client_created_idx
  on private.coach_client_updates(client_id, created_at desc);
create index if not exists coach_client_updates_coach_created_idx
  on private.coach_client_updates(coach_id, created_at desc);

alter table private.coach_client_assignments enable row level security;
alter table private.coach_client_updates enable row level security;
revoke all on private.coach_client_assignments from public, anon, authenticated;
revoke all on private.coach_client_updates from public, anon, authenticated;

insert into private.coach_client_assignments (coach_id, client_id, invite_id)
select invitations.created_by, invitations.used_by, invitations.id
from private.beta_invites invitations
join private.user_roles roles
  on roles.user_id = invitations.created_by
 and roles.role = 'coach'
where invitations.used_by is not null
  and invitations.created_by is not null
  and invitations.created_by <> invitations.used_by
on conflict (coach_id, client_id) do update
set invite_id = excluded.invite_id;

create or replace function private.coach_can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.coach_client_assignments assignment
    where assignment.coach_id = (select auth.uid())
      and assignment.client_id = p_client_id
      and assignment.status = 'active'
      and assignment.coach_data_consent = true
  );
$$;

revoke all on function private.coach_can_access_client(uuid) from public, anon, authenticated;

create or replace function public.redeem_beta_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  claimed private.beta_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Une session authentifiée est requise.' using errcode = '28000';
  end if;

  if exists (
    select 1 from private.beta_invites
    where used_by = current_user_id
      and code_hash <> private.normalized_invite_hash(p_code)
  ) then
    raise exception 'Ce compte possède déjà son accès bêta.' using errcode = 'P0001';
  end if;

  update private.beta_invites
  set used_by = current_user_id,
      used_at = coalesce(used_at, now())
  where code_hash = private.normalized_invite_hash(p_code)
    and (used_by is null or used_by = current_user_id)
    and revoked_at is null
    and expires_at > now()
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Ce code bêta est invalide, expiré ou déjà utilisé.' using errcode = 'P0001';
  end if;

  if claimed.created_by is not null
     and claimed.created_by <> current_user_id
     and exists (
       select 1 from private.user_roles
       where user_id = claimed.created_by and role = 'coach'
     ) then
    insert into private.coach_client_assignments (coach_id, client_id, invite_id)
    values (claimed.created_by, current_user_id, claimed.id)
    on conflict (coach_id, client_id) do update
    set invite_id = excluded.invite_id,
        status = 'active';
  end if;

  return jsonb_build_object(
    'has_access', true,
    'is_coach', false,
    'is_beta_client', true,
    'invite_label', claimed.label
  );
end;
$$;

create or replace function public.get_access_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'has_access',
      private.current_user_is_coach()
      or exists (select 1 from public.account_profiles where user_id = (select auth.uid()))
      or exists (
        select 1 from private.beta_invites
        where used_by = (select auth.uid())
          and revoked_at is null
      ),
    'is_coach', private.current_user_is_coach(),
    'is_beta_client', exists (
      select 1 from private.beta_invites
      where used_by = (select auth.uid())
        and revoked_at is null
    )
  );
$$;

create or replace function public.set_coach_data_consent(p_granted boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  changed_count integer;
begin
  if current_user_id is null then
    raise exception 'Une session authentifiée est requise.' using errcode = '28000';
  end if;

  update private.coach_client_assignments
  set coach_data_consent = coalesce(p_granted, false),
      consent_updated_at = now()
  where client_id = current_user_id
    and status = 'active';

  get diagnostics changed_count = row_count;
  return jsonb_build_object(
    'has_assignment', changed_count > 0,
    'coach_data_consent', coalesce(p_granted, false),
    'consent_updated_at', case when changed_count > 0 then now() else null end
  );
end;
$$;

create or replace function public.get_client_coach_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  assignment private.coach_client_assignments%rowtype;
  coach_name text;
  updates jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Une session authentifiée est requise.' using errcode = '28000';
  end if;

  select * into assignment
  from private.coach_client_assignments
  where client_id = current_user_id
    and status = 'active'
  order by assigned_at desc
  limit 1;

  if assignment.id is null then
    return jsonb_build_object('has_assignment', false, 'coach_data_consent', false, 'updates', '[]'::jsonb);
  end if;

  select coalesce(
    nullif(trim(nutrition.display_name), ''),
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    split_part(users.email, '@', 1),
    'Ton coach'
  ) into coach_name
  from auth.users users
  left join public.user_nutrition_profiles nutrition on nutrition.user_id = users.id
  where users.id = assignment.coach_id;

  if assignment.coach_data_consent then
    select coalesce(jsonb_agg(to_jsonb(recent_update) order by recent_update.created_at desc), '[]'::jsonb)
    into updates
    from (
      select update_row.id, update_row.message, update_row.created_at
      from private.coach_client_updates update_row
      where update_row.client_id = current_user_id
        and update_row.coach_id = assignment.coach_id
      order by update_row.created_at desc
      limit 20
    ) recent_update;
  end if;

  return jsonb_build_object(
    'has_assignment', true,
    'coach_name', coach_name,
    'coach_data_consent', assignment.coach_data_consent,
    'consent_updated_at', assignment.consent_updated_at,
    'updates', updates
  );
end;
$$;

drop function if exists public.coach_beta_dashboard();
create function public.coach_beta_dashboard()
returns table (
  invite_id uuid,
  client_user_id uuid,
  label text,
  status text,
  email text,
  display_name text,
  onboarding_status text,
  coach_data_consent boolean,
  coach_consent_updated_at timestamptz,
  created_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.current_user_is_coach() then
    raise exception 'Accès coach requis.' using errcode = '42501';
  end if;

  return query
  select
    invitations.id,
    invitations.used_by,
    invitations.label,
    case
      when invitations.revoked_at is not null then 'revoked'
      when invitations.used_by is not null then 'active'
      when invitations.expires_at <= now() then 'expired'
      else 'pending'
    end,
    users.email::text,
    nutrition.display_name,
    nutrition.onboarding_status,
    coalesce(assignment.coach_data_consent, false),
    assignment.consent_updated_at,
    invitations.created_at,
    invitations.expires_at,
    invitations.used_at,
    users.last_sign_in_at,
    greatest(users.last_sign_in_at, nutrition.updated_at, daily.last_activity_at, tracking.last_activity_at)
  from private.beta_invites invitations
  left join auth.users users on users.id = invitations.used_by
  left join public.user_nutrition_profiles nutrition on nutrition.user_id = invitations.used_by
  left join private.coach_client_assignments assignment
    on assignment.invite_id = invitations.id
   and assignment.coach_id = (select auth.uid())
   and assignment.status = 'active'
  left join lateral (
    select max(d.updated_at) as last_activity_at
    from public.user_daily_state d
    where d.user_id = invitations.used_by
  ) daily on true
  left join lateral (
    select max(t.updated_at) as last_activity_at
    from public.user_tracking t
    where t.user_id = invitations.used_by
  ) tracking on true
  where invitations.created_by = (select auth.uid())
  order by invitations.created_at;
end;
$$;

create or replace function public.coach_get_client_file(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.coach_can_access_client(p_client_id) then
    raise exception 'Accès refusé : client non attribué ou consentement absent.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'profile', (
      select to_jsonb(profile_row)
      from (
        select profile.profile_id, profile.display_name, profile.questionnaire_json,
               profile.plan_modes_json, profile.calibration_json,
               profile.onboarding_status, profile.updated_at
        from public.user_nutrition_profiles profile
        where profile.user_id = p_client_id
        limit 1
      ) profile_row
    ),
    'preferences', (
      select to_jsonb(preferences_row)
      from (
        select preferences.current_profile_id, preferences.current_mode_id,
               preferences.last_mode_by_profile_json, preferences.updated_at
        from public.user_preferences preferences
        where preferences.user_id = p_client_id
        limit 1
      ) preferences_row
    ),
    'daily', (
      select coalesce(jsonb_agg(to_jsonb(daily_row) order by daily_row.date_key desc, daily_row.mode_id), '[]'::jsonb)
      from (
        select daily.profile_id, daily.mode_id, daily.date_key, daily.plan_json,
               daily.status_json, daily.real_qty_json, daily.insight_json,
               daily.changes_since_analysis, daily.updated_at
        from public.user_daily_state daily
        where daily.user_id = p_client_id
        order by daily.date_key desc, daily.updated_at desc
        limit 90
      ) daily_row
    ),
    'tracking', (
      select coalesce(jsonb_agg(to_jsonb(tracking_row) order by tracking_row.date_key desc), '[]'::jsonb)
      from (
        select tracking.profile_id, tracking.date_key, tracking.cal_journal,
               tracking.entry_json, tracking.measurements_json, tracking.updated_at
        from public.user_tracking tracking
        where tracking.user_id = p_client_id
        order by tracking.date_key desc
        limit 120
      ) tracking_row
    ),
    'updates', (
      select coalesce(jsonb_agg(to_jsonb(update_row) order by update_row.created_at desc), '[]'::jsonb)
      from (
        select updates.id, updates.message, updates.created_at
        from private.coach_client_updates updates
        where updates.client_id = p_client_id
          and updates.coach_id = (select auth.uid())
        order by updates.created_at desc
        limit 20
      ) update_row
    )
  ) into result;

  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.coach_create_client_update(p_client_id uuid, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_message text := trim(coalesce(p_message, ''));
  created_update private.coach_client_updates%rowtype;
begin
  if not private.coach_can_access_client(p_client_id) then
    raise exception 'Accès refusé : client non attribué ou consentement absent.' using errcode = '42501';
  end if;

  if char_length(clean_message) < 3 or char_length(clean_message) > 1000 then
    raise exception 'Le message doit contenir entre 3 et 1000 caractères.' using errcode = '22023';
  end if;

  insert into private.coach_client_updates (coach_id, client_id, message)
  values ((select auth.uid()), p_client_id, clean_message)
  returning * into created_update;

  return jsonb_build_object(
    'id', created_update.id,
    'message', created_update.message,
    'created_at', created_update.created_at
  );
end;
$$;

revoke all on function public.redeem_beta_invite(text) from public, anon, authenticated;
revoke all on function public.get_access_context() from public, anon, authenticated;
revoke all on function public.set_coach_data_consent(boolean) from public, anon, authenticated;
revoke all on function public.get_client_coach_context() from public, anon, authenticated;
revoke all on function public.coach_beta_dashboard() from public, anon, authenticated;
revoke all on function public.coach_get_client_file(uuid) from public, anon, authenticated;
revoke all on function public.coach_create_client_update(uuid, text) from public, anon, authenticated;

grant execute on function public.redeem_beta_invite(text) to authenticated;
grant execute on function public.get_access_context() to authenticated;
grant execute on function public.set_coach_data_consent(boolean) to authenticated;
grant execute on function public.get_client_coach_context() to authenticated;
grant execute on function public.coach_beta_dashboard() to authenticated;
grant execute on function public.coach_get_client_file(uuid) to authenticated;
grant execute on function public.coach_create_client_update(uuid, text) to authenticated;
