import * as Sentry from '@sentry/react';

const SAFE_TAGS = new Set(['app_area', 'operation']);
const SAFE_BREADCRUMB_CATEGORIES = new Set(['fetch', 'http', 'navigation', 'xhr']);
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const TOKEN_PATTERN = /\b(?:bearer\s+)?[a-z0-9_-]{24,}\b/gi;

export const sanitizeText = value => String(value || '')
  .replace(EMAIL_PATTERN, '[email]')
  .replace(UUID_PATTERN, '[id]')
  .replace(TOKEN_PATTERN, '[secret]');

export const sanitizeUrl = value => {
  if (!value) return undefined;
  try {
    const parsed = new URL(String(value), 'https://coach-nutrition.invalid');
    const clean = `${parsed.origin}${parsed.pathname}`;
    return parsed.origin === 'https://coach-nutrition.invalid' ? parsed.pathname : clean;
  } catch {
    return sanitizeText(String(value).split(/[?#]/)[0]);
  }
};

const safeHttpMethod = value => {
  const method = String(value || '').toUpperCase();
  return /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method) ? method : undefined;
};

const safeStatusCode = value => {
  const statusCode = Number(value);
  return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : undefined;
};

export const sanitizeBreadcrumb = breadcrumb => {
  if (!SAFE_BREADCRUMB_CATEGORIES.has(breadcrumb?.category)) return null;
  const source = breadcrumb.data || {};
  const data = {};
  for (const key of ['url', 'from', 'to']) {
    const cleanUrl = sanitizeUrl(source[key]);
    if (cleanUrl) data[key] = cleanUrl;
  }
  const method = safeHttpMethod(source.method);
  const statusCode = safeStatusCode(source.status_code);
  if (method) data.method = method;
  if (statusCode) data.status_code = statusCode;
  return {
    category: breadcrumb.category,
    type: breadcrumb.type,
    level: breadcrumb.level,
    timestamp: breadcrumb.timestamp,
    data,
  };
};

const sanitizeFrame = frame => ({
  filename: sanitizeUrl(frame?.filename),
  abs_path: sanitizeUrl(frame?.abs_path),
  module: frame?.module ? sanitizeText(frame.module).slice(0, 160) : undefined,
  function: frame?.function ? sanitizeText(frame.function).slice(0, 160) : undefined,
  lineno: Number.isInteger(frame?.lineno) ? frame.lineno : undefined,
  colno: Number.isInteger(frame?.colno) ? frame.colno : undefined,
  in_app: Boolean(frame?.in_app),
});

export const sanitizeSentryEvent = event => {
  if (!event) return event;
  const safeTags = Object.fromEntries(
    Object.entries(event.tags || {})
      .filter(([key]) => SAFE_TAGS.has(key))
      .map(([key, value]) => [key, sanitizeText(value).slice(0, 80)]),
  );
  const values = (event.exception?.values || []).map(exception => ({
    type: String(exception?.type || 'Error').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80) || 'Error',
    value: 'Erreur technique',
    stacktrace: exception?.stacktrace?.frames
      ? { frames: exception.stacktrace.frames.map(sanitizeFrame) }
      : undefined,
  }));
  const requestUrl = sanitizeUrl(event.request?.url);
  const requestMethod = safeHttpMethod(event.request?.method);

  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    tags: safeTags,
    request: requestUrl || requestMethod ? { url: requestUrl, method: requestMethod } : undefined,
    breadcrumbs: (event.breadcrumbs || []).map(sanitizeBreadcrumb).filter(Boolean),
    exception: values.length ? { values } : undefined,
    message: values.length ? undefined : 'Erreur technique',
  };
};

let initialized = false;

export const initMonitoring = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (initialized || !import.meta.env.PROD || !dsn) return false;
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeSentryEvent,
    beforeBreadcrumb: sanitizeBreadcrumb,
  });
  initialized = true;
  return true;
};

export const reportAppError = (error, { area = 'app', operation = 'unknown' } = {}) => {
  if (!initialized) return;
  Sentry.withScope(scope => {
    scope.setTag('app_area', sanitizeText(area).slice(0, 80));
    scope.setTag('operation', sanitizeText(operation).slice(0, 80));
    Sentry.captureException(error instanceof Error ? error : new Error('Erreur technique'));
  });
};
