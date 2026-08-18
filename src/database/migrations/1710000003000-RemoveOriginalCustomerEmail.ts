import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOriginalCustomerEmail1710000003000 implements MigrationInterface {
  name = 'RemoveOriginalCustomerEmail1710000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('customers', 'email');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "customers" ADD "email" character varying(254)',
    );
    await queryRunner.query(
      'UPDATE "customers" SET "email" = "email_normalized"',
    );
    await queryRunner.query(
      'ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL',
    );
  }
}
