/**
 * Helpers for Ethiopia Local Time (UTC+3) and attendance status calculation.
 */
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
