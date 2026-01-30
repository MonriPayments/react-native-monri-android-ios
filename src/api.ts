export const SCANDOC_KS_BASE_URL = 'https://api.scandoc.ai/ks';
export const SCANDOC_SCAN_BASE_URL = 'https://monri-scandoc.asseco-see.hr';
export const SCANDOC_VALIDATION_BASE_URL = 'https://shadowfax.zemris.fer.hr';

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

export type ScandocAuthResponse = Record<string, unknown>;

export type ScandocAuthRequest = {
  user_key: string;
  sub_client?: string;
};

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

export type CreditCardExtractionRequest = {
  DataFields: {
    Image: string;
    ImageType: 'base64';
    ImageCropped: boolean;
  };
  Settings: {
    ShouldReturnDocumentImage: boolean;
    SkipDocumentSizeCheck: boolean;
    SkipImageSizeCheck: boolean;
    CanStoreImages: boolean;
    DontUseValidation: boolean;
  };
  AcceptTermsAndConditions: boolean;
};

export type ExtractionDataField<T = string> = {
  Read: boolean;
  Value: T;
};

export type ExtractionResponse = {
  TransactionID: string;
  UploadedAt: string;
  ProductName: string;
  Errors: string[];
  Warnings: string[];
  Status: number;
  Method: string;
  InfoCode: number;
  Data: {
    CardNumber?: ExtractionDataField;
    ExpiryDate?: ExtractionDataField;
    [key: string]: ExtractionDataField | undefined;
  };
  ImageData?: {
    CreditCardImage?: string;
  };
  AnalysisTime: string;
};

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

export type ValidationRequest = {
  AcceptTermsAndConditions: boolean;
  Settings: {
    SkipImageSizeCheck: boolean;
  };
  DataFields?: {
    Image: string;
    ImageType: 'base64';
    ImageCropped: boolean;
  };
};

export type ValidationResponse = {
  TransactionID: string;
  UploadedAt: string;
  ProductName: string;
  Errors: string[];
  Warnings: string[];
  Status: number;
  Method: 'Validation';
  InfoCode: number;
  Keypoints?: [number, number][];
  DetectedBlurValue?: number;
  Validated: boolean;
  Index?: number;
  AnalysisTime: string;
};

export function validateCreditCardImage(
  payload: ValidationRequest
): Promise<ValidationResponse> {
  return fetchJson<ValidationResponse>(
    '/validation/',
    {
      method: 'POST',
      body: payload,
    },
    SCANDOC_VALIDATION_BASE_URL
  );
}
