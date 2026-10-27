# On-Ground Call Centre App (rebuild)

A React rebuild of the On-Ground.ai Call Centre app: the screen an agent keeps open through a shift. All data is sample data in local JS modules, no backend.

## Run it
Needs Node 18+.
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## What is built
**Must build**
- [x] App shell: sidebar (Plan sub-items always visible) and top bar (bell, score ring, rank, avatar, user menu)
- [x] Dashboard: KPI cards, progress, who is waiting, earnings, tasks, 7-day charts
- [x] Plan: Calls to make (ranked, expandable rows, paging), Incoming (missed calls ranked by expected value), Recent (tap a call for the SOP review)
- [x] Calendar: month grid, event dots, Today button, month switcher, upcoming list
- [x] Pulse home (AvaniBot, role and task agents, channels, Kudos, DMs) and channel chat
- [x] Leads modal with paging, opened from the dashboard task list

**Bonus**
- [x] Send a message in a channel (with a simulated reply; AvaniBot answers a few known questions by keyword)
- [x] Answer the pinned "Needs your input" card (buttons or free text)
- [x] Place call / Call back / Practise a call, with the full call flow below
- [x] Works at phone width (bottom tab bar, bottom-sheet modals)
- [x] Charts with a library (Chart.js)

**Real calling (not mocked)**
Five call types, chosen in the pre-call popup. The first two are the call-centre way (a real phone number, no peer IDs):
- **Phone number (human to phone):** the agent types the customer's real mobile number and talks through the browser microphone. The browser connects to Twilio (WebRTC), and Twilio rings the number on the phone network.
- **AI to phone:** Avani, the AI voice agent, rings the real number from our server (Twilio REST). She asks for recording consent out loud, then talks using Twilio speech recognition and text-to-speech, with Gemini writing her replies (`api/ai-voice.js`).
- **Human (web) and AI (web):** the same two levels browser to browser (WebRTC through PeerJS), for when no phone is at hand. The other person opens `/customer`, gets a 5-digit code and the agent types it in.
- **Practice:** a scripted, simulated customer (no microphone needed).

Consent is enforced on real calls too: the live transcript only flows to the agent while recording consent is ON, and the AI only starts talking after the consent step. On an AI phone call, Avani asks for consent out loud and the app records the customer's spoken yes or no.

**The call flow (same for all three types)**
1. Pre-call SOP check: product to champion, pitching language, cross-sell, ideal EMI and the lead's SOP checkpoints.
2. "Ask before you record": consent gate in 3 languages, by WhatsApp tap (simulated) or said out loud, optional offers consent, under-18 toggle. A yes creates a Consent ID tied to the call; a no is logged and the call carries on without recording.
3. Live call workspace: call card with timer and sentiment, live transcript, and the AI Assist panel (what to offer, live SOP checklist that also ticks from real speech, "drifting off SOP" warning, Ask AI, quick replies, drafted summary, case history).
4. Rights panel (Sec 11, 12, 13, 14, 6): each request logs a DPO reference; "Withdraw consent" stops recording.
5. Wrap-up: editable AI-drafted summary, outcome chips, Save to CRM. The call then appears in Recent with an SOP review built from what was covered.
6. DEMO strip: practice call, simulated incoming call, the "Unsure? / My data? / Stop!" consent nudges, and the consent log (kept in `localStorage` under `og_consent_events`).

**Also built:** Notifications, OG Score and Rank explainers, Avatar picker (saved in the browser), Settings, Date-range sheet, Leads-modal action sheets (WhatsApp, No Interest, Came Back), Kudos screen and customer-discussions screen in Pulse.

## Stack and why
- **React 18 + Vite (JavaScript):** small, fast to start, easy to review.
- **react-router-dom:** every screen has a real URL (`/plan/incoming`, `/pulse/callcentre-team`), so refresh and back/forward work.
- **Plain CSS with design tokens** (`src/styles/tokens.css`): the mock uses a small set of colours and sizes, so variables keep it consistent without a UI library.
- **Local mock modules, no backend:** as required. `src/data/*.js`.
- **Tabler icons + Inter** via npm packages.

## Design decisions
- **Derived data:** the Incoming list is computed from the call history joined with the leads (`src/data/selectors.js`), not hard-coded, so calling someone back removes them from Incoming and adds an entry to Recent.
- **Shared pieces:** `Modal`, `Pager`, `Collapsible`, `BarChart` are reused across screens.
- **Context for cross-screen state:** leads modal, Pulse threads and needs-input answers, and the call flow each live in a small context, so answering a pinned card in a channel also updates the dashboard task count.
- **Calendar maths is my own** (`src/utils/calendar.js`), no calendar library. "Today" is the real current date.

