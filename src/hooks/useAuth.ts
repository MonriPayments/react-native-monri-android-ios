import { useCallback, useState, useRef } from 'react';
import {
  authenticateScandoc,
  refreshScandocAuth,
  ScandocAuthResponse,
  ScandocAuthRequest,
} from '../api';

function extractToken(response: ScandocAuthResponse | null): string | null {
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

export function useAuth() {
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
      const result = await authenticateScandoc(creds);
      setData(result);
      const t = extractToken(result);
      const rt = extractRefreshToken(result);
      if (t) setToken(t);
      if (rt) setRefreshToken(rt);
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
      const result = await refreshScandocAuth(refreshToken);
      setData(result);
      const t = extractToken(result);
      const rt = extractRefreshToken(result);
      if (t) setToken(t);
      if (rt) setRefreshToken(rt); // Update refresh token if rotated
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
