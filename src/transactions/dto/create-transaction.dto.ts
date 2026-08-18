import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { TransactionStatus } from '../transactions.types';

export class CreateTransactionDto {
  @IsUUID()
  billId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNumber?: number;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerReference?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestHash?: string;

  @IsOptional()
  @IsIn(['visa', 'mastercard', 'unknown'])
  cardBrand?: string;

  @IsOptional()
  @Matches(/^\d{4}$/)
  lastFour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  failureCode?: string;
}
