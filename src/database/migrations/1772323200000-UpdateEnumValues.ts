import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnumValues1772323200000 implements MigrationInterface {
  name = 'UpdateEnumValues1772323200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── projects.status ─────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_status_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_status_enum" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')`);
    await queryRunner.query(`
      UPDATE "projects" SET "status" = CASE "status"
        WHEN 'start'       THEN 'PLANNING'
        WHEN 'in_progress' THEN 'IN_PROGRESS'
        WHEN 'burning'     THEN 'ON_HOLD'
        WHEN 'end'         THEN 'COMPLETED'
        WHEN 'late'        THEN 'CANCELLED'
        ELSE 'PLANNING'
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" TYPE "projects_status_enum" USING "status"::"projects_status_enum"`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'PLANNING'`);

    // ─── projects.project_type ───────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE text USING "projectType"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_projectType_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_projectType_enum" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INFRASTRUCTURE', 'INDUSTRIAL', 'OTHER')`);
    await queryRunner.query(`
      UPDATE "projects" SET "projectType" = CASE "projectType"
        WHEN 'interior'    THEN 'OTHER'
        WHEN 'residential' THEN 'RESIDENTIAL'
        WHEN 'commercial'  THEN 'COMMERCIAL'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE "projects_projectType_enum" USING "projectType"::"projects_projectType_enum"`);

    // ─── projects.size ───────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "size" TYPE text USING "size"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_size_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_size_enum" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE')`);
    await queryRunner.query(`
      UPDATE "projects" SET "size" = CASE "size"
        WHEN 'small'  THEN 'SMALL'
        WHEN 'medium' THEN 'MEDIUM'
        WHEN 'large'  THEN 'LARGE'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "size" TYPE "projects_size_enum" USING "size"::"projects_size_enum"`);

    // ─── projects.complexity ─────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "complexity" TYPE text USING "complexity"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_complexity_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_complexity_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')`);
    await queryRunner.query(`
      UPDATE "projects" SET "complexity" = CASE "complexity"
        WHEN 'low'    THEN 'LOW'
        WHEN 'medium' THEN 'MEDIUM'
        WHEN 'high'   THEN 'HIGH'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "complexity" TYPE "projects_complexity_enum" USING "complexity"::"projects_complexity_enum"`);

    // ─── projects.priority (inline enum) ────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "priority" TYPE text USING "priority"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_priority_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_priority_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH')`);
    await queryRunner.query(`
      UPDATE "projects" SET "priority" = CASE "priority"
        WHEN 'low'    THEN 'LOW'
        WHEN 'medium' THEN 'MEDIUM'
        WHEN 'high'   THEN 'HIGH'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "priority" TYPE "projects_priority_enum" USING "priority"::"projects_priority_enum"`);

    // ─── tasks.status ────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`CREATE TYPE "tasks_status_enum" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED')`);
    await queryRunner.query(`
      UPDATE "tasks" SET "status" = CASE "status"
        WHEN 'start'       THEN 'TODO'
        WHEN 'in_progress' THEN 'IN_PROGRESS'
        WHEN 'burning'     THEN 'IN_REVIEW'
        WHEN 'end'         THEN 'DONE'
        WHEN 'late'        THEN 'CANCELLED'
        WHEN 'cancelled'   THEN 'CANCELLED'
        ELSE 'TODO'
      END
    `);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "tasks_status_enum" USING "status"::"tasks_status_enum"`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO'`);

    // ─── tasks.priority ──────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE text USING "priority"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_priority_enum"`);
    await queryRunner.query(`CREATE TYPE "tasks_priority_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
    await queryRunner.query(`
      UPDATE "tasks" SET "priority" = CASE "priority"
        WHEN 'low'    THEN 'LOW'
        WHEN 'medium' THEN 'MEDIUM'
        WHEN 'high'   THEN 'HIGH'
        WHEN 'urgent' THEN 'URGENT'
        ELSE 'MEDIUM'
      END
    `);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE "tasks_priority_enum" USING "priority"::"tasks_priority_enum"`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM'`);

    // ─── clients.client_type ─────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" TYPE text USING "client_type"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "clients_client_type_enum"`);
    await queryRunner.query(`CREATE TYPE "clients_client_type_enum" AS ENUM ('INDIVIDUAL', 'COMPANY', 'GOVERNMENT', 'NGO')`);
    await queryRunner.query(`
      UPDATE "clients" SET "client_type" = CASE "client_type"
        WHEN 'organization' THEN 'COMPANY'
        WHEN 'person'       THEN 'INDIVIDUAL'
        ELSE 'INDIVIDUAL'
      END
    `);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" TYPE "clients_client_type_enum" USING "client_type"::"clients_client_type_enum"`);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" SET DEFAULT 'INDIVIDUAL'`);

    // ─── users.status ────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED')`);
    await queryRunner.query(`
      UPDATE "users" SET "status" = CASE "status"
        WHEN 'working' THEN 'ACTIVE'
        WHEN 'idle'    THEN 'INACTIVE'
        WHEN 'offline' THEN 'INACTIVE'
        ELSE 'INACTIVE'
      END
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "users_status_enum" USING "status"::"users_status_enum"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'INACTIVE'`);

    // ─── team_memberships.team_role ──────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" TYPE text USING "team_role"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "team_memberships_team_role_enum"`);
    await queryRunner.query(`CREATE TYPE "team_memberships_team_role_enum" AS ENUM ('owner', 'admin', 'manager', 'member')`);
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" TYPE "team_memberships_team_role_enum" USING "team_role"::"team_memberships_team_role_enum"`);
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" SET DEFAULT 'member'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── team_memberships.team_role ──────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" TYPE text USING "team_role"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "team_memberships_team_role_enum"`);
    await queryRunner.query(`CREATE TYPE "team_memberships_team_role_enum" AS ENUM ('owner', 'admin', 'member')`);
    await queryRunner.query(`UPDATE "team_memberships" SET "team_role" = 'member' WHERE "team_role" = 'manager'`);
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" TYPE "team_memberships_team_role_enum" USING "team_role"::"team_memberships_team_role_enum"`);
    await queryRunner.query(`ALTER TABLE "team_memberships" ALTER COLUMN "team_role" SET DEFAULT 'member'`);

    // ─── users.status ────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('working', 'idle', 'offline')`);
    await queryRunner.query(`
      UPDATE "users" SET "status" = CASE "status"
        WHEN 'ACTIVE'     THEN 'working'
        WHEN 'INACTIVE'   THEN 'offline'
        WHEN 'ON_LEAVE'   THEN 'idle'
        WHEN 'TERMINATED' THEN 'offline'
        ELSE 'offline'
      END
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "users_status_enum" USING "status"::"users_status_enum"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline'`);

    // ─── clients.client_type ─────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" TYPE text USING "client_type"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "clients_client_type_enum"`);
    await queryRunner.query(`CREATE TYPE "clients_client_type_enum" AS ENUM ('organization', 'person')`);
    await queryRunner.query(`
      UPDATE "clients" SET "client_type" = CASE "client_type"
        WHEN 'INDIVIDUAL'  THEN 'person'
        WHEN 'COMPANY'     THEN 'organization'
        WHEN 'GOVERNMENT'  THEN 'organization'
        WHEN 'NGO'         THEN 'organization'
        ELSE 'organization'
      END
    `);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" TYPE "clients_client_type_enum" USING "client_type"::"clients_client_type_enum"`);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "client_type" SET DEFAULT 'organization'`);

    // ─── tasks.priority ──────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE text USING "priority"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_priority_enum"`);
    await queryRunner.query(`CREATE TYPE "tasks_priority_enum" AS ENUM ('low', 'medium', 'high', 'urgent')`);
    await queryRunner.query(`UPDATE "tasks" SET "priority" = LOWER("priority")`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE "tasks_priority_enum" USING "priority"::"tasks_priority_enum"`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'medium'`);

    // ─── tasks.status ────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`CREATE TYPE "tasks_status_enum" AS ENUM ('start', 'in_progress', 'burning', 'end', 'late', 'cancelled')`);
    await queryRunner.query(`
      UPDATE "tasks" SET "status" = CASE "status"
        WHEN 'TODO'        THEN 'start'
        WHEN 'IN_PROGRESS' THEN 'in_progress'
        WHEN 'IN_REVIEW'   THEN 'burning'
        WHEN 'DONE'        THEN 'end'
        WHEN 'CANCELLED'   THEN 'cancelled'
        ELSE 'start'
      END
    `);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "tasks_status_enum" USING "status"::"tasks_status_enum"`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'start'`);

    // ─── projects.priority ───────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "priority" TYPE text USING "priority"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_priority_enum"`);
    await queryRunner.query(`UPDATE "projects" SET "priority" = LOWER("priority")`);

    // ─── projects.complexity ─────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "complexity" TYPE text USING "complexity"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_complexity_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_complexity_enum" AS ENUM ('low', 'medium', 'high')`);
    await queryRunner.query(`
      UPDATE "projects" SET "complexity" = CASE "complexity"
        WHEN 'LOW'       THEN 'low'
        WHEN 'MEDIUM'    THEN 'medium'
        WHEN 'HIGH'      THEN 'high'
        WHEN 'VERY_HIGH' THEN 'high'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "complexity" TYPE "projects_complexity_enum" USING "complexity"::"projects_complexity_enum"`);

    // ─── projects.size ───────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "size" TYPE text USING "size"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_size_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_size_enum" AS ENUM ('small', 'medium', 'large')`);
    await queryRunner.query(`
      UPDATE "projects" SET "size" = CASE "size"
        WHEN 'SMALL'      THEN 'small'
        WHEN 'MEDIUM'     THEN 'medium'
        WHEN 'LARGE'      THEN 'large'
        WHEN 'ENTERPRISE' THEN 'large'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "size" TYPE "projects_size_enum" USING "size"::"projects_size_enum"`);

    // ─── projects.project_type ───────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE text USING "projectType"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_projectType_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_projectType_enum" AS ENUM ('interior', 'residential', 'commercial')`);
    await queryRunner.query(`
      UPDATE "projects" SET "projectType" = CASE "projectType"
        WHEN 'RESIDENTIAL'    THEN 'residential'
        WHEN 'COMMERCIAL'     THEN 'commercial'
        WHEN 'INFRASTRUCTURE' THEN 'commercial'
        WHEN 'INDUSTRIAL'     THEN 'commercial'
        WHEN 'OTHER'          THEN 'interior'
        ELSE NULL
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE "projects_projectType_enum" USING "projectType"::"projects_projectType_enum"`);

    // ─── projects.status ─────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" TYPE text USING "status"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "projects_status_enum"`);
    await queryRunner.query(`CREATE TYPE "projects_status_enum" AS ENUM ('start', 'in_progress', 'burning', 'end', 'late')`);
    await queryRunner.query(`
      UPDATE "projects" SET "status" = CASE "status"
        WHEN 'PLANNING'    THEN 'start'
        WHEN 'IN_PROGRESS' THEN 'in_progress'
        WHEN 'ON_HOLD'     THEN 'burning'
        WHEN 'COMPLETED'   THEN 'end'
        WHEN 'CANCELLED'   THEN 'late'
        ELSE 'start'
      END
    `);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" TYPE "projects_status_enum" USING "status"::"projects_status_enum"`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'start'`);
  }
}
