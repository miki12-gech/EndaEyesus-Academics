import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import { AcademicProfileRow, NO_DEPT_VALUE } from "@/lib/constants";

export const dynamic = "force-dynamic";

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
    const deptParam = url.searchParams.get("dept") || "";

    await ensureSchema();
    const sql = getSql();
    const allRows = (await sql`
      SELECT * FROM academic_profiles
      ORDER BY is_red_flag DESC, academic_year ASC, full_name ASC
    `) as unknown as AcademicProfileRow[];

    const rows = deptParam
      ? allRows.filter((r) =>
          deptParam === "NO_DEPT"
            ? r.service_dept === NO_DEPT_VALUE
            : r.service_dept === deptParam
        )
      : allRows;

    const headers = [
      "ID",
      "ሙሉ ስም (Full Name)",
      "ስልክ (Phone)",
      "Telegram Username",
      "ጾታ (Gender)",
      "የትምህርት ዓመት (Year)",
      "ኮሌጅ (College)",
      "ዲፓርትመንት (Department)",
      "መኖሪያ (Residence)",
      "ዶርም/ብሎክ",
      "የአገልግሎት ደረጃ (Role)",
      "የአገልግሎት ክፍል (Service Dept)",
      "የውጤት ደረጃ (CGPA)",
      "Red Flag (ልዩ ድጋፍ)",
      "የትምህርት እክሎች (Challenges)",
      "የሚፈልጉት ድጋፍ (Support Needs)",
      "ማገዝ የሚችሉት (Can Tutor/Help)",
      "ተጨማሪ ሐሳብ/ጥያቄ (Notes)",
      "የተመዘገበበት ቀን",
    ];

    const lines = [headers.map(csvEscape).join(",")];

    for (const r of rows) {
      const collegeDisplay =
        r.college === "ሌላ (Other)" && r.college_other
          ? `ሌላ: ${r.college_other}`
          : r.college;
      const serviceDeptDisplay =
        r.service_dept === "ሌላ (Other)" && r.service_dept_other
          ? `ሌላ: ${r.service_dept_other}`
          : r.service_dept;
      const challengesDisplay = [
        ...(Array.isArray(r.challenges) ? r.challenges : []),
        r.challenge_other ? `ሌላ: ${r.challenge_other}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      const supportDisplay = [
        ...(Array.isArray(r.support_needs) ? r.support_needs : []),
        r.support_other ? `ሌላ: ${r.support_other}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      lines.push(
        [
          r.id,
          r.full_name,
          r.phone_number,
          r.telegram_username ? `@${r.telegram_username}` : "",
          r.gender,
          r.academic_year,
          collegeDisplay,
          r.department,
          r.residence,
          r.dorm_info || "",
          r.service_role,
          serviceDeptDisplay,
          r.cgpa_range,
          r.is_red_flag ? "YES (Red Flag)" : "NO",
          challengesDisplay,
          supportDisplay,
          r.can_help_with || "",
          r.additional_notes || "",
          new Date(r.updated_at).toISOString().split("T")[0],
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    // UTF-8 BOM ensures Amharic characters display cleanly in Microsoft Excel
    const csvContent = "\uFEFF" + lines.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="enda-eyesus-academic-status.csv"',
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: "CSV ማውረድ አልተቻለም።" },
      { status: 500 }
    );
  }
}
