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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillStatus } from '../bills.types';
import { CreateBillItemDto } from './create-bill-item.dto';

export class CreateBillDto {
  @ApiPropertyOptional({ example: 'BILL-2026-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ type: () => [CreateBillItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items!: CreateBillItemDto[];

  @ApiPropertyOptional({ enum: BillStatus, default: BillStatus.PENDING })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({ example: 200000, minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseFeeInCents?: number;

  @ApiPropertyOptional({ example: 800000, minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeeInCents?: number;

  @ApiPropertyOptional({
    example: 'COP',
    default: 'COP',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @IsUppercase()
  currency?: string;
}
