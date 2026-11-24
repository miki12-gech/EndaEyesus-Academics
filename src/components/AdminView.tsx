"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
  Printer,
  FileSpreadsheet,
  KeyRound,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import {
  ACADEMIC_YEARS,
  AcademicProfileRow,
  COLLEGES,
  NO_DEPT_VALUE,
  SERVICE_DEPARTMENTS,
  buildDepartmentStats,
} from "@/lib/constants";

interface AdminViewProps {
  initData?: string;
  adminPin?: string;
}

interface Stats {
  total: number;
  servants: number;
  redFlags: number;
  potentialTutors: number;
  gcCount: number;
}

export default function AdminView({ initData, adminPin }: AdminViewProps) {
  const [records, setRecords] = useState<AcademicProfileRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    servants: 0,
    redFlags: 0,
    potentialTutors: 0,
    gcCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [collegeFilter, setCollegeFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [onlyRedFlag, setOnlyRedFlag] = useState(false);
  const [onlyTutors, setOnlyTutors] = useState(false);
  const [adminSection, setAdminSection] = useState<
    "students" | "departments" | "links"
  >("students");
  const [leaderMode, setLeaderMode] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeLeaderLink, setActiveLeaderLink] = useState<{
    dept: string;
    label: string;
    url: string;
  } | null>(null);
  const [leaderLinkLoading, setLeaderLinkLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const deptSummary = useMemo(() => buildDepartmentStats(records), [records]);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (initData) h["x-telegram-init-data"] = initData;
    if (adminPin) h["x-admin-pin"] = adminPin;
    return h;
  }, [initData, adminPin]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/records", { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "መረጃውን ማምጣት አልተቻለም።");
      }
      setRecords(data.records || []);
      setStats(data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData, adminPin]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (onlyRedFlag && !r.is_red_flag) return false;
      if (onlyTutors && (!r.can_help_with || !r.can_help_with.trim()))
        return false;
      if (yearFilter !== "ALL" && r.academic_year !== yearFilter) return false;
      if (collegeFilter !== "ALL" && r.college !== collegeFilter) return false;
      if (deptFilter !== "ALL" && r.service_dept !== deptFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          r.full_name,
          r.phone_number,
          r.department,
          r.college,
          r.college_other,
          r.service_dept,
          r.service_dept_other,
          r.can_help_with,
          r.additional_notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    records,
    search,
    yearFilter,
    collegeFilter,
    deptFilter,
    onlyRedFlag,
    onlyTutors,
  ]);

  const buildAuthQuery = (extraDept?: string, mode?: string) => {
    const params = new URLSearchParams();
    if (initData) params.set("initData", initData);
    else if (adminPin) params.set("pin", adminPin);
    if (extraDept) params.set("dept", extraDept);
    if (mode) params.set("mode", mode);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const handleExportCsv = async (deptKey?: string, mode?: string) => {
    setExporting(true);
    try {
      const tg = (
        window as unknown as {
          Telegram?: {
            WebApp?: {
              openLink?: (url: string) => void;
            };
          };
        }
      ).Telegram?.WebApp;

      const query = buildAuthQuery(deptKey, mode);
      const exportUrl = `${window.location.origin}/api/admin/export${query}`;

      // Inside Telegram WebApp, open external browser so file download works reliably
      if (tg?.openLink && initData) {
        tg.openLink(exportUrl);
        return;
      }

      const fetchParams = new URLSearchParams();
      if (deptKey) fetchParams.set("dept", deptKey);
      if (mode) fetchParams.set("mode", mode);
      const fetchQs = fetchParams.toString();
      const fetchUrl = `/api/admin/export${fetchQs ? `?${fetchQs}` : ""}`;
      const res = await fetch(fetchUrl, { headers: authHeaders });
      if (!res.ok) throw new Error("CSV ማውረድ አልተቻለም።");
      const csvText = await res.text();

      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const suffix = deptKey ? `-${deptKey}` : "";
      const filename = `enda-eyesus-academic${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 500);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = (deptKey?: string, mode?: string) => {
    const reportUrl = `${window.location.origin}/api/admin/report${buildAuthQuery(deptKey, mode)}`;
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            openLink?: (url: string) => void;
          };
        };
      }
    ).Telegram?.WebApp;

    if (tg?.openLink && initData) {
      tg.openLink(reportUrl);
    } else {
      window.open(reportUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleGenerateLeaderLink = async (
    deptKey: string,
    label: string,
    regenerate = false
  ) => {
    setLeaderLinkLoading(true);
    setCopiedLink(false);
    try {
      const res = await fetch("/api/admin/leaders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ department: deptKey, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ሊንክ መፍጠር አልተቻለም።");
      const url = `${window.location.origin}/leader?token=${data.access_token}`;
      setActiveLeaderLink({ dept: deptKey, label, url });
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
      } catch {
        // Clipboard may be blocked in some WebViews; user can copy from input box
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLeaderLinkLoading(false);
    }
  };

  const handleRevokeLeaderLink = async (deptKey: string) => {
    setLeaderLinkLoading(true);
    try {
      const res = await fetch(
        `/api/admin/leaders?department=${encodeURIComponent(deptKey)}`,
        { method: "DELETE", headers: authHeaders }
      );
      if (!res.ok) throw new Error("ሊንኩን ማጥፋት አልተቻለም።");
      setActiveLeaderLink(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLeaderLinkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gibi-navy text-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-gibi-gold" />
          <div>
            <h2 className="font-bold text-base">የአካዳሚክ ክፍል አድሚን ዳሽቦርድ</h2>
            <p className="text-xs text-slate-300">
              እንዳ ኢየሱስ ግቢ ጉባኤ — ነባር ተማሪዎችና አገልጋዮች
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            አድስ
          </button>
          <button
            onClick={() => handlePrint()}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition disabled:opacity-50"
            title="እንደ ሪፖርት አትም ወይም ወደ PDF ቀይር"
          >
            <Printer className="w-3.5 h-3.5" />
            ፕሪንት (Print / PDF)
          </button>
          <button
            onClick={() => handleExportCsv()}
            disabled={exporting || records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gibi-gold text-gibi-navy hover:bg-yellow-400 text-xs font-bold transition disabled:opacity-50 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? "በማውረድ ላይ..." : "Excel (CSV)"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>ጠቅላላ ተመዝጋቢ</span>
            <Users className="w-4 h-4 text-gibi-blue" />
          </div>
          <p className="text-2xl font-extrabold text-gibi-navy">{stats.total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">GC ተመራቂዎች: {stats.gcCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>አገልጋዮች</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{stats.servants}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">በክፍላት የሚያገለግሉ</p>
        </div>

        <button
          onClick={() => {
            setOnlyRedFlag((v) => !v);
            setOnlyTutors(false);
            setAdminSection("students");
          }}
          className={`text-left p-3.5 rounded-2xl border shadow-sm transition ${
            onlyRedFlag
              ? "bg-red-600 text-white border-red-600"
              : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={onlyRedFlag ? "text-red-100" : "text-red-700"}>
              🚨 ልዩ ድጋፍ (Red Flag)
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold">{stats.redFlags}</p>
          <p className={`text-[11px] mt-0.5 ${onlyRedFlag ? "text-red-100" : "text-red-600"}`}>
            {onlyRedFlag ? "ማጣሪያው በርቷል ✓" : "ለማጣራት ይጫኑ"}
          </p>
        </button>

        <button
          onClick={() => {
            setOnlyTutors((v) => !v);
            setOnlyRedFlag(false);
            setAdminSection("students");
          }}
          className={`text-left p-3.5 rounded-2xl border shadow-sm transition ${
            onlyTutors
              ? "bg-gibi-blue text-white border-gibi-blue"
              : "bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={onlyTutors ? "text-blue-100" : "text-amber-800"}>
              በጎ ፈቃደኛ አስጠኚዎች
            </span>
            <HeartHandshake className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold">{stats.potentialTutors}</p>
          <p className={`text-[11px] mt-0.5 ${onlyTutors ? "text-blue-100" : "text-amber-700"}`}>
            {onlyTutors ? "ማጣሪያው በርቷል ✓" : "ለማጣራት ይጫኑ"}
          </p>
        </button>
      </div>

      {/* Section Navigation (Clean 3-Tab Switcher) */}
      <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setAdminSection("students")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            adminSection === "students"
              ? "bg-gibi-navy text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>ተማሪዎች ({records.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSection("departments")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            adminSection === "departments"
              ? "bg-gibi-navy text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>ክፍላት</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSection("links")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            adminSection === "links"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
          }`}
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>መዳረሻ ሊንክ</span>
        </button>
      </div>

      {/* SECTION: Leader Access Links (Shown ONLY when 'መዳረሻ ሊንክ' is clicked) */}
      {adminSection === "links" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div>
            <h3 className="font-bold text-sm text-gibi-navy">
              🔑 የክፍል ተጠሪዎች መዳረሻ ሊንክ (Leader Access Links)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ለእያንዳንዱ ክፍል ተጠሪ የራሱን የአባላት ዝርዝር (ስም፣ ስልክ፣ Telegram እና አገልግሎት ብቻ) የሚያይበት ሚስጥራዊ ሊንክ ይስጡ።
            </p>
          </div>

          {activeLeaderLink && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  🔑 የተመረጠው ሊንክ — {activeLeaderLink.label}
                </span>
                <span className="text-[10px] text-emerald-800">
                  (ሚስጥራዊ CGPA እና Red Flag አያሳይም)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={activeLeaderLink.url}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800 font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(activeLeaderLink.url);
                    setCopiedLink(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      ተቀድቷል
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      ቅዳ (Copy)
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleGenerateLeaderLink(
                      activeLeaderLink.dept,
                      activeLeaderLink.label,
                      true
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100"
                >
                  <RefreshCw className="w-3 h-3" />
                  ቀይር
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeLeaderLink(activeLeaderLink.dept)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100"
                >
                  <Trash2 className="w-3 h-3" />
                  ሰርዝ
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deptSummary.departments.map((d) => (
              <div
                key={d.dept}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70"
              >
                <div>
                  <p className="text-xs font-bold text-gibi-navy">{d.label}</p>
                  <p className="text-[11px] text-slate-500">
                    {d.total} አባላት (ዋና: {d.main} • ንዑስ: {d.sub} • አክቲቭ: {d.active})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateLeaderLink(d.dept, d.label)}
                  disabled={leaderLinkLoading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold shrink-0 disabled:opacity-40"
                >
                  <KeyRound className="w-3 h-3" />
                  ሊንክ ስጥ
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/70">
              <div>
                <p className="text-xs font-bold text-amber-950">
                  ⚠️ ክፍል የሌላቸው (አባል ብቻ)
                </p>
                <p className="text-[11px] text-amber-800">
                  {deptSummary.noDept.total} ተማሪዎች
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleGenerateLeaderLink("NO_DEPT", "ክፍል የሌላቸው")
                }
                disabled={leaderLinkLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold shrink-0 disabled:opacity-40"
              >
                <KeyRound className="w-3 h-3" />
                ሊንክ ስጥ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Department Breakdown & Per-Department Print */}
      {adminSection === "departments" && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-xs sm:text-sm text-gibi-navy">
            📊 የየክፍላቱ አገልጋዮች እና ክፍል የሌላቸው (Department Breakdown)
          </h3>
          <p className="text-[11px] text-slate-500">
            ለእያንዳንዱ ክፍል ዋና/ንዑስ/አክቲቭ አገልጋዮችን ይዩ እና ለየክፍሉ ፕሪንት ያድርጉ
          </p>
        </div>

        <div className="p-3.5 space-y-3">
            {/* Mode Toggle: Class Leader Roster vs Full Academic Report */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[11px] font-bold text-slate-700">
                ለክፍል ተጠሪዎች የሚሰጥ የፕሪንት/CSV ዓይነት፦
              </span>
              <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setLeaderMode(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    leaderMode
                      ? "bg-gibi-navy text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📋 ለክፍል ተጠሪ (ስም፣ ስልክ፣ Telegram፣ አገልግሎት)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderMode(false)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    !leaderMode
                      ? "bg-gibi-navy text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📊 ሙሉ የአካዳሚክ መረጃ
                </button>
              </div>
            </div>

            {/* Highlighted Banner for Students Without Any Department */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950">
                    ⚠️ ክፍል የሌላቸው (አባል ብቻ)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-200 text-amber-950">
                    {deptSummary.noDept.total} ተማሪዎች
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  በየትኛውም የአገልግሎት ክፍል ያልተመደቡ ነባር ተማሪዎች
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeptFilter(NO_DEPT_VALUE);
                    setAdminSection("students");
                  }}
                  disabled={deptSummary.noDept.total === 0}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-40 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100"
                >
                  እነማን ናቸው? (ዝርዝር እይ)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePrint("NO_DEPT", leaderMode ? "leader" : undefined)
                  }
                  disabled={deptSummary.noDept.total === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gibi-navy text-white hover:bg-gibi-blue text-[11px] font-bold transition disabled:opacity-40"
                >
                  <Printer className="w-3 h-3" />
                  ፕሪንት
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleExportCsv("NO_DEPT", leaderMode ? "leader" : undefined)
                  }
                  disabled={deptSummary.noDept.total === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition disabled:opacity-40"
                >
                  <Download className="w-3 h-3" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleGenerateLeaderLink("NO_DEPT", "ክፍል የሌላቸው")
                  }
                  disabled={leaderLinkLoading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition disabled:opacity-40"
                >
                  <KeyRound className="w-3 h-3" />
                  መዳረሻ ሊንክ
                </button>
              </div>
            </div>

            {activeLeaderLink && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-950">
                    🔑 የክፍል ተጠሪ ሚስጥራዊ ሊንክ — {activeLeaderLink.label}
                  </span>
                  <span className="text-[10px] text-emerald-800">
                    (ስም፣ ስልክ፣ Telegram እና አገልግሎት ብቻ ያሳያል — ሚስጥራዊ CGPA አያሳይም)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={activeLeaderLink.url}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(activeLeaderLink.url);
                      setCopiedLink(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        ተቀድቷል
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        ቅዳ (Copy)
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateLeaderLink(
                        activeLeaderLink.dept,
                        activeLeaderLink.label,
                        true
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100"
                    title="አዲስ ሊንክ ቀይር (የቀድሞውን ያጠፋል)"
                  >
                    <RefreshCw className="w-3 h-3" />
                    ቀይር
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeLeaderLink(activeLeaderLink.dept)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100"
                    title="መዳረሻውን ሰርዝ"
                  >
                    <Trash2 className="w-3 h-3" />
                    ሰርዝ
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Department Cards (no horizontal scroll needed) */}
            <div className="sm:hidden space-y-2">
              {deptSummary.departments.map((d) => {
                const isSelected = deptFilter === d.dept;
                return (
                  <div
                    key={d.dept}
                    className={`rounded-xl border p-3 space-y-2 ${
                      isSelected
                        ? "bg-blue-50/70 border-gibi-blue"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-gibi-navy">
                        {d.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-gibi-navy text-white">
                        ጠቅላላ: {d.total}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span>ዋና: <b>{d.main}</b></span>
                      <span>•</span>
                      <span>ንዑስ: <b>{d.sub}</b></span>
                      <span>•</span>
                      <span className="text-emerald-700">አክቲቭ: <b>{d.active}</b></span>
                      {d.redFlags > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-700 font-bold">🚨 {d.redFlags}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDeptFilter(d.dept);
                          setAdminSection("students");
                        }}
                        disabled={d.total === 0}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-40 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        እይ
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePrint(d.dept, leaderMode ? "leader" : undefined)
                        }
                        disabled={d.total === 0}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gibi-navy text-white text-[11px] font-bold disabled:opacity-40"
                      >
                        <Printer className="w-3 h-3" />
                        ፕሪንት
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleExportCsv(d.dept, leaderMode ? "leader" : undefined)
                        }
                        disabled={d.total === 0}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-bold disabled:opacity-40"
                      >
                        <Download className="w-3 h-3" />
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateLeaderLink(d.dept, d.label)}
                        disabled={leaderLinkLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-40"
                      >
                        <KeyRound className="w-3 h-3" />
                        መዳረሻ ሊንክ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Per-Department Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-bold">የአገልግሎት ክፍል</th>
                    <th className="text-center py-2 px-1.5 font-bold">ጠቅላላ</th>
                    <th className="text-center py-2 px-1.5 font-bold">ዋና</th>
                    <th className="text-center py-2 px-1.5 font-bold">ንዑስ</th>
                    <th className="text-center py-2 px-1.5 font-bold">አክቲቭ</th>
                    <th className="text-center py-2 px-1.5 font-bold">🚨</th>
                    <th className="text-right py-2 px-2 font-bold">ፕሪንት / ዝርዝር</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptSummary.departments.map((d) => {
                    const isSelected = deptFilter === d.dept;
                    return (
                      <tr
                        key={d.dept}
                        className={isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"}
                      >
                        <td className="py-2 px-2 font-semibold text-gibi-navy">
                          {d.label}
                        </td>
                        <td className="py-2 px-1.5 text-center font-extrabold text-gibi-navy">
                          {d.total}
                        </td>
                        <td className="py-2 px-1.5 text-center text-slate-700">
                          {d.main}
                        </td>
                        <td className="py-2 px-1.5 text-center text-slate-700">
                          {d.sub}
                        </td>
                        <td className="py-2 px-1.5 text-center text-emerald-700 font-semibold">
                          {d.active}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {d.redFlags > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                              {d.redFlags}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDeptFilter(d.dept);
                                setAdminSection("students");
                              }}
                              disabled={d.total === 0}
                              className="px-2 py-1 rounded-md text-[10px] font-bold transition disabled:opacity-40 bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                              እይ
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handlePrint(
                                  d.dept,
                                  leaderMode ? "leader" : undefined
                                )
                              }
                              disabled={d.total === 0}
                              title={`${d.label} — ፕሪንት (Print / PDF)`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gibi-navy text-white hover:bg-gibi-blue text-[10px] font-bold transition disabled:opacity-40"
                            >
                              <Printer className="w-3 h-3" />
                              ፕሪንት
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleExportCsv(
                                  d.dept,
                                  leaderMode ? "leader" : undefined
                                )
                              }
                              disabled={d.total === 0}
                              title={`${d.label} — Excel (CSV)`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-900 hover:bg-amber-200 text-[10px] font-bold transition disabled:opacity-40"
                            >
                              <Download className="w-3 h-3" />
                              CSV
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleGenerateLeaderLink(d.dept, d.label)
                              }
                              disabled={leaderLinkLoading}
                              title={`${d.label} — ለክፍል ተጠሪ ሊንክ ስጥ`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold transition disabled:opacity-40"
                            >
                              <KeyRound className="w-3 h-3" />
                              ሊንክ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
      </div>
      )}

      {/* SECTION: Students (Department Quick Chips + Search + Student List) */}
      {adminSection === "students" && (
      <div className="space-y-3">
        {/* Quick Department Chips */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600">
              በክፍል ይምረጡ (Filter by Department):
            </span>
            {deptFilter !== "ALL" && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handlePrint(
                      deptFilter === NO_DEPT_VALUE ? "NO_DEPT" : deptFilter,
                      leaderMode ? "leader" : undefined
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gibi-navy text-white text-[10px] font-bold"
                >
                  <Printer className="w-3 h-3" />
                  የተመረጠውን ፕሪንት
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDeptFilter("ALL")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                deptFilter === "ALL"
                  ? "bg-gibi-navy text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ሁሉም ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setDeptFilter(NO_DEPT_VALUE)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                deptFilter === NO_DEPT_VALUE
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              ክፍል የሌላቸው ({deptSummary.noDept.total})
            </button>
            {deptSummary.departments.map((d) => (
              <button
                key={d.dept}
                type="button"
                onClick={() => setDeptFilter(d.dept)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                  deptFilter === d.dept
                    ? "bg-gibi-blue text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d.label} ({d.total})
              </button>
            ))}
          </div>
        </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="በስም፣ ስልክ፣ ዲፓርትመንት ወይም ኮርስ ይፈልጉ..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-blue/30"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
          >
            <option value="ALL">ሁሉም የትምህርት ዓመታት</option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
          >
            <option value="ALL">ሁሉም የአገልግሎት ክፍላት</option>
            {SERVICE_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
          >
            <option value="ALL">ሁሉም ኮሌጆች</option>
            {COLLEGES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error / Loading / Records */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          መረጃዎችን በማምጣት ላይ...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
          በተመረጠው ማጣሪያ ምንም የተመዘገበ መረጃ አልተገኘም።
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-500 px-1">
            ውጤት፦ <b>{filteredRecords.length}</b> ተማሪዎች/አገልጋዮች
          </p>
          {filteredRecords.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                  r.is_red_flag ? "border-red-300" : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full p-3.5 text-left flex items-start justify-between gap-2 hover:bg-slate-50/60"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm text-gibi-navy">
                        {r.full_name}
                      </span>
                      {r.is_red_flag && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          🚨 ልዩ ድጋፍ
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-gibi-blue">
                        {r.academic_year.split(" ")[0]} {r.academic_year.split(" ")[1] || ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {r.department} •{" "}
                      {r.service_dept === "ሌላ (Other)" && r.service_dept_other
                        ? r.service_dept_other
                        : r.service_dept}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      📞 {r.phone_number} • 📊 {r.cgpa_range}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70 text-xs space-y-2 text-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div>
                        <b>ኮሌጅ፦</b>{" "}
                        {r.college === "ሌላ (Other)" && r.college_other
                          ? r.college_other
                          : r.college}
                      </div>
                      <div>
                        <b>የአገልግሎት ደረጃ፦</b> {r.service_role}
                      </div>
                      <div>
                        <b>መኖሪያ፦</b> {r.residence}{" "}
                        {r.dorm_info ? `(${r.dorm_info})` : ""}
                      </div>
                      <div>
                        <b>Telegram፦</b>{" "}
                        {r.telegram_username
                          ? `@${r.telegram_username}`
                          : r.telegram_id}
                      </div>
                    </div>

                    {Array.isArray(r.challenges) && r.challenges.length > 0 && (
                      <div>
                        <b>የትምህርት እክሎች፦</b>{" "}
                        <span className="text-red-700">
                          {r.challenges.join("፣ ")}
                          {r.challenge_other ? ` (${r.challenge_other})` : ""}
                        </span>
                      </div>
                    )}

                    {Array.isArray(r.support_needs) &&
                      r.support_needs.length > 0 && (
                        <div>
                          <b>የሚፈልጉት ድጋፍ፦</b>{" "}
                          {r.support_needs.join("፣ ")}
                          {r.support_other ? ` (${r.support_other})` : ""}
                        </div>
                      )}

                    {r.can_help_with && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-900">
                        <b>🎓 ማስጠናት/ማገዝ የሚችሉት፦</b> {r.can_help_with}
                      </div>
                    )}

                    {r.additional_notes && (
                      <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-amber-950">
                        <b>💬 ተጨማሪ ሐሳብ/ጥያቄ፦</b> {r.additional_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
