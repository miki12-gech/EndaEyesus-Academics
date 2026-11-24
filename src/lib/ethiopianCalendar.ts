export const ETHIOPIAN_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
] as const;

const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

export function toEthiopianDate(gregorianYmd: string): {
  year: number;
  month: number;
  day: number;
  monthName: string;
  formatted: string;
} {
  const clean = String(gregorianYmd || "").slice(0, 10);
  const [yStr, mStr, dStr] = clean.split("-");
  const gy = Number(yStr);
  const gm = Number(mStr);
  const gd = Number(dStr);
  if (!gy || !gm || !gd) {
    return { year: 2019, month: 1, day: 1, monthName: "መስከረም", formatted: clean };
  }

  const jdn = gregorianToJdn(gy, gm, gd);
  const r = (jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const year =
    4 * Math.floor((jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  const monthName = ETHIOPIAN_MONTHS[month - 1] || "";
  return {
    year,
    month,
    day,
    monthName,
    formatted: `${monthName} ${day}/${year} ዓ.ም`,
  };
}

export function toGregorianYmd(
  ethYear: number,
  ethMonth: number,
  ethDay: number
): string {
  const jdn =
    JD_EPOCH_OFFSET_AMETE_MIHRET +
    365 +
    365 * (ethYear - 1) +
    Math.floor(ethYear / 4) +
    30 * (ethMonth - 1) +
    ethDay -
    1;
  const { year, month, day } = jdnToGregorian(jdn);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatEthiopianTime(hhmm24: string): string {
  const [hStr, mStr] = (hhmm24 || "17:30").split(":");
  const h24 = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h24) || Number.isNaN(m)) return hhmm24;

  const ethHour = (h24 + 6) % 12 || 12;
  let period = "ቀን";
  if (h24 >= 0 && h24 < 6) period = "ሌሊት";
  else if (h24 >= 6 && h24 < 12) period = "ጠዋት";
  else if (h24 >= 12 && h24 < 17) period = "ከሰዓት";
  else if (h24 >= 17 && h24 < 20) period = "ማታ";
  else period = "ምሽት";

  return `${ethHour}:${String(m).padStart(2, "0")} ${period}`;
}
