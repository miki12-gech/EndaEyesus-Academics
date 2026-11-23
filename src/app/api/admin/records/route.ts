import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import { AcademicProfileRow } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: "ፈቃድ የለዎትም (Unauthorized Admin Access)" },
        { status: 403 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM academic_profiles
      ORDER BY is_red_flag DESC, updated_at DESC
    `) as unknown as AcademicProfileRow[];

    const total = rows.length;
    const redFlags = rows.filter((r) => r.is_red_flag).length;
    const servants = rows.filter(
      (r) => !r.service_role.includes("አባል ብቻ")
    ).length;
    const potentialTutors = rows.filter(
      (r) => Boolean(r.can_help_with && r.can_help_with.trim().length > 1)
    ).length;
    const gcCount = rows.filter((r) => r.academic_year.includes("GC")).length;

    return NextResponse.json({
      ok: true,
      admin: auth.adminLabel,
      stats: {
        total,
        servants,
        redFlags,
        potentialTutors,
        gcCount,
      },
      records: rows,
    });
  } catch (error) {
    console.error("GET /api/admin/records error:", error);
    return NextResponse.json(
      { error: "የአድሚን መረጃውን ማምጣት አልተቻለም።" },
      { status: 500 }
    );
  }
}
