import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOriginalCustomerEmail1710000002000 implements MigrationInterface {
  name = 'AddOriginalCustomerEmail1710000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '254',
        isNullable: true,
      }),
    );

    await queryRunner.query('UPDATE customers SET email = email_normalized');

    await queryRunner.changeColumn(
      'customers',
      'email',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '254',
        isNullable: false,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('customers', 'email');
  }
}
