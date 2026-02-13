import { ExtractionResponse, ScandocCardDetails } from '../types/scandocTypes';

export const normalizePan = (value?: string) =>
  (value ?? '').replace(/\s+/g, '').trim();

export const parseExpiry = (value?: string) => {
  if (!value) return null;
  const [mm, yy] = value.split('/');
  if (!mm || !yy) return null;
  const month = Number(mm);
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  if (!month || !year) return null;
  return { month, year };
};

export const toCardDetails = (
  res: ExtractionResponse
): ScandocCardDetails | null => {
  const pan = normalizePan(res.Data?.CardNumber?.Value as string | undefined);
  const expiry = parseExpiry(res.Data?.ExpiryDate?.Value as string | undefined);
  const holderName =
    (res.Data as any)?.HoldersName?.Value ??
    (res.Data as any)?.HolderName?.Value;

  return {
    pan,
    expiryMonth: expiry?.month ?? 0,
    expiryYear: expiry?.year ?? 0,
    holderName,
  };
};
