"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import QrCodeImage from "@/components/QrCodeImage";
import { formatTime12h } from "@/lib/courseTime";

interface CourseRow {
  id: number;
  title: string;
  description: string | null;
  total_days: number;
  start_date: string;
  end_date: string;
  class_time: string;
  grace_minutes: number;
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

interface AdminCoursesViewProps {
  authHeaders: Record<string, string>;
  buildAuthQuery: () => string;
  initData?: string;
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

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalDays, setTotalDays] = useState("14");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [classTime, setClassTime] = useState("17:30");
  const [graceMinutes, setGraceMinutes] = useState("15");
  const [creating, setCreating] = useState(false);

  const [qrPanel, setQrPanel] = useState<"none" | "enroll" | "session">("none");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualBadge, setManualBadge] = useState("");

  const fetchCourses = async (cid: number | null = selectedCourseId) => {
    setLoading(true);
    try {
      const qs = cid ? `?courseId=${cid}` : "";
      const res = await fetch(`/api/admin/courses${qs}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load courses.");
      setCourses(data.courses || []);
      setRoster(data.roster || []);
      setHeldDaysCount(data.heldDaysCount || 0);
      setToday(data.today || "");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title,
          description,
          totalDays: Number(totalDays),
          startDate,
          endDate,
          classTime,
          graceMinutes: Number(graceMinutes),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ኮርሱን መፍጠር አልተቻለም።");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setSelectedCourseId(data.course.id);
      await fetchCourses(data.course.id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRotateSession = async (courseId: number) => {
    await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ courseId, action: "rotate_session" }),
    });
    await fetchCourses(courseId);
  };

  const submitScannedBadge = async (qrText: string) => {
    if (!selectedCourseId || !qrText.trim()) return;
    setScanResult(null);
    try {
      const res = await fetch("/api/admin/courses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ courseId: selectedCourseId, qrText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ስካን አልተሳካም።");
      setScanResult(data.message);
      setManualBadge("");
      await fetchCourses(selectedCourseId);
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
      }),
    });
    await fetchCourses(selectedCourseId);
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm("ይህን ኮርስ እና የአቴንዳንስ መረጃውን ማጥፋት ይፈልጋሉ?")) return;
    await fetch(`/api/admin/courses?courseId=${courseId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    setSelectedCourseId(null);
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
            ኮርስ ይፍጠሩ፣ Registration QR ያጋሩ እና በQR ስካን ክትትል ይያዙ
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue"
        >
          <Plus className="w-3.5 h-3.5" />
          አዲስ ኮርስ
        </button>
      </div>

      {/* Create Course Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateCourse}
          className="bg-white rounded-2xl border border-gibi-blue/40 p-4 shadow-sm space-y-3"
        >
          <h4 className="font-bold text-xs text-gibi-navy">
            ✨ አዲስ መንፈሳዊ ኮርስ መፍጠሪያ
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="የኮርሱ ስም (ምሳሌ፦ ትምህርተ ሃይማኖት — ደረጃ 1)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="አጭር መግለጫ (አማራጭ)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  መጀመሪያ ቀን
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  መጨረሻ ቀን
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  ጠቅላላ ቀናት
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  መጀመሪያ ሰዓት
                </label>
                <input
                  type="time"
                  required
                  value={classTime}
                  onChange={(e) => setClassTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                የመዘግየት ገደብ (Grace Minutes — ከዚህ በኋላ &quot;Late&quot; ይላል)
              </label>
              <input
                type="number"
                min={0}
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(e.target.value)}
                className="w-32 px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
            >
              ተወው
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-1.5 rounded-xl bg-gibi-navy text-white text-xs font-bold hover:bg-gibi-blue disabled:opacity-50"
            >
              {creating ? "በመፍጠር ላይ..." : "ኮርሱን ፍጠር"}
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
                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {String(c.start_date).slice(0, 10)} →{" "}
                    {String(c.end_date).slice(0, 10)}
                  </span>
                  <span>• {formatTime12h(c.class_time)}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
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
                የዛሬ ቀን ({today}) • የተካሄዱ ቀናት: {heldDaysCount} /{" "}
                {selectedCourse.total_days}
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
                  🔄 የዛሬው ({today}) ክፍል QR (Daily Rotating QR)
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
              የተመዘገቡ ተማሪዎች ({roster.length})
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
