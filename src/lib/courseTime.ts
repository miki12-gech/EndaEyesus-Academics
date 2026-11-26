import { formatEthiopianTime, toEthiopianDate } from "./ethiopianCalendar";

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

export function minutesToHHMM(totalMinutes: number): string {
  const clamped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getCheckInWindowBounds(
  classTimeHHMM: string,
  earlyMinutes: number,
  graceMinutes: number,
  durationMinutes: number
) {
  const [hStr, mStr] = (classTimeHHMM || "17:30").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const startMin =
    !Number.isNaN(h) && !Number.isNaN(m) ? h * 60 + m : 17 * 60 + 30;
  const early = Math.max(0, Number(earlyMinutes ?? 60));
  const grace = Math.max(0, Number(graceMinutes ?? 15));
  const duration = Math.max(grace + 5, Number(durationMinutes ?? 90));

  const openMin = Math.max(0, startMin - early);
  const graceEndMin = Math.min(1439, startMin + grace);
  const closeMin = Math.min(1439, startMin + duration);

  return {
    startMin,
    openMin,
    graceEndMin,
    closeMin,
    openTimeEth: formatEthiopianTime(minutesToHHMM(openMin)),
    startTimeEth: formatEthiopianTime(minutesToHHMM(startMin)),
    closeTimeEth: formatEthiopianTime(minutesToHHMM(closeMin)),
  };
}

export interface QrWindowResult {
  allowed: boolean;
  status?: "present" | "late";
  code?:
    | "INACTIVE"
    | "NOT_STARTED"
    | "ENDED"
    | "FUTURE_DATE"
    | "WRONG_WEEKDAY"
    | "TOO_EARLY"
    | "TOO_LATE";
  message?: string;
}

export function evaluateQrCheckInWindow(
  course: {
    is_active?: boolean;
    start_date: string | Date;
    end_date: string | Date;
    class_time: string;
    grace_minutes: number;
    early_minutes?: number;
    duration_minutes?: number;
    class_days?: unknown;
  },
  targetDateYmd?: string,
  nowOverride?: { dateStr: string; minutesSinceMidnight: number }
): QrWindowResult {
  const { dateStr: today, minutesSinceMidnight } =
    nowOverride || getEthiopiaNow();
  const targetDate = targetDateYmd || today;

  if (course.is_active === false) {
    return {
      allowed: false,
      code: "INACTIVE",
      message: "⛔ ይህ ኮርስ በአሁኑ ጊዜ ዝግ ነው።",
    };
  }

  if (targetDate > today) {
    return {
      allowed: false,
      code: "FUTURE_DATE",
      message: "📅 ወደፊት ላለ ቀን QR ስካን ማድረግ አይቻልም!",
    };
  }

  const startYmd =
    course.start_date instanceof Date
      ? course.start_date.toISOString().slice(0, 10)
      : String(course.start_date).slice(0, 10);
  const endYmd =
    course.end_date instanceof Date
      ? course.end_date.toISOString().slice(0, 10)
      : String(course.end_date).slice(0, 10);

  if (targetDate < startYmd) {
    const startEth = toEthiopianDate(startYmd).formatted;
    const startWeekday = getEthiopianWeekdayName(startYmd);
    return {
      allowed: false,
      code: "NOT_STARTED",
      message: `📅 ኮርሱ ገና አልተጀመረም! የሚጀምረው ${startEth} (${startWeekday}) ነው።`,
    };
  }

  if (targetDate > endYmd) {
    const endEth = toEthiopianDate(endYmd).formatted;
    return {
      allowed: false,
      code: "ENDED",
      message: `🏁 ይህ ኮርስ በ${endEth} ተጠናቋል።`,
    };
  }

  if (!isScheduledClassDay(targetDate, course.class_days)) {
    const targetWeekday = getEthiopianWeekdayName(targetDate);
    const schedule = formatClassDaysLabel(course.class_days);
    return {
      allowed: false,
      code: "WRONG_WEEKDAY",
      message: `📅 ዛሬ (${targetWeekday}) የኮርሱ የትምህርት ቀን አይደለም! የትምህርት ቀናት፦ ${schedule}`,
    };
  }

  // Time window check applies for live (today) QR scans
  if (targetDate === today) {
    const bounds = getCheckInWindowBounds(
      String(course.class_time || "17:30"),
      Number(course.early_minutes ?? 60),
      Number(course.grace_minutes ?? 15),
      Number(course.duration_minutes ?? 90)
    );

    if (minutesSinceMidnight < bounds.openMin) {
      return {
        allowed: false,
        code: "TOO_EARLY",
        message: `⏳ ገና ነው! የዛሬው አቴንዳንስ የሚከፈተው ከ${bounds.openTimeEth} ጀምሮ ነው (ትምህርት የሚጀምረው ${bounds.startTimeEth})።`,
      };
    }

    if (minutesSinceMidnight > bounds.closeMin) {
      return {
        allowed: false,
        code: "TOO_LATE",
        message: `⛔ ሰዓቱ አልፎበታል! የዛሬው አቴንዳንስ መቀበያ በ${bounds.closeTimeEth} ተዘግቷል።`,
      };
    }

    return {
      allowed: true,
      status:
        minutesSinceMidnight <= bounds.graceEndMin ? "present" : "late",
    };
  }

  return { allowed: true, status: "present" };
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
