// Exported types for the data layer (src/data/** and src/utils/**).

/* ---------- Leads ---------- */
export interface LeadSignal { category: string; quote: string }
export interface LeadJourneyEntry { date: string; channel: string; icon: string; text: string }
export interface LeadIcpItem { label: string; pct: number }
export interface Lead {
  called?: boolean; callDue?: any; [k: string]: any;
  id: string; name: string; initials: string; avatarBg: string; avatarColor: string;
  product: string; price: number; interest: string; crossSell: string; emiNote: string; story: string;
  status: string; score: number; icp: number; intent: number; expectedValue: number;
  slaLeft: string; actionNote: string; phone: string;
  icpBreakdown: LeadIcpItem[]; journey: LeadJourneyEntry[]; signals: LeadSignal[]; notes: string[];
  cumulativeMissed: number;
  manual?: boolean; ingested?: boolean; createdAt?: string;
}
export interface NewLeadInput { name?: string | null; phone?: string | null; product?: string | null }
export interface LeadMeta { phone: string; mrp: number; idealEmi: number }
export interface LeadPrep { stage: string; summary: string; notes: string[]; money: string; last: string }
export interface LeadBrief {
  intent: number; intentLabel: string; icp: number; fitLine: string; sell: string; sellLine: string;
  cross: string; fin: string; finLine: string; cap: string[]; story: string; pts: number;
}
export interface PrepEntry { stage?: string; summary?: string; notes?: string[]; money?: string; last?: string }

/* ---------- Call records ---------- */
/** Structured notes captured after a call (shape produced by the call-notes service). */
export interface CallNotes {
  interest?: string; siteVisit?: boolean; nextStep?: string; objection?: string;
}
/** A call made from this app, stored locally (callLog). */
export interface AppCall {
  id: string; ts: string; name: string; leadId: string | null; dur: number; outcome: string;
  summary: string; quote: boolean; csat: number; comment: string; notes: CallNotes | null;
}
export interface LogAppCallInput {
  name?: string | null; leadId?: string | null; dur?: number | null; outcome?: string | null;
  summary?: string | null; csat?: number | null; comment?: string | null; notes?: CallNotes | null;
}
export interface SopReviewItem { label: string; passed: boolean; quote: string }
export interface SopReview { score: number; items: SopReviewItem[] }
export type CallDirection = 'in' | 'out' | 'missed';
/** A row in the recent-calls list (sample data or merged from the backend). */
export interface RecentCall {
  id: string; dir: CallDirection | string; name: string; time: string; duration: string;
  ts?: string; summary?: string; ingested?: boolean; handled?: boolean; review?: SopReview | null;
}

/* ---------- Practice ---------- */
export interface PracticePersona {
  mood?: string; lang?: string; [k: string]: any;
  name: string; voice: string; pitch: number; product: string; budget: string; trait: string;
  concerns: string[]; opener: string;
}
export interface PracticeMood { id: string; label: string; emoji: string; desc: string; opener: string | null }
export interface PracticeLine { who: string; text: string }
export interface PracticeReview {
  score: number; skills?: Record<string, number>; stars?: number; strengths?: string[]; improve?: string[];
  summary?: string; source?: string; seconds?: number;
}
export interface PracticeSession {
  id: string; ts: string; persona: PracticePersona; lines: PracticeLine[]; seconds: number; review: PracticeReview;
  [extra: string]: unknown; // trust, result, ...
}
export interface NewPracticeSession {
  persona: PracticePersona; lines: PracticeLine[]; seconds: number; review: PracticeReview;
  [extra: string]: unknown; // trust, result, ...
}

