import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCodeToTeams1772755200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "teams"
        ADD COLUMN IF NOT EXISTS "code" VARCHAR(10) NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_teams_code"
      ON "teams" ("code")
      WHERE "code" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_teams_code"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "code"`);
  }
}
