import { neon } from "@neondatabase/serverless";

let schemaPromise: Promise<void> | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not configured.");
  }
  return neon(databaseUrl);
}

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS academic_profiles (
          id SERIAL PRIMARY KEY,
          telegram_id TEXT UNIQUE NOT NULL,
          telegram_username TEXT,
          full_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          gender TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          college TEXT NOT NULL,
          college_other TEXT,
          department TEXT NOT NULL,
          residence TEXT NOT NULL,
          dorm_info TEXT,
          service_role TEXT NOT NULL,
          service_dept TEXT NOT NULL,
          service_dept_other TEXT,
          cgpa_range TEXT NOT NULL,
          challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
          challenge_other TEXT,
          support_needs JSONB NOT NULL DEFAULT '[]'::jsonb,
          support_other TEXT,
          can_help_with TEXT,
          additional_notes TEXT,
          is_red_flag BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_academic_profiles_year
        ON academic_profiles (academic_year)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_academic_profiles_service_dept
        ON academic_profiles (service_dept)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_academic_profiles_red_flag
        ON academic_profiles (is_red_flag)
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS department_access (
          id SERIAL PRIMARY KEY,
          department TEXT UNIQUE NOT NULL,
          access_token TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}
