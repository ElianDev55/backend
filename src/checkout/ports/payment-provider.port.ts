import { TransactionStatus } from '../../transactions/transactions.types';

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentChargeInput {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  reference: string;
  paymentToken: string;
  installments: number;
}

export interface PaymentChargeResult {
  status: TransactionStatus;
  providerReference: string | null;
  cardBrand: string | null;
  lastFour: string | null;
  failureCode: string | null;
}

export interface PaymentProviderPort {
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  pollTransaction(providerReference: string): Promise<PaymentChargeResult>;
}
