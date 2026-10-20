// Normalize API Base URL: automatically handles missing /api, trailing slashes, or custom domains
function getResolvedBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

const BASE_URL = getResolvedBaseUrl();

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('temple_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${BASE_URL}${cleanEndpoint}`;

  const response = await fetch(targetUrl, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If token expired or invalid, clear token
    if (token && !endpoint.includes('/login')) {
      localStorage.removeItem('temple_token');
      localStorage.removeItem('temple_user');
      window.location.href = '/login';
    }
  }

  // Handle binary/csv downloads
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error('Failed to download CSV');
    }
    return (await response.text()) as unknown as T;
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (e) {
    // Empty or non-JSON response
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

