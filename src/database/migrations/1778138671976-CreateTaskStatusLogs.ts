import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskStatusLogs1778138671976 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_status_logs" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "task_id"          UUID         NOT NULL,
        "status"           VARCHAR(50)  NOT NULL,
        "started_at"       TIMESTAMPTZ  NOT NULL,
        "ended_at"         TIMESTAMPTZ  NULL,
        "duration_seconds" INTEGER      NULL,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_status_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_status_logs_task" FOREIGN KEY ("task_id")
          REFERENCES "tasks"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_task_status_logs_task_id" ON "task_status_logs" ("task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_status_logs_task_status" ON "task_status_logs" ("task_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_status_logs_open" ON "task_status_logs" ("task_id") WHERE "ended_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "task_status_logs"`);
  }
}
