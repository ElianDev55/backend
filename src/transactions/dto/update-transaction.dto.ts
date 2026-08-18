import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TransactionStatus } from '../transactions.types';

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerReference?: string;

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
