"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import AdminView from "@/components/AdminView";

export default function StandaloneAdminPage() {
  const [pinInput, setPinInput] = useState("");
  const [activePin, setActivePin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/records", {
        headers: { "x-admin-pin": pinInput.trim() },
      });
      if (!res.ok) {
        throw new Error("የገባው የይለፍ ቃል (Admin PIN) ትክክል አይደለም።");
      }
      setActivePin(pinInput.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  if (activePin) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-6">
        <AdminView adminPin={activePin} />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4"
      >
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gibi-navy text-gibi-gold flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-extrabold text-gibi-navy">
            የአካዳሚክ ክፍል አድሚን መግቢያ
          </h1>
          <p className="text-xs text-slate-500">
            እንዳ ኢየሱስ ግቢ ጉባኤ — ከኮምፒውተር ለመጠቀም
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-xs p-3 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Admin PIN (ADMIN_DASHBOARD_PIN)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="የአድሚን የይለፍ ቃል ያስገቡ..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gibi-blue/40"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={checking}
          className="w-full py-3 rounded-xl bg-gibi-navy text-white font-bold text-sm hover:bg-gibi-blue transition disabled:opacity-60"
        >
          {checking ? "በማረጋገጥ ላይ..." : "ግባ (Login)"}
        </button>
      </form>
    </main>
  );
}
