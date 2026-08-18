import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Bill } from '../../bills/entities/bill.entity';
import { DeliveryStatus } from '../deliveries.types';

@Entity({ name: 'deliveries' })
@Index('IDX_deliveries_status', ['status'])
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Bill, (bill) => bill.delivery, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'bill_id' })
  bill!: Bill;

  @Column({ type: 'varchar', length: 20, default: DeliveryStatus.PENDING })
  status!: DeliveryStatus;

  @Column({ name: 'recipient_name', type: 'varchar', length: 160 })
  recipientName!: string;

  @Column({ name: 'address_line', type: 'varchar', length: 240 })
  addressLine!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 120 })
  state!: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20 })
  postalCode!: string;

  @Column({ type: 'varchar', length: 2 })
  country!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
