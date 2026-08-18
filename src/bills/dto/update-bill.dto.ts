import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUppercase,
  Length,
  Min,
} from 'class-validator';
import { BillStatus } from '../bills.types';

export class UpdateBillDto {
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseFeeInCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeeInCents?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @IsUppercase()
  currency?: string;
}
