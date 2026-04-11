import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceColumnsToProjects1772668800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "contract_value_uzs" NUMERIC(15, 2) NULL,
        ADD COLUMN IF NOT EXISTS "contract_value_usd" NUMERIC(12, 2) NULL,
        ADD COLUMN IF NOT EXISTS "contract_signed_date" DATE NULL,
        ADD COLUMN IF NOT EXISTS "risk_coefficient" NUMERIC(5, 3) NULL DEFAULT 1.150
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "risk_coefficient",
        DROP COLUMN IF EXISTS "contract_signed_date",
        DROP COLUMN IF EXISTS "contract_value_usd",
        DROP COLUMN IF EXISTS "contract_value_uzs"
    `);
  }
}
