// Tells the front end which real-calling features are switched on (so the UI can guide you instead of failing).
import { phoneReady, phoneMode, aiPhoneReady, env } from './_lib/twilio.js';
import { storeReady } from './_lib/store.js';

export default function handler(req, res) {
  res.status(200).json({
    phone: phoneReady(), phoneMode: phoneMode(), aiPhone: aiPhoneReady(), transcripts: storeReady(),
    gemini: !!process.env.GEMINI_API_KEY, passcode: !!env().passcode,
  });
}
