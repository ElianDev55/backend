import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateDeliveries1710000005000 implements MigrationInterface {
  name = 'CreateDeliveries1710000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'deliveries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'bill_id', type: 'uuid', isUnique: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          { name: 'recipient_name', type: 'varchar', length: '160' },
          { name: 'address_line', type: 'varchar', length: '240' },
          { name: 'city', type: 'varchar', length: '120' },
          { name: 'state', type: 'varchar', length: '120' },
          { name: 'postal_code', type: 'varchar', length: '20' },
          { name: 'country', type: 'varchar', length: '2' },
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
      'deliveries',
      new TableIndex({
        name: 'IDX_deliveries_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createForeignKey(
      'deliveries',
      new TableForeignKey({
        name: 'FK_deliveries_bill_id',
        columnNames: ['bill_id'],
        referencedTableName: 'bills',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deliveries');
  }
}
