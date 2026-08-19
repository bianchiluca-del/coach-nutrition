export function passwordValidationMessage(password) {
  if (String(password || '').length < 12) return 'Utilise au moins 12 caractères.';
  if (!/[a-z]/.test(password)) return 'Ajoute au moins une lettre minuscule.';
  if (!/[A-Z]/.test(password)) return 'Ajoute au moins une lettre majuscule.';
  if (!/\d/.test(password)) return 'Ajoute au moins un chiffre.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Ajoute au moins un symbole.';
  return '';
}
