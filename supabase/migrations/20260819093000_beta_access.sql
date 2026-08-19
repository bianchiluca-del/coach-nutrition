create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.beta_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null check (char_length(label) between 1 and 80),
  created_by uuid references auth.users(id) on delete set null,
  used_by uuid unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach')),
  created_at timestamptz not null default now()
);

create index if not exists beta_invites_created_by_idx on private.beta_invites(created_by);

alter table private.beta_invites enable row level security;
alter table private.user_roles enable row level security;
revoke all on private.beta_invites from public, anon, authenticated;
revoke all on private.user_roles from public, anon, authenticated;

insert into private.user_roles (user_id, role)
values ('c8abb3aa-0641-4adb-884b-796cc4665c88', 'coach')
on conflict (user_id) do update set role = excluded.role;

create or replace function private.normalized_invite_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function private.current_user_is_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.user_roles
    where user_id = (select auth.uid())
      and role = 'coach'
  );
$$;

revoke all on function private.normalized_invite_hash(text) from public, anon, authenticated;
revoke all on function private.current_user_is_coach() from public, anon, authenticated;

create or replace function public.check_beta_invite(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.beta_invites
    where code_hash = private.normalized_invite_hash(p_code)
      and used_by is null
      and revoked_at is null
      and expires_at > now()
  );
$$;

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

  return jsonb_build_object('has_access', true, 'is_coach', false, 'invite_label', claimed.label);
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
    'is_coach', private.current_user_is_coach()
  );
$$;

create or replace function public.coach_create_beta_invite(p_label text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_count integer;
  raw_code text;
  display_code text;
  invite_label text;
  new_invite_id uuid;
  new_expires_at timestamptz;
begin
  if not private.current_user_is_coach() then
    raise exception 'Accès coach requis.' using errcode = '42501';
  end if;

  select count(*) into invite_count
  from private.beta_invites
  where revoked_at is null;

  if invite_count >= 10 then
    raise exception 'Les 10 places de la bêta sont déjà créées.' using errcode = 'P0001';
  end if;

  invite_label := left(coalesce(nullif(trim(p_label), ''), 'Prospect ' || (invite_count + 1)), 80);
  raw_code := upper(encode(extensions.gen_random_bytes(7), 'hex'));
  display_code := 'CN-' || substr(raw_code, 1, 4) || '-' || substr(raw_code, 5, 4) || '-' || substr(raw_code, 9, 6);

  insert into private.beta_invites (code_hash, label, created_by)
  values (private.normalized_invite_hash(display_code), invite_label, (select auth.uid()))
  returning id, expires_at into new_invite_id, new_expires_at;

  return jsonb_build_object(
    'invite_id', new_invite_id,
    'label', invite_label,
    'code', display_code,
    'expires_at', new_expires_at
  );
end;
$$;

create or replace function public.coach_revoke_beta_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.current_user_is_coach() then
    raise exception 'Accès coach requis.' using errcode = '42501';
  end if;

  update private.beta_invites
  set revoked_at = now()
  where id = p_invite_id
    and used_by is null
    and revoked_at is null;

  if not found then
    raise exception 'Cette invitation ne peut pas être désactivée.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.coach_beta_dashboard()
returns table (
  invite_id uuid,
  label text,
  status text,
  email text,
  display_name text,
  onboarding_status text,
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
    invitations.created_at,
    invitations.expires_at,
    invitations.used_at,
    users.last_sign_in_at,
    greatest(
      users.last_sign_in_at,
      nutrition.updated_at,
      daily.last_activity_at,
      tracking.last_activity_at
    )
  from private.beta_invites invitations
  left join auth.users users on users.id = invitations.used_by
  left join public.user_nutrition_profiles nutrition on nutrition.user_id = invitations.used_by
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
  order by invitations.created_at;
end;
$$;

revoke all on function public.check_beta_invite(text) from public, anon, authenticated;
revoke all on function public.redeem_beta_invite(text) from public, anon, authenticated;
revoke all on function public.get_access_context() from public, anon, authenticated;
revoke all on function public.coach_create_beta_invite(text) from public, anon, authenticated;
revoke all on function public.coach_revoke_beta_invite(uuid) from public, anon, authenticated;
revoke all on function public.coach_beta_dashboard() from public, anon, authenticated;

grant execute on function public.check_beta_invite(text) to anon, authenticated;
grant execute on function public.redeem_beta_invite(text) to authenticated;
grant execute on function public.get_access_context() to authenticated;
grant execute on function public.coach_create_beta_invite(text) to authenticated;
grant execute on function public.coach_revoke_beta_invite(uuid) to authenticated;
grant execute on function public.coach_beta_dashboard() to authenticated;
