export function resolveAuthRedirectUrl({ href, baseUrl = './' }) {
  if (!href) {
    throw new Error('A current page URL is required.');
  }

  return new URL(baseUrl, href).toString();
}
