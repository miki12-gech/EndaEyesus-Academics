"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HeartHandshake,
  Lock,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import {
  ACADEMIC_CHALLENGES,
  ACADEMIC_YEARS,
  AcademicProfilePayload,
  AcademicProfileRow,
  CGPA_RANGES,
  COLLEGES,
  SERVICE_DEPARTMENTS,
  SERVICE_ROLES,
  SUPPORT_NEEDS,
} from "@/lib/constants";
import AdminView from "@/components/AdminView";
import CoursesStudentView from "@/components/CoursesStudentView";
import StudentProfileView from "@/components/StudentProfileView";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        HapticFeedback?: {
          notificationOccurred: (type: "success" | "warning" | "error") => void;
        };
      };
    };
  }
}

const INITIAL_FORM: AcademicProfilePayload = {
  fullName: "",
  phoneNumber: "",
  gender: "ወንድ",
  academicYear: "",
  college: "",
  collegeOther: "",
  department: "",
  residence: "ግቢ ውስጥ (ዶርም)",
  dormInfo: "",
  serviceRole: "",
  serviceDept: "",
  serviceDeptOther: "",
  cgpaRange: "",
  challenges: [],
  challengeOther: "",
  supportNeeds: [],
  supportOther: "",
  canHelpWith: "",
  additionalNotes: "",
};

