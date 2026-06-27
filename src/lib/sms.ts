import "server-only";

/**
 * Mobicom SMS gateway helper (development.md §9.1). When the gateway isn't
 * configured the function runs in mock mode — it returns `mock: true` so the
 * OTP route can surface the code in development instead of texting it.
 */
const API_KEY = process.env.MOBICOM_SMS_API_KEY ?? "";
const SENDER = process.env.MOBICOM_SMS_SENDER ?? "vonscent";

export const isSmsConfigured = Boolean(API_KEY);

export async function sendSms(
  phone: string,
  text: string,
): Promise<{ ok: boolean; mock: boolean }> {
  if (!isSmsConfigured) {
    // Mock mode — pretend success so the flow can be exercised locally.
    return { ok: true, mock: true };
  }
  try {
    const url = new URL("https://api.mobicom.mn/sms/send");
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("from", SENDER);
    url.searchParams.set("to", phone);
    url.searchParams.set("text", text);
    const res = await fetch(url, { method: "POST" });
    return { ok: res.ok, mock: false };
  } catch {
    return { ok: false, mock: false };
  }
}
