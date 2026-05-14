import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectTeamAssignments1777965871976 implements MigrationInterface {
    name = 'AddProjectTeamAssignments1777965871976'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop FK constraints - IF EXISTS makes these safe to re-run
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP CONSTRAINT IF EXISTS "FK_uma_project"`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP CONSTRAINT IF EXISTS "FK_uma_user"`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" DROP CONSTRAINT IF EXISTS "FK_pmc_project"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" DROP CONSTRAINT IF EXISTS "FK_tec_user"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" DROP CONSTRAINT IF EXISTS "FK_tec_time_entry"`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" DROP CONSTRAINT IF EXISTS "FK_pfp_project"`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" DROP CONSTRAINT IF EXISTS "FK_hourly_rates_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_teams_code"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_uma_org_period"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_pmc_org_period"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_pfp_project_current"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_hourly_rates_user_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_equipment_org_active"`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP CONSTRAINT IF EXISTS "UQ_uma_user_project_period"`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" DROP CONSTRAINT IF EXISTS "UQ_pmc_project_period"`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" DROP CONSTRAINT IF EXISTS "UQ_overhead_org_period_cat"`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" DROP CONSTRAINT IF EXISTS "UQ_hourly_rates_user_date"`);
        await queryRunner.query(`ALTER TABLE "exchange_rates" DROP CONSTRAINT IF EXISTS "UQ_exchange_rates_org_date"`);
        // Create new type and table idempotently
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."project_team_assignments_status_enum" AS ENUM('pending', 'active', 'completed'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "project_team_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "team_id" uuid NOT NULL, "status" "public"."project_team_assignments_status_enum" NOT NULL DEFAULT 'pending', "assigned_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "activated_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "notes" text, CONSTRAINT "PK_183bf4c1efd1ca20e31d0db57f8" PRIMARY KEY ("id"))`);
        // Rename employment_type enum idempotently
        await queryRunner.query(`DO $$ BEGIN ALTER TYPE "public"."employment_type_enum" RENAME TO "employment_type_enum_old"; EXCEPTION WHEN undefined_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."users_employment_type_enum" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "employment_type" TYPE "public"."users_employment_type_enum" USING "employment_type"::"text"::"public"."users_employment_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."employment_type_enum_old"`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "teams" ADD CONSTRAINT "UQ_7bf0cfd599b5e34fa917a78d28f" UNIQUE ("code"); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        // Rename projectType enum idempotently
        await queryRunner.query(`DO $$ BEGIN ALTER TYPE "public"."projects_projectType_enum" RENAME TO "projects_projectType_enum_old"; EXCEPTION WHEN undefined_object THEN null; END $$`);
        // Drop and recreate to ensure the enum has the correct values
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."projects_projecttype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."projects_projecttype_enum" AS ENUM('RESIDENTIAL', 'COMMERCIAL', 'INFRASTRUCTURE', 'INDUSTRIAL', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE "public"."projects_projecttype_enum" USING "projectType"::"text"::"public"."projects_projecttype_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."projects_projectType_enum_old"`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "risk_coefficient" SET DEFAULT '1.15'`);
        // Change org_id columns from uuid to varchar - only act if column is still uuid type
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='user_monthly_allocation' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "user_monthly_allocation" DROP COLUMN "org_id"; ALTER TABLE "user_monthly_allocation" ADD "org_id" character varying; END IF; END $$`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='project_monthly_costs' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "project_monthly_costs" DROP COLUMN "org_id"; ALTER TABLE "project_monthly_costs" ADD "org_id" character varying; END IF; END $$`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='time_entry_costs' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "time_entry_costs" DROP COLUMN "org_id"; ALTER TABLE "time_entry_costs" ADD "org_id" character varying; END IF; END $$`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "calculated_at" DROP DEFAULT`);
        // Rename cost_source enum idempotently
        await queryRunner.query(`DO $$ BEGIN ALTER TYPE "public"."cost_source_enum" RENAME TO "cost_source_enum_old"; EXCEPTION WHEN undefined_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."time_entry_costs_source_enum" AS ENUM('REALTIME', 'BACKFILL', 'MANUAL'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "source" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "source" TYPE "public"."time_entry_costs_source_enum" USING "source"::"text"::"public"."time_entry_costs_source_enum"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "source" SET DEFAULT 'REALTIME'`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."cost_source_enum_old"`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='project_financial_plan' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "project_financial_plan" DROP COLUMN "org_id"; ALTER TABLE "project_financial_plan" ADD "org_id" character varying; END IF; END $$`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" ALTER COLUMN "risk_coefficient" SET DEFAULT '1.15'`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='overhead_costs' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "overhead_costs" DROP COLUMN "org_id"; ALTER TABLE "overhead_costs" ADD "org_id" character varying NOT NULL; END IF; END $$`);
        // Rename overhead_category enum idempotently
        await queryRunner.query(`DO $$ BEGIN ALTER TYPE "public"."overhead_category_enum" RENAME TO "overhead_category_enum_old"; EXCEPTION WHEN undefined_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."overhead_costs_category_enum" AS ENUM('RENT', 'UTILITIES', 'INTERNET', 'SOFTWARE_LICENSES', 'OFFICE_SUPPLIES', 'MARKETING', 'TRAINING', 'INSURANCE', 'LEGAL', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" ALTER COLUMN "category" TYPE "public"."overhead_costs_category_enum" USING "category"::"text"::"public"."overhead_costs_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."overhead_category_enum_old"`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='hourly_rates' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "hourly_rates" DROP COLUMN "org_id"; ALTER TABLE "hourly_rates" ADD "org_id" character varying; END IF; END $$`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='exchange_rates' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "exchange_rates" DROP COLUMN "org_id"; ALTER TABLE "exchange_rates" ADD "org_id" character varying; END IF; END $$`);
        await queryRunner.query(`DO $$ BEGIN IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='equipment' AND column_name='org_id') = 'uuid' THEN ALTER TABLE "equipment" DROP COLUMN "org_id"; ALTER TABLE "equipment" ADD "org_id" character varying NOT NULL; END IF; END $$`);
        // Create indexes idempotently
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_736e1102fba62ecd92547fdeb5" ON "user_monthly_allocation" ("org_id", "period_year", "period_month") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e35e5f76fde135e3a7bf0035c6" ON "project_monthly_costs" ("org_id", "period_year", "period_month") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_68e2719cbecfcaf4f9a90fb010" ON "project_financial_plan" ("project_id", "is_current") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ab34d087a461231cfefea9ade1" ON "hourly_rates" ("user_id", "effective_date") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_959b293077a8f4dec865294284" ON "exchange_rates" ("rate_date") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_eb9eef21a669bf3621113a58e4" ON "equipment" ("org_id", "is_active") `);
        // Add unique constraints idempotently
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_monthly_allocation" ADD CONSTRAINT "UQ_9d8a61a8a411f7adfa3c9c2d363" UNIQUE ("user_id", "project_id", "period_year", "period_month"); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_monthly_costs" ADD CONSTRAINT "UQ_3c66bd4f9b393bfc6346482f541" UNIQUE ("project_id", "period_year", "period_month"); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "overhead_costs" ADD CONSTRAINT "UQ_150ab886f36ceacc708a1c61ea2" UNIQUE ("org_id", "period_year", "period_month", "category"); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "hourly_rates" ADD CONSTRAINT "UQ_ab34d087a461231cfefea9ade19" UNIQUE ("user_id", "effective_date"); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "exchange_rates" ADD CONSTRAINT "UQ_4348853f089385e71d2931d403b" UNIQUE ("org_id", "rate_date"); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        // Add FK constraints idempotently
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_team_assignments" ADD CONSTRAINT "FK_99f5c368819c75660f6f2491251" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_team_assignments" ADD CONSTRAINT "FK_e2ba286d4677df6e72ae69db951" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_team_assignments" ADD CONSTRAINT "FK_cbd83f2cc1ee5e65f3c17408de8" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_monthly_allocation" ADD CONSTRAINT "FK_a3810830bd09183fbf6fa165367" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "user_monthly_allocation" ADD CONSTRAINT "FK_68f7e721928b3c094e857b7a3e8" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_monthly_costs" ADD CONSTRAINT "FK_ea3a4e7c3e91b7664096ef9f4ad" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "time_entry_costs" ADD CONSTRAINT "FK_f776be4b447884828281a14b51b" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "time_entry_costs" ADD CONSTRAINT "FK_88b08cd9f1fbdc7cae63cec129e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "time_entry_costs" ADD CONSTRAINT "FK_a567ab60208f0dd477861106984" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_financial_plan" ADD CONSTRAINT "FK_ed827b35a1c2c52997d2941a480" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "project_financial_plan" ADD CONSTRAINT "FK_6c1f69c34289190f6461839c981" FOREIGN KEY ("calculated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await queryRunner.query(`DO $$ BEGIN ALTER TABLE "hourly_rates" ADD CONSTRAINT "FK_eb4d14b4cc97f6dacbc23e4f209" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN null; END $$`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hourly_rates" DROP CONSTRAINT "FK_eb4d14b4cc97f6dacbc23e4f209"`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" DROP CONSTRAINT "FK_6c1f69c34289190f6461839c981"`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" DROP CONSTRAINT "FK_ed827b35a1c2c52997d2941a480"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" DROP CONSTRAINT "FK_a567ab60208f0dd477861106984"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" DROP CONSTRAINT "FK_88b08cd9f1fbdc7cae63cec129e"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" DROP CONSTRAINT "FK_f776be4b447884828281a14b51b"`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" DROP CONSTRAINT "FK_ea3a4e7c3e91b7664096ef9f4ad"`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP CONSTRAINT "FK_68f7e721928b3c094e857b7a3e8"`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP CONSTRAINT "FK_a3810830bd09183fbf6fa165367"`);
        await queryRunner.query(`ALTER TABLE "project_team_assignments" DROP CONSTRAINT "FK_cbd83f2cc1ee5e65f3c17408de8"`);
        await queryRunner.query(`ALTER TABLE "project_team_assignments" DROP CONSTRAINT "FK_e2ba286d4677df6e72ae69db951"`);
        await queryRunner.query(`ALTER TABLE "project_team_assignments" DROP CONSTRAINT "FK_99f5c368819c75660f6f2491251"`);
        await queryRunner.query(`ALTER TABLE "exchange_rates" DROP CONSTRAINT "UQ_4348853f089385e71d2931d403b"`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" DROP CONSTRAINT "UQ_ab34d087a461231cfefea9ade19"`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" DROP CONSTRAINT "UQ_150ab886f36ceacc708a1c61ea2"`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" DROP CONSTRAINT "UQ_3c66bd4f9b393bfc6346482f541"`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP CONSTRAINT "UQ_9d8a61a8a411f7adfa3c9c2d363"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb9eef21a669bf3621113a58e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_959b293077a8f4dec865294284"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab34d087a461231cfefea9ade1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_68e2719cbecfcaf4f9a90fb010"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e35e5f76fde135e3a7bf0035c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_736e1102fba62ecd92547fdeb5"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD "org_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "exchange_rates" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "exchange_rates" ADD "org_id" uuid`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" ADD "org_id" uuid`);
        await queryRunner.query(`CREATE TYPE "public"."overhead_category_enum_old" AS ENUM('RENT', 'UTILITIES', 'INTERNET', 'SOFTWARE_LICENSES', 'OFFICE_SUPPLIES', 'MARKETING', 'TRAINING', 'INSURANCE', 'LEGAL', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" ALTER COLUMN "category" TYPE "public"."overhead_category_enum_old" USING "category"::"text"::"public"."overhead_category_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."overhead_costs_category_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."overhead_category_enum_old" RENAME TO "overhead_category_enum"`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" ADD "org_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" ALTER COLUMN "risk_coefficient" SET DEFAULT 1.150`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" ADD "org_id" uuid`);
        await queryRunner.query(`CREATE TYPE "public"."cost_source_enum_old" AS ENUM('REALTIME', 'BACKFILL', 'MANUAL')`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "source" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "source" TYPE "public"."cost_source_enum_old" USING "source"::"text"::"public"."cost_source_enum_old"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "source" SET DEFAULT 'REALTIME'`);
        await queryRunner.query(`DROP TYPE "public"."time_entry_costs_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."cost_source_enum_old" RENAME TO "cost_source_enum"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ALTER COLUMN "calculated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ADD "org_id" uuid`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" ADD "org_id" uuid`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" DROP COLUMN "org_id"`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" ADD "org_id" uuid`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "risk_coefficient" SET DEFAULT 1.150`);
        await queryRunner.query(`CREATE TYPE "public"."projects_projectType_enum_old" AS ENUM('RESIDENTIAL', 'COMMERCIAL', 'INFRASTRUCTURE', 'INDUSTRIAL', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE "public"."projects_projectType_enum_old" USING "projectType"::"text"::"public"."projects_projectType_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."projects_projecttype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."projects_projectType_enum_old" RENAME TO "projects_projectType_enum"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "UQ_7bf0cfd599b5e34fa917a78d28f"`);
        await queryRunner.query(`CREATE TYPE "public"."employment_type_enum_old" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "employment_type" TYPE "public"."employment_type_enum_old" USING "employment_type"::"text"::"public"."employment_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_employment_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."employment_type_enum_old" RENAME TO "employment_type_enum"`);
        await queryRunner.query(`DROP TABLE "project_team_assignments"`);
        await queryRunner.query(`DROP TYPE "public"."project_team_assignments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "exchange_rates" ADD CONSTRAINT "UQ_exchange_rates_org_date" UNIQUE ("org_id", "rate_date")`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" ADD CONSTRAINT "UQ_hourly_rates_user_date" UNIQUE ("user_id", "effective_date")`);
        await queryRunner.query(`ALTER TABLE "overhead_costs" ADD CONSTRAINT "UQ_overhead_org_period_cat" UNIQUE ("org_id", "period_year", "period_month", "category")`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" ADD CONSTRAINT "UQ_pmc_project_period" UNIQUE ("project_id", "period_year", "period_month")`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" ADD CONSTRAINT "UQ_uma_user_project_period" UNIQUE ("user_id", "project_id", "period_year", "period_month")`);
        await queryRunner.query(`CREATE INDEX "IDX_equipment_org_active" ON "equipment" ("org_id", "is_active") `);
        await queryRunner.query(`CREATE INDEX "IDX_hourly_rates_user_date" ON "hourly_rates" ("user_id", "effective_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_pfp_project_current" ON "project_financial_plan" ("project_id", "is_current") `);
        await queryRunner.query(`CREATE INDEX "IDX_pmc_org_period" ON "project_monthly_costs" ("org_id", "period_year", "period_month") `);
        await queryRunner.query(`CREATE INDEX "IDX_uma_org_period" ON "user_monthly_allocation" ("org_id", "period_year", "period_month") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_teams_code" ON "teams" ("code") WHERE (code IS NOT NULL)`);
        await queryRunner.query(`ALTER TABLE "hourly_rates" ADD CONSTRAINT "FK_hourly_rates_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_financial_plan" ADD CONSTRAINT "FK_pfp_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ADD CONSTRAINT "FK_tec_time_entry" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entry_costs" ADD CONSTRAINT "FK_tec_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_monthly_costs" ADD CONSTRAINT "FK_pmc_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" ADD CONSTRAINT "FK_uma_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_monthly_allocation" ADD CONSTRAINT "FK_uma_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
