import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Bill } from '../../bills/entities/bill.entity';
import { TransactionStatus } from '../transactions.types';

@Entity({ name: 'transactions' })
@Index('IDX_transactions_status', ['status'])
@Index('UQ_transactions_bill_attempt', ['bill', 'attemptNumber'], {
  unique: true,
})
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Bill, (bill) => bill.transactions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'bill_id' })
  bill!: Bill;

  @Column({ name: 'attempt_number', type: 'integer' })
  attemptNumber!: number;

  @Column({ type: 'varchar', length: 20, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ type: 'varchar', length: 40 })
  provider!: string;

  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  providerReference!: string | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 120,
    unique: true,
  })
  idempotencyKey!: string;

  @Column({
    name: 'request_hash',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  requestHash!: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 20, nullable: true })
  cardBrand!: string | null;

  @Column({ name: 'last_four', type: 'varchar', length: 4, nullable: true })
  lastFour!: string | null;

  @Column({ name: 'failure_code', type: 'varchar', length: 80, nullable: true })
  failureCode!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
