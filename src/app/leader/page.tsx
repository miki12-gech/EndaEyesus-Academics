"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";

interface SafeMember {
  id: number;
  full_name: string;
  phone_number: string;
  telegram_username: string | null;
  service_role: string;
  service_dept: string;
  service_dept_other: string | null;
}

interface LeaderStats {
  total: number;
  main: number;
  sub: number;
  active: number;
}

function LeaderPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deptLabel, setDeptLabel] = useState("");
  const [members, setMembers] = useState<SafeMember[]>([]);
  const [stats, setStats] = useState<LeaderStats>({
    total: 0,
    main: 0,
    sub: 0,
    active: 0,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const fetchMembers = async () => {
    if (!token) {
      setError("የመግቢያ ሊንኩ ትክክል አይደለም (Missing token)። እባክዎ አድሚኑን ይጠይቁ።");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/leader/members?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "መረጃውን ማምጣት አልተቻለም።");
      }
      setDeptLabel(data.departmentLabel || "");
      setMembers(data.members || []);
      setStats(data.stats || { total: 0, main: 0, sub: 0, active: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter === "main" && !m.service_role.includes("ዋና ክፍል"))
        return false;
      if (roleFilter === "sub" && !m.service_role.includes("ንዑስ ክፍል"))
        return false;
      if (roleFilter === "active" && !m.service_role.includes("አገልጋይ"))
        return false;
      if (roleFilter === "regular" && !m.service_role.includes("አባል ብቻ"))
        return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          m.full_name,
          m.phone_number,
          m.telegram_username,
          m.service_role,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, search, roleFilter]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-red-200 shadow-sm text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-base font-extrabold text-red-800">
            መግባት አልተቻለም
          </h1>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-3.5 py-5 pb-12 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gibi-navy text-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <Users className="w-6 h-6 text-gibi-gold shrink-0" />
          <div>
            <h1 className="font-bold text-base">
              {deptLabel || "የክፍል ተጠሪ ፖርታል"}
            </h1>
            <p className="text-xs text-slate-300">
              እንዳ ኢየሱስ ግቢ ጉባኤ — የክፍል አባላትና አገልጋዮች ዝርዝር
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchMembers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            አድስ
          </button>
          <a
            href={`/api/leader/members?token=${encodeURIComponent(token)}&format=report`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            ፕሪንት (Print / PDF)
          </a>
          <a
            href={`/api/leader/members?token=${encodeURIComponent(token)}&format=csv`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gibi-gold text-gibi-navy hover:bg-yellow-400 text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel (CSV)
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-semibold">ጠቅላላ</p>
          <p className="text-2xl font-extrabold text-gibi-navy">{stats.total}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-semibold">ዋና ክፍል</p>
          <p className="text-2xl font-extrabold text-gibi-blue">{stats.main}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-semibold">ንዑስ ክፍል</p>
          <p className="text-2xl font-extrabold text-slate-700">{stats.sub}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-semibold">አክቲቭ አገልጋይ</p>
          <p className="text-2xl font-extrabold text-emerald-700">{stats.active}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="በስም፣ ስልክ ወይም Telegram ይፈልጉ..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-blue/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50"
        >
          <option value="ALL">ሁሉም የአገልግሎት ደረጃ</option>
          <option value="main">ዋና ክፍል</option>
          <option value="sub">ንዑስ ክፍል</option>
          <option value="active">አገልጋይ (Active Servant)</option>
          <option value="regular">አባል ብቻ</option>
        </select>
      </div>

      {/* Member List */}
      <div className="text-xs text-slate-500 px-1">
        የሚታዩት: <b>{filtered.length}</b> / {members.length}
      </div>

      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
          መረጃውን በማምጣት ላይ...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
          ምንም የተገኘ አባል የለም።
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m, idx) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-gibi-navy">
                    {m.full_name}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {m.service_dept === "ሌላ (Other)" && m.service_dept_other
                    ? m.service_dept_other
                    : m.service_dept}{" "}
                  • <span className="font-semibold text-gibi-blue">{m.service_role}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${m.phone_number}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {m.phone_number}
                </a>
                {m.telegram_username && (
                  <a
                    href={`https://t.me/${m.telegram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-gibi-blue border border-blue-200 text-xs font-bold hover:bg-blue-100"
                  >
                    <Send className="w-3.5 h-3.5" />@{m.telegram_username}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function LeaderPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          በመጫን ላይ...
        </div>
      }
    >
      <LeaderPortalContent />
    </Suspense>
  );
}
