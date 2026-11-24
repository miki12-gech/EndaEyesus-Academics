import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT department, access_token, updated_at
      FROM department_access
      ORDER BY department ASC
    `;

    return NextResponse.json({ ok: true, leaders: rows });
  } catch (error) {
    console.error("Admin leaders GET error:", error);
    return NextResponse.json(
      { error: "መረጃውን ማምጣት አልተቻለም።" },
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
      department?: string;
      regenerate?: boolean;
    };
    const department = (body.department || "").trim();
    if (!department) {
      return NextResponse.json(
        { error: "Department is required." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();

    if (!body.regenerate) {
      const existing = await sql`
        SELECT department, access_token
        FROM department_access
        WHERE department = ${department}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({
          ok: true,
          department: existing[0].department,
          access_token: existing[0].access_token,
        });
      }
    }

    const token = crypto.randomBytes(12).toString("hex");
    await sql`
      INSERT INTO department_access (department, access_token, updated_at)
      VALUES (${department}, ${token}, NOW())
      ON CONFLICT (department) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        updated_at = NOW()
    `;

    return NextResponse.json({
      ok: true,
      department,
      access_token: token,
    });
  } catch (error) {
    console.error("Admin leaders POST error:", error);
    return NextResponse.json(
      { error: "የክፍል ተጠሪ ሊንክ መፍጠር አልተቻለም።" },
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
    const department = url.searchParams.get("department") || "";
    if (!department) {
      return NextResponse.json(
        { error: "Department is required." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getSql();
    await sql`
      DELETE FROM department_access
      WHERE department = ${department}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin leaders DELETE error:", error);
    return NextResponse.json(
      { error: "ሊንኩን ማጥፋት አልተቻለም።" },
      { status: 500 }
    );
  }
}
