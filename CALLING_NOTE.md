# How I got calling working

**What it does.** From Plan → Calls to make → Place call, the agent can start five kinds of call. The two that matter most work like a real call centre, with a real phone number and no peer IDs:

1. **Web to phone number (human to human).** The agent types the customer's mobile number. The browser talks to Twilio over WebRTC using a short-lived token from `/api/voice-token`. Twilio then asks `/api/voice-twiml` what to do, and we answer "dial this number". The customer's phone rings as a normal call and the two people talk.
2. **AI to phone number (AI to human).** `/api/ai-call` asks Twilio to ring the number. When the customer picks up, Twilio calls `/api/ai-voice` for each turn. Avani asks for recording consent out loud, listens (Twilio speech recognition), asks Gemini for her next sentence, and speaks it. The agent screen polls `/api/ai-call-status` and shows the live transcript (only after the customer said yes to recording).
3. Browser-to-browser versions of both (PeerJS/WebRTC), plus a scripted practice call.

**Why this design.** A browser cannot dial the phone network, so a telephony provider has to sit in the middle. I used Twilio because it has a browser SDK, a REST call API and speech/voice built in. The app has no database; the AI call's conversation travels inside the webhook URL, and an optional Redis store only feeds the agent's live transcript.

**Keys.** Twilio and Gemini keys exist only as Vercel environment variables. The browser only ever receives a one-hour token. An optional passcode stops strangers spending call credit.

**Consent.** Nothing is transcribed until the customer says yes (spoken or on the consent screen). A no or a withdrawal stops it, and every answer is logged with a consent ID.

**What I got working by hand.** I ran both web-to-web calls end to end between two devices, tested the server logic (number cleanup, token, dial instruction, a full multi-turn AI conversation) and the screens. Phone calls need my Twilio account, so I made them live and recorded them on the deployed site (see the demo video).

**Honest limits.** Twilio trial accounts can only call verified numbers and play a short trial message first. Human-to-phone transcripts only capture the agent's side. The AI voice is Twilio's text-to-speech, not a custom voice.

**AI tools used.** I built this with Claude and tested it myself; the README lists everything.
