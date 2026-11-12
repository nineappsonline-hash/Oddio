'use client';

import type { ApiResponse } from '@ai-music/contracts';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }
  if (!response.ok || !payload || payload.error) {
    throw new ApiClientError(
      payload?.error?.message ?? 'Something went wrong',
      payload?.error?.code ?? 'request_failed',
      response.status,
    );
  }
  return payload.data as T;
}
