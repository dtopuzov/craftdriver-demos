import type { ErrorResponse } from '@exam/contracts';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && options.body !== null && !headers.has('content-type'))
    headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorResponse | null;
    throw new ApiClientError(response.status, body?.error.message ?? 'Request failed.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
