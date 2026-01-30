import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  extractCreditCardData,
  CreditCardExtractionRequest,
  ScandocAuthRequest,
  ExtractionResponse,
} from '../api';
import { useAuth } from './useAuth';

type ScandocCardDetails = {
  pan: string;
  expiryMonth: number;
  expiryYear: number;
  holderName?: string;
};

const normalizePan = (value?: string) =>
  (value ?? '').replace(/\s+/g, '').trim();

const parseExpiry = (value?: string) => {
  if (!value) return null;
  const [mm, yy] = value.split('/');
  if (!mm || !yy) return null;
  const month = Number(mm);
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  if (!month || !year) return null;
  return { month, year };
};

const toCardDetails = (res: ExtractionResponse): ScandocCardDetails | null => {
  const pan = normalizePan(res.Data?.CardNumber?.Value as string | undefined);
  const expiry = parseExpiry(res.Data?.ExpiryDate?.Value as string | undefined);
  const holderName =
    (res.Data as any)?.HoldersName?.Value ??
    (res.Data as any)?.HolderName?.Value;

  if (!pan || !expiry) return null;

  return {
    pan,
    expiryMonth: expiry.month,
    expiryYear: expiry.year,
    holderName,
  };
};

export function useScanDoc() {
  const { token, refreshToken, authenticate, refresh } = useAuth();
  const [data, setData] = useState<ScandocCardDetails | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const extract = useCallback(
    async (
      payload: CreditCardExtractionRequest,
      authCreds: ScandocAuthRequest
    ) => {
      setIsLoading(true);
      setError(null);

      const getValidToken = async (): Promise<string> => {
        const HARDCODED_TOKEN =
          'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJDbGllbnRJZCI6NTcsIlN1YkNsaWVudElkIjo1MjYsIlRpbWUiOiIyMDI2LTAxLTMwVDE0OjE0OjU0LjQxMTEyMiJ9.GD16ITyXeNHAGtZQ35jzTCyl-WNz5gqtYA76JU6-gChQia7VSXDejyr5J52VzoU1CuR2fIIZxU3rSfvzPVFEkw';
        if (HARDCODED_TOKEN) return HARDCODED_TOKEN;

        if (token) return token;
        const authRes = await authenticate(authCreds);
        const t = (authRes as any)?.access_token ?? (authRes as any)?.token;
        if (!t) throw new Error('No access token received from auth');
        return t;
      };

      try {
        const currentToken = await getValidToken();

        try {
          const result = await extractCreditCardData(payload, currentToken);
          const cardDetails = toCardDetails(result);
          if (!cardDetails) {
            setData(null);
            return null;
          }
          Alert.alert('Extraction Successful', JSON.stringify(cardDetails));
          setData(cardDetails);
          return cardDetails;
        } catch (e) {
          const status = (e as Error & { status?: number }).status;

          if (status === 401) {
            if (refreshToken) {
              const refreshRes = await refresh();
              const newToken =
                (refreshRes as any)?.access_token ?? (refreshRes as any)?.token;
              if (newToken) {
                const retryResult = await extractCreditCardData(
                  payload,
                  newToken
                );
                const retryCardDetails = toCardDetails(retryResult);
                setData(retryCardDetails);
                return retryCardDetails;
              }
            }

            const reAuthRes = await authenticate(authCreds);
            const reToken =
              (reAuthRes as any)?.access_token ?? (reAuthRes as any)?.token;
            if (reToken) {
              const retryResult = await extractCreditCardData(payload, reToken);
              const retryCardDetails = toCardDetails(retryResult);
              setData(retryCardDetails);
              return retryCardDetails;
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
    [token, refreshToken, authenticate, refresh]
  );

  return { extract, data, error, isLoading };
}
