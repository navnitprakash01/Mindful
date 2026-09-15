/**
 * API URL Helper
 * Resolves the full API URL for a given path, prepending VITE_API_URL when configured.
 * Supports Vite (import.meta.env), Node.js (process.env), and same-origin defaults.
 */

export function getApiUrl(path: string): string {
  if (!path) return '';

  // Return absolute URLs as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
    ''
  ).replace(/\/+$/, '');

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
