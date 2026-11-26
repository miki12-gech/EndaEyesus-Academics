import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import { evaluateQrCheckInWindow, getEthiopiaNow } from "@/lib/courseTime";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await req.json()) as {
      courseId?: number;
      qrText?: string;
      sessionDate?: string;
    };

    const courseId = Number(body.courseId);
    const rawQr = (body.qrText || "").trim();

    if (!courseId || !rawQr) {
      return NextResponse.json(
        { error: "የQR ኮዱ ወይም ኮርሱ ትክክል አይደለም።" },
        { status: 400 }
      );
    }

    // Parse "EEGG-BADGE:<badge_token>" or raw badge token
    const badgeToken = rawQr.startsWith("EEGG-BADGE:")
      ? rawQr.replace("EEGG-BADGE:", "").trim()
      : rawQr;

    await ensureSchema();
    const sql = getSql();

    const courseRows = await sql`
      SELECT
        id,
        title,
        is_active,
        start_date,
        end_date,
        class_time,
        grace_minutes,
        early_minutes,
        duration_minutes,
        class_days
      FROM spiritual_courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    if (courseRows.length === 0) {
      return NextResponse.json({ error: "ኮርሱ አልተገኘም።" }, { status: 404 });
    }
    const course = courseRows[0] as {
      id: number;
      title: string;
      is_active: boolean;
      start_date: string | Date;
      end_date: string | Date;
      class_time: string;
      grace_minutes: number;
      early_minutes: number;
      duration_minutes: number;
      class_days: unknown;
    };

    const enrollRows = await sql`
      SELECT id, course_id, full_name, phone_number
      FROM course_enrollments
      WHERE badge_token = ${badgeToken}
      LIMIT 1
    `;
    if (enrollRows.length === 0) {
      return NextResponse.json(
        { error: "❌ ይህ የQR መታወቂያ በዚህ ኮርስ አልተመዘገበም!" },
        { status: 404 }
      );
    }
    const enrollment = enrollRows[0];

    if (Number(enrollment.course_id) !== courseId) {
      return NextResponse.json(
        { error: `❌ ${enrollment.full_name} የተመዘገበው/ችው በሌላ ኮርስ ላይ ነው!` },
        { status: 400 }
      );
    }

    const { dateStr: today } = getEthiopiaNow();
    const requestedDate = (body.sessionDate || "").trim();
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : today;

    const windowCheck = evaluateQrCheckInWindow(course, targetDate);
    if (!windowCheck.allowed || !windowCheck.status) {
      return NextResponse.json(
        {
          error: windowCheck.message || "በአሁኑ ሰዓት QR ስካን ማድረግ አይቻልም።",
          code: windowCheck.code,
        },
        { status: 400 }
      );
    }

    const existing = await sql`
      SELECT status, checked_in_at
      FROM course_attendance
      WHERE course_id = ${courseId}
        AND enrollment_id = ${enrollment.id}
        AND session_date = ${targetDate}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json({
        ok: true,
        alreadyCheckedIn: true,
        studentName: enrollment.full_name,
        status: existing[0].status,
        message: `ℹ️ ${enrollment.full_name} ቀድሞ ተመዝግቧል (${existing[0].status === "present" ? "በሰዓቱ" : "ዘግይቷል"})።`,
      });
    }

    const status = windowCheck.status;

    await sql`
      INSERT INTO course_attendance (course_id, enrollment_id, session_date, status, method)
      VALUES (${courseId}, ${enrollment.id}, ${targetDate}, ${status}, 'usher_scan')
    `;

    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: false,
      studentName: enrollment.full_name,
      status,
      message:
        status === "present"
          ? `✅ ${enrollment.full_name} — በሰዓቱ ተገኝቷል (Present)!`
          : `⏰ ${enrollment.full_name} — ዘግይቶ ተመዝግቧል (Late)!`,
    });
  } catch (error) {
    console.error("Admin course scan error:", error);
    return NextResponse.json(
      { error: "QR ስካን ማድረግ አልተቻለም።" },
      { status: 500 }
    );
  }
}
