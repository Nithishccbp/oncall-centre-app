# Telephony (Vobiz / Exotel / Ozonetel) — staff click-to-call

Everything is entered in the app: **Settings → Telephony** (provider, Auth ID / Secret, caller ID number, extra numbers). Details are saved on the server (Upstash Redis) and the secret never comes back to the browser.

Call flow: Plan → Place call → "My phone → customer" → the provider rings YOUR phone → then the customer, who sees the brand number.

Needs: Upstash Redis connected in Vercel (Storage tab). Optional: APP_PASSCODE in Vercel so only staff who know it can change telephony or place calls.
Vercel variables (TEL_PROVIDER, VOBIZ_AUTH_ID ...) still work as a fallback; see .env.example.
Endpoints: GET /api/telephony/config, POST /api/telephony/save|disconnect|call|hangup, GET /api/telephony/status?id=, /api/telephony/answer.

## Web → customer (the browser calls straight out, Vobiz only)
One-time setup in the Vobiz console (Voice section):
1. **Applications → create** an application (for example "Call Centre Web"). Answer URL: `https://oncall-centre-app.vercel.app/api/telephony/webrtc`, method POST. Hangup URL: `https://oncall-centre-app.vercel.app/api/telephony/hook/web/hangup`, method POST. Save.
2. **Endpoints → create** an endpoint for each staff member: username (letters and digits only) and a password. Assign the application from step 1. Save the password, Vobiz shows it only once. One endpoint can be signed in on one browser at a time.
3. In the app: Plan → Place call → I'm ready · call → **🎧 Web → customer**. Type the endpoint username and password (saved on that device only), allow the microphone, and place the call.

The customer sees the brand number set in Settings → Telephony.
