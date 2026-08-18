import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBills1710000004000 implements MigrationInterface {
  name = 'CreateBills1710000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bills',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'number', type: 'varchar', length: '40', isUnique: true },
          { name: 'customer_id', type: 'uuid' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          { name: 'subtotal_in_cents', type: 'integer' },
          { name: 'base_fee_in_cents', type: 'integer', default: '0' },
          { name: 'delivery_fee_in_cents', type: 'integer', default: '0' },
          { name: 'total_in_cents', type: 'integer' },
          { name: 'currency', type: 'varchar', length: '3', default: "'COP'" },
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
      'bills',
      new TableIndex({ name: 'IDX_bills_status', columnNames: ['status'] }),
    );
    await queryRunner.createForeignKey(
      'bills',
      new TableForeignKey({
        name: 'FK_bills_customer_id',
        columnNames: ['customer_id'],
        referencedTableName: 'customers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'bill_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'bill_id', type: 'uuid' },
          { name: 'product_id', type: 'uuid' },
          { name: 'product_name_snapshot', type: 'varchar', length: '160' },
          { name: 'sku_snapshot', type: 'varchar', length: '80' },
          { name: 'unit_price_in_cents', type: 'integer' },
          { name: 'quantity', type: 'integer' },
          { name: 'line_total_in_cents', type: 'integer' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'bill_items',
      new TableIndex({
        name: 'IDX_bill_items_bill_id',
        columnNames: ['bill_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'bill_items',
      new TableForeignKey({
        name: 'FK_bill_items_bill_id',
        columnNames: ['bill_id'],
        referencedTableName: 'bills',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'bill_items',
      new TableForeignKey({
        name: 'FK_bill_items_product_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bill_items');
    await queryRunner.dropTable('bills');
  }
}
