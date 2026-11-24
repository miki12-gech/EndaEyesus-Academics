import { NextRequest, NextResponse } from "next/server";
import { isTelegramAdmin } from "@/lib/telegramAuth";

export const dynamic = "force-dynamic";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret && headerSecret !== secret) {
        console.warn("Webhook secret token mismatch");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id;
    const firstName = message.from?.first_name || "ወንድማችን/እኅታችን";
    const text = (message.text || "").trim();
    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    const admin = userId ? isTelegramAdmin(userId) : false;

    if (text.startsWith("/start")) {
      const welcomeText = [
        "<b>በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ አሜን!</b>",
        "",
        `ሰላም <b>${firstName}</b>፤ እንኳን ወደ <b>እንዳ ኢየሱስ ግቢ ጉባኤ — የአካዳሚክ ክፍል</b> የነባር ተማሪዎችና አገልጋዮች ፖርታል በሰላም መጡ!`,
        "",
        "📋 ይህ ፖርታል ከ2ኛ ዓመት ጀምሮ ያሉ ተማሪዎችንና አገልጋዮችን የትምህርት ሁኔታ (Status) በሚስጥር በመለየት <b>የቲቶሪያል፣ የጥናት ቡድን፣ የExit Exam፣ የThesis እና የክህሎት ሥልጠና</b> ድጋፍ ለማድረግ የተዘጋጀ ነው።",
        "",
        "👇 ከታች ያለውን ቁልፍ በመጫን በ1 ደቂቃ ውስጥ መረጃዎን ይመዝግቡ ወይም ያድሱ፦",
      ].join("\n");

      const inlineKeyboard: Array<Array<Record<string, unknown>>> = [
        [
          {
            text: "📋 የአካዳሚክ ፖርታል ክፈት (Open Mini App)",
            web_app: { url: appUrl },
          },
        ],
      ];

      if (admin) {
        inlineKeyboard.push([
          {
            text: "🛡️ አድሚን ዳሽቦርድ (Admin Dashboard)",
            web_app: { url: `${appUrl}/?tab=admin` },
          },
        ]);
      }

      await sendTelegramMessage(chatId, welcomeText, {
        inline_keyboard: inlineKeyboard,
      });
    } else if (text.startsWith("/admin")) {
      if (!admin) {
        await sendTelegramMessage(
          chatId,
          "⛔ ይቅርታ፣ ይህ ትእዛዝ ለአካዳሚክ ዋና ክፍል አስተባባሪዎች ብቻ የተፈቀደ ነው።"
        );
      } else {
        await sendTelegramMessage(
          chatId,
          "🛡️ <b>የእንዳ ኢየሱስ ግቢ ጉባኤ አካዳሚክ አድሚን ዳሽቦርድ</b>\nከታች ያለውን ቁልፍ በመጫን የተማሪዎችን መረጃ፣ Red Flags እና Excel Export ማግኘት ይችላሉ፦",
          {
            inline_keyboard: [
              [
                {
                  text: "📊 አድሚን ዳሽቦርድ ክፈት",
                  web_app: { url: `${appUrl}/?tab=admin` },
                },
              ],
            ],
          }
        );
      }
    } else if (text.startsWith("/myid")) {
      await sendTelegramMessage(
        chatId,
        `🆔 የእርስዎ Telegram ID፦ <code>${userId}</code>`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "👇 የአካዳሚክ መረጃዎን ለመመዝገብ ወይም ለማደስ ከታች ያለውን ቁልፍ ይጫኑ፦",
        {
          inline_keyboard: [
            [
              {
                text: "📋 ፖርታሉን ክፈት (Open Portal)",
                web_app: { url: appUrl },
              },
            ],
          ],
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Bot webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
