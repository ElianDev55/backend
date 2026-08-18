import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillItem } from '../bills/entities/bill-item.entity';
import { Bill } from '../bills/entities/bill.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Product } from '../products/entities/product.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { WompiClient } from './wompi.client';
import { PAYMENT_PROVIDER } from './ports/payment-provider.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bill,
      BillItem,
      Customer,
      Delivery,
      Product,
      Transaction,
    ]),
  ],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    WompiClient,
    { provide: PAYMENT_PROVIDER, useExisting: WompiClient },
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
