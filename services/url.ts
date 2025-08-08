import environment from '../config/environment';

export const toImageUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const base = (environment.LARAVEL_API_URL || '').replace(/\/+$/, '');
  const clean = value.replace(/^\/+/, '');
  return `${base}/storage/${clean}`;
};

export default {
  toImageUrl,
};
