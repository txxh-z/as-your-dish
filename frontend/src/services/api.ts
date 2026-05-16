// WHY: a single fetch wrapper centralizes error shape, base URL, and credentials.
// throws ApiError so callers (React Query) can branch on status codes.
import {
  isLLMProviderName,
  type LLMProviderName,
} from '@as-your-dish/shared';

import { getStoredProviderApiKey } from '../utils/apiKey';

function normalizeApiBase(value: string | undefined): string {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiGet<T>(
  path: string,
  options: Pick<RequestInit, 'signal'> = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    signal: options.signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? 'unknown', body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

function formString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === 'string' ? value : undefined;
}

function formProvider(form: FormData): LLMProviderName {
  const raw = formString(form, 'llmProvider');
  return raw && isLLMProviderName(raw) ? raw : 'anthropic';
}

export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const provider = formProvider(form);
  const model = formString(form, 'llmModel');
  const apiKey = getStoredProviderApiKey(provider);
  // WHY: backend requires X-Requested-With on multipart uploads to force
  // CORS preflight (CSRF guard — see backend/src/routes/analyzeMenu.ts).
  const headers: Record<string, string> = {
    'x-requested-with': 'fetch',
    'x-llm-provider': provider,
  };
  if (model) headers['x-llm-model'] = model;
  if (apiKey) {
    headers['x-llm-api-key'] = apiKey;
    if (provider === 'anthropic') headers['x-anthropic-key'] = apiKey;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
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

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
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
