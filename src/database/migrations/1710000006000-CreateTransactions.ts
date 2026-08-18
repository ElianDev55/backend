import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateTransactions1710000006000 implements MigrationInterface {
  name = 'CreateTransactions1710000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'bill_id', type: 'uuid' },
          { name: 'attempt_number', type: 'integer' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          { name: 'provider', type: 'varchar', length: '40' },
          {
            name: 'provider_reference',
            type: 'varchar',
            length: '160',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '120',
            isUnique: true,
          },
          {
            name: 'request_hash',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'card_brand',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          { name: 'last_four', type: 'varchar', length: '4', isNullable: true },
          {
            name: 'failure_code',
            type: 'varchar',
            length: '80',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createUniqueConstraint(
      'transactions',
      new TableUnique({
        name: 'UQ_transactions_bill_attempt',
        columnNames: ['bill_id', 'attempt_number'],
      }),
    );
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'FK_transactions_bill_id',
        columnNames: ['bill_id'],
        referencedTableName: 'bills',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions');
  }
}
