import crypto from "crypto";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_TELEGRAM_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function isTelegramAdmin(telegramId: string | number): boolean {
  return getAdminIds().has(String(telegramId));
}

/**
 * Cryptographically verifies Telegram WebApp initData using HMAC-SHA256
 * per official Telegram Mini App security documentation.
 */
export function verifyTelegramInitData(initData: string): TelegramWebAppUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const entries = Array.from(params.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const hashBuf = Buffer.from(hash, "hex");
    const calcBuf = Buffer.from(calculatedHash, "hex");

    if (
      hashBuf.length !== calcBuf.length ||
      !crypto.timingSafeEqual(hashBuf, calcBuf)
    ) {
      return null;
    }

    const userJson = params.get("user");
    if (!userJson) return null;

    const user = JSON.parse(userJson) as TelegramWebAppUser;
    if (!user || typeof user.id !== "number") return null;

    return user;
  } catch {
    return null;
  }
}

export function verifyAdminAccess(request: Request): {
  authorized: boolean;
  adminLabel?: string;
} {
  let queryInitData = "";
  let queryPin = "";
  try {
    const url = new URL(request.url);
    queryInitData = url.searchParams.get("initData") || "";
    queryPin = url.searchParams.get("pin") || "";
  } catch {
    // Ignore malformed URL
  }

  const initData =
    request.headers.get("x-telegram-init-data") || queryInitData;
  if (initData) {
    const tgUser = verifyTelegramInitData(initData);
    if (tgUser && isTelegramAdmin(tgUser.id)) {
      return {
        authorized: true,
        adminLabel: tgUser.username
          ? `@${tgUser.username}`
          : `${tgUser.first_name} (${tgUser.id})`,
      };
    }
  }

  const providedPin = request.headers.get("x-admin-pin") || queryPin;
  const configuredPin = process.env.ADMIN_DASHBOARD_PIN || "";
  if (configuredPin && providedPin && providedPin === configuredPin) {
    return { authorized: true, adminLabel: "Admin PIN" };
  }

  return { authorized: false };
}
