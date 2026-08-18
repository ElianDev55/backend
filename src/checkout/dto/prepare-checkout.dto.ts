import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUppercase,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutCustomerDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({ example: '+57 300 123 4567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;
}

export class CheckoutDeliveryDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  recipientName!: string;

  @ApiProperty({ example: 'Carrera 10 # 20-30' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  addressLine!: string;

  @ApiProperty({ example: 'Bogotá' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 'Cundinamarca' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  state!: string;

  @ApiProperty({ example: '110111' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ example: 'CO', minLength: 2, maxLength: 2 })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  country!: string;
}

export class PrepareCheckoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'checkout-2026-000001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9_-]+$/)
  idempotencyKey!: string;

  @ApiProperty({ type: () => CheckoutCustomerDto })
  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer!: CheckoutCustomerDto;

  @ApiProperty({ type: () => CheckoutDeliveryDto })
  @ValidateNested()
  @Type(() => CheckoutDeliveryDto)
  delivery!: CheckoutDeliveryDto;

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
