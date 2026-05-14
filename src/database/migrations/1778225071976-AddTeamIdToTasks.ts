import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamIdToTasks1778225071976 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "team_id" uuid NULL,
      ADD CONSTRAINT "fk_tasks_team_id"
        FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      DROP CONSTRAINT "fk_tasks_team_id",
      DROP COLUMN "team_id"
    `);
  }
}
