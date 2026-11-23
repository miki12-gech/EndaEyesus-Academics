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
} from "lucide-react";
import {
  ACADEMIC_YEARS,
  AcademicProfileRow,
  COLLEGES,
  SERVICE_DEPARTMENTS,
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export", { headers: authHeaders });
      if (!res.ok) throw new Error("CSV ማውረድ አልተቻለም።");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enda-eyesus-academic-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExporting(false);
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
            onClick={handleExportCsv}
            disabled={exporting || records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gibi-gold text-gibi-navy hover:bg-yellow-400 text-xs font-bold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
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
  );
}
