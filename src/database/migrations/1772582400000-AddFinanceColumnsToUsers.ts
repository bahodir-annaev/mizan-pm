import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceColumnsToUsers1772582400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type_enum') THEN
          CREATE TYPE employment_type_enum AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "salary_uzs" NUMERIC(15, 2) NULL,
        ADD COLUMN IF NOT EXISTS "employment_type" employment_type_enum NULL,
        ADD COLUMN IF NOT EXISTS "is_production_employee" BOOLEAN NOT NULL DEFAULT TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "is_production_employee",
        DROP COLUMN IF EXISTS "employment_type",
        DROP COLUMN IF EXISTS "salary_uzs"
    `);
  }
}
