import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import {
  isTelegramAdmin,
  verifyTelegramInitData,
} from "@/lib/telegramAuth";
import {
  AcademicProfilePayload,
  RED_FLAG_CGPA,
  RED_FLAG_CHALLENGES,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

function computeRedFlag(cgpaRange: string, challenges: string[]): boolean {
  if (cgpaRange === RED_FLAG_CGPA) return true;
  return challenges.some((c) => RED_FLAG_CHALLENGES.has(c));
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const initData = req.headers.get("x-telegram-init-data") || "";
    const tgUser = verifyTelegramInitData(initData);

    if (!tgUser) {
      return NextResponse.json({
        authenticated: false,
        isAdmin: false,
        profile: null,
      });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT * FROM academic_profiles
      WHERE telegram_id = ${String(tgUser.id)}
      LIMIT 1
    `;

    return NextResponse.json({
      authenticated: true,
      telegramUser: tgUser,
      isAdmin: isTelegramAdmin(tgUser.id),
      profile: rows[0] || null,
    });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json(
      { error: "መረጃውን ማንበብ አልተቻለም። እባክዎ እንደገና ይሞክሩ።" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = (await req.json()) as AcademicProfilePayload;

    // Validate required fields
    if (
      !body.fullName?.trim() ||
      !body.phoneNumber?.trim() ||
      !body.academicYear ||
      !body.college ||
      !body.department?.trim() ||
      !body.serviceRole ||
      !body.serviceDept ||
      !body.cgpaRange
    ) {
      return NextResponse.json(
        { error: "እባክዎ ሁሉንም አስፈላጊ (*) ሳጥኖች ይሙሉ።" },
        { status: 400 }
      );
    }

    const initData = req.headers.get("x-telegram-init-data") || "";
    const tgUser = verifyTelegramInitData(initData);

    // If opened inside Telegram Mini App, tie strictly to verified Telegram ID.
    // If opened in a regular browser fallback, use normalized phone number key.
    const normalizedPhone = body.phoneNumber.replace(/[^0-9+]/g, "");
    const telegramId = tgUser ? String(tgUser.id) : `web:${normalizedPhone}`;
    const telegramUsername = tgUser?.username || null;

    const challenges = Array.isArray(body.challenges) ? body.challenges : [];
    const supportNeeds = Array.isArray(body.supportNeeds)
      ? body.supportNeeds
      : [];
    const isRedFlag = computeRedFlag(body.cgpaRange, challenges);

    const sql = getSql();
    const rows = await sql`
      INSERT INTO academic_profiles (
        telegram_id,
        telegram_username,
        full_name,
        phone_number,
        gender,
        academic_year,
        college,
        college_other,
        department,
        residence,
        dorm_info,
        service_role,
        service_dept,
        service_dept_other,
        cgpa_range,
        challenges,
        challenge_other,
        support_needs,
        support_other,
        can_help_with,
        additional_notes,
        is_red_flag,
        updated_at
      )
      VALUES (
        ${telegramId},
        ${telegramUsername},
        ${body.fullName.trim()},
        ${body.phoneNumber.trim()},
        ${body.gender || "ወንድ"},
        ${body.academicYear},
        ${body.college},
        ${body.collegeOther?.trim() || null},
        ${body.department.trim()},
        ${body.residence || "ግቢ ውስጥ (ዶርም)"},
        ${body.dormInfo?.trim() || null},
        ${body.serviceRole},
        ${body.serviceDept},
        ${body.serviceDeptOther?.trim() || null},
        ${body.cgpaRange},
        ${JSON.stringify(challenges)}::jsonb,
        ${body.challengeOther?.trim() || null},
        ${JSON.stringify(supportNeeds)}::jsonb,
        ${body.supportOther?.trim() || null},
        ${body.canHelpWith?.trim() || null},
        ${body.additionalNotes?.trim() || null},
        ${isRedFlag},
        NOW()
      )
      ON CONFLICT (telegram_id)
      DO UPDATE SET
        telegram_username = COALESCE(EXCLUDED.telegram_username, academic_profiles.telegram_username),
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        gender = EXCLUDED.gender,
        academic_year = EXCLUDED.academic_year,
        college = EXCLUDED.college,
        college_other = EXCLUDED.college_other,
        department = EXCLUDED.department,
        residence = EXCLUDED.residence,
        dorm_info = EXCLUDED.dorm_info,
        service_role = EXCLUDED.service_role,
        service_dept = EXCLUDED.service_dept,
        service_dept_other = EXCLUDED.service_dept_other,
        cgpa_range = EXCLUDED.cgpa_range,
        challenges = EXCLUDED.challenges,
        challenge_other = EXCLUDED.challenge_other,
        support_needs = EXCLUDED.support_needs,
        support_other = EXCLUDED.support_other,
        can_help_with = EXCLUDED.can_help_with,
        additional_notes = EXCLUDED.additional_notes,
        is_red_flag = EXCLUDED.is_red_flag,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({
      ok: true,
      profile: rows[0],
      message: "መረጃዎ በተሳካ ሁኔታ ተመዝግቧል! እግዚአብሔር ትምህርትዎን ይባርክ።",
    });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json(
      { error: "መረጃውን ማስቀመጥ አልተቻለም። እባክዎ ቆይተው እንደገና ይሞክሩ።" },
      { status: 500 }
    );
  }
}
