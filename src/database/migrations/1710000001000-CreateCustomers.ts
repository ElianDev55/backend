import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomers1710000001000 implements MigrationInterface {
  name = 'CreateCustomers1710000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'email_normalized',
            type: 'varchar',
            length: '254',
            isUnique: true,
          },
          { name: 'full_name', type: 'varchar', length: '160' },
          { name: 'phone', type: 'varchar', length: '40' },
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
      'customers',
      new TableIndex({
        name: 'IDX_customers_is_deleted',
        columnNames: ['is_deleted'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customers');
  }
}
