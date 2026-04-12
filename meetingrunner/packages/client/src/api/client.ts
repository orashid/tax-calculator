const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401 && localStorage.getItem('accessToken')) {
    // Try token refresh only if we had a session
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw new ApiError(401, 'Session expired');
    }
    throw new ApiError(401, 'Token refreshed, retry request');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, body.error || 'Request failed', body.details);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: await getHeaders(),
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async delete(path: string): Promise<void> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    await handleResponse<void>(response);
  },
};
