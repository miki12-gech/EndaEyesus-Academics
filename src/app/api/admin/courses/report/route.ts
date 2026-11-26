import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import { toEthiopianDate, formatEthiopianTime } from "@/lib/ethiopianCalendar";
import { formatClassDaysLabel } from "@/lib/courseTime";

export const dynamic = "force-dynamic";

function esc(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvEscape(val: unknown): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const courseId = Number(url.searchParams.get("courseId"));
    const format = url.searchParams.get("format") || "report";

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();

    const courseRows = await sql`
      SELECT
        id,
        title,
        total_days,
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
        class_time,
        class_days
      FROM spiritual_courses WHERE id = ${courseId} LIMIT 1
    `;
    if (courseRows.length === 0) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    const course = courseRows[0];

    const distinctDays = await sql`
      SELECT COUNT(DISTINCT session_date)::int AS cnt
      FROM course_attendance
      WHERE course_id = ${courseId}
    `;
    const heldDays = Number(distinctDays[0]?.cnt || 0);

    const roster = await sql`
      SELECT
        e.id,
        e.full_name,
        e.phone_number,
        e.telegram_username,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'present') AS present_count,
        (SELECT COUNT(*)::int FROM course_attendance a WHERE a.enrollment_id = e.id AND a.status = 'late') AS late_count
      FROM course_enrollments e
      WHERE e.course_id = ${courseId}
      ORDER BY e.full_name ASC
    `;

    if (format === "csv") {
      const headers = [
        "#",
        "ሙሉ ስም (Full Name)",
        "ስልክ (Phone)",
        "Telegram",
        "በሰዓቱ (Present)",
        "ዘግይቷል (Late)",
        "ቀርቷል (Absent)",
        "የተካሄዱ ቀናት (Held Days)",
        "ክትትል % (Attendance %)",
      ];
      const lines = [headers.map(csvEscape).join(",")];
      roster.forEach((r, idx) => {
        const present = Number(r.present_count || 0);
        const late = Number(r.late_count || 0);
        const attended = present + late;
        const absent = Math.max(0, heldDays - attended);
        const pct = heldDays > 0 ? Math.round((attended / heldDays) * 100) : 100;
        lines.push(
          [
            idx + 1,
            r.full_name,
            r.phone_number,
            r.telegram_username ? `@${r.telegram_username}` : "",
            present,
            late,
            absent,
            heldDays,
            `${pct}%`,
          ]
            .map(csvEscape)
            .join(",")
        );
      });
      return new NextResponse("\uFEFF" + lines.join("\r\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="course-${courseId}-attendance.csv"`,
        },
      });
    }

    const today = toEthiopianDate(
      new Date().toISOString().split("T")[0]
    ).formatted;
    const startStr = toEthiopianDate(
      String(course.start_date).slice(0, 10)
    ).formatted;
    const endStr = toEthiopianDate(
      String(course.end_date).slice(0, 10)
    ).formatted;

    const rowsHtml = roster
      .map((r, idx) => {
        const present = Number(r.present_count || 0);
        const late = Number(r.late_count || 0);
        const attended = present + late;
        const absent = Math.max(0, heldDays - attended);
        const pct = heldDays > 0 ? Math.round((attended / heldDays) * 100) : 100;
        return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="bold">${esc(r.full_name)}</td>
          <td>${esc(r.phone_number)}</td>
          <td>${r.telegram_username ? `@${esc(r.telegram_username)}` : "—"}</td>
          <td class="center green">${present}</td>
          <td class="center amber">${late}</td>
          <td class="center red">${absent}</td>
          <td class="center bold">${pct}%</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(course.title)} — Attendance Report</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Ethiopic", Arial, sans-serif; color: #0f172a; background: #f1f5f9; margin: 0; padding: 20px; font-size: 12px; }
    .toolbar { max-width: 900px; margin: 0 auto 16px auto; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; background: #0f294a; color: #fff; padding: 12px 18px; border-radius: 12px; }
    .btn { border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-print { background: #eab308; color: #0f294a; }
    .btn-csv { background: #ffffff; color: #0f294a; }
    .sheet { max-width: 900px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0f294a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { margin: 0; font-size: 19px; color: #0f294a; }
    .header p { margin: 4px 0 0 0; color: #475569; font-size: 11.5px; }
    .meta { text-align: right; font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f294a; color: #fff; text-align: left; padding: 8px 7px; border: 1px solid #0f294a; }
    td { padding: 7px; border: 1px solid #cbd5e1; }
    tr:nth-child(even) { background: #f8fafc; }
    .center { text-align: center; }
    .bold { font-weight: 700; color: #0f294a; }
    .green { color: #15803d; font-weight: 700; }
    .amber { color: #b45309; font-weight: 700; }
    .red { color: #b91c1c; font-weight: 700; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { box-shadow: none; padding: 0; max-width: 100%; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>📖 ${esc(course.title)} — Attendance Report</strong>
    <div style="display:flex;gap:10px;">
      <a class="btn btn-csv" href="${esc(url.pathname + url.search.replace("format=report", "format=csv"))}">📥 Download Excel (CSV)</a>
      <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
  </div>
  <div class="sheet">
    <div class="header">
      <div>
        <h1>እንዳ ኢየሱስ ግቢ ጉባኤ — ${esc(course.title)}</h1>
        <p>የመንፈሳዊ ኮርስ ክትትል ሪፖርት • ከ${startStr} እስከ ${endStr} (${course.total_days} ቀናት) • ${esc(formatClassDaysLabel(course.class_days))} • ${esc(formatEthiopianTime(String(course.class_time)))}</p>
      </div>
      <div class="meta">
        <div><strong>ቀን:</strong> ${today}</div>
        <div><strong>የተካሄዱ ቀናት:</strong> ${heldDays} / ${course.total_days}</div>
        <div><strong>ተመዝጋቢ:</strong> ${roster.length}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center">#</th>
          <th>ሙሉ ስም (Full Name)</th>
          <th>ስልክ</th>
          <th>Telegram</th>
          <th class="center">✅ በሰዓቱ</th>
          <th class="center">⏰ ዘግይቷል</th>
          <th class="center">❌ ቀርቷል</th>
          <th class="center">ክትትል %</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="8" class="center">ምንም የተመዘገበ ተማሪ የለም።</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Course report error:", error);
    return NextResponse.json(
      { error: "ሪፖርቱን ማዘጋጀት አልተቻለም።" },
      { status: 500 }
    );
  }
}
