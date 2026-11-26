import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyTelegramInitData } from "@/lib/telegramAuth";
import { evaluateQrCheckInWindow, getEthiopiaNow } from "@/lib/courseTime";
import { notifyStudentCheckIn } from "@/lib/telegramNotify";

export const dynamic = "force-dynamic";

function resolveStudent(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data") || "";
  const tgUser = verifyTelegramInitData(initData);
  if (tgUser) return tgUser;
  if (process.env.NODE_ENV !== "production") {
    return {
      id: 999999999,
      first_name: "Demo",
      last_name: "Student",
      username: "demo_student",
    };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const tgUser = resolveStudent(req);
    if (!tgUser) {
      return NextResponse.json(
        { error: "እባክዎ አፕሊኬሽኑን ከTelegram ውስጥ ይክፈቱ።" },
        { status: 401 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    const { dateStr: today } = getEthiopiaNow();
    const telegramId = String(tgUser.id);

    const courses = await sql`
      SELECT
        c.id,
        c.title,
        c.description,
        c.total_days,
        TO_CHAR(c.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(c.end_date, 'YYYY-MM-DD') AS end_date,
        c.class_time,
        c.grace_minutes,
        c.early_minutes,
        c.duration_minutes,
        c.class_days,
        c.enroll_code,
        c.is_active,
        (SELECT COUNT(DISTINCT a.session_date)::int FROM course_attendance a WHERE a.course_id = c.id) AS held_days
      FROM spiritual_courses c
      WHERE c.is_active = TRUE
      ORDER BY c.created_at DESC
    `;

    const enrollments = await sql`
      SELECT
        e.*,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'present') AS present_count,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'late') AS late_count,
        (SELECT a.status FROM course_attendance a WHERE a.enrollment_id = e.id AND a.session_date = ${today} LIMIT 1) AS today_status
      FROM course_enrollments e
      WHERE e.telegram_id = ${telegramId}
    `;

    return NextResponse.json({
      ok: true,
      today,
      courses,
      enrollments,
    });
  } catch (error) {
    console.error("Student courses GET error:", error);
    return NextResponse.json(
      { error: "ኮርሶችን ማምጣት አልተቻለም።" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tgUser = resolveStudent(req);
    if (!tgUser) {
      return NextResponse.json(
        { error: "እባክዎ አፕሊኬሽኑን ከTelegram ውስጥ ይክፈቱ።" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as {
      action: "enroll" | "self_checkin";
      courseId?: number;
      enrollCode?: string;
      qrText?: string;
      fullName?: string;
      phoneNumber?: string;
    };

    await ensureSchema();
    const sql = getSql();
    const telegramId = String(tgUser.id);
    const { dateStr: today } = getEthiopiaNow();

    if (body.action === "enroll") {
      let courseRows;
      if (body.enrollCode) {
        const cleanCode = body.enrollCode.trim().toUpperCase();
        courseRows = await sql`
          SELECT * FROM spiritual_courses WHERE enroll_code = ${cleanCode} LIMIT 1
        `;
      } else if (body.courseId) {
        courseRows = await sql`
          SELECT * FROM spiritual_courses WHERE id = ${Number(body.courseId)} LIMIT 1
        `;
      } else {
        return NextResponse.json(
          { error: "ኮርሱ አልተመረጠም።" },
          { status: 400 }
        );
      }

      if (!courseRows || courseRows.length === 0) {
        return NextResponse.json(
          { error: "ኮርሱ አልተገኘም ወይም ሊንኩ ትክክል አይደለም።" },
          { status: 404 }
        );
      }
      const course = courseRows[0];

      // Auto-pull name & phone from academic_profiles if available
      let fullName = (body.fullName || "").trim();
      let phoneNumber = (body.phoneNumber || "").trim();

      if (!fullName || !phoneNumber) {
        const profileRows = await sql`
          SELECT full_name, phone_number FROM academic_profiles
          WHERE telegram_id = ${telegramId}
          LIMIT 1
        `;
        if (profileRows.length > 0) {
          fullName = fullName || String(profileRows[0].full_name);
          phoneNumber = phoneNumber || String(profileRows[0].phone_number);
        }
      }

      if (!fullName || !phoneNumber) {
        return NextResponse.json(
          { error: "እባክዎ ሙሉ ስም እና ስልክ ቁጥር ያስገቡ።" },
          { status: 400 }
        );
      }

      const badgeToken = crypto.randomBytes(8).toString("hex").toUpperCase();

      const enrolled = await sql`
        INSERT INTO course_enrollments (
          course_id,
          telegram_id,
          telegram_username,
          full_name,
          phone_number,
          badge_token
        )
        VALUES (
          ${course.id},
          ${telegramId},
          ${tgUser.username || null},
          ${fullName},
          ${phoneNumber},
          ${badgeToken}
        )
        ON CONFLICT (course_id, telegram_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone_number = EXCLUDED.phone_number,
          telegram_username = EXCLUDED.telegram_username
        RETURNING *
      `;

      return NextResponse.json({
        ok: true,
        enrollment: enrolled[0],
        message: `🎉 በ"${course.title}" ኮርስ ላይ በተሳካ ሁኔታ ተመዝግበዋል!`,
      });
    }

    if (body.action === "self_checkin") {
      const rawQr = (body.qrText || "").trim();
      if (!rawQr.startsWith("EEGG-SESSION:")) {
        return NextResponse.json(
          { error: "❌ ይህ የዛሬው የኮርስ QR ኮድ አይደለም።" },
          { status: 400 }
        );
      }
      const parts = rawQr.split(":");
      const courseId = Number(parts[1]);
      const sessionCode = (parts[2] || "").trim();

      if (!courseId || !sessionCode) {
        return NextResponse.json(
          { error: "❌ የQR ኮዱ ትክክል አይደለም።" },
          { status: 400 }
        );
      }

      const courseRows = await sql`
        SELECT
          id,
          title,
          is_active,
          TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
          TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
          class_time,
          grace_minutes,
          early_minutes,
          duration_minutes,
          class_days,
          active_session_code,
          TO_CHAR(active_session_date, 'YYYY-MM-DD') AS active_session_date
        FROM spiritual_courses WHERE id = ${courseId} LIMIT 1
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
        active_session_code: string | null;
        active_session_date: string | Date | null;
      };

      const activeDate = course.active_session_date
        ? String(course.active_session_date).slice(0, 10)
        : "";
      if (
        course.active_session_code !== sessionCode ||
        activeDate !== today
      ) {
        return NextResponse.json(
          {
            error:
              "⏳ ይህ QR ኮድ ጊዜው አልፎበታል። እባክዎ አስተባባሪው የሚያሳየውን የዛሬውን QR ይቃኙ!",
          },
          { status: 400 }
        );
      }

      const windowCheck = evaluateQrCheckInWindow(course, today);
      if (!windowCheck.allowed || !windowCheck.status) {
        return NextResponse.json(
          {
            error: windowCheck.message || "በአሁኑ ሰዓት QR ስካን ማድረግ አይቻልም።",
            code: windowCheck.code,
          },
          { status: 400 }
        );
      }

      const enrollRows = await sql`
        SELECT * FROM course_enrollments
        WHERE course_id = ${courseId} AND telegram_id = ${telegramId}
        LIMIT 1
      `;
      if (enrollRows.length === 0) {
        return NextResponse.json(
          { error: "በዚህ ኮርስ ላይ ገና አልተመዘገቡም! መጀመሪያ ይመዝገቡ።" },
          { status: 403 }
        );
      }
      const enrollment = enrollRows[0];

      const existing = await sql`
        SELECT status FROM course_attendance
        WHERE course_id = ${courseId}
          AND enrollment_id = ${enrollment.id}
          AND session_date = ${today}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({
          ok: true,
          alreadyCheckedIn: true,
          status: existing[0].status,
          message: `ℹ️ ዛሬ ቀድመው ተመዝግበዋል (${existing[0].status === "present" ? "በሰዓቱ" : "ዘግይቷል"})።`,
        });
      }

      const status = windowCheck.status;

      await sql`
        INSERT INTO course_attendance (course_id, enrollment_id, session_date, status, method)
        VALUES (${courseId}, ${enrollment.id}, ${today}, ${status}, 'self_scan')
      `;

      await notifyStudentCheckIn({
        telegramId,
        studentName: String(enrollment.full_name),
        courseTitle: course.title,
        sessionDateYmd: today,
        status,
      });

      return NextResponse.json({
        ok: true,
        alreadyCheckedIn: false,
        status,
        message:
          status === "present"
            ? "✅ በሰዓቱ ተገኝተዋል (Present)!"
            : "⏰ ዘግይተው ተመዝግበዋል (Late)!",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Student courses POST error:", error);
    return NextResponse.json(
      { error: "ጥያቄውን ማስፈጸም አልተቻለም።" },
      { status: 500 }
    );
  }
}
