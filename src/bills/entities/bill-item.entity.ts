import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Bill } from './bill.entity';

@Entity({ name: 'bill_items' })
@Index('IDX_bill_items_bill_id', ['bill'])
export class BillItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Bill, (bill) => bill.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bill_id' })
  bill!: Bill;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 160 })
  productNameSnapshot!: string;

  @Column({ name: 'sku_snapshot', type: 'varchar', length: 80 })
  skuSnapshot!: string;

  @Column({ name: 'unit_price_in_cents', type: 'integer' })
  unitPriceInCents!: number;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'line_total_in_cents', type: 'integer' })
  lineTotalInCents!: number;
}
