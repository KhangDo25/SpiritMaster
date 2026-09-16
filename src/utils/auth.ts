export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('linhthu_token') || localStorage.getItem('auth_token') || '';
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('linhthu_token', token);
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('linhthu_token');
  localStorage.removeItem('auth_token');
}
