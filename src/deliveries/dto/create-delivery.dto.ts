import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DeliveryStatus } from '../deliveries.types';

export class CreateDeliveryDto {
  @IsUUID()
  billId!: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  recipientName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  addressLine!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  state!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  country!: string;
}
