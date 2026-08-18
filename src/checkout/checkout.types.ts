import { TransactionStatus } from '../transactions/transactions.types';

export interface CheckoutResponse {
  transactionId: string;
  transactionNumber: string;
  billId: string;
  billNumber: string;
  status: TransactionStatus;
  amountInCents: number;
  currency: string;
  providerReference: string | null;
}