/* ---------- Dashboard / KPI ---------- */
export interface DateSpan { from: Date; to: Date }
export interface DashboardUser {
  name: string; initials: string; store: string; team: string; location: string;
  ogScore: number; rank: number | string; avatarEmoji: string; phone: string;
}
export interface DashboardKpi { label: string; value: string; delta: string; tone: string }
export interface CounterCard { count: number; sub: string }
export interface TodayCall { ts?: number; hour?: number; dur?: number; outcome?: string; quote?: boolean; time: string; name: string; topic: string; stars: number }
export interface ProgressItem { value: number; delta: string }
export interface DashboardProgress { leadsCreated: ProgressItem; leadsCalled: ProgressItem }
export interface Earnings { amount: number; slabMin: number; slabMax: number; coached: number }
export interface DashboardTask { id: string; pulseTaskId: string; icon: string; tone: string; title: string; sub: string }
export interface WaitingCaller { id: string; name: string; note: string; wait: string; level: string }
export interface DayValue { day: string; v: number }

/** A call row as the KPI layer sees it (backend or local). */
export interface CallRow {
  ts: string; time: string; hour: number; name: string; dir: string; dur: number; outcome: string;
  topic: string; quote: boolean; stars: number; comment: string;
  leadId?: string | null; summary?: string; csat?: number;
}
export interface RatedCall { time: string; name: string; stars: number; comment: string }
export interface WeekRow { day: string; calls: number; aht?: number; csat?: number }
export interface TodayListItem {
  ts: string; time: string; name: string; topic: string; stars: number; dur: number; outcome: string; summary: string; comment: string;
}
export interface KpiData {
  created: Lead[]; calledToday: CallRow[]; calledLeads: number; week: WeekRow[]; ratedToday: RatedCall[];
  csatToday: number | null; todaysList: TodayListItem[]; handled: number; aht: number; lv: number;
}
export interface TrendBuckets { labels: string[]; line: number[] }

/** The slice of the ingest context (backend conversations) that the data layer reads. */
export interface IngestConv {
  conversation_id: string; type: string; direction: string; started_at: string;
  customer?: { name?: string; phone?: string };
  follow_up?: { at: string; type?: string; title?: string } | null;
}
export interface IngestView {
  version: number; convs: IngestConv[]; callsAll: CallRow[]; week: WeekRow[]; ratedToday: RatedCall[];
}
/** Row of a KPI trend source with an optional timestamp. */
export type TsGetter<T> = (item: T) => string | number | Date | null | undefined;
/** The slice of the UI context that the data layer reads. */
export interface UiView { span: DateSpan; range: string }

/* ---------- Notifications ---------- */
export interface NotificationLink { label: string; to: string }
export interface AppNotification {
  id: string; icon: string; kind: 'action' | 'alert' | string; time: string; text: string; link?: NotificationLink; ts?: string;
}

/* ---------- Calendar ---------- */
export interface CalendarEvent { id: string; date: string; time: string; title: string; who: string }
export interface ShareOption { id: string; label: string; sub: string; icon: string }
export interface CalendarCell { date: Date | null }

/* ---------- OG score ---------- */
export type SkillKey = 'greeting' | 'discovery' | 'objections' | 'closing' | 'tone' | 'empathy';
export interface OgSkill { key: SkillKey; skill: string; score: number; vs: number | null; next: string }
export interface OgScoreData {
  live: boolean; score: number; delta: number | null; labels: string[]; trend: number[]; prior: number[];
  skills: OgSkill[]; scored: number; hasData: boolean; range: string;
}

