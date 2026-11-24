import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/telegramAuth";
import {
  AcademicProfileRow,
  NO_DEPT_VALUE,
  buildDepartmentStats,
  classifyServiceRole,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

function esc(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdminAccess(req);
    if (!auth.authorized) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="am"><head><meta charset="utf-8"><title>Unauthorized</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>⛔ Unauthorized</h2><p>ይህን ሪፖርት ለማየት የአድሚን ፈቃድ ያስፈልጋል።</p></body></html>`,
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const url = new URL(req.url);
    const deptParam = url.searchParams.get("dept") || "";
    const modeParam = url.searchParams.get("mode") || "";
    const isLeaderMode = modeParam === "leader";

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

    const total = rows.length;
    const redFlags = rows.filter((r) => r.is_red_flag).length;
    const mainCount = rows.filter(
      (r) => classifyServiceRole(r.service_role) === "main"
    ).length;
    const subCount = rows.filter(
      (r) => classifyServiceRole(r.service_role) === "sub"
    ).length;
    const activeCount = rows.filter(
      (r) => classifyServiceRole(r.service_role) === "active"
    ).length;
    const servants = rows.filter(
      (r) =>
        r.service_role !== "አባል ብቻ (Regular Member)" &&
        r.service_dept !== NO_DEPT_VALUE
    ).length;
    const tutors = rows.filter(
      (r) => r.can_help_with && r.can_help_with.trim().length > 0
    ).length;
    const gcCount = rows.filter((r) => r.academic_year.includes("GC")).length;

    const deptLabel =
      deptParam === "NO_DEPT"
        ? "ክፍል የሌላቸው (አባል ብቻ)"
        : deptParam
          ? `${deptParam} ክፍል`
          : "ሁሉም ክፍላት";

    const { departments: deptStats, noDept: noDeptStats } =
      buildDepartmentStats(allRows);

    const deptSummaryHtml = !deptParam
      ? `
    <div style="margin-bottom: 18px;">
      <h2 style="font-size: 13px; color: #0f294a; margin: 0 0 8px 0;">የክፍላት አጠቃላይ መረጃ (Department Breakdown)</h2>
      <table>
        <thead>
          <tr>
            <th>የአገልግሎት ክፍል</th>
            <th class="center">ጠቅላላ</th>
            <th class="center">ዋና ክፍል</th>
            <th class="center">ንዑስ ክፍል</th>
            <th class="center">አክቲቭ አገልጋይ</th>
            <th class="center">አባል ብቻ</th>
            <th class="center">🚨 Red Flag</th>
          </tr>
        </thead>
        <tbody>
          ${deptStats
            .map(
              (d) => `
          <tr>
            <td class="bold">${esc(d.label)}</td>
            <td class="center bold">${d.total}</td>
            <td class="center">${d.main}</td>
            <td class="center">${d.sub}</td>
            <td class="center">${d.active}</td>
            <td class="center">${d.regular}</td>
            <td class="center">${d.redFlags > 0 ? `<span class="flag-badge">${d.redFlags}</span>` : "0"}</td>
          </tr>`
            )
            .join("")}
          <tr style="background: #fefce8;">
            <td class="bold">${esc(noDeptStats.label)}</td>
            <td class="center bold">${noDeptStats.total}</td>
            <td class="center">${noDeptStats.main}</td>
            <td class="center">${noDeptStats.sub}</td>
            <td class="center">${noDeptStats.active}</td>
            <td class="center">${noDeptStats.regular}</td>
            <td class="center">${noDeptStats.redFlags > 0 ? `<span class="flag-badge">${noDeptStats.redFlags}</span>` : "0"}</td>
          </tr>
        </tbody>
      </table>
    </div>`
      : "";

    const exportQuery = url.search ? url.search : "";
    const today = new Date().toISOString().split("T")[0];

    const tableRows = rows
      .map((r, idx) => {
        const college =
          r.college === "ሌላ (Other)" && r.college_other
            ? r.college_other
            : r.college.split(" ")[0];
        const serviceDept =
          r.service_dept === "ሌላ (Other)" && r.service_dept_other
            ? r.service_dept_other
            : r.service_dept;
        const challenges = [
          ...(Array.isArray(r.challenges) ? r.challenges : []),
          r.challenge_other ? r.challenge_other : "",
        ]
          .filter(Boolean)
          .join("፣ ");
        const support = [
          ...(Array.isArray(r.support_needs) ? r.support_needs : []),
          r.support_other ? r.support_other : "",
        ]
          .filter(Boolean)
          .join("፣ ");

        if (isLeaderMode) {
          return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="name">${esc(r.full_name)}</td>
          <td>${esc(r.phone_number)}</td>
          <td>${r.telegram_username ? `@${esc(r.telegram_username)}` : "—"}</td>
          <td>
            <div class="bold">${esc(serviceDept)}</div>
            <div class="sub">${esc(r.service_role)}</div>
          </td>
        </tr>`;
        }

        return `
        <tr class="${r.is_red_flag ? "red-row" : ""}">
          <td class="center">${idx + 1}</td>
          <td>
            <div class="name">${esc(r.full_name)}</div>
            <div class="sub">${esc(r.gender)} • ${esc(r.phone_number)}</div>
            ${r.telegram_username ? `<div class="sub">@${esc(r.telegram_username)}</div>` : ""}
          </td>
          <td class="center"><span class="badge">${esc(r.academic_year)}</span></td>
          <td>
            <div class="bold">${esc(r.department)}</div>
            <div class="sub">${esc(college)} • ${esc(r.residence)}${r.dorm_info ? ` (${esc(r.dorm_info)})` : ""}</div>
          </td>
          <td>
            <div class="bold">${esc(serviceDept)}</div>
            <div class="sub">${esc(r.service_role)}</div>
          </td>
          <td>
            <div>${esc(r.cgpa_range)}</div>
            ${r.is_red_flag ? `<div class="flag-badge">🚨 ልዩ ድጋፍ (Red Flag)</div>` : ""}
          </td>
          <td class="small">${esc(challenges) || "—"}</td>
          <td class="small">${esc(support) || "—"}</td>
          <td class="small">${esc(r.can_help_with) || "—"}</td>
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
    @page {
      size: ${isLeaderMode ? "A4 portrait" : "A4 landscape"};
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Ethiopic", Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.4;
    }
    .toolbar {
      max-width: 1200px;
      margin: 0 auto 16px auto;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      background: #0f294a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(15, 41, 74, 0.15);
    }
    .toolbar-actions { display: flex; gap: 10px; }
    .btn {
      border: none;
      padding: 9px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print { background: #eab308; color: #0f294a; }
    .btn-csv { background: #ffffff; color: #0f294a; }
    .sheet {
      max-width: 1200px;
      margin: 0 auto;
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 3px solid #0f294a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .report-header h1 {
      margin: 0;
      font-size: 20px;
      color: #0f294a;
    }
    .report-header p {
      margin: 4px 0 0 0;
      color: #475569;
      font-size: 12px;
    }
    .meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 10px; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 20px; font-weight: 800; color: #0f294a; margin-top: 2px; }
    .kpi.danger { background: #fef2f2; border-color: #fecaca; }
    .kpi.danger .kpi-val { color: #b91c1c; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #0f294a;
      color: #ffffff;
      text-align: left;
      padding: 8px 7px;
      font-weight: 700;
      border: 1px solid #0f294a;
    }
    td {
      padding: 7px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    tr:nth-child(even) { background: #f8fafc; }
    tr.red-row { background: #fff1f2 !important; }
    .center { text-align: center; }
    .name { font-weight: 700; color: #0f294a; font-size: 11.5px; }
    .bold { font-weight: 600; }
    .sub { font-size: 10px; color: #475569; margin-top: 2px; }
    .small { font-size: 10px; color: #334155; }
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 7px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 10px;
      white-space: nowrap;
    }
    .flag-badge {
      display: inline-block;
      margin-top: 4px;
      background: #fee2e2;
      color: #b91c1c;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9.5px;
    }
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
    <div>
      <strong>እንዳ ኢየሱስ ግቢ ጉባኤ — Printable Academic Report</strong>
    </div>
    <div class="toolbar-actions">
      <a class="btn btn-csv" href="/api/admin/export${esc(exportQuery)}">📥 Download Excel (CSV)</a>
      <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
  </div>

  <div class="sheet">
    <div class="report-header">
      <div>
        <h1>እንዳ ኢየሱስ ግቢ ጉባኤ — ${esc(deptLabel)}</h1>
        <p>${
          isLeaderMode
            ? "የክፍል ተጠሪዎች ዝርዝር (ሙሉ ስም፣ ስልክ፣ Telegram እና አገልግሎት)"
            : "የነባር ተማሪዎችና አገልጋዮች የትምህርት ሁኔታ (Status) እና የድጋፍ ሪፖርት"
        }</p>
      </div>
      <div class="meta">
        <div><strong>ቀን (Date):</strong> ${today}</div>
        <div><strong>ጠቅላላ መዝገብ:</strong> ${total} ተማሪዎች</div>
      </div>
    </div>

    <div class="kpi-grid" style="grid-template-columns: repeat(${isLeaderMode ? 4 : 5}, 1fr);">
      <div class="kpi">
        <div class="kpi-label">ጠቅላላ ተመዝጋቢ</div>
        <div class="kpi-val">${total}</div>
      </div>
      ${
        deptParam || isLeaderMode
          ? `<div class="kpi">
        <div class="kpi-label">ዋና ክፍል</div>
        <div class="kpi-val">${mainCount}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">ንዑስ ክፍል</div>
        <div class="kpi-val">${subCount}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">አክቲቭ አገልጋይ</div>
        <div class="kpi-val">${activeCount}</div>
      </div>`
          : `<div class="kpi">
        <div class="kpi-label">GC ተመራቂዎች</div>
        <div class="kpi-val">${gcCount}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">ንቁ አገልጋዮች</div>
        <div class="kpi-val">${servants}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">🎓 ማስጠናት የሚችሉ</div>
        <div class="kpi-val">${tutors}</div>
      </div>`
      }
      ${
        isLeaderMode
          ? ""
          : `<div class="kpi danger">
        <div class="kpi-label">🚨 ልዩ ድጋፍ (Red Flag)</div>
        <div class="kpi-val">${redFlags}</div>
      </div>`
      }
    </div>

    ${isLeaderMode ? "" : deptSummaryHtml}

    <table>
      <thead>
        ${
          isLeaderMode
            ? `<tr>
          <th class="center">#</th>
          <th>ሙሉ ስም (Full Name)</th>
          <th>ስልክ ቁጥር (Phone)</th>
          <th>Telegram</th>
          <th>አገልግሎት (Service Dept & Role)</th>
        </tr>`
            : `<tr>
          <th class="center">#</th>
          <th>ሙሉ ስም እና ስልክ</th>
          <th class="center">Batch</th>
          <th>ዲፓርትመንት / ኮሌጅ / መኖሪያ</th>
          <th>የአገልግሎት ክፍል</th>
          <th>CGPA / ሁኔታ</th>
          <th>የትምህርት እክሎች</th>
          <th>የሚፈልጉት ድጋፍ</th>
          <th>ማገዝ የሚችሉት</th>
        </tr>`
        }
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="${isLeaderMode ? 5 : 9}" class="center">ምንም የተመዘገበ መረጃ የለም።</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { error: "ሪፖርቱን ማዘጋጀት አልተቻለም።" },
      { status: 500 }
    );
  }
}
