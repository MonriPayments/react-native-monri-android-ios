import { NativeModules } from 'react-native';

export type MonriApiOptions = {
  authenticityToken: string;
  developmentMode: boolean;
  merchantID?: string;
};

export type SavedPaymentMethod = {
  type: string;
  data: { [id: string]: any };
};

/**
 * Google Pay button options
 * type: Button type (1-8):
 * 1 - Buy
 * 2 - Book
 * 3 - Checkout
 * 4 - Donate
 * 5 - Order
 * 6 - Pay
 * 7 - Subscribe
 * 8 - Plain
 */
export type GooglePayButtonOptions = {
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  theme: ButtonTheme;
  borderRadius?: number;
};

export type ButtonTheme = 1 | 2;

export type PaymentResult = {
  status: string;
  currency?: string;
  amount?: number;
  orderNumber?: string;
  panToken?: string;
  createdAt?: string;
  transactionType?: string;
  paymentMethod?: SavedPaymentMethod;
  errors?: [String];
};

export type Card = {
  pan: string;
  cvv: string;
  expiryYear: number;
  expiryMonth: number;
  saveCard?: boolean;
};

export type Transaction = {
  email?: string;
  fullName?: string;
  address?: string;
  phone?: string;
  country?: string;
  city?: string;
  zip?: string;
  orderInfo?: string;
};

export type SavedCard = {
  panToken: string;
  cvv: string;
};

/**
 * 3DS browser (device) info sent with confirmPayment.
 * All fields are optional — any field not provided is
 * resolved automatically by the native SDK.
 */
export type BrowserInfo = {
  screenWidth?: number;
  screenHeight?: number;
  colorDepth?: number;
  userAgent?: string;
  timeZoneOffset?: number;
  language?: string;
  javaEnabled?: boolean;
  httpAccept?: string;
  httpUserAgent?: string;
  httpAcceptLanguage?: string;
};

export type ConfirmPaymentParams = {
  type: string;
  clientSecret: string;
  card?: Card;
  savedCard?: SavedCard;
  transaction: Transaction;
  browserInfo?: BrowserInfo;
  googlePayButtonOptions?: GooglePayButtonOptions;
  pkPaymentButtonType?: number | null;
  pkPaymentButtonStyle?: number | null;
};

type MonriAndroidIosType = {
  initialize(options: MonriApiOptions): Promise<void>;
  confirmPayment(
    options: MonriApiOptions,
    params: ConfirmPaymentParams
  ): Promise<PaymentResult>;
};

const { MonriAndroidIos } = NativeModules;

export default MonriAndroidIos as MonriAndroidIosType;
