// Rates come from env so the dashboard shows real spend, not guesses (open item in the brief).
const num = (k: string) => Number(process.env[k] ?? 0) || 0;

export function callCost(durationSec: number, tokens: { input: number; output: number }) {
  const minutes = durationSec / 60;
  const telephony = minutes * num("TELEPHONY_INR_PER_MIN");
  const speech = minutes * num("SPEECH_INR_PER_MIN");
  const usd = (tokens.input / 1e6) * num("GEMINI_INPUT_USD_PER_M") + (tokens.output / 1e6) * num("GEMINI_OUTPUT_USD_PER_M");
  const gemini = usd * (num("USD_INR") || 85);
  return { minutes, telephony, speech, gemini, total: telephony + speech + gemini };
}

export const ratesConfigured = () =>
  !!(num("TELEPHONY_INR_PER_MIN") || num("SPEECH_INR_PER_MIN")) && !!(num("GEMINI_INPUT_USD_PER_M") || num("GEMINI_OUTPUT_USD_PER_M"));
