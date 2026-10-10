export type Target = "designers" | "front_desk" | "founder";

const CHAT: Record<Target, string | undefined> = {
  designers: process.env.TELEGRAM_DESIGNERS_CHAT_ID,
  front_desk: process.env.TELEGRAM_FRONTDESK_CHAT_ID,
  founder: process.env.TELEGRAM_FOUNDER_CHAT_ID,
};

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendTelegram(target: Target, html: string): Promise<{ ok: boolean; error?: string }> {
  const chat = CHAT[target];
  if (!process.env.TELEGRAM_BOT_TOKEN || !chat) return { ok: false, error: `Telegram not configured for ${target}` };
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!r.ok) return { ok: false, error: `Telegram ${r.status}: ${(await r.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
