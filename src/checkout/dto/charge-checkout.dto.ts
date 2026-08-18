import {
  Equals,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChargeCheckoutDto {
  @ApiProperty({ example: 'tok_stagtest_123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^tok_[A-Za-z0-9_-]+$/)
  paymentToken!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 36 })
  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  termsAccepted!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  personalDataAccepted!: boolean;
}
