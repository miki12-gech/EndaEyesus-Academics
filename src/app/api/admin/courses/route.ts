import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import { getEthiopiaNow, normalizeClassDays } from "@/lib/courseTime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await ensureSchema();
    const sql = getSql();
    const { dateStr: today } = getEthiopiaNow();
    const url = new URL(req.url);
    const courseIdParam = url.searchParams.get("courseId");
    const sessionDateParam = (url.searchParams.get("sessionDate") || "").trim();
    const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(sessionDateParam)
      ? sessionDateParam
      : today;

    const courses = await sql`
      SELECT
        c.*,
        (SELECT COUNT(*)::int FROM course_enrollments e WHERE e.course_id = c.id) AS enrolled_count,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.course_id = c.id AND a.session_date = ${today} AND a.status = 'present') AS today_present,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.course_id = c.id AND a.session_date = ${today} AND a.status = 'late') AS today_late
      FROM spiritual_courses c
      ORDER BY c.is_active DESC, c.created_at DESC
    `;

    let roster: unknown[] = [];
    let heldDaysCount = 0;

    if (courseIdParam) {
      const cid = Number(courseIdParam);
      if (!Number.isNaN(cid)) {
        const distinctDays = await sql`
          SELECT COUNT(DISTINCT session_date)::int AS cnt
          FROM course_attendance
          WHERE course_id = ${cid}
        `;
        heldDaysCount = Number(distinctDays[0]?.cnt || 0);

        roster = await sql`
          SELECT
            e.id AS enrollment_id,
            e.full_name,
            e.phone_number,
            e.telegram_username,
            e.badge_token,
            e.enrolled_at,
            (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'present') AS present_count,
            (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'late') AS late_count,
            (SELECT a.status FROM course_attendance a WHERE a.enrollment_id = e.id AND a.session_date = ${sessionDate} LIMIT 1) AS today_status,
            (SELECT a.checked_in_at FROM course_attendance a WHERE a.enrollment_id = e.id AND a.session_date = ${sessionDate} LIMIT 1) AS today_checked_in_at
          FROM course_enrollments e
          WHERE e.course_id = ${cid}
          ORDER BY e.full_name ASC
        `;
      }
    }

    return NextResponse.json({
      ok: true,
      today,
      sessionDate,
      courses,
      roster,
      heldDaysCount,
    });
  } catch (error) {
    console.error("Admin courses GET error:", error);
    return NextResponse.json(
      { error: "የኮርሶችን መረጃ ማምጣት አልተቻለም።" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      totalDays?: number;
      startDate?: string;
      endDate?: string;
      classTime?: string;
      graceMinutes?: number;
      earlyMinutes?: number;
      durationMinutes?: number;
      classDays?: number[];
    };

    const title = (body.title || "").trim();
    const startDate = (body.startDate || "").trim();
    const endDate = (body.endDate || "").trim();
    const totalDays = Math.max(1, Number(body.totalDays || 14));
    const classTime = (body.classTime || "17:30").trim();
    const graceMinutes = Math.max(0, Number(body.graceMinutes ?? 15));
    const earlyMinutes = Math.max(0, Number(body.earlyMinutes ?? 60));
    const durationMinutes = Math.max(
      graceMinutes + 5,
      Number(body.durationMinutes ?? 90)
    );
    const classDays = normalizeClassDays(body.classDays);

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "እባክዎ የኮርሱን ስም፣ መጀመሪያ እና መጨረሻ ቀን ያስገቡ።" },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    const enrollCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const sessionCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const { dateStr: today } = getEthiopiaNow();

    const created = await sql`
      INSERT INTO spiritual_courses (
        title,
        description,
        total_days,
        start_date,
        end_date,
        class_time,
        grace_minutes,
        early_minutes,
        duration_minutes,
        class_days,
        enroll_code,
        active_session_code,
        active_session_date
      )
      VALUES (
        ${title},
        ${(body.description || "").trim() || null},
        ${totalDays},
        ${startDate},
        ${endDate},
        ${classTime},
        ${graceMinutes},
        ${earlyMinutes},
        ${durationMinutes},
        ${JSON.stringify(classDays)}::jsonb,
        ${enrollCode},
        ${sessionCode},
        ${today}
      )
      RETURNING *
    `;

    return NextResponse.json({ ok: true, course: created[0] });
  } catch (error) {
    console.error("Admin courses POST error:", error);
    return NextResponse.json(
      { error: "ኮርሱን መፍጠር አልተቻለም።" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await req.json()) as {
      courseId?: number;
      action?:
        | "rotate_session"
        | "toggle_active"
        | "manual_attendance"
        | "update_course";
      enrollmentId?: number;
      status?: "present" | "late" | "absent";
      sessionDate?: string;
      title?: string;
      description?: string;
      totalDays?: number;
      startDate?: string;
      endDate?: string;
      classTime?: string;
      graceMinutes?: number;
      earlyMinutes?: number;
      durationMinutes?: number;
      classDays?: number[];
    };

    const courseId = Number(body.courseId);
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    const { dateStr: today } = getEthiopiaNow();

    if (body.action === "update_course") {
      const title = (body.title || "").trim();
      const startDate = (body.startDate || "").trim();
      const endDate = (body.endDate || "").trim();
      const totalDays = Math.max(1, Number(body.totalDays || 14));
      const classTime = (body.classTime || "17:30").trim();
      const graceMinutes = Math.max(0, Number(body.graceMinutes ?? 15));
      const earlyMinutes = Math.max(0, Number(body.earlyMinutes ?? 60));
      const durationMinutes = Math.max(
        graceMinutes + 5,
        Number(body.durationMinutes ?? 90)
      );
      const classDays = normalizeClassDays(body.classDays);

      if (!title || !startDate || !endDate) {
        return NextResponse.json(
          { error: "እባክዎ የኮርሱን ስም፣ መጀመሪያ እና መጨረሻ ቀን ያስገቡ።" },
          { status: 400 }
        );
      }

      const updated = await sql`
        UPDATE spiritual_courses
        SET
          title = ${title},
          description = ${(body.description || "").trim() || null},
          total_days = ${totalDays},
          start_date = ${startDate},
          end_date = ${endDate},
          class_time = ${classTime},
          grace_minutes = ${graceMinutes},
          early_minutes = ${earlyMinutes},
          duration_minutes = ${durationMinutes},
          class_days = ${JSON.stringify(classDays)}::jsonb
        WHERE id = ${courseId}
        RETURNING *
      `;
      return NextResponse.json({ ok: true, course: updated[0] });
    }

    if (body.action === "rotate_session") {
      const newCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const updated = await sql`
        UPDATE spiritual_courses
        SET active_session_code = ${newCode}, active_session_date = ${today}
        WHERE id = ${courseId}
        RETURNING *
      `;
      return NextResponse.json({ ok: true, course: updated[0] });
    }

    if (body.action === "toggle_active") {
      const updated = await sql`
        UPDATE spiritual_courses
        SET is_active = NOT is_active
        WHERE id = ${courseId}
        RETURNING *
      `;
      return NextResponse.json({ ok: true, course: updated[0] });
    }

    if (body.action === "manual_attendance") {
      const enrollmentId = Number(body.enrollmentId);
      const targetDate = body.sessionDate || today;
      const status = body.status || "present";
      if (!enrollmentId) {
        return NextResponse.json(
          { error: "enrollmentId is required." },
          { status: 400 }
        );
      }

      if (status === "absent") {
        await sql`
          DELETE FROM course_attendance
          WHERE course_id = ${courseId}
            AND enrollment_id = ${enrollmentId}
            AND session_date = ${targetDate}
        `;
      } else {
        await sql`
          INSERT INTO course_attendance (course_id, enrollment_id, session_date, status, method)
          VALUES (${courseId}, ${enrollmentId}, ${targetDate}, ${status}, 'manual')
          ON CONFLICT (course_id, enrollment_id, session_date)
          DO UPDATE SET status = EXCLUDED.status, method = 'manual', checked_in_at = NOW()
        `;
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Admin courses PATCH error:", error);
    return NextResponse.json(
      { error: "ማስተካከያውን ማስቀመጥ አልተቻለም።" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const courseId = Number(url.searchParams.get("courseId"));
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM spiritual_courses WHERE id = ${courseId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin courses DELETE error:", error);
    return NextResponse.json(
      { error: "ኮርሱን ማጥፋት አልተቻለም።" },
      { status: 500 }
    );
  }
}