## Setup for real phone calls and the AI call
Step by step in [`TWILIO_SETUP.md`](TWILIO_SETUP.md); how it works in [`CALLING_NOTE.md`](CALLING_NOTE.md).
Short version: the web-to-web calls need no setup. Phone calls need a Twilio account and these environment variables in the Vercel project (Settings, Environment Variables): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_TWIML_APP_SID`, `TWILIO_NUMBER`. After deploying, open `/api/diagnose` (add `?p=YOURPASSCODE` if you set one) to see which setup step, if any, is failing. Optional: `GEMINI_API_KEY` (Gemini writes Avani's replies; without it she uses built-in rules), `APP_PASSCODE` (stops strangers using your Twilio credit) and an Upstash Redis store (live transcript of the AI phone call). All keys stay on the server and are never in the front-end code. Locally, `npm run dev` has no `/api`; use `vercel dev` to test it.

## Skipped or simplified
- Phone calls go through Twilio. On a Twilio trial account only verified numbers can be called and a short trial message plays first. On human-to-phone calls the transcript shows the agent's own words only (the browser cannot caption the customer's phone audio); the AI phone call shows both sides when the Redis store is connected. Web-to-web calls: use headphones to avoid echo.
- The consent "tap on WhatsApp" and sending a quote on WhatsApp are simulated.
- Live captions use the browser's speech recognition (Chrome/Edge). Without it, calls still work but the transcript stays empty (the AI call also accepts typed replies).
- The free public PeerJS server is used for the call handshake; on strict corporate networks a call may not connect.
- Settings fields, Language, LinkedIn and Logout are visual only. The consent log and chosen avatar are the only things saved (in `localStorage`).

## Folder structure
```
api/            serverless functions: voice-token, voice-twiml, click-call, ai-call, ai-voice, ai-call-status, ai-agent, config, diagnose
src/
  components/   AppShell, Sidebar, TopBar, Modal, Pager, Collapsible, KpiCard, BarChart, LeadsModal, LeadCard,
                Calling (CallHost, ConsentGate, CallWorkspace, AiAssist, WrapUpModal, RightsPanel, DemoStrip),
                Overlays (notifications, score, rank, avatar, settings, date range), Sheets, Toast
  context/      LeadsModalContext, PulseContext, CallContext, ConsentContext, UiContext
  services/     liveCall (WebRTC calling), aiAgent (AI voice brain)
  data/         leads, calls, calling, selectors, dashboard, calendar, pulse (sample data)
  pages/        Dashboard, Plan, Calendar, Pulse, Customer (the /customer demo phone)
  styles/       tokens.css, global.css
  utils/        calendar.js
```

## AI tools used
<!-- EDIT THIS so it is true for you. Be specific about what you wrote or changed by hand. -->
- Continue (VS Code) with Gemini: <what you used it for>
- Claude: <what you used it for>
I reviewed the code and can explain every file.

## Not copied
Built from the mock's visible behaviour only; none of its source was saved or copied.


## Real phone calls with Vonage
AI → phone calls also work with a free Vonage trial account. See `VONAGE_SETUP.md`.

## Real-estate presales update (Godrej Properties · Lakeside Towers)
Updated to the "3.5 Real estate · Presales call centre · Web" mock. Existing calling features (WebRTC, AI to phone, consent, wrap-up) are unchanged.
- Dashboard: 5 KPI tiles, queue chip, Today's calls with stars, Leads to call next, thanks / visits tiles, This week charts.
- Avani AI (new, `/avani`): persona picker; Assess chat with chips and chat history; Learn path with module detail and mark-done; Practise (record by speech or type, scored feedback against the SOP step).
- Pulse: Post-Visit Follow-up role agent, Presales agent and task agents with member cards, detail overlay, coaching notes and acknowledge.
- Calendar: share an invite (manager / team / L&D) and add new invites.
- Leads modal: ownership banner, Fit score, "Why this lead fits", win-back footer. Settings: Real estate industry.
- Data: leads, SOP checklist (Opening, Needs, Project Walkthrough, Loan / Payment Plan, Possession & RERA, Site Visit Booking), call scripts, knowledge base, AI voice prompts converted to real estate. Amounts show as ₹98 L / ₹1.42 Cr.
