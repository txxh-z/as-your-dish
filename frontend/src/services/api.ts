// WHY: a single fetch wrapper centralizes error shape, base URL, and credentials.
// throws ApiError so callers (React Query) can branch on status codes.

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? 'unknown', body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? 'unknown', body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPostJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      errorBody.error ?? 'unknown',
      errorBody.message ?? res.statusText,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiPutJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      errorBody.error ?? 'unknown',
      errorBody.message ?? res.statusText,
    );
  }
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  ok: boolean;
  ts: string;
  env: string;
  llmProvider: string;
}
