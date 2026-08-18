import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUppercase,
  Length,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillStatus } from '../bills.types';

export class UpdateBillDto {
  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({ example: 200000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseFeeInCents?: number;

  @ApiPropertyOptional({ example: 800000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeeInCents?: number;

  @ApiPropertyOptional({ example: 'COP', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @IsUppercase()
  currency?: string;
}
