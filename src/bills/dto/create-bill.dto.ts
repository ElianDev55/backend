import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUppercase,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillStatus } from '../bills.types';
import { CreateBillItemDto } from './create-bill-item.dto';

export class CreateBillDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;

  @IsUUID()
  customerId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items!: CreateBillItemDto[];

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
