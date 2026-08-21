import App from '../App.jsx';
import { createProspectPreviewProfile } from '../lib/prospectPreview.js';

const previewProfile = createProspectPreviewProfile();

export default function ProspectPreview() {
  const leavePreview = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <App
      session={null}
      accountProfileId={previewProfile.profile_id}
      nutritionProfile={previewProfile}
      accessContext={{ has_access: true, is_beta_client: true, is_coach: false }}
      previewMode
      onExitPreview={leavePreview}
    />
  );
}
