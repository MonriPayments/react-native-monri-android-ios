import { NativeModules } from 'react-native';

export type MonriApiOptions = {
  authenticityToken: string;
  developmentMode: boolean;
};

export type SavedPaymentMethod = {
  type: string;
  data: { [id: string]: any };
};

export type PaymentResult = {
  status: string;
  currency: string;
  amount: number;
  orderNumber: string;
  panToken?: string;
  createdAt: string;
  transactionType: string;
  paymentMethod?: SavedPaymentMethod;
  errors: [String];
};

export type Card = {
  pan: string;
  cvv: string;
  expiryYear: number;
  expiryMonth: number;
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

export type ConfirmPaymentParams = {
  clientSecret: string;
  card: Card;
  transaction: Transaction;
};

type MonriAndroidIosType = {
  confirmPayment(
    options: MonriApiOptions,
    params: ConfirmPaymentParams
  ): Promise<PaymentResult>;
};

const { MonriAndroidIos } = NativeModules;

export default MonriAndroidIos as MonriAndroidIosType;
