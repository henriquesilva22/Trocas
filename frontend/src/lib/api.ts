const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'troca-segura:token';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? `Erro ${response.status} ao chamar ${path}`;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

/** Igual `apiFetch`, mas sem Content-Type fixo — o browser define o boundary do multipart sozinho. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? `Erro ${response.status} ao chamar ${path}`;
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, response.status);
  }

  return response.json() as Promise<T>;
}
