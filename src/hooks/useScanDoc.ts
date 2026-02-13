import { useCallback, useState } from 'react';
import {
  CreditCardExtractionRequest,
  ScandocAuthRequest,
  type ValidationRequest,
} from '../api';
import { useScandocAuthentication } from './useScandocAuthentication';
import { toCardDetails } from '../utils/cardUtils';
import { ScandocCardDetails } from '../types/scandocTypes';
import { useHTTP } from './useHTTP';

export function useScanDoc() {
  const { extractCreditCardData, validateCreditCardImage } = useHTTP();
  const { token, refreshToken, authenticate, refresh } =
    useScandocAuthentication();
  const [data, setData] = useState<ScandocCardDetails | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getValidToken = useCallback(
    async (authCreds: ScandocAuthRequest, baseUrl: string): Promise<string> => {
      // For testing, you can hardcode a valid token here to skip auth flow. The token expires after some time, so you may need to update it periodically.
      const HARDCODED_TOKEN =
        'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6NTcsIlN1YkNsaWVudElkIjo1MjYsIlRpbWUiOiIyMDI2LTAyLTEyVDEyOjUwOjI5LjQwMjQwNSJ9.qF6faka4kZn5D4kn2RF5gs4EmaGDV6FT7cbfr_Rc6yj3GL0vVB3DWui6uqmU9Fm4Ea-OOzR74aHcTR1nzV802Q';
      if (HARDCODED_TOKEN) return HARDCODED_TOKEN;

      if (token) return token;
      const authRes = await authenticate(baseUrl, authCreds);
      const accessToken =
        (authRes as any)?.access_token ?? (authRes as any)?.token;
      if (!accessToken) throw new Error('No access token received from auth');
      return accessToken;
    },
    [token, authenticate]
  );

  const ExtractPayloadBuilder = useCallback(
    (
      imageBase64: string,
      settings?: any,
      imageCropped?: boolean
    ): CreditCardExtractionRequest => ({
      DataFields: {
        Image: imageBase64,
        ImageType: 'base64',
        ImageCropped: imageCropped ?? false,
      },
      Settings: {
        ShouldReturnDocumentImage: settings?.shouldReturnDocumentImage ?? true,
        SkipDocumentSizeCheck: settings?.skipDocumentSizeCheck ?? true,
        SkipImageSizeCheck: settings?.skipImageSizeCheck ?? true,
        CanStoreImages: settings?.canStoreImages ?? false,
        DontUseValidation: settings?.dontUseValidation ?? false,
      },
      AcceptTermsAndConditions: true,
    }),
    []
  );

  const ValidationPayloadBuilder = useCallback(
    (
      imageBase64: string,
      settings?: any,
      imageCropped?: boolean
    ): ValidationRequest => ({
      DataFields: {
        Images: [imageBase64],
        ImageType: 'base64',
        ImageCropped: imageCropped ?? false,
      },
      Settings: {
        SkipImageSizeCheck: settings?.skipImageSizeCheck ?? true,
      },
      AcceptTermsAndConditions: true,
    }),
    []
  );

  const extract = useCallback(
    async (
      baseUrl: string,
      imageBase64: string,
      authCreds: ScandocAuthRequest,
      settings?: any,
      imageCropped?: boolean
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const currentToken = await getValidToken(authCreds, baseUrl);

        const payload = ExtractPayloadBuilder(
          imageBase64,
          settings,
          imageCropped
        );

        try {
          const result = await extractCreditCardData(
            baseUrl,
            payload,
            currentToken
          );
          const cardDetails = toCardDetails(result);
          if (!cardDetails) {
            setData(null);
            return null;
          }
          setData(cardDetails);
          return result;
        } catch (e) {
          const status = (e as Error & { status?: number }).status;

          if (status === 401) {
            if (refreshToken) {
              const refreshRes = await refresh(baseUrl);
              const newToken =
                (refreshRes as any)?.access_token ?? (refreshRes as any)?.token;
              if (newToken) {
                const retryResult = await extractCreditCardData(
                  baseUrl,
                  payload,
                  newToken
                );
                const retryCardDetails = toCardDetails(retryResult);
                setData(retryCardDetails);
                return retryResult;
              }
            }

            const reAuthRes = await authenticate(baseUrl, authCreds);
            const reToken =
              (reAuthRes as any)?.access_token ?? (reAuthRes as any)?.token;
            if (reToken) {
              const retryResult = await extractCreditCardData(
                baseUrl,
                payload,
                reToken
              );
              const retryCardDetails = toCardDetails(retryResult);
              setData(retryCardDetails);
              return retryResult;
            }
          }
          throw e;
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getValidToken, refreshToken, authenticate, refresh]
  );

  const validate = useCallback(
    async (
      baseUrl: string,
      imageBase64: string,
      authCreds: ScandocAuthRequest,
      settings?: any,
      imageCropped?: boolean
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const currentToken = await getValidToken(authCreds, baseUrl);
        const payload = ValidationPayloadBuilder(
          imageBase64,
          settings,
          imageCropped
        );

        try {
          const result = await validateCreditCardImage(
            baseUrl,
            payload,
            currentToken
          );
          return result;
        } catch (e) {
          const status = (e as Error & { status?: number }).status;

          if (status === 401) {
            if (refreshToken) {
              const refreshRes = await refresh(baseUrl);
              const newToken =
                (refreshRes as any)?.access_token ?? (refreshRes as any)?.token;
              if (newToken) {
                return await validateCreditCardImage(
                  baseUrl,
                  payload,
                  newToken
                );
              }
            }

            const reAuthRes = await authenticate(baseUrl, authCreds);
            const reToken =
              (reAuthRes as any)?.access_token ?? (reAuthRes as any)?.token;
            if (reToken) {
              return await validateCreditCardImage(baseUrl, payload, reToken);
            }
          }
          throw e;
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getValidToken, refreshToken, authenticate, refresh]
  );

  return { extract, validate, data, error, isLoading };
}
