import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskVolumeColumns1772496000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD COLUMN IF NOT EXISTS "volume" NUMERIC(12, 4) NULL,
        ADD COLUMN IF NOT EXISTS "unit_of_measure" VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
        DROP COLUMN IF EXISTS "unit_of_measure",
        DROP COLUMN IF EXISTS "volume"
    `);
  }
}
