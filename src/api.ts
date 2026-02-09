import {
  CreditCardExtractionRequest,
  ExtractionResponse,
  ScandocAuthRequest,
  ScandocAuthResponse,
  ValidationRequest,
  ValidationResponse,
} from './types';

export * from './types';

export const SCANDOC_KS_BASE_URL = 'https://api.scandoc.ai/ks';
export const SCANDOC_SCAN_BASE_URL = 'https://monri-scandoc.asseco-see.hr';
export const SCANDOC_VALIDATION_BASE_URL =
  'https://monri-scandoc.asseco-see.hr';

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

export function authenticateScandoc(
  creds: ScandocAuthRequest
): Promise<ScandocAuthResponse> {
  return fetchJson<ScandocAuthResponse>(
    '/authenticate/',
    {
      method: 'POST',
      body: {
        user_key: creds.user_key,
        sub_client: creds.sub_client || 'react-native-monri-android-ios',
      },
    },
    SCANDOC_KS_BASE_URL
  );
}

export function refreshScandocAuth(
  refreshToken: string
): Promise<ScandocAuthResponse> {
  return fetchJson<ScandocAuthResponse>(
    '/authenticate/refresh',
    {
      method: 'POST',
      body: {
        refresh_token: refreshToken,
      },
    },
    SCANDOC_KS_BASE_URL
  );
}

export function extractCreditCardData(
  payload: CreditCardExtractionRequest,
  token: string
): Promise<ExtractionResponse> {
  return fetchJson<ExtractionResponse>(
    '/extraction/',
    {
      method: 'POST',
      headers: { Authorization: `${token}` },
      body: payload,
    },
    SCANDOC_SCAN_BASE_URL
  );
}

export function validateCreditCardImage(
  payload: ValidationRequest,
  token?: string
): Promise<ValidationResponse> {
  console.warn(
    'validateCreditCardImage called. First image length approx:',
    payload.DataFields?.Images?.[0]?.length ?? 'no image'
  );
  return fetchJson<ValidationResponse>(
    '/validation/',
    {
      method: 'POST',
      headers: token ? { Authorization: `${token}` } : undefined,
      body: payload,
    },
    SCANDOC_VALIDATION_BASE_URL
  );
}
