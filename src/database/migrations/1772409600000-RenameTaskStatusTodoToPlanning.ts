import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTaskStatusTodoToPlanning1772409600000 implements MigrationInterface {
  name = 'RenameTaskStatusTodoToPlanning1772409600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`CREATE TYPE "tasks_status_enum" AS ENUM ('PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED')`);
    await queryRunner.query(`UPDATE "tasks" SET "status" = 'PLANNING' WHERE "status" = 'TODO'`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "tasks_status_enum" USING "status"::"tasks_status_enum"`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'PLANNING'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`CREATE TYPE "tasks_status_enum" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED')`);
    await queryRunner.query(`UPDATE "tasks" SET "status" = 'TODO' WHERE "status" = 'PLANNING'`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "tasks_status_enum" USING "status"::"tasks_status_enum"`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO'`);
  }
}
