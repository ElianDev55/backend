import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '../deliveries.types';

export class CreateDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  billId!: string;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

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
  @IsNotEmpty()
  @MaxLength(2)
  country!: string;
}
