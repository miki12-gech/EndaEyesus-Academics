"use client";

import React from "react";
import {
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Pencil,
  Phone,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AcademicProfilePayload } from "@/lib/constants";
import { toEthiopianDate } from "@/lib/ethiopianCalendar";

interface StudentProfileViewProps {
  profile: AcademicProfilePayload;
  telegramUsername?: string;
  updatedAt?: string;
  onEdit: () => void;
  onOpenCourses: () => void;
}

export default function StudentProfileView({
  profile,
  telegramUsername,
  updatedAt,
  onEdit,
  onOpenCourses,
}: StudentProfileViewProps) {
  const initial = (profile.fullName || "ተ").trim().charAt(0).toUpperCase();
  const collegeDisplay =
    profile.college === "ሌላ (Other)" && profile.collegeOther
      ? profile.collegeOther
      : profile.college;
  const serviceDeptDisplay =
    profile.serviceDept === "ሌላ (Other)" && profile.serviceDeptOther
      ? profile.serviceDeptOther
      : profile.serviceDept;

  const updatedEth = updatedAt
    ? toEthiopianDate(String(updatedAt).slice(0, 10)).formatted
    : "";

  return (
    <div className="space-y-3.5">
      {/* Identity Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gibi-navy to-gibi-blue text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm">
              {initial}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-extrabold text-base text-gibi-navy">
                  {profile.fullName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <UserCheck className="w-3 h-3" />
                  ተመዝግበዋል
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {profile.phoneNumber}
                </span>
                <span>• {profile.gender}</span>
                {telegramUsername && <span>• @{telegramUsername}</span>}
              </p>
            </div>
          </div>
        </div>

        {updatedEth && (
          <p className="text-[11px] text-slate-400">
            መጨረሻ የተሻሻለው፦ {updatedEth}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onEdit}
            className="w-full py-2.5 px-3 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue transition inline-flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            መረጃዬን አስተካክል (Edit Profile)
          </button>
          <button
            type="button"
            onClick={onOpenCourses}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-50 text-gibi-blue border border-blue-200 text-xs font-bold hover:bg-blue-100 transition inline-flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            መንፈሳዊ ኮርስ እና QR
          </button>
        </div>
      </div>

      {/* Academic & Service Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-2">
          <h3 className="font-bold text-xs text-gibi-navy flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <GraduationCap className="w-4 h-4 text-gibi-blue" />
            የትምህርት መረጃ
          </h3>
          <div className="text-xs space-y-1.5 text-slate-700">
            <p>
              <span className="text-slate-500">Batch፦ </span>
              <span className="font-bold text-gibi-blue">
                {profile.academicYear}
              </span>
            </p>
            <p>
              <span className="text-slate-500">ኮሌጅ፦ </span>
              <span className="font-semibold">{collegeDisplay}</span>
            </p>
            <p>
              <span className="text-slate-500">ዲፓርትመንት፦ </span>
              <span className="font-semibold">{profile.department}</span>
            </p>
            <p>
              <span className="text-slate-500">መኖሪያ፦ </span>
              <span className="font-semibold">
                {profile.residence}
                {profile.dormInfo ? ` (${profile.dormInfo})` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-2">
          <h3 className="font-bold text-xs text-gibi-navy flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            የግቢ ጉባኤ አገልግሎት
          </h3>
          <div className="text-xs space-y-1.5 text-slate-700">
            <p>
              <span className="text-slate-500">የአገልግሎት ክፍል፦ </span>
              <span className="font-bold text-gibi-navy">
                {serviceDeptDisplay}
              </span>
            </p>
            <p>
              <span className="text-slate-500">የአገልግሎት ደረጃ፦ </span>
              <span className="font-semibold">{profile.serviceRole}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Private Academic Status & Support */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-xs text-gibi-navy flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gibi-gold" />
            የትምህርት ሁኔታና ድጋፍ (ሚስጥራዊ)
          </h3>
          <span className="text-[10px] text-slate-400">ለአካዳሚክ ክፍል ብቻ</span>
        </div>

        <div className="text-xs space-y-2 text-slate-700">
          <p>
            <span className="text-slate-500">CGPA፦ </span>
            <span className="font-bold">{profile.cgpaRange}</span>
          </p>

          {profile.challenges.length > 0 && (
            <div>
              <p className="text-slate-500 mb-1">የትምህርት እክሎች፦</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.challenges.map((ch) => (
                  <span
                    key={ch}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                  >
                    {ch}
                  </span>
                ))}
                {profile.challengeOther && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                    {profile.challengeOther}
                  </span>
                )}
              </div>
            </div>
          )}

          {profile.supportNeeds.length > 0 && (
            <div>
              <p className="text-slate-500 mb-1">የሚፈልጉት ድጋፍ፦</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.supportNeeds.map((sup) => (
                  <span
                    key={sup}
                    className="px-2 py-0.5 rounded-lg bg-blue-50 text-gibi-blue text-[11px] font-medium"
                  >
                    {sup}
                  </span>
                ))}
                {profile.supportOther && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-gibi-blue text-[11px]">
                    {profile.supportOther}
                  </span>
                )}
              </div>
            </div>
          )}

          {profile.canHelpWith && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-900">
              <b>🎓 ማገዝ/ማስጠናት የሚችሉት፦</b> {profile.canHelpWith}
            </div>
          )}

          {profile.additionalNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-950">
              <b>💬 ተጨማሪ ሐሳብ፦</b> {profile.additionalNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
