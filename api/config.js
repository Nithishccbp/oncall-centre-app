// Tells the front end which real-calling features are switched on (so the UI can guide you instead of failing).
import { phoneReady, phoneMode, aiPhoneReady, env } from './_lib/twilio.js';
import { vonageReady } from './_lib/vonage.js';
import { storeReady } from './_lib/store.js';

export default function handler(req, res) {
  const vonage = vonageReady();
  res.status(200).json({
    phone: phoneReady(), phoneMode: phoneMode(), aiPhone: vonage || aiPhoneReady(),
    provider: vonage ? 'vonage' : (aiPhoneReady() ? 'twilio' : 'none'),
    vonageVariablesFound: !!(process.env.VONAGE_APPLICATION_ID || process.env.VONAGE_PRIVATE_KEY),
    transcripts: storeReady(),
    gemini: !!process.env.GEMINI_API_KEY, passcode: !!env().passcode,
  });
}
