import { ApiProperty } from '@nestjs/swagger';
import { BillStatus } from '../../bills/bills.types';
import { DeliveryStatus } from '../../deliveries/deliveries.types';
import { TransactionStatus } from '../../transactions/transactions.types';

export class CheckoutPaymentConfigDto {
  @ApiProperty({ enum: ['wompi'] })
  provider!: 'wompi';

  @ApiProperty({ nullable: true, description: 'Public provider key only.' })
  publicKey!: string | null;

  @ApiProperty({ enum: ['CARD'] })
  paymentMethodType!: 'CARD';
}

export class PrepareCheckoutResponseDto {
  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ format: 'uuid' })
  billId!: string;

  @ApiProperty({ example: 'BILL-ME5K5Q-AB12CD34' })
  billNumber!: string;

  @ApiProperty({ example: 'BILL-ME5K5Q-AB12CD34' })
  reference!: string;

  @ApiProperty({ example: 8990000 })
  amountInCents!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ type: () => CheckoutPaymentConfigDto })
  paymentConfig!: CheckoutPaymentConfigDto;
}

export class CheckoutResultResponseDto {
  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ format: 'uuid' })
  billId!: string;

  @ApiProperty({ example: 'BILL-ME5K5Q-AB12CD34' })
  billNumber!: string;

  @ApiProperty({ example: 'BILL-ME5K5Q-AB12CD34' })
  reference!: string;

  @ApiProperty({ example: 8990000 })
  amountInCents!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: 'wompi' })
  provider!: string;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ enum: BillStatus })
  billStatus!: BillStatus;

  @ApiProperty({ enum: DeliveryStatus, nullable: true })
  deliveryStatus!: DeliveryStatus | null;

  @ApiProperty({ nullable: true, description: 'Provider transaction ID only.' })
  providerReference!: string | null;

  @ApiProperty({ nullable: true })
  cardBrand!: string | null;

  @ApiProperty({ nullable: true, minLength: 4, maxLength: 4 })
  lastFour!: string | null;

  @ApiProperty({ nullable: true })
  failureCode!: string | null;

  @ApiProperty({
    description: 'Whether the local payment state is terminal.',
  })
  isFinal!: boolean;

  @ApiProperty({
    description: 'Whether the client may safely continue polling this attempt.',
  })
  retryable!: boolean;
}
