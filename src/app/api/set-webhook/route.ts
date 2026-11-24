import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    const secret = process.env.WEBHOOK_SECRET;

    if (!token || !appUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing TELEGRAM_BOT_TOKEN or APP_URL in environment variables.",
        },
        { status: 400 }
      );
    }

    // 1. Initialize Neon Postgres schema automatically
    await ensureSchema();

    // 2. Register Telegram Webhook
    const webhookUrl = `${appUrl}/api/bot`;
    const webhookRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret || undefined,
          drop_pending_updates: true,
        }),
      }
    );
    const webhookData = await webhookRes.json();

    return NextResponse.json({
      ok: true,
      databaseInitialized: true,
      webhookUrl,
      telegramWebhook: webhookData,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
