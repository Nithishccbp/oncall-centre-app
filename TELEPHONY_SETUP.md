# Telephony (Vobiz / Exotel / Ozonetel) — staff click-to-call

Everything is entered in the app: **Settings → Telephony** (provider, Auth ID / Secret, caller ID number, extra numbers). Details are saved on the server (Upstash Redis) and the secret never comes back to the browser.

Call flow: Plan → Place call → "My phone → customer" → the provider rings YOUR phone → then the customer, who sees the brand number.

Needs: Upstash Redis connected in Vercel (Storage tab). Optional: APP_PASSCODE in Vercel so only staff who know it can change telephony or place calls.
Vercel variables (TEL_PROVIDER, VOBIZ_AUTH_ID ...) still work as a fallback; see .env.example.
Endpoints: GET /api/telephony/config, POST /api/telephony/save|disconnect|call|hangup, GET /api/telephony/status?id=, /api/telephony/answer.