/* ---------- Impact ---------- */
export interface RoiAssumptions {
  toolCost: number; hourCost: number; minSaved: number; baselineVisit: number; visitToBooking: number; margin: number;
}
export type RoiAssumptionSetter = (key: keyof RoiAssumptions, value: number) => void;
export interface ImpactRow {
  lead: Lead; value: number; added: number; age: number; calls: number; firstCall: number | null; speed: number | null;
  interest: string | null; siteVisit: boolean; nextStep: string;
}
export interface ImpactPractice {
  n: number; avg: number | null; delta: number | null; lift: number | null; afterN: number; otherN: number;
}
export interface ImpactData {
  days: number; calls: number; callRows: AppCall[]; notesRows: AppCall[]; ratedRows: AppCall[]; sessionRows: PracticeSession[];
  withNotes: number; rows: ImpactRow[]; waiting: ImpactRow[]; atRisk: ImpactRow[]; contacted: ImpactRow[]; interested: ImpactRow[];
  hot: ImpactRow[]; visits: ImpactRow[];
  valueAll: number; valueWaiting: number; valueAtRisk: number; valueContacted: number; valueInterested: number; valueHot: number; valueVisits: number;
  avgSpeed: number | null; medSpeed: number | null; slaPct: number | null; SLA: number;
  objections: [string, number][]; stepRate: number | null; csat: number | null; ratedCount: number; practice: ImpactPractice;
  hours: number; saved: number; avgDeal: number; revPerBooking: number; baseline: number; extraVisits: number; extraRevenue: number;
  cost: number; gain: number; roi: number | null;
}

/* ---------- Avani coach ---------- */
export interface AvaniPersona { id: string; name: string; emoji: string; bg: string }
export interface AssessChip { id: string; icon: string; label: string; q: string }
export interface AssessKbEntry { m: string[]; a: string }
export interface WeakArea { label: string; n: number }
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface SeedSession { id: string; title: string; history: ChatMessage[] }
export interface LearningModule { id: string; icon: string; title: string; sub: string; pct: number; points: string[] }
export interface PractiseStep {
  id: string; icon: string; name: string; tip: string; example: string; watch: string[]; kw: string[];
}
export interface StepCheck { label: string; ok: boolean }
export interface StepScore { checks: StepCheck[]; score: number; note: string; words: number }

/* ---------- Calling experience ---------- */
export interface ConsentLanguage { id: string; label: string; text: string }
export interface RightsAction { id: string; title: string; sec: string; icon: string; tone: string }
export interface Checkpoint { category: string; relevant: boolean; text: string }
export interface ScriptLine {
  who: 'agent' | 'cust'; text: string; sop?: number; mood?: number; tip?: string; drift?: boolean;
}
export interface Nudge { customer: string; title: string; body: string; action: string | null }
export type NudgeId = 'unsure' | 'mydata' | 'stop';
export interface QuickReply { id: string; label: string; agent?: string; sop?: number }
export interface CallOutcome { id: string; label: string; icon: string; chance: number }
export interface RankBreakdownItem { icon: string; label: string; value: string; weight: number; pct: number }
export interface AvatarOption { id: string; emoji: string; name: string }
export interface CustomerThread {
  id: string; name: string; initials: string; bg: string; color: string; preview: string;
  wa?: boolean; missed?: boolean; time?: string; unread?: number;
}

/* ---------- Pulse ---------- */
export interface PulseAgent {
  id: string; sub: string; icon: string; color: string; pins: number; metric?: string; trend?: string;
}
export interface PulseAgents { role: PulseAgent[]; task: PulseAgent[] }
export interface PulseChannel {
  id: string; name: string; unread?: number; sub?: string; preview?: string; time?: string; mention?: boolean;
}
export interface PulseDm { id: string; name: string; initials: string; preview: string; time: string; badge?: string }
export interface KudosItem { id: string; from: string; initials: string; icon: string; tone: string; time: string; text: string }
export interface Kudos { newCount: number; total: number; latest: string; feed: KudosItem[] }
export interface PulseCardAction { label: string; primary?: boolean; openLeads?: boolean }
export interface PulseCard {
  icon: string; title: string; badge?: string; fields: [string, string][]; actions: PulseCardAction[];
}
export interface PulseSender { who: string; initials: string; bg?: string; color?: string; bot?: boolean; mine?: boolean }
export interface PulseReply extends PulseSender { text: string }
export interface PulseMessage extends PulseSender { id: string; text?: string; time?: string; card?: PulseCard }
export interface PulseThread { title: string; dateLabel: string; reply?: PulseReply; messages: PulseMessage[] }
export interface NeedsInputTask { id: string; question: string; context: string; options: string[] }
