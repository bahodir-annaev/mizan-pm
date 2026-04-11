import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceTables1772841600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exchange_rates" (
        "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
        "org_id"      UUID        NULL,
        "rate_date"   DATE        NOT NULL,
        "uzs_per_usd" NUMERIC(12, 2) NOT NULL,
        "source"      VARCHAR(50) NULL,
        "created_at"  TIMESTAMP   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP   NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP   NULL,
        CONSTRAINT "PK_exchange_rates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_exchange_rates_org_date" UNIQUE ("org_id", "rate_date")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hourly_rates" (
        "id"                        UUID          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"                   UUID          NOT NULL,
        "org_id"                    UUID          NULL,
        "effective_date"            DATE          NOT NULL,
        "salary_uzs"                NUMERIC(15,2) NOT NULL,
        "bonus_uzs"                 NUMERIC(15,2) NOT NULL DEFAULT 0,
        "tax_uzs"                   NUMERIC(15,2) NOT NULL DEFAULT 0,
        "jssm_uzs"                  NUMERIC(15,2) NOT NULL DEFAULT 0,
        "admin_share_uzs"           NUMERIC(15,2) NOT NULL DEFAULT 0,
        "equipment_share_uzs"       NUMERIC(15,2) NOT NULL DEFAULT 0,
        "overhead_share_uzs"        NUMERIC(15,2) NOT NULL DEFAULT 0,
        "total_monthly_cost_uzs"    NUMERIC(15,2) NOT NULL,
        "hourly_rate_uzs"           NUMERIC(12,4) NOT NULL,
        "hourly_rate_usd"           NUMERIC(10,4) NULL,
        "exchange_rate_used"        NUMERIC(12,2) NULL,
        "production_employee_count" SMALLINT      NOT NULL DEFAULT 15,
        "working_hours_per_month"   SMALLINT      NOT NULL DEFAULT 176,
        "notes"                     TEXT          NULL,
        "created_at"                TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"                TIMESTAMP     NULL,
        CONSTRAINT "PK_hourly_rates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hourly_rates_user_date" UNIQUE ("user_id", "effective_date"),
        CONSTRAINT "FK_hourly_rates_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_hourly_rates_user_date" ON "hourly_rates" ("user_id", "effective_date")`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'overhead_category_enum') THEN
          CREATE TYPE overhead_category_enum AS ENUM (
            'RENT','UTILITIES','INTERNET','SOFTWARE_LICENSES',
            'OFFICE_SUPPLIES','MARKETING','TRAINING','INSURANCE','LEGAL','OTHER'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "overhead_costs" (
        "id"           UUID                   NOT NULL DEFAULT gen_random_uuid(),
        "org_id"       UUID                   NOT NULL,
        "period_year"  SMALLINT               NOT NULL,
        "period_month" SMALLINT               NOT NULL,
        "category"     overhead_category_enum NOT NULL,
        "amount_uzs"   NUMERIC(15,2)          NOT NULL,
        "description"  TEXT                   NULL,
        "created_at"   TIMESTAMP              NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP              NOT NULL DEFAULT now(),
        "deleted_at"   TIMESTAMP              NULL,
        CONSTRAINT "PK_overhead_costs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_overhead_org_period_cat" UNIQUE ("org_id", "period_year", "period_month", "category")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment" (
        "id"                        UUID          NOT NULL DEFAULT gen_random_uuid(),
        "org_id"                    UUID          NOT NULL,
        "name"                      VARCHAR(255)  NOT NULL,
        "category"                  VARCHAR(100)  NULL,
        "purchase_date"             DATE          NOT NULL,
        "purchase_cost_uzs"         NUMERIC(15,2) NOT NULL,
        "useful_life_months"        SMALLINT      NOT NULL,
        "monthly_amortization_uzs"  NUMERIC(12,2) NOT NULL,
        "residual_value_uzs"        NUMERIC(15,2) NOT NULL DEFAULT 0,
        "decommission_date"         DATE          NULL,
        "is_active"                 BOOLEAN       NOT NULL DEFAULT TRUE,
        "serial_number"             VARCHAR(100)  NULL,
        "notes"                     TEXT          NULL,
        "created_at"                TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"                TIMESTAMP     NULL,
        CONSTRAINT "PK_equipment" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_equipment_org_active" ON "equipment" ("org_id", "is_active")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_financial_plan" (
        "id"                      UUID          NOT NULL DEFAULT gen_random_uuid(),
        "project_id"              UUID          NOT NULL,
        "org_id"                  UUID          NULL,
        "version"                 SMALLINT      NOT NULL DEFAULT 1,
        "is_current"              BOOLEAN       NOT NULL DEFAULT TRUE,
        "contract_signed_date"    DATE          NULL,
        "contract_value_uzs"      NUMERIC(15,2) NULL,
        "contract_value_usd"      NUMERIC(12,2) NULL,
        "planned_hours_total"     NUMERIC(10,2) NOT NULL,
        "avg_hourly_rate_uzs"     NUMERIC(12,4) NOT NULL,
        "risk_coefficient"        NUMERIC(5,3)  NOT NULL DEFAULT 1.150,
        "mizan_cost_uzs"          NUMERIC(15,2) NOT NULL,
        "mizan_cost_usd"          NUMERIC(12,2) NULL,
        "planned_profit_uzs"      NUMERIC(15,2) NULL,
        "planned_margin_pct"      NUMERIC(7,4)  NULL,
        "exchange_rate_at_signing" NUMERIC(12,2) NULL,
        "calculated_by"           UUID          NULL,
        "notes"                   TEXT          NULL,
        "created_at"              TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"              TIMESTAMP     NULL,
        CONSTRAINT "PK_project_financial_plan" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pfp_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pfp_project_current" ON "project_financial_plan" ("project_id", "is_current")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_monthly_costs" (
        "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
        "project_id"          UUID          NOT NULL,
        "org_id"              UUID          NULL,
        "period_year"         SMALLINT      NOT NULL,
        "period_month"        SMALLINT      NOT NULL,
        "total_hours"         NUMERIC(10,2) NOT NULL,
        "total_cost_uzs"      NUMERIC(15,2) NOT NULL,
        "total_cost_usd"      NUMERIC(12,2) NULL,
        "employee_count"      SMALLINT      NOT NULL,
        "avg_hourly_rate_uzs" NUMERIC(12,4) NULL,
        "is_finalized"        BOOLEAN       NOT NULL DEFAULT FALSE,
        "calculated_at"       TIMESTAMPTZ   NULL,
        "created_at"          TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP     NULL,
        CONSTRAINT "PK_project_monthly_costs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pmc_project_period" UNIQUE ("project_id", "period_year", "period_month"),
        CONSTRAINT "FK_pmc_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pmc_org_period" ON "project_monthly_costs" ("org_id", "period_year", "period_month")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_monthly_allocation" (
        "id"                        UUID          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"                   UUID          NOT NULL,
        "project_id"                UUID          NOT NULL,
        "org_id"                    UUID          NULL,
        "period_year"               SMALLINT      NOT NULL,
        "period_month"              SMALLINT      NOT NULL,
        "hours_logged"              NUMERIC(10,2) NOT NULL,
        "hourly_rate_uzs_snapshot"  NUMERIC(12,4) NOT NULL,
        "cost_uzs"                  NUMERIC(15,2) NOT NULL,
        "cost_usd"                  NUMERIC(12,2) NULL,
        "exchange_rate_snapshot"    NUMERIC(12,2) NULL,
        "is_finalized"              BOOLEAN       NOT NULL DEFAULT FALSE,
        "calculated_at"             TIMESTAMPTZ   NULL,
        "created_at"                TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMP     NOT NULL DEFAULT now(),
        "deleted_at"                TIMESTAMP     NULL,
        CONSTRAINT "PK_user_monthly_allocation" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_uma_user_project_period" UNIQUE ("user_id", "project_id", "period_year", "period_month"),
        CONSTRAINT "FK_uma_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_uma_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_uma_org_period" ON "user_monthly_allocation" ("org_id", "period_year", "period_month")`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cost_source_enum') THEN
          CREATE TYPE cost_source_enum AS ENUM ('REALTIME', 'BACKFILL', 'MANUAL');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "time_entry_costs" (
        "id"                         UUID            NOT NULL DEFAULT gen_random_uuid(),
        "time_entry_id"              UUID            NOT NULL,
        "user_id"                    UUID            NOT NULL,
        "project_id"                 UUID            NULL,
        "org_id"                     UUID            NULL,
        "hourly_rate_uzs_at_entry"   NUMERIC(12,4)   NULL,
        "cost_uzs"                   NUMERIC(15,2)   NULL,
        "cost_usd"                   NUMERIC(10,2)   NULL,
        "exchange_rate_at_entry"     NUMERIC(12,2)   NULL,
        "calculated_at"              TIMESTAMPTZ     NOT NULL DEFAULT now(),
        "source"                     cost_source_enum NOT NULL DEFAULT 'REALTIME',
        CONSTRAINT "PK_time_entry_costs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tec_time_entry" UNIQUE ("time_entry_id"),
        CONSTRAINT "FK_tec_time_entry" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id"),
        CONSTRAINT "FK_tec_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "time_entry_costs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_monthly_allocation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_monthly_costs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_financial_plan"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "overhead_costs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hourly_rates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cost_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "overhead_category_enum"`);
  }
}
