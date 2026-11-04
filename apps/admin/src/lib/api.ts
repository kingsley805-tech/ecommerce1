const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const tokens = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  if (tokens) headers['X-CSRF-Token'] = decodeURIComponent(tokens[1]);

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: opts.signal,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const error = data?.error;
    if (res.status === 401 && !path.startsWith('/auth') && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/super-owner')) {
      window.location.href = '/admin/login';
    }
    throw new ApiError(res.status, error?.code ?? 'ERROR', error?.message ?? `Request failed (${res.status})`, error?.details);
  }

  if (data && Array.isArray(data.data) && data.meta) {
    return { items: data.data, meta: data.meta } as T;
  }
  return (data?.data ?? data) as T;
}

export const apiClient = {
  get<T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) {
    return api<T>(path, { ...opts, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) {
    return api<T>(path, { ...opts, method: 'POST', body });
  },
  patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) {
    return api<T>(path, { ...opts, method: 'PATCH', body });
  },
  put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) {
    return api<T>(path, { ...opts, method: 'PUT', body });
  },
  async upload<T>(path: string, file: File): Promise<T> {
    const url = new URL(API_BASE + path, window.location.origin);
    const form = new FormData();
    form.append('file', file);
    const headers: Record<string, string> = { Accept: 'application/json' };
    const tokens = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (tokens) headers['X-CSRF-Token'] = decodeURIComponent(tokens[1]);
    const res = await fetch(url.toString(), { method: 'POST', headers, credentials: 'include', body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `Upload failed (${res.status})`, data?.error?.details);
    }
    return (data?.data ?? data) as T;
  },
  delete<T>(path: string, opts?: Omit<RequestOptions, 'method'>) {
    return api<T>(path, { ...opts, method: 'DELETE' });
  },
};
