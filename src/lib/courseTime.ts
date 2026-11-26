/**
 * Helpers for Ethiopia Local Time (UTC+3), attendance status, and weekday schedules.
 */

export const ETHIOPIAN_WEEKDAYS = [
  { day: 1, short: "ሰኞ", label: "ሰኞ (Mon)" },
  { day: 2, short: "ማክሰኞ", label: "ማክሰኞ (Tue)" },
  { day: 3, short: "ረቡዕ", label: "ረቡዕ (Wed)" },
  { day: 4, short: "ሐሙስ", label: "ሐሙስ (Thu)" },
  { day: 5, short: "ዓርብ", label: "ዓርብ (Fri)" },
  { day: 6, short: "ቅዳሜ", label: "ቅዳሜ (Sat)" },
  { day: 0, short: "እሑድ", label: "እሑድ (Sun)" },
] as const;

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function normalizeClassDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...ALL_WEEKDAYS];
  const valid = Array.from(
    new Set(
      raw
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    )
  );
  return valid.length > 0 ? valid : [...ALL_WEEKDAYS];
}

export function formatClassDaysLabel(raw: unknown): string {
  const days = normalizeClassDays(raw);
  if (days.length === 7) return "በየቀኑ (ሁሉም ቀናት)";
  const set = new Set(days);
  if (
    days.length === 4 &&
    set.has(1) &&
    set.has(2) &&
    set.has(3) &&
    set.has(4)
  ) {
    return "ሰኞ – ሐሙስ";
  }
  if (
    days.length === 5 &&
    set.has(1) &&
    set.has(2) &&
    set.has(3) &&
    set.has(4) &&
    set.has(5)
  ) {
    return "ሰኞ – ዓርብ";
  }
  if (days.length === 2 && set.has(6) && set.has(0)) {
    return "ቅዳሜና እሑድ";
  }
  return ETHIOPIAN_WEEKDAYS.filter((w) => set.has(w.day))
    .map((w) => w.short)
    .join("፣ ");
}

export function getWeekdayForYmd(ymd: string): number {
  const clean = String(ymd || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return 1;
  return new Date(`${clean}T12:00:00Z`).getUTCDay();
}

export function getEthiopianWeekdayName(ymd: string): string {
  const day = getWeekdayForYmd(ymd);
  return ETHIOPIAN_WEEKDAYS.find((w) => w.day === day)?.short || "";
}

export function isScheduledClassDay(ymd: string, rawDays: unknown): boolean {
  const days = normalizeClassDays(rawDays);
  return days.includes(getWeekdayForYmd(ymd));
}

export function countScheduledDays(
  startYmd: string,
  endYmd: string,
  rawDays: unknown
): number {
  const s = String(startYmd || "").slice(0, 10);
  const e = String(endYmd || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) {
    return 1;
  }
  const startMs = Date.parse(`${s}T12:00:00Z`);
  const endMs = Date.parse(`${e}T12:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return 1;
  }

  const daySet = new Set(normalizeClassDays(rawDays));
  let count = 0;
  // Cap iteration to ~5 years to protect against extreme dates
  const maxDays = 1850;
  for (
    let cur = startMs, i = 0;
    cur <= endMs && i < maxDays;
    cur += 86400000, i += 1
  ) {
    const dow = new Date(cur).getUTCDay();
    if (daySet.has(dow)) count += 1;
  }
  return Math.max(1, count);
}

export function shiftYmd(ymd: string, deltaDays: number): string {
  const clean = String(ymd || "").slice(0, 10);
  const ms = Date.parse(`${clean}T12:00:00Z`);
  if (Number.isNaN(ms)) return clean;
  return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10);
}

export function getEthiopiaNow(): {
  dateStr: string;
  minutesSinceMidnight: number;
} {
  const now = new Date();
  // Ethiopia is UTC+3 year-round (no DST)
  const ethMs = now.getTime() + 3 * 60 * 60 * 1000;
  const eth = new Date(ethMs);
  const dateStr = eth.toISOString().slice(0, 10);
  const minutesSinceMidnight = eth.getUTCHours() * 60 + eth.getUTCMinutes();
  return { dateStr, minutesSinceMidnight };
}

export function computeAttendanceStatus(
  classTimeHHMM: string,
  graceMinutes: number
): "present" | "late" {
  const { minutesSinceMidnight } = getEthiopiaNow();
  const [hStr, mStr] = (classTimeHHMM || "17:30").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return "present";
  const deadline = h * 60 + m + (Number(graceMinutes) || 0);
  return minutesSinceMidnight <= deadline ? "present" : "late";
}

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = (hhmm || "17:30").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
