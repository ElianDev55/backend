import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { BillStatus } from '../bills.types';
import { BillItem } from './bill-item.entity';

@Entity({ name: 'bills' })
@Index('IDX_bills_status', ['status'])
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  number!: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @OneToMany(() => BillItem, (billItem) => billItem.bill, {
    cascade: ['insert'],
  })
  items!: BillItem[];

  @Column({ type: 'varchar', length: 20, default: BillStatus.PENDING })
  status!: BillStatus;

  @Column({ name: 'subtotal_in_cents', type: 'integer' })
  subtotalInCents!: number;

  @Column({ name: 'base_fee_in_cents', type: 'integer', default: 0 })
  baseFeeInCents!: number;

  @Column({ name: 'delivery_fee_in_cents', type: 'integer', default: 0 })
  deliveryFeeInCents!: number;

  @Column({ name: 'total_in_cents', type: 'integer' })
  totalInCents!: number;

  @Column({ type: 'varchar', length: 3, default: 'COP' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
