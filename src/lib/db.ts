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

      await sql`
        CREATE TABLE IF NOT EXISTS spiritual_courses (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          total_days INTEGER NOT NULL DEFAULT 14,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          class_time TEXT NOT NULL DEFAULT '17:30',
          grace_minutes INTEGER NOT NULL DEFAULT 15,
          enroll_code TEXT UNIQUE NOT NULL,
          active_session_code TEXT,
          active_session_date DATE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES spiritual_courses(id) ON DELETE CASCADE,
          telegram_id TEXT NOT NULL,
          telegram_username TEXT,
          full_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          badge_token TEXT UNIQUE NOT NULL,
          enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (course_id, telegram_id)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS course_attendance (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES spiritual_courses(id) ON DELETE CASCADE,
          enrollment_id INTEGER NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
          session_date DATE NOT NULL,
          status TEXT NOT NULL,
          checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          method TEXT NOT NULL DEFAULT 'qr',
          UNIQUE (course_id, enrollment_id, session_date)
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_course_attendance_course_date
        ON course_attendance (course_id, session_date)
      `;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}
