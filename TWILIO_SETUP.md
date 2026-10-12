# Real phone calls: setup (about 20 minutes)

**Free Twilio trial (Limited trial) path.** The free trial hides TwiML Apps and has no number to buy, but it works:
- Your trial number is shown under Voice → Overview → Try Out Voice ("From"). Use it as `TWILIO_NUMBER`.
- Only phones verified as testers can be called (your own mobile is added at sign-up).
- Skip steps 2, 3 and 7 below. Without `TWILIO_TWIML_APP_SID` the app uses "click to call": Twilio rings the customer first, and when they pick up the call connects to the agent's browser. Needed variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_NUMBER`.
- On a trial, the person called hears a short Twilio message and must press any key.


1. **Create a Twilio account** at twilio.com and verify your email and your own mobile number.
2. **Get a phone number:** Console → Phone Numbers → Buy a number (trial credit covers it). Voice-capable. Copy it, like `+15551234567`. This is `TWILIO_NUMBER`.
3. **Allow calls to India:** Console → Voice → Settings → Geo permissions → tick **India** (and Save).
4. **Trial only: verify the phone you will call:** Phone Numbers → Manage → Verified Caller IDs → add your mobile and enter the code. (Trial accounts can only call verified numbers. Upgrading removes this.)
5. **Account SID and Auth Token:** shown on the Console home page. These are `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
6. **API key:** Account → API keys & tokens → Create API key (Standard). Copy the **SID (starts SK)** → `TWILIO_API_KEY` and the **Secret** (shown once) → `TWILIO_API_SECRET`.
7. **TwiML App:** Voice → Manage → TwiML Apps → Create new. Name it `callcentre`. **Voice Request URL:** `https://oncall-centre-app.vercel.app/api/voice-twiml`, method **HTTP POST**. Save and copy its **SID (starts AP)** → `TWILIO_TWIML_APP_SID`.
8. **Vercel:** your project → Settings → Environment Variables → add the six variables above (plus `GEMINI_API_KEY` if not done). Then Deployments → ⋯ → **Redeploy**.
9. **Optional, for the live AI-call transcript:** Vercel → Storage / Marketplace → add **Upstash for Redis** and connect it to the project, then redeploy.
10. **Optional:** add `APP_PASSCODE` with any word; the app asks for it once in the browser.

**Check your setup:** open `https://oncall-centre-app.vercel.app/api/diagnose` (add `?p=YOURPASSCODE` if you set one). It ticks or fails each step above and says what to fix.

**Test:** open the live site, Plan → Calls to make → Place call, choose **📞 Phone number**, type your mobile, Place the live call, allow the microphone. Your phone rings. On a trial account press any key when Twilio's message plays. Then try **🤖 AI → phone**.

**If it fails:** the pre-call popup says if keys are missing. "Permission to call … not enabled" means step 3. "Unverified number" means step 4. No ring and a Twilio error means the TwiML App URL (step 7) is wrong.
