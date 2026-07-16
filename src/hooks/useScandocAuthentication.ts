import { useCallback, useState, useRef } from 'react';
import { ScandocAuthResponse, ScandocAuthRequest } from '../api';
import { useHTTP } from './useHTTP';

function extractAccessToken(
  response: ScandocAuthResponse | null
): string | null {
  const r = response as Record<string, unknown> | null;
  return (
    (r?.access_token as string) ||
    (r?.accessToken as string) ||
    (r?.token as string) ||
    null
  );
}

function extractRefreshToken(
  response: ScandocAuthResponse | null
): string | null {
  const r = response as Record<string, unknown> | null;
  return (r?.refresh_token as string) || (r?.refreshToken as string) || null;
}

const SCANDOC_AUTH_URL = 'https://api.scandoc.ai/ks';

export function useScandocAuthentication() {
  const { authenticateScandoc, refreshScandocAuth } = useHTTP();
  const [data, setData] = useState<ScandocAuthResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Keep creds in ref to reuse during ensureToken if needed (optional)
  const credsRef = useRef<ScandocAuthRequest | null>(null);

  const authenticate = useCallback(async (creds: ScandocAuthRequest) => {
    setIsLoading(true);
    setError(null);
    credsRef.current = creds;
    try {
      const result = await authenticateScandoc(SCANDOC_AUTH_URL, creds);
      setData(result);
      const accessToken = extractAccessToken(result);
      const refreshToken = extractRefreshToken(result);
      if (accessToken) setToken(accessToken);
      if (refreshToken) setRefreshToken(refreshToken);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await refreshScandocAuth(SCANDOC_AUTH_URL, refreshToken);
      setData(result);
      const accessToken = extractAccessToken(result);
      const refToken = extractRefreshToken(result);
      if (accessToken) setToken(accessToken);
      if (refToken) setRefreshToken(refToken);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  return { authenticate, refresh, data, token, refreshToken, error, isLoading };
}
