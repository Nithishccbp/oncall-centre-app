# Phone calls with Vonage (free trial)

Why Vonage: Twilio's free "Limited trial" blocked our call settings. Vonage's trial lets the server ring **the phone number you signed up with**, which is enough to prove a real AI → phone call.

> Trial limit: you can only call the number you gave when you signed up. Add credit to call any number.

## What works
- **AI → phone**: Avani (Gemini) rings a real number, asks consent aloud, and talks. Code: `api/ai-call.js`, `api/vonage-ai.js`, `api/_lib/vonage.js`.
- **Human → phone** still uses the Twilio code path (or the web-to-web call). A Vonage version needs the Vonage browser SDK and is a separate step.

## Set up (once)
1. Vonage dashboard → **Applications → Create a new application**. Name: `oncall-centre`.
2. Click **Generate public and private key**. A file `private.key` downloads. **Keep it private. Never commit it.**
3. Turn on **Voice**. For both URLs (Answer and Event) use:
   `https://oncall-centre-app.vercel.app/api/vonage-event` (method POST). Save.
4. Copy the **Application ID** (a long id with dashes).
5. In Vercel → Project → Settings → Environment Variables, add:
   - `VONAGE_APPLICATION_ID` = the Application ID
   - `VONAGE_PRIVATE_KEY` = open `private.key` in Notepad, copy **everything** (including the BEGIN/END lines), paste
   - (optional) `GEMINI_API_KEY`
6. Redeploy. Open `/api/diagnose` — every line should say `ok: true`.

## Try it
Plan → Calls to make → pick a lead → **AI → phone** → type the number you signed up with → Place call. Answer, say "yes", then talk.

## How it works
1. Our server signs a short-lived token (RS256) with the private key and asks Vonage to create the call, with Avani's first words inline.
2. Vonage rings the phone. After the greeting it listens (speech recognition, `en-IN`).
3. What the customer said is posted to `/api/vonage-ai`. Gemini writes the reply, we send it back as the next instruction, and Vonage speaks it.
4. The conversation so far travels inside the webhook URL, so no database is needed. The live transcript on the agent screen needs the optional Upstash Redis and is only stored if the customer said yes to recording.
