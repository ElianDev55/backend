import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProducts1710000000000 implements MigrationInterface {
  name = 'CreateProducts1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'sku', type: 'varchar', length: '80', isUnique: true },
          { name: 'name', type: 'varchar', length: '160' },
          { name: 'description', type: 'text' },
          { name: 'image_url', type: 'text', isNullable: true },
          { name: 'price_in_cents', type: 'integer' },
          { name: 'currency', type: 'varchar', length: '3', default: "'COP'" },
          { name: 'stock_quantity', type: 'integer' },
          { name: 'reserved_quantity', type: 'integer', default: '0' },
          { name: 'is_deleted', type: 'boolean', default: false },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
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
      'products',
      new TableIndex({
        name: 'IDX_products_is_deleted',
        columnNames: ['is_deleted'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('products');
  }
}
