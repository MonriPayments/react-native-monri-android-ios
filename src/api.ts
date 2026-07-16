export * from './types/scandocTypes';

type FetchJsonOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
};

export async function fetchJson<T>(
  path: string,
  options: FetchJsonOptions = {},
  baseUrl: string
): Promise<T> {
  const { method = 'GET', headers = {}, body } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(
      `Scandoc API error (${response.status}): ${text || response.statusText}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}
