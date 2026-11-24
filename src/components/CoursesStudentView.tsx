"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  ScanLine,
  Sparkles,
  XCircle,
} from "lucide-react";
import QrCodeImage from "@/components/QrCodeImage";
import {
  formatEthiopianTime,
  toEthiopianDate,
} from "@/lib/ethiopianCalendar";

interface SpiritualCourse {
  id: number;
  title: string;
  description: string | null;
  total_days: number;
  start_date: string;
  end_date: string;
  class_time: string;
  grace_minutes: number;
  enroll_code: string;
  held_days: number;
}

interface Enrollment {
  id: number;
  course_id: number;
  full_name: string;
  phone_number: string;
  badge_token: string;
  present_count: number;
  late_count: number;
  today_status: "present" | "late" | null;
}

interface CoursesStudentViewProps {
  initData: string;
  defaultFullName?: string;
  defaultPhone?: string;
  highlightEnrollCode?: string;
}

export default function CoursesStudentView({
  initData,
  defaultFullName = "",
  defaultPhone = "",
  highlightEnrollCode = "",
}: CoursesStudentViewProps) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<SpiritualCourse[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [today, setToday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(
    null
  );
  const [nameInput, setNameInput] = useState(defaultFullName);
  const [phoneInput, setPhoneInput] = useState(defaultPhone);
  const [showBadgeCourseId, setShowBadgeCourseId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (defaultFullName && !nameInput) setNameInput(defaultFullName);
    if (defaultPhone && !phoneInput) setPhoneInput(defaultPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFullName, defaultPhone]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses", {
        headers: initData ? { "x-telegram-init-data": initData } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ኮርሶችን ማምጣት አልተቻለም።");
      setCourses(data.courses || []);
      setEnrollments(data.enrollments || []);
      setToday(data.today || "");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  const handleEnroll = async (courseId: number) => {
    setEnrollingCourseId(courseId);
    setError(null);
    setBannerMsg(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { "x-telegram-init-data": initData } : {}),
        },
        body: JSON.stringify({
          action: "enroll",
          courseId,
          fullName: nameInput,
          phoneNumber: phoneInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "መመዝገብ አልተቻለም።");
      setBannerMsg(data.message);
      setShowBadgeCourseId(courseId);
      await fetchCourses();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleSelfScan = () => {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            showScanQrPopup?: (
              params: { text?: string },
              cb: (text: string) => boolean | void
            ) => void;
            closeScanQrPopup?: () => void;
          };
        };
      }
    ).Telegram?.WebApp;

    if (!tg?.showScanQrPopup) {
      alert(
        "QR ስካነር የሚሰራው በTelegram App ውስጥ ብቻ ነው። ከሌለዎት የግል QR መታወቂያዎን (My QR Badge) ለበር ተቆጣጣሪው ያሳዩ!"
      );
      return;
    }

    tg.showScanQrPopup(
      { text: "የዛሬውን የመንፈሳዊ ኮርስ QR ኮድ ይቃኙ" },
      (qrText: string) => {
        tg.closeScanQrPopup?.();
        void (async () => {
          setError(null);
          setBannerMsg(null);
          try {
            const res = await fetch("/api/courses", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(initData ? { "x-telegram-init-data": initData } : {}),
              },
              body: JSON.stringify({ action: "self_checkin", qrText }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Check-in አልተሳካም።");
            setBannerMsg(data.message);
            await fetchCourses();
          } catch (err) {
            setError((err as Error).message);
          }
        })();
        return true;
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Action Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm text-gibi-navy flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-gibi-blue" />
            መንፈሳዊ ኮርሶች እና QR አቴንዳንስ
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            ይመዝገቡ፣ የግል QR መታወቂያዎን ያግኙ እና ዕለታዊ ክትትልዎን ይከታተሉ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCourses}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="አድስ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleSelfScan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue shadow-sm"
          >
            <ScanLine className="w-4 h-4 text-gibi-gold" />
            Scan Class QR
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl text-xs font-bold">
          {bannerMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-500 border border-slate-200">
          ኮርሶችን በማምጣት ላይ...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-500 border border-slate-200">
          በአሁኑ ጊዜ ክፍት የሆነ መንፈሳዊ ኮርስ የለም።
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => {
            const enrollment = enrollments.find((e) => e.course_id === c.id);
            const isHighlighted =
              highlightEnrollCode &&
              c.enroll_code.toUpperCase() === highlightEnrollCode.toUpperCase();
            const startStr = String(c.start_date).slice(0, 10);
            const endStr = String(c.end_date).slice(0, 10);
            const held = Number(c.held_days || 0);
            const present = Number(enrollment?.present_count || 0);
            const late = Number(enrollment?.late_count || 0);
            const attended = present + late;
            const absent = Math.max(0, held - attended);
            const pct = held > 0 ? Math.round((attended / held) * 100) : 100;
            const showBadge = showBadgeCourseId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border p-4 shadow-sm space-y-3 ${
                  isHighlighted
                    ? "border-gibi-gold ring-2 ring-gibi-gold/30"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-gibi-navy">
                        {c.title}
                      </h3>
                      {enrollment && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ ተመዝግበዋል
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-slate-600 mt-1">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-gibi-blue">
                    {c.total_days} ቀናት
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gibi-blue" />
                    {toEthiopianDate(startStr).formatted} →{" "}
                    {toEthiopianDate(endStr).formatted}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {formatEthiopianTime(c.class_time)} (+{c.grace_minutes} ደቂቃ)
                  </span>
                </div>

                {enrollment ? (
                  <div className="space-y-3">
                    {/* Today's Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                      <div className="text-xs">
                        <span className="text-slate-500">
                          የዛሬ ({toEthiopianDate(today).formatted}) ሁኔታ፦{" "}
                        </span>
                        {enrollment.today_status === "present" ? (
                          <span className="font-bold text-emerald-700">
                            ✅ በሰዓቱ ተገኝተዋል (Present)
                          </span>
                        ) : enrollment.today_status === "late" ? (
                          <span className="font-bold text-amber-700">
                            ⏰ ዘግይተው ተመዝግበዋል (Late)
                          </span>
                        ) : (
                          <span className="font-bold text-slate-600">
                            ⏳ ገና አልተመዘገበም
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowBadgeCourseId(showBadge ? null : c.id)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue"
                      >
                        <QrCode className="w-3.5 h-3.5 text-gibi-gold" />
                        {showBadge ? "QR ደብቅ" : "የኔ QR መታወቂያ"}
                      </button>
                    </div>

                    {/* Personal QR Badge */}
                    {showBadge && (
                      <div className="bg-gradient-to-br from-gibi-navy to-blue-900 text-white rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
                        <p className="text-xs font-bold text-amber-200 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          የግል የአቴንዳንስ መታወቂያ (Personal QR Badge)
                        </p>
                        <QrCodeImage
                          value={`EEGG-BADGE:${enrollment.badge_token}`}
                          size={190}
                        />
                        <p className="text-xs font-bold">
                          {enrollment.full_name}
                        </p>
                        <p className="text-[10px] text-blue-200">
                          በበር ላይ ለአስተባባሪው ያሳዩ (Screenshot ማድረግ ይችላሉ)
                        </p>
                      </div>
                    )}

                    {/* Attendance Summary */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                        <p className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> በሰዓቱ
                        </p>
                        <p className="text-base font-extrabold text-emerald-800">
                          {present}
                        </p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2">
                        <p className="text-[10px] text-amber-700 font-semibold flex items-center justify-center gap-0.5">
                          <Clock className="w-3 h-3" /> ዘግይቷል
                        </p>
                        <p className="text-base font-extrabold text-amber-800">
                          {late}
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-2">
                        <p className="text-[10px] text-red-700 font-semibold flex items-center justify-center gap-0.5">
                          <XCircle className="w-3 h-3" /> ቀርቷል
                        </p>
                        <p className="text-base font-extrabold text-red-800">
                          {absent}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-2">
                        <p className="text-[10px] text-gibi-blue font-semibold">
                          ክትትል %
                        </p>
                        <p className="text-base font-extrabold text-gibi-navy">
                          {pct}%
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                    <p className="text-xs font-bold text-gibi-navy">
                      ለዚህ ኮርስ ለመመዝገብ መረጃዎን ያረጋግጡ፦
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="ሙሉ ስም (ከነ አባት)..."
                        className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      />
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="ስልክ ቁጥር (09...)..."
                        className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEnroll(c.id)}
                      disabled={enrollingCourseId === c.id}
                      className="w-full py-2.5 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue transition disabled:opacity-50"
                    >
                      {enrollingCourseId === c.id
                        ? "በመመዝገብ ላይ..."
                        : "✨ በዚህ ኮርስ ተመዝገብ (Enroll & Get QR)"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
