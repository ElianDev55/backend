import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../transactions.types';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ example: 'provider-reference-123' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerReference?: string;

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