export default function AcademicMiniAppPage() {
  const [initData, setInitData] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"portal" | "courses" | "admin">(
    "portal"
  );
  const [highlightCourseCode, setHighlightCourseCode] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [profileUpdatedAt, setProfileUpdatedAt] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<AcademicProfilePayload>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    let rawInitData = "";

    if (tg) {
      tg.ready();
      tg.expand();
      rawInitData = tg.initData || "";
      setInitData(rawInitData);

      const u = tg.initDataUnsafe?.user;
      if (u) {
        const tgName = [u.first_name, u.last_name].filter(Boolean).join(" ");
        setForm((prev) => ({
          ...prev,
          fullName: prev.fullName || tgName,
        }));
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = urlParams.get("tab");
    const courseCodeParam = urlParams.get("course");
    if (courseCodeParam) {
      setHighlightCourseCode(courseCodeParam);
      setActiveTab("courses");
    } else if (requestedTab === "courses") {
      setActiveTab("courses");
    }

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          headers: rawInitData ? { "x-telegram-init-data": rawInitData } : {},
        });
        const data = await res.json();
        if (data.isAdmin) {
          setIsAdmin(true);
          if (requestedTab === "admin") {
            setActiveTab("admin");
          }
        }
        if (data.profile) {
          const p = data.profile as AcademicProfileRow;
          setAlreadySubmitted(true);
          setIsEditingProfile(false);
          setTelegramUsername(p.telegram_username || "");
          setProfileUpdatedAt(p.updated_at || "");
          setForm({
            fullName: p.full_name || "",
            phoneNumber: p.phone_number || "",
            gender: p.gender || "ወንድ",
            academicYear: p.academic_year || "",
            college: p.college || "",
            collegeOther: p.college_other || "",
            department: p.department || "",
            residence: p.residence || "ግቢ ውስጥ (ዶርም)",
            dormInfo: p.dorm_info || "",
            serviceRole: p.service_role || "",
            serviceDept: p.service_dept || "",
            serviceDeptOther: p.service_dept_other || "",
            cgpaRange: p.cgpa_range || "",
            challenges: Array.isArray(p.challenges) ? p.challenges : [],
            challengeOther: p.challenge_other || "",
            supportNeeds: Array.isArray(p.support_needs) ? p.support_needs : [],
            supportOther: p.support_other || "",
            canHelpWith: p.can_help_with || "",
            additionalNotes: p.additional_notes || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const toggleMultiSelect = (
    field: "challenges" | "supportNeeds",
    value: string
  ) => {
    setForm((prev) => {
      const current = prev[field];
      const exists = current.includes(value);
      let next: string[];

      if (field === "challenges" && value === "ምንም ችግር የለብኝም") {
        next = exists ? [] : [value];
      } else {
        const filtered =
          field === "challenges"
            ? current.filter((item) => item !== "ምንም ችግር የለብኝም")
            : current;
        next = exists
          ? filtered.filter((item) => item !== value)
          : [...filtered, value];
      }
      return { ...prev, [field]: next };
    });
  };

  const validateStep = (targetStep: number): boolean => {
    setErrorMsg(null);
    if (targetStep === 1) {
      if (!form.fullName.trim() || form.fullName.trim().length < 3) {
        setErrorMsg("እባክዎ ሙሉ ስምዎን በትክክል ያስገቡ።");
        return false;
      }
      if (!form.phoneNumber.trim() || form.phoneNumber.trim().length < 9) {
        setErrorMsg("እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ።");
        return false;
      }
      if (!form.academicYear) {
        setErrorMsg("እባክዎ የትምህርት ዓመትዎን ይምረጡ።");
        return false;
      }
      if (!form.college) {
        setErrorMsg("እባክዎ ኮሌጅዎን ይምረጡ።");
        return false;
      }
      if (form.college === "ሌላ (Other)" && !form.collegeOther?.trim()) {
        setErrorMsg("እባክዎ የኮሌጅዎን ስም ይጻፉ።");
        return false;
      }
      if (!form.department.trim()) {
        setErrorMsg("እባክዎ ዲፓርትመንትዎን ይጻፉ።");
        return false;
      }
    }

    if (targetStep === 2) {
      if (!form.serviceRole) {
        setErrorMsg("እባክዎ በግቢ ጉባኤው ያለዎትን የአገልግሎት ሁኔታ ይምረጡ።");
        return false;
      }
      if (!form.serviceDept) {
        setErrorMsg("እባክዎ የሚያገለግሉበትን ክፍል ይምረጡ።");
        return false;
      }
      if (
        form.serviceDept === "ሌላ (Other)" &&
        !form.serviceDeptOther?.trim()
      ) {
        setErrorMsg("እባክዎ የሚያገለግሉበትን ክፍል ስም ይጻፉ።");
        return false;
      }
    }

    if (targetStep === 3) {
      if (!form.cgpaRange) {
        setErrorMsg("እባክዎ የውጤት (CGPA) ደረጃዎን ይምረጡ።");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { "x-telegram-init-data": initData } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "መረጃውን ማስቀመጥ አልተቻለም።");
      }

      setAlreadySubmitted(true);
      setIsEditingProfile(false);
      setProfileUpdatedAt(new Date().toISOString());
      setSuccessMsg(
        data.message || "መረጃዎ በተሳካ ሁኔታ ተመዝግቧል! እግዚአብሔር ትምህርትዎን ይባርክ።"
      );
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMsg((err as Error).message);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto px-3.5 py-4 pb-12">
      {/* Top Banner */}
      <header className="bg-gradient-to-br from-gibi-navy via-gibi-blue to-blue-900 text-white rounded-3xl p-5 shadow-md mb-4 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-gibi-gold/15 rounded-full blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-full text-amber-200">
              እንዳ ኢየሱስ ግቢ ጉባኤ
            </span>
            {alreadySubmitted && activeTab === "portal" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/25 text-emerald-200 px-2.5 py-1 rounded-full">
                <UserCheck className="w-3.5 h-3.5" />
                ተመዝግበዋል
              </span>
            )}
          </div>
          <h1 className="text-lg font-extrabold tracking-tight leading-snug">
            የነባር ተማሪዎችና አገልጋዮች የአካዳሚክ ፖርታል
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            ከ2ኛ ዓመት ጀምሮ ያሉ ተማሪዎች የትምህርት ሁኔታና የድጋፍ መመዝገቢያ
          </p>
        </div>
      </header>

      {/* Navigation Switcher: Academic Form, Spiritual Courses, and Admin */}
      <div
        className={`grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"} gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm mb-4`}
      >
        <button
          type="button"
          onClick={() => setActiveTab("portal")}
          className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "portal"
              ? "bg-gibi-navy text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {alreadySubmitted ? (
            <>
              <User className="w-4 h-4 shrink-0" />
              <span>ፕሮፋይሌ</span>
            </>
          ) : (
            <>
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>መመዝገቢያ</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "courses"
              ? "bg-gibi-blue text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>መንፈሳዊ ኮርስ</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "admin"
                ? "bg-gibi-gold text-gibi-navy shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>አድሚን</span>
          </button>
        )}
      </div>

      {activeTab === "admin" && isAdmin ? (
        <AdminView initData={initData} />
      ) : activeTab === "courses" ? (
        <CoursesStudentView
          initData={initData}
          defaultFullName={form.fullName}
          defaultPhone={form.phoneNumber}
          highlightEnrollCode={highlightCourseCode}
        />
      ) : loadingProfile ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-gibi-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600">ፖርታሉን በመክፈት ላይ...</p>
        </div>
      ) : successMsg ? (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gibi-navy">
              በተሳካ ሁኔታ ተመዝግቧል!
            </h2>
            <p className="text-sm text-slate-600 mt-1">{successMsg}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-xs text-gibi-navy text-left space-y-1">
            <p className="font-bold">📌 ማስታወሻ፦</p>
            <p>
              የአካዳሚክ ክፍሉ መረጃዎን በጥብቅ ሚስጥር ይዞ እንደፍላጎትዎ የጥናት ቡድን፣ የቲቶሪያል፣
              የExit Exam ወይም የምክር ድጋፍ ያመቻቻል።
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSuccessMsg(null);
                setIsEditingProfile(false);
              }}
              className="w-full py-3 rounded-2xl bg-gibi-navy text-white font-bold text-sm hover:bg-gibi-blue transition"
            >
              👤 ፕሮፋይሌን እይ (View Profile)
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg(null);
                setIsEditingProfile(true);
                setStep(1);
              }}
              className="w-full py-3 rounded-2xl bg-slate-100 text-gibi-navy font-bold text-sm hover:bg-slate-200 transition"
            >
              ✏️ መልሼ ለማስተካከል
            </button>
          </div>
        </div>
      ) : alreadySubmitted && !isEditingProfile ? (
        <StudentProfileView
          profile={form}
          telegramUsername={telegramUsername}
          updatedAt={profileUpdatedAt}
          onEdit={() => {
            setStep(1);
            setIsEditingProfile(true);
          }}
          onOpenCourses={() => setActiveTab("courses")}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {alreadySubmitted && isEditingProfile && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3.5 py-2.5 rounded-2xl">
              <span className="text-xs font-bold text-gibi-navy">
                ✏️ መረጃዎን በማስተካከል ላይ ነዎት
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setErrorMsg(null);
                }}
                className="text-xs font-bold text-gibi-blue hover:underline"
              >
                ← ወደ ፕሮፋይሌ ተመለስ
              </button>
            </div>
          )}
          {/* Progress Stepper */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { num: 1, label: "1. የትምህርት መረጃ" },
                { num: 2, label: "2. አገልግሎት" },
                { num: 3, label: "3. ስታተስና ድጋፍ" },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step || validateStep(step)) {
                      setStep(s.num as 1 | 2 | 3);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold transition ${
                    step === s.num
                      ? "bg-gibi-blue text-white shadow-sm"
                      : step > s.num
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium p-3.5 rounded-2xl">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* STEP 1: Basic & Academic Info */}
          {step === 1 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <GraduationCap className="w-5 h-5 text-gibi-blue" />
                <h2 className="font-bold text-sm text-gibi-navy">
                  ክፍል 1፦ መሠረታዊና የትምህርት መረጃ
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ስም(ከነ አባት) *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  placeholder="ምሳሌ፦ አበበ ከበደ"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ስልክ ቁጥር *
                  </label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumber: e.target.value })
                    }
                    placeholder="09... ወይም 07..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ጾታ *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["ወንድ", "ሴት"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, gender: g })}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                          form.gender === g
                            ? "bg-gibi-blue text-white border-gibi-blue"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  የትምህርት ዓመት (Batch) *
                </label>
                <select
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm({ ...form, academicYear: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
                >
                  <option value="">— ይምረጡ —</option>
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ኮሌጅ / ኢንስቲትዩት *
                </label>
                <select
                  value={form.college}
                  onChange={(e) =>
                    setForm({ ...form, college: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
                >
                  <option value="">— ኮሌጅ ይምረጡ —</option>
                  {COLLEGES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {form.college === "ሌላ (Other)" && (
                  <input
                    type="text"
                    value={form.collegeOther}
                    onChange={(e) =>
                      setForm({ ...form, collegeOther: e.target.value })
                    }
                    placeholder="የኮሌጅዎን ስም እዚህ ይጻፉ..."
                    className="mt-2 w-full px-3.5 py-2.5 text-sm border border-amber-300 bg-amber-50/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-gold"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ዲፓርትመንት (Department) *
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder="ምሳሌ፦ Software Engineering, Civil, Biology, Law..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    የመኖሪያ ሁኔታ
                  </label>
                  <select
                    value={form.residence}
                    onChange={(e) =>
                      setForm({ ...form, residence: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="ግቢ ውስጥ (ዶርም)">ግቢ ውስጥ (ዶርም)</option>
                    <option value="ከግቢ ውጭ (ተከራይቶ/ቤተሰብ)">
                      ከግቢ ውጭ (ተከራይቶ/ቤተሰብ)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ዶርም / ብሎክ (አማራጭ)
                  </label>
                  <input
                    type="text"
                    value={form.dormInfo}
                    onChange={(e) =>
                      setForm({ ...form, dormInfo: e.target.value })
                    }
                    placeholder="ምሳሌ፦ Block 12, Room 05"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Gibi Gubae Service Info */}
          {step === 2 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <HeartHandshake className="w-5 h-5 text-gibi-blue" />
                <h2 className="font-bold text-sm text-gibi-navy">
                  ክፍል 2፦ የእንዳ ኢየሱስ ግቢ ጉባኤ አገልግሎት ሁኔታ
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  በግቢ ጉባኤው ያለዎት የአገልግሎት ደረጃ *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {SERVICE_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm({ ...form, serviceRole: role })}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left border transition ${
                        form.serviceRole === role
                          ? "bg-gibi-blue text-white border-gibi-blue shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {form.serviceRole === role ? "● " : "○ "}
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  የሚያገለግሉበት ክፍል (ክፍላት) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setForm({ ...form, serviceDept: dept })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition ${
                        form.serviceDept === dept
                          ? "bg-gibi-navy text-gibi-gold border-gibi-navy shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>

                {form.serviceDept === "ሌላ (Other)" && (
                  <input
                    type="text"
                    value={form.serviceDeptOther}
                    onChange={(e) =>
                      setForm({ ...form, serviceDeptOther: e.target.value })
                    }
                    placeholder="የሚያገለግሉበትን ክፍል ስም ይጻፉ..."
                    className="mt-2.5 w-full px-3.5 py-2.5 text-sm border border-amber-300 bg-amber-50/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-gold"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Confidential Academic Status & Support */}
          {step === 3 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Lock className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="font-bold text-sm text-gibi-navy">
                    ክፍል 3፦ ሚስጥራዊ የትምህርት ስታተስና ድጋፍ
                  </h2>
                  <p className="text-[11px] text-emerald-700">
                    🔒 ይህ መረጃ በአካዳሚክ ዋና ክፍል ብቻ በጥብቅ ሚስጥር የሚያዝ ነው።
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  አጠቃላይ የውጤት ደረጃ (CGPA) *
                </label>
                <select
                  value={form.cgpaRange}
                  onChange={(e) =>
                    setForm({ ...form, cgpaRange: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
                >
                  <option value="">— የውጤት ደረጃ ይምረጡ —</option>
                  {CGPA_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  አሁን ያለብዎት የትምህርት እክል (ከአንድ በላይ መምረጥ ይቻላል)
                </label>
                <div className="space-y-1.5">
                  {ACADEMIC_CHALLENGES.map((item) => {
                    const checked = form.challenges.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleMultiSelect("challenges", item)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-left border transition flex items-center gap-2 ${
                          checked
                            ? "bg-blue-50 border-gibi-blue text-gibi-navy font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 ${
                            checked
                              ? "bg-gibi-blue border-gibi-blue text-white"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          {checked ? "✓" : ""}
                        </span>
                        {item}
                      </button>
                    );
                  })}
                </div>
                {form.challenges.includes("ሌላ (Other)") && (
                  <input
                    type="text"
                    value={form.challengeOther}
                    onChange={(e) =>
                      setForm({ ...form, challengeOther: e.target.value })
                    }
                    placeholder="ሌላ የትምህርት እክል ካለ እዚህ ይጻፉ..."
                    className="mt-2 w-full px-3.5 py-2.5 text-sm border border-amber-300 bg-amber-50/40 rounded-xl"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ከአካዳሚክ ክፍሉ የሚፈልጉት ድጋፍ (ከአንድ በላይ መምረጥ ይቻላል)
                </label>
                <div className="space-y-1.5">
                  {SUPPORT_NEEDS.map((item) => {
                    const checked = form.supportNeeds.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleMultiSelect("supportNeeds", item)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-left border transition flex items-center gap-2 ${
                          checked
                            ? "bg-amber-50 border-gibi-gold text-gibi-navy font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 ${
                            checked
                              ? "bg-gibi-gold border-gibi-gold text-gibi-navy"
                              : "bg-white border-slate-300"
                          }`}
                        >
                          {checked ? "✓" : ""}
                        </span>
                        {item}
                      </button>
                    );
                  })}
                </div>
                {form.supportNeeds.includes("ሌላ (Other)") && (
                  <input
                    type="text"
                    value={form.supportOther}
                    onChange={(e) =>
                      setForm({ ...form, supportOther: e.target.value })
                    }
                    placeholder="ሌላ የሚፈልጉት ድጋፍ ካለ እዚህ ይጻፉ..."
                    className="mt-2 w-full px-3.5 py-2.5 text-sm border border-amber-300 bg-amber-50/40 rounded-xl"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  🎓 ሌሎችን ማገዝ የሚችሉት (አማራጭ)
                </label>
                <input
                  type="text"
                  value={form.canHelpWith}
                  onChange={(e) =>
                    setForm({ ...form, canHelpWith: e.target.value })
                  }
                  placeholder="ለታናናሾች ማስጠናት የሚችሉት ኮርስ ወይም ሶፍትዌር (ምሳሌ፦ C++, Applied Maths, SPSS)"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  💬 ሌላ ጥያቄ ወይም ተጨማሪ ሐሳብ ካለ (አማራጭ)
                </label>
                <textarea
                  rows={3}
                  value={form.additionalNotes}
                  onChange={(e) =>
                    setForm({ ...form, additionalNotes: e.target.value })
                  }
                  placeholder="ሌላ የሚያሳስብዎት ጉዳይ፣ ጥያቄ ወይም ለአካዳሚክ ክፍሉ የሚሰጡት ሐሳብ ካለ እዚህ ይጻፉ..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2.5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep((s) => (s - 1) as 1 | 2 | 3);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                ተመለስ
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3.5 rounded-2xl bg-gibi-navy text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-gibi-blue shadow-sm transition"
              >
                ቀጣይ (Next)
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 rounded-2xl bg-gibi-gold text-gibi-navy font-extrabold text-sm flex items-center justify-center gap-1.5 hover:bg-yellow-400 shadow-md transition disabled:opacity-60"
              >
                {submitting
                  ? "በመመዝገብ ላይ..."
                  : alreadySubmitted
                  ? "✅ መረጃዬን አድስ (Update)"
                  : "✅ መረጃዬን መዝግብ (Submit)"}
              </button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
