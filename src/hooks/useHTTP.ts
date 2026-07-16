import { fetchJson } from '../api';
import {
  CreditCardExtractionRequest,
  ExtractionResponse,
  ScandocAuthRequest,
  ScandocAuthResponse,
  ValidationRequest,
  ValidationResponse,
} from '../types/scandocTypes';

export function useHTTP() {
  function authenticateScandoc(
    baseUrl: string,
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
      baseUrl
    );
  }

  function refreshScandocAuth(
    baseUrl: string,
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
      baseUrl
    );
  }

  function extractCreditCardData(
    baseUrl: string,
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
      baseUrl
    );
  }

  function validateCreditCardImage(
    baseUrl: string,
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
      baseUrl
    );
  }

  return {
    authenticateScandoc,
    refreshScandocAuth,
    extractCreditCardData,
    validateCreditCardImage,
  };
}
