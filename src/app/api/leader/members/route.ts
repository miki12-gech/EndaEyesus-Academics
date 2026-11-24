import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { NO_DEPT_VALUE, classifyServiceRole } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface SafeLeaderMember {
  id: number;
  full_name: string;
  phone_number: string;
  telegram_username: string | null;
  service_role: string;
  service_dept: string;
  service_dept_other: string | null;
}

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
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();
    const format = url.searchParams.get("format") || "json";

    if (!token) {
      return NextResponse.json(
        { error: "የመግቢያ ሊንኩ ትክክል አይደለም (Missing token)።" },
        { status: 403 }
      );
    }

    await ensureSchema();
    const sql = getSql();

    const accessRows = await sql`
      SELECT department FROM department_access
      WHERE access_token = ${token}
      LIMIT 1
    `;

    if (accessRows.length === 0) {
      return NextResponse.json(
        { error: "ይህ ሊንክ ተሰርዟል ወይም ትክክል አይደለም። እባክዎ አድሚኑን ይጠይቁ።" },
        { status: 403 }
      );
    }

    const deptKey = String(accessRows[0].department);
    const targetDept = deptKey === "NO_DEPT" ? NO_DEPT_VALUE : deptKey;
    const deptLabel =
      deptKey === "NO_DEPT" ? "ክፍል የሌላቸው (አባል ብቻ)" : `${deptKey} ክፍል`;

    // Strictly select ONLY privacy-safe contact & service fields
    const members = (await sql`
      SELECT
        id,
        full_name,
        phone_number,
        telegram_username,
        service_role,
        service_dept,
        service_dept_other
      FROM academic_profiles
      WHERE service_dept = ${targetDept}
      ORDER BY full_name ASC
    `) as unknown as SafeLeaderMember[];

    if (format === "csv") {
      const headers = [
        "#",
        "ሙሉ ስም (Full Name)",
        "ስልክ (Phone)",
        "Telegram",
        "የአገልግሎት ክፍል (Service Dept)",
        "የአገልግሎት ደረጃ (Role)",
      ];
      const lines = [headers.map(csvEscape).join(",")];
      members.forEach((m, idx) => {
        const deptDisplay =
          m.service_dept === "ሌላ (Other)" && m.service_dept_other
            ? m.service_dept_other
            : m.service_dept;
        lines.push(
          [
            idx + 1,
            m.full_name,
            m.phone_number,
            m.telegram_username ? `@${m.telegram_username}` : "",
            deptDisplay,
            m.service_role,
          ]
            .map(csvEscape)
            .join(",")
        );
      });
      return new NextResponse("\uFEFF" + lines.join("\r\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="enda-eyesus-department-members.csv"',
        },
      });
    }

    if (format === "report") {
      const today = new Date().toISOString().split("T")[0];
      const total = members.length;
      const mainCount = members.filter(
        (m) => classifyServiceRole(m.service_role) === "main"
      ).length;
      const subCount = members.filter(
        (m) => classifyServiceRole(m.service_role) === "sub"
      ).length;
      const activeCount = members.filter(
        (m) => classifyServiceRole(m.service_role) === "active"
      ).length;

      const tableRows = members
        .map((m, idx) => {
          const deptDisplay =
            m.service_dept === "ሌላ (Other)" && m.service_dept_other
              ? m.service_dept_other
              : m.service_dept;
          return `
          <tr>
            <td class="center">${idx + 1}</td>
            <td class="name">${esc(m.full_name)}</td>
            <td>${esc(m.phone_number)}</td>
            <td>${m.telegram_username ? `@${esc(m.telegram_username)}` : "—"}</td>
            <td>
              <div class="bold">${esc(deptDisplay)}</div>
              <div class="sub">${esc(m.service_role)}</div>
            </td>
          </tr>`;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>እንዳ ኢየሱስ ግቢ ጉባኤ — ${esc(deptLabel)} (${today})</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Ethiopic", Arial, sans-serif;
      color: #0f172a; background: #f1f5f9; margin: 0; padding: 20px; font-size: 12px;
    }
    .toolbar {
      max-width: 900px; margin: 0 auto 16px auto; display: flex; flex-wrap: wrap; gap: 10px;
      align-items: center; justify-content: space-between; background: #0f294a; color: #fff;
      padding: 12px 18px; border-radius: 12px;
    }
    .toolbar-actions { display: flex; gap: 10px; }
    .btn {
      border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 13px;
      cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-print { background: #eab308; color: #0f294a; }
    .btn-csv { background: #ffffff; color: #0f294a; }
    .sheet {
      max-width: 900px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    }
    .report-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      border-bottom: 3px solid #0f294a; padding-bottom: 12px; margin-bottom: 16px;
    }
    .report-header h1 { margin: 0; font-size: 19px; color: #0f294a; }
    .report-header p { margin: 4px 0 0 0; color: #475569; font-size: 12px; }
    .meta { text-align: right; font-size: 11px; color: #475569; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .kpi-label { font-size: 10px; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 20px; font-weight: 800; color: #0f294a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f294a; color: #fff; text-align: left; padding: 8px 7px; border: 1px solid #0f294a; }
    td { padding: 7px; border: 1px solid #cbd5e1; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .center { text-align: center; }
    .name { font-weight: 700; color: #0f294a; }
    .bold { font-weight: 600; }
    .sub { font-size: 10px; color: #475569; margin-top: 2px; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { box-shadow: none; padding: 0; max-width: 100%; border-radius: 0; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>እንዳ ኢየሱስ ግቢ ጉባኤ — ${esc(deptLabel)}</strong>
    <div class="toolbar-actions">
      <a class="btn btn-csv" href="/api/leader/members?token=${encodeURIComponent(token)}&format=csv">📥 Download Excel (CSV)</a>
      <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
  </div>
  <div class="sheet">
    <div class="report-header">
      <div>
        <h1>እንዳ ኢየሱስ ግቢ ጉባኤ — ${esc(deptLabel)}</h1>
        <p>የክፍል ተጠሪዎች ዝርዝር (ሙሉ ስም፣ ስልክ፣ Telegram እና አገልግሎት)</p>
      </div>
      <div class="meta">
        <div><strong>ቀን:</strong> ${today}</div>
        <div><strong>ጠቅላላ:</strong> ${total}</div>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">ጠቅላላ</div><div class="kpi-val">${total}</div></div>
      <div class="kpi"><div class="kpi-label">ዋና ክፍል</div><div class="kpi-val">${mainCount}</div></div>
      <div class="kpi"><div class="kpi-label">ንዑስ ክፍል</div><div class="kpi-val">${subCount}</div></div>
      <div class="kpi"><div class="kpi-label">አክቲቭ አገልጋይ</div><div class="kpi-val">${activeCount}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center">#</th>
          <th>ሙሉ ስም (Full Name)</th>
          <th>ስልክ ቁጥር (Phone)</th>
          <th>Telegram</th>
          <th>አገልግሎት (Service Dept & Role)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="5" class="center">ምንም የተመዘገበ አባል የለም።</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      ok: true,
      department: deptKey,
      departmentLabel: deptLabel,
      stats: {
        total: members.length,
        main: members.filter(
          (m) => classifyServiceRole(m.service_role) === "main"
        ).length,
        sub: members.filter(
          (m) => classifyServiceRole(m.service_role) === "sub"
        ).length,
        active: members.filter(
          (m) => classifyServiceRole(m.service_role) === "active"
        ).length,
      },
      members,
    });
  } catch (error) {
    console.error("Leader members API error:", error);
    return NextResponse.json(
      { error: "መረጃውን ማምጣት አልተቻለም።" },
      { status: 500 }
    );
  }
}
