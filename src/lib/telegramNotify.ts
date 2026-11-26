import { toEthiopianDate } from "./ethiopianCalendar";

export async function sendTelegramBotMessage(
  telegramId: string | number,
  htmlText: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = String(telegramId || "").trim();
  if (!token || !chatId || chatId === "999999999") return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlText,
          parse_mode: "HTML",
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyStudentCheckIn(params: {
  telegramId: string | null | undefined;
  studentName: string;
  courseTitle: string;
  sessionDateYmd: string;
  status: "present" | "late";
}) {
  if (!params.telegramId) return;
  const ethDate = toEthiopianDate(params.sessionDateYmd).formatted;
  const badge =
    params.status === "present"
      ? "✅ <b>በሰዓቱ ተገኝተዋል (Present)</b>"
      : "⏰ <b>ዘግይተው ተመዝግበዋል (Late)</b>";

  const text = [
    `📖 <b>${params.courseTitle}</b>`,
    "",
    `ሰላም <b>${params.studentName}</b>፤`,
    `የ<b>${ethDate}</b> የክፍል አቴንዳንስዎ፦ ${badge}`,
  ].join("\n");

  await sendTelegramBotMessage(params.telegramId, text);
}
