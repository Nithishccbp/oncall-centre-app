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

**The call flow (everything is simulated, no telephony)**
1. Pre-call SOP check: product to champion, pitching language, cross-sell, ideal EMI and the lead's SOP checkpoints.
2. "Ask before you record": consent gate in 3 languages, by WhatsApp tap or said out loud, optional offers consent, under-18 toggle. A yes creates a Consent ID tied to the call; a no is logged and the call carries on without recording.
3. Live call workspace: call card with timer and sentiment, live transcript (appears only while recording is on), and the AI Assist panel (what to offer, live SOP checklist, "drifting off SOP" warning, Ask AI, quick replies, drafted summary, case history).
4. Rights panel (Sec 11, 12, 13, 14, 6): each request logs a DPO reference; "Withdraw consent" stops recording.
5. Wrap-up: editable AI-drafted summary, outcome chips, Save to CRM (toast with closing chance). The call then appears in Recent with an SOP review built from what was covered.
6. DEMO strip: start an in-app call, simulate an incoming phone call, fire the "Unsure? / My data? / Stop!" consent nudges, open the consent log (kept in `localStorage` under `og_consent_events`).

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

## Skipped or simplified
- Calls, WhatsApp sends and the consent "tap" are simulated; no telephony or WhatsApp API (the brief says local data only, and API keys must never ship in front-end code).
- "Ask AI" and the drafted call summary use a small local knowledge base and the scripted transcript, not a live LLM.
- Settings fields, Language, LinkedIn and Logout are visual only. The consent log and chosen avatar are the only things saved (in `localStorage`).

## Folder structure
```
src/
  components/   AppShell, Sidebar, TopBar, Modal, Pager, Collapsible, KpiCard, BarChart, LeadsModal, LeadCard,
                Calling (CallHost, ConsentGate, CallWorkspace, AiAssist, WrapUpModal, RightsPanel, DemoStrip),
                Overlays (notifications, score, rank, avatar, settings, date range), Sheets, Toast
  context/      LeadsModalContext, PulseContext, CallContext, ConsentContext, UiContext
  data/         leads, calls, calling, selectors, dashboard, calendar, pulse (sample data)
  pages/        Dashboard, Plan, Calendar, Pulse
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
