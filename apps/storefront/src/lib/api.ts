const API_BASE = '/api/v1';

const SESSION_KEY = 'mc_session_id';

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

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
  auth?: boolean;
  csrf?: boolean;
  signal?: AbortSignal;
}

export async function api<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  headers['x-session-id'] = getSessionId();

  if (opts.csrf) {
    const tokens = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (tokens) headers['X-CSRF-Token'] = decodeURIComponent(tokens[1]);
  }

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
  delete<T>(path: string, opts?: Omit<RequestOptions, 'method'>) {
    return api<T>(path, { ...opts, method: 'DELETE' });
  },
};
