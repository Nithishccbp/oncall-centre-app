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
Three call types, chosen in the pre-call popup:
- **Practice:** a scripted, simulated customer (no microphone needed).
- **Human call:** real two-way voice between the agent and a person, browser to browser (WebRTC through PeerJS). The other person opens `/customer` (on a phone or second tab), gets a 5-digit line code, and the agent types it in.
- **AI call:** an AI voice agent ("Avani") phones the person on `/customer`. She speaks (browser text-to-speech), listens (browser speech recognition, or type a reply) and thinks with Gemini through a serverless function (`api/ai-agent.js`). If no key is set she falls back to simple built-in rules, and the customer page shows which one answered.

Consent is enforced on real calls too: the live transcript only flows to the agent while recording consent is ON, and the AI only starts talking after the consent step.

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

## Setup for the real AI call (optional)
Human calls and the AI call's voice work with no setup. For Gemini-written replies, add an environment variable `GEMINI_API_KEY` in the Vercel project (Settings, Environment Variables) and redeploy. The key stays on the server and is never in the front-end code. Locally, `npm run dev` has no `/api`, so the AI uses its built-in fallback; use `vercel dev` to test the function.

## Skipped or simplified
- Not a phone-network call: calls are browser to browser (WebRTC), so no phone numbers or telephony provider. Both people need a browser with microphone access. Use headphones to avoid echo.
- The consent "tap on WhatsApp" and sending a quote on WhatsApp are simulated.
- Live captions use the browser's speech recognition (Chrome/Edge). Without it, calls still work but the transcript stays empty (the AI call also accepts typed replies).
- The free public PeerJS server is used for the call handshake; on strict corporate networks a call may not connect.
- Settings fields, Language, LinkedIn and Logout are visual only. The consent log and chosen avatar are the only things saved (in `localStorage`).

## Folder structure
```
api/            ai-agent.js (Vercel serverless function for the AI agent)
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
- Claude (Anthropic): used for most of this project. It planned the screens from the mock, wrote the React code and styling, built the call flow (consent, live transcript, AI Assist, wrap-up) and the real calling feature (WebRTC human-to-human call and the AI voice call), and tested it.
- I ran the project, tested every screen and call type myself, fixed setup problems, and deployed it to Vercel.

## Not copied
Built from the mock's visible behaviour only; none of its source was saved or copied.
