import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDeliveryDto } from './create-delivery.dto';

export class UpdateDeliveryDto extends OmitType(
  PartialType(CreateDeliveryDto),
  ['billId'] as const,
) {}
