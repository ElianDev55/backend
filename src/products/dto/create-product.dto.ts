import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUppercase,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'LAMP-PORTABLE-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  sku!: string;

  @ApiProperty({ example: 'Lámpara portátil' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    example: 'Iluminación cálida y compacta para cualquier espacio.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    example: 'https://images.example.com/lamp.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  imageUrl?: string;

  @ApiProperty({
    example: 8990000,
    minimum: 0,
    description: 'Amount in the smallest currency unit.',
  })
  @IsInt()
  @Min(0)
  priceInCents!: number;

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

  @ApiProperty({ example: 12, minimum: 0 })
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservedQuantity?: number;
}
