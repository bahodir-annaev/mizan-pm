import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryDateToProjectsAndTasks1778052271976
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "delivery_date" date NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN "delivery_date" date NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN "delivery_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "delivery_date"`,
    );
  }
}
