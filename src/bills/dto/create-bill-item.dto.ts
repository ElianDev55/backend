import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateBillItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
