import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import { getEthiopiaNow } from "@/lib/courseTime";
import { formatEthiopianTime, toEthiopianDate } from "@/lib/ethiopianCalendar";
import { sendTelegramBotMessage } from "@/lib/telegramNotify";

export const dynamic = "force-dynamic";

function escHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await req.json()) as {
      courseId?: number;
      audience?: "all" | "absent_today" | "high_absent";
      customMessage?: string;
    };

    const courseId = Number(body.courseId);
    const audience = body.audience || "all";
    const customMessage = (body.customMessage || "").trim();

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    const { dateStr: today } = getEthiopiaNow();

    const courseRows = await sql`
      SELECT id, title, class_time
      FROM spiritual_courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    if (courseRows.length === 0) {
      return NextResponse.json({ error: "ኮርሱ አልተገኘም።" }, { status: 404 });
    }
    const course = courseRows[0];

    const distinctDays = await sql`
      SELECT COUNT(DISTINCT session_date)::int AS cnt
      FROM course_attendance
      WHERE course_id = ${courseId}
    `;
    const heldDays = Number(distinctDays[0]?.cnt || 0);

    const enrollments = await sql`
      SELECT
        e.id,
        e.telegram_id,
        e.full_name,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'present') AS present_count,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'late') AS late_count,
        (SELECT a.status FROM course_attendance a WHERE a.enrollment_id = e.id AND a.session_date = ${today} LIMIT 1) AS today_status
      FROM course_enrollments e
      WHERE e.course_id = ${courseId}
    `;

    const targets = enrollments.filter((r) => {
      if (audience === "absent_today") {
        return !r.today_status;
      }
      if (audience === "high_absent") {
        const attended =
          Number(r.present_count || 0) + Number(r.late_count || 0);
        const absent = Math.max(0, heldDays - attended);
        return absent >= 2;
      }
      return true;
    });

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "በዚህ ምርጫ ውስጥ መልእክት የሚላክለት ተማሪ የለም።" },
        { status: 400 }
      );
    }

    const todayEth = toEthiopianDate(today).formatted;
    const classTimeEth = formatEthiopianTime(String(course.class_time));

    let sentCount = 0;
    let failedCount = 0;

    // Send in small concurrent batches of 10 to stay friendly to Telegram limits
    for (let i = 0; i < targets.length; i += 10) {
      const batch = targets.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(async (r) => {
          const attended =
            Number(r.present_count || 0) + Number(r.late_count || 0);
          const absent = Math.max(0, heldDays - attended);

          let msgBody = "";
          if (customMessage) {
            msgBody = escHtml(customMessage);
          } else if (audience === "absent_today") {
            msgBody = `የዛሬ (${todayEth}) ክፍለ ጊዜ አቴንዳንስዎ ገና አልተመዘገበም። በሰዓቱ (${classTimeEth}) በመገኘት QRዎን ያስመዝግቡ።`;
          } else if (audience === "high_absent") {
            msgBody = `እስካሁን ከተካሄዱት ${heldDays} ቀናት ውስጥ <b>${absent} ቀን</b> ቀርተዋል። እባክዎ ቀጣይ ክፍለ ጊዜዎች ላይ በትጋት ይገኙ።`;
          } else {
            msgBody = `ማስታወሻ፦ ዛሬ በ<b>${classTimeEth}</b> የ<b>${escHtml(course.title)}</b> ትምህርት አለ። በሰዓቱ በመገኘት የQR መታወቂያዎን ያዘጋጁ!`;
          }

          const fullMsg = [
            `📢 <b>እንዳ ኢየሱስ ግቢ ጉባኤ — ${escHtml(course.title)}</b>`,
            "",
            `ሰላም <b>${escHtml(r.full_name)}</b>፤`,
            msgBody,
          ].join("\n");

          return sendTelegramBotMessage(String(r.telegram_id), fullMsg);
        })
      );

      for (const ok of results) {
        if (ok) sentCount += 1;
        else failedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      sentCount,
      failedCount,
      message: `📨 ለ ${sentCount} ተማሪዎች በTelegram ኖቲፊኬሽን ተልኳል${failedCount > 0 ? ` (${failedCount} አልደረሰም)` : "!"}`,
    });
  } catch (error) {
    console.error("Course notify error:", error);
    return NextResponse.json(
      { error: "ኖቲፊኬሽን መላክ አልተቻለም።" },
      { status: 500 }
    );
  }
}
