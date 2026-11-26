"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import QrCodeImage from "@/components/QrCodeImage";
import {
  ETHIOPIAN_MONTHS,
  formatEthiopianTime,
  toEthiopianDate,
  toGregorianYmd,
} from "@/lib/ethiopianCalendar";
import {
  ALL_WEEKDAYS,
  ETHIOPIAN_WEEKDAYS,
  countScheduledDays,
  formatClassDaysLabel,
  getEthiopianWeekdayName,
  isScheduledClassDay,
  normalizeClassDays,
  shiftYmd,
} from "@/lib/courseTime";

interface CourseRow {
  id: number;
  title: string;
  description: string | null;
  total_days: number;
  start_date: string;
  end_date: string;
  class_time: string;
  grace_minutes: number;
  class_days?: number[];
  enroll_code: string;
  active_session_code: string | null;
  active_session_date: string | null;
  is_active: boolean;
  enrolled_count: number;
  today_present: number;
  today_late: number;
}

interface RosterRow {
  enrollment_id: number;
  full_name: string;
  phone_number: string;
  telegram_username: string | null;
  badge_token: string;
  present_count: number;
  late_count: number;
  today_status: "present" | "late" | null;
}

interface EthDateParts {
  year: number;
  month: number;
  day: number;
}

interface CourseDraft {
  title: string;
  description: string;
  startEth: EthDateParts;
  endEth: EthDateParts;
  totalDays: string;
  classTime: string;
  graceMinutes: string;
  classDays: number[];
}

interface AdminCoursesViewProps {
  authHeaders: Record<string, string>;
  buildAuthQuery: () => string;
  initData?: string;
}

function EthiopianDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EthDateParts;
  onChange: (next: EthDateParts) => void;
}) {
  const maxDays = value.month === 13 ? 6 : 30;
  return (
    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
      <label className="block text-[10px] font-bold text-gibi-navy mb-1.5">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        <select
          value={value.month}
          onChange={(e) => {
            const nextMonth = Number(e.target.value);
            const limit = nextMonth === 13 ? 6 : 30;
            onChange({
              ...value,
              month: nextMonth,
              day: Math.min(value.day, limit),
            });
          }}
          className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          {ETHIOPIAN_MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={Math.min(value.day, maxDays)}
          onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
          className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={value.year}
          onChange={(e) =>
            onChange({ ...value, year: Number(e.target.value) })
          }
          className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          {[2018, 2019, 2020, 2021].map((y) => (
            <option key={y} value={y}>
              {y} ዓ.ም
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function makeInitialDraft(): CourseDraft {
  const start = toEthiopianDate(new Date().toISOString().slice(0, 10));
  const end = toEthiopianDate(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  return {
    title: "",
    description: "",
    startEth: { year: start.year, month: start.month, day: start.day },
    endEth: { year: end.year, month: end.month, day: end.day },
    totalDays: "14",
    classTime: "17:30",
    graceMinutes: "15",
    classDays: [...ALL_WEEKDAYS],
  };
}

function draftFromCourse(course: CourseRow): CourseDraft {
  const s = toEthiopianDate(String(course.start_date).slice(0, 10));
  const e = toEthiopianDate(String(course.end_date).slice(0, 10));
  return {
    title: course.title,
    description: course.description || "",
    startEth: { year: s.year, month: s.month, day: s.day },
    endEth: { year: e.year, month: e.month, day: e.day },
    totalDays: String(course.total_days),
    classTime: course.class_time || "17:30",
    graceMinutes: String(course.grace_minutes ?? 15),
    classDays: normalizeClassDays(course.class_days),
  };
}

export default function AdminCoursesView({
  authHeaders,
  buildAuthQuery,
  initData,
}: AdminCoursesViewProps) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [heldDaysCount, setHeldDaysCount] = useState(0);
  const [today, setToday] = useState("");
  const [sessionDate, setSessionDate] = useState("");

  const [formMode, setFormMode] = useState<"closed" | "create" | "edit">(
    "closed"
  );
  const [draft, setDraft] = useState<CourseDraft>(makeInitialDraft);
  const [savingCourse, setSavingCourse] = useState(false);

  const [qrPanel, setQrPanel] = useState<"none" | "enroll" | "session">("none");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualBadge, setManualBadge] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchCourses = async (
    cid: number | null = selectedCourseId,
    targetDate: string = sessionDate
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cid) params.set("courseId", String(cid));
      if (targetDate) params.set("sessionDate", targetDate);
      const qs = params.toString();
      const res = await fetch(`/api/admin/courses${qs ? `?${qs}` : ""}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load courses.");
      setCourses(data.courses || []);
      setRoster(data.roster || []);
      setHeldDaysCount(data.heldDaysCount || 0);
      setToday(data.today || "");
      if (!targetDate && data.sessionDate) {
        setSessionDate(data.sessionDate);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, sessionDate]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;
  const activeDate = sessionDate || today;

  const computedDays = countScheduledDays(
    toGregorianYmd(
      draft.startEth.year,
      draft.startEth.month,
      draft.startEth.day
    ),
    toGregorianYmd(draft.endEth.year, draft.endEth.month, draft.endEth.day),
    draft.classDays
  );

  const toggleWeekday = (day: number) => {
    const exists = draft.classDays.includes(day);
    if (exists && draft.classDays.length === 1) return; // Require at least 1 day
    const next = exists
      ? draft.classDays.filter((d) => d !== day)
      : [...draft.classDays, day];
    setDraft({ ...draft, classDays: next });
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCourse(true);
    try {
      const startDate = toGregorianYmd(
        draft.startEth.year,
        draft.startEth.month,
        draft.startEth.day
      );
      const endDate = toGregorianYmd(
        draft.endEth.year,
        draft.endEth.month,
        draft.endEth.day
      );

      if (formMode === "edit" && selectedCourseId) {
        const res = await fetch("/api/admin/courses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            courseId: selectedCourseId,
            action: "update_course",
            title: draft.title,
            description: draft.description,
            totalDays: Number(draft.totalDays),
            startDate,
            endDate,
            classTime: draft.classTime,
            graceMinutes: Number(draft.graceMinutes),
            classDays: draft.classDays,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "ኮርሱን ማሻሻል አልተቻለም።");
        setFormMode("closed");
        await fetchCourses(selectedCourseId, activeDate);
      } else {
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            title: draft.title,
            description: draft.description,
            totalDays: Number(draft.totalDays),
            startDate,
            endDate,
            classTime: draft.classTime,
            graceMinutes: Number(draft.graceMinutes),
            classDays: draft.classDays,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "ኮርሱን መፍጠር አልተቻለም።");
        setFormMode("closed");
        setDraft(makeInitialDraft());
        setSelectedCourseId(data.course.id);
        await fetchCourses(data.course.id, activeDate);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleRotateSession = async (courseId: number) => {
    await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ courseId, action: "rotate_session" }),
    });
    await fetchCourses(courseId, activeDate);
  };

  const submitScannedBadge = async (qrText: string) => {
    if (!selectedCourseId || !qrText.trim()) return;
    setScanResult(null);
    try {
      const res = await fetch("/api/admin/courses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          courseId: selectedCourseId,
          qrText,
          sessionDate: activeDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ስካን አልተሳካም።");
      setScanResult(data.message);
      setManualBadge("");
      await fetchCourses(selectedCourseId, activeDate);
    } catch (err) {
      setScanResult((err as Error).message);
    }
  };

  const handleUsherScanQr = () => {
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
        "ካሜራ QR ስካነር የሚሰራው በTelegram App ውስጥ ነው። ከታች በእጅ (Manual) መመዝገብ ይችላሉ።"
      );
      return;
    }

    tg.showScanQrPopup(
      { text: "የተማሪውን የQR መታወቂያ (Badge) ይቃኙ" },
      (qrText: string) => {
        tg.closeScanQrPopup?.();
        void submitScannedBadge(qrText);
        return true;
      }
    );
  };

  const handleManualStatus = async (
    enrollmentId: number,
    status: "present" | "late" | "absent"
  ) => {
    if (!selectedCourseId) return;
    await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        courseId: selectedCourseId,
        action: "manual_attendance",
        enrollmentId,
        status,
        sessionDate: activeDate,
      }),
    });
    await fetchCourses(selectedCourseId, activeDate);
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm("ይህን ኮርስ እና የአቴንዳንስ መረጃውን ማጥፋት ይፈልጋሉ?")) return;
    await fetch(`/api/admin/courses?courseId=${courseId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    setSelectedCourseId(null);
    setFormMode("closed");
    await fetchCourses(null);
  };

  const openCourseExport = (courseId: number, format: "report" | "csv") => {
    const baseQ = buildAuthQuery();
    const sep = baseQ ? "&" : "?";
    const url = `${window.location.origin}/api/admin/courses/report${baseQ}${sep}courseId=${courseId}&format=${format}`;
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { openLink?: (u: string) => void } };
      }
    ).Telegram?.WebApp;
    if (tg?.openLink && initData) {
      tg.openLink(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const activeDateEth = toEthiopianDate(activeDate);
  const activeWeekday = getEthiopianWeekdayName(activeDate);
  const isSelectedDateScheduled = selectedCourse
    ? isScheduledClassDay(activeDate, selectedCourse.class_days)
    : true;

  return (
    <div className="space-y-3">
      {/* Header & Create Button */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm text-gibi-navy flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-gibi-blue" />
            መንፈሳዊ ኮርሶች እና QR አቴንዳንስ
          </h3>
          <p className="text-[11px] text-slate-500">
            ኮርስ ይፍጠሩ፣ ያስተካክሉ፣ ቀናትን ይምረጡ እና በQR ስካን ክትትል ይያዙ
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (formMode === "create") {
              setFormMode("closed");
            } else {
              setDraft(makeInitialDraft());
              setFormMode("create");
            }
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue"
        >
          <Plus className="w-3.5 h-3.5" />
          አዲስ ኮርስ
        </button>
      </div>

      {/* Create / Edit Course Form */}
      {formMode !== "closed" && (
        <form
          onSubmit={handleSaveCourse}
          className="bg-white rounded-2xl border border-gibi-blue/40 p-4 shadow-sm space-y-3"
        >
          <h4 className="font-bold text-xs text-gibi-navy">
            {formMode === "edit"
              ? "✏️ ኮርሱን ማስተካከያ (Edit Course)"
              : "✨ አዲስ መንፈሳዊ ኮርስ መፍጠሪያ"}
          </h4>

          <div className="space-y-2.5">
            <input
              type="text"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="የኮርሱ ስም (ምሳሌ፦ ትምህርተ ሃይማኖት — ደረጃ 1)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
            <input
              type="text"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="አጭር መግለጫ (አማራጭ)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EthiopianDatePicker
                label="📅 መጀመሪያ ቀን (በኢትዮጵያ አቆጣጠር)"
                value={draft.startEth}
                onChange={(startEth) => setDraft({ ...draft, startEth })}
              />
              <EthiopianDatePicker
                label="📅 መጨረሻ ቀን (በኢትዮጵያ አቆጣጠር)"
                value={draft.endEth}
                onChange={(endEth) => setDraft({ ...draft, endEth })}
              />
            </div>

            {/* Weekday Schedule Picker */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-gibi-navy">
                  📆 የትምህርት ቀናት በሳምንት (Scheduled Class Days)
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, classDays: [1, 2, 3, 4] })
                    }
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    ሰኞ–ሐሙስ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, classDays: [1, 2, 3, 4, 5] })
                    }
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    ሰኞ–ዓርብ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, classDays: [6, 0] })}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    ቅዳሜ–እሑድ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, classDays: [...ALL_WEEKDAYS] })
                    }
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    ሁሉም ቀናት
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ETHIOPIAN_WEEKDAYS.map((w) => {
                  const active = draft.classDays.includes(w.day);
                  return (
                    <button
                      key={w.day}
                      type="button"
                      onClick={() => toggleWeekday(w.day)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                        active
                          ? "bg-gibi-navy text-white border-gibi-navy"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {w.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="text-[10px] font-bold text-slate-600">
                    ጠቅላላ ቀናት (መጨመር/መቀነስ ይቻላል)
                  </label>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    required
                    value={draft.totalDays}
                    onChange={(e) =>
                      setDraft({ ...draft, totalDays: e.target.value })
                    }
                    className="w-20 px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, totalDays: String(computedDays) })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-blue-50 text-gibi-blue border border-blue-200 text-[10px] font-bold hover:bg-blue-100"
                    title="በተመረጡት የሳምንት ቀናት መሠረት ጠቅላላ ቀናትን አስላ"
                  >
                    <Sparkles className="w-3 h-3" />
                    አስላ ({computedDays})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  መጀመሪያ ሰዓት ({formatEthiopianTime(draft.classTime)})
                </label>
                <input
                  type="time"
                  required
                  value={draft.classTime}
                  onChange={(e) =>
                    setDraft({ ...draft, classTime: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  የመዘግየት ገደብ (Grace Min)
                </label>
                <input
                  type="number"
                  min={0}
                  value={draft.graceMinutes}
                  onChange={(e) =>
                    setDraft({ ...draft, graceMinutes: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormMode("closed")}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
            >
              ተወው
            </button>
            <button
              type="submit"
              disabled={savingCourse}
              className="px-4 py-1.5 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue disabled:opacity-50"
            >
              {savingCourse
                ? "በማስቀመጥ ላይ..."
                : formMode === "edit"
                  ? "ለውጡን አስቀምጥ"
                  : "ኮርሱን ፍጠር"}
            </button>
          </div>
        </form>
      )}

      {/* Course Selector Chips */}
      {loading && courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
          በመጫን ላይ...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
          ገና ምንም ኮርስ አልተፈጠረም። ከላይ &quot;+ አዲስ ኮርስ&quot; የሚለውን ይጫኑ።
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {courses.map((c) => {
            const isSel = selectedCourseId === c.id;
            const absentToday = Math.max(
              0,
              Number(c.enrolled_count) -
                Number(c.today_present) -
                Number(c.today_late)
            );
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCourseId(isSel ? null : c.id);
                  setQrPanel("none");
                  setScanResult(null);
                  if (formMode === "edit") setFormMode("closed");
                }}
                className={`text-left p-3.5 rounded-2xl border shadow-sm transition space-y-1.5 ${
                  isSel
                    ? "bg-blue-50/70 border-gibi-navy ring-2 ring-gibi-navy/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-gibi-navy">
                    {c.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                    {c.total_days} ቀናት
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {toEthiopianDate(String(c.start_date).slice(0, 10)).formatted}{" "}
                    →{" "}
                    {toEthiopianDate(String(c.end_date).slice(0, 10)).formatted}
                  </span>
                  <span>• {formatEthiopianTime(c.class_time)}</span>
                </p>
                <p className="text-[10px] font-semibold text-gibi-blue">
                  📆 {formatClassDaysLabel(c.class_days)}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                  <span className="inline-flex items-center gap-1 font-bold text-gibi-blue">
                    <Users className="w-3 h-3" /> {c.enrolled_count} ተመዝጋቢ
                  </span>
                  <span className="text-emerald-700 font-bold">
                    ✅ {c.today_present}
                  </span>
                  <span className="text-amber-700 font-bold">
                    ⏰ {c.today_late}
                  </span>
                  <span className="text-red-700 font-bold">
                    ❌ {absentToday}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Course Command Center */}
      {selectedCourse && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-gibi-navy">
                {selectedCourse.title}
              </h4>
              <p className="text-[11px] text-slate-500">
                📆 {formatClassDaysLabel(selectedCourse.class_days)} • ⏰{" "}
                {formatEthiopianTime(selectedCourse.class_time)} • የተካሄዱ ቀናት:{" "}
                {heldDaysCount} / {selectedCourse.total_days}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleUsherScanQr}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Scan Student QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(draftFromCourse(selectedCourse));
                  setFormMode("edit");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-gibi-blue border border-blue-200 text-xs font-bold hover:bg-blue-100"
                title="የኮርሱን ቀናት፣ ሰዓት ወይም ስም አስተካክል"
              >
                <Pencil className="w-3.5 h-3.5" />
                አስተካክል
              </button>
              <button
                type="button"
                onClick={() =>
                  setQrPanel(qrPanel === "enroll" ? "none" : "enroll")
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200"
              >
                <QrCode className="w-3.5 h-3.5" />
                Registration QR
              </button>
              <button
                type="button"
                onClick={() =>
                  setQrPanel(qrPanel === "session" ? "none" : "session")
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200"
              >
                <QrCode className="w-3.5 h-3.5" />
                Daily Class QR
              </button>
              <button
                type="button"
                onClick={() => openCourseExport(selectedCourse.id, "report")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gibi-navy text-white text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                ፕሪንት
              </button>
              <button
                type="button"
                onClick={() => openCourseExport(selectedCourse.id, "csv")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gibi-gold text-gibi-navy text-xs font-bold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCourse(selectedCourse.id)}
                className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                title="ኮርሱን ሰርዝ"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {scanResult && (
            <div className="bg-blue-50 border border-blue-200 text-gibi-navy p-3 rounded-xl text-xs font-bold">
              {scanResult}
            </div>
          )}

          {/* QR Display Panels */}
          {qrPanel === "enroll" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
              <p className="text-xs font-bold text-gibi-navy">
                📱 የኮርስ መመዝገቢያ QR (Course Registration QR)
              </p>
              <QrCodeImage
                value={`${window.location.origin}/?tab=courses&course=${selectedCourse.enroll_code}`}
                size={200}
              />
              <p className="text-[11px] text-slate-600">
                ተማሪዎች ይህን QR ሲቃኙ በቀጥታ በ&quot;{selectedCourse.title}&quot; ይመዘገባሉ።
              </p>
            </div>
          )}

          {qrPanel === "session" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-amber-950">
                  🔄 የዛሬው ({toEthiopianDate(today).formatted}) ክፍል QR (Daily Rotating QR)
                </p>
                <button
                  type="button"
                  onClick={() => handleRotateSession(selectedCourse.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-200 text-amber-950 text-[10px] font-bold hover:bg-amber-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  ኮድ ቀይር
                </button>
              </div>
              <QrCodeImage
                value={`EEGG-SESSION:${selectedCourse.id}:${selectedCourse.active_session_code || ""}`}
                size={210}
              />
              <p className="text-[11px] text-amber-900">
                ተማሪዎች ከስልካቸው &quot;Scan Class QR&quot; ብለው ይህን ሲቃኙ በሰዓቱ/ዘግይቷል ብሎ ይመዘግባቸዋል።
              </p>
            </div>
          )}

          {/* Attendance Date Selector (Today or Past Dates) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <span className="text-slate-500 font-semibold">
                  የአቴንዳንስ ቀን፦{" "}
                </span>
                <span className="font-bold text-gibi-navy">
                  {activeDateEth.formatted} ({activeWeekday})
                </span>
                {activeDate === today && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ዛሬ
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSessionDate(today)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    activeDate === today
                      ? "bg-gibi-navy text-white border-gibi-navy"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  ዛሬ
                </button>
                <button
                  type="button"
                  onClick={() => setSessionDate(shiftYmd(today, -1))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    activeDate === shiftYmd(today, -1)
                      ? "bg-gibi-navy text-white border-gibi-navy"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  ትናንት
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Calendar className="w-3 h-3" />
                  {showDatePicker ? "ደብቅ" : "ሌላ ቀን ምረጥ"}
                </button>
              </div>
            </div>

            {showDatePicker && (
              <EthiopianDatePicker
                label="ያለፈ ቀን ወይም ሌላ ቀን ይምረጡ (ለወረቀት አቴንዳንስ ማስገቢያ/ማስተካከያ)"
                value={{
                  year: activeDateEth.year,
                  month: activeDateEth.month,
                  day: activeDateEth.day,
                }}
                onChange={(next) =>
                  setSessionDate(
                    toGregorianYmd(next.year, next.month, next.day)
                  )
                }
              />
            )}

            {!isSelectedDateScheduled && (
              <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl">
                ⚠️ {activeWeekday} በዚህ ኮርስ መደበኛ የትምህርት ቀናት (
                {formatClassDaysLabel(selectedCourse.class_days)}) ውስጥ አይደለም።
                (ተጨማሪ ክፍለ ጊዜ ካለ ግን በእጅ መመዝገብ ይችላሉ)
              </p>
            )}
          </div>

          {/* Manual Badge Check-in Fallback */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualBadge}
              onChange={(e) => setManualBadge(e.target.value)}
              placeholder="የተማሪ Badge ኮድ (ካለ) በእጅ ያስገቡ..."
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
            />
            <button
              type="button"
              onClick={() => submitScannedBadge(manualBadge)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
            >
              መዝግብ
            </button>
          </div>

          {/* Roster Table */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">
              የተመዘገቡ ተማሪዎች ({roster.length}) — ለ{activeDateEth.formatted}
            </p>
            {roster.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                ገና የተመዘገበ ተማሪ የለም።
              </p>
            ) : (
              roster.map((r, idx) => {
                const present = Number(r.present_count || 0);
                const late = Number(r.late_count || 0);
                const attended = present + late;
                const absent = Math.max(0, heldDaysCount - attended);
                const pct =
                  heldDaysCount > 0
                    ? Math.round((attended / heldDaysCount) * 100)
                    : 100;

                return (
                  <div
                    key={r.enrollment_id}
                    className="border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50"
                  >
                    <div>
                      <p className="text-xs font-bold text-gibi-navy">
                        {idx + 1}. {r.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        📞 {r.phone_number} • ✅ {present} • ⏰ {late} • ❌{" "}
                        {absent} • <b>{pct}%</b>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleManualStatus(r.enrollment_id, "present")
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-0.5 ${
                          r.today_status === "present"
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> በሰዓቱ
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleManualStatus(r.enrollment_id, "late")
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-0.5 ${
                          r.today_status === "late"
                            ? "bg-amber-500 text-white"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <Clock className="w-3 h-3" /> ዘግይቷል
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleManualStatus(r.enrollment_id, "absent")
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-0.5 ${
                          !r.today_status
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <XCircle className="w-3 h-3" /> ቀርቷል
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
