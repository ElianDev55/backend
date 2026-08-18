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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../transactions.types';

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  billId!: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNumber?: number;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({ example: 'wompi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  provider!: string;

  @ApiPropertyOptional({ example: 'provider-reference-123' })
  @IsOptional()
  @ApiProperty({ example: 'checkout-attempt-2026-0001' })
  @IsString()
  @MaxLength(160)
  providerReference?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  idempotencyKey!: string;

  @ApiPropertyOptional({ example: 'sha256:abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestHash?: string;

  @ApiPropertyOptional({ enum: ['visa', 'mastercard', 'unknown'] })
  @IsOptional()
  @IsIn(['visa', 'mastercard', 'unknown'])
  cardBrand?: string;

  @ApiPropertyOptional({ example: '1111', minLength: 4, maxLength: 4 })
  @IsOptional()
  @Matches(/^\d{4}$/)
  lastFour?: string;

  @ApiPropertyOptional({ example: 'CARD_DECLINED' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  failureCode?: string;
}
