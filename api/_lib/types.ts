// Shared backend types for the Vercel functions (types only, no runtime code).

// ---------- Gemini ----------
export interface GeminiPart { text?: string; inlineData?: { data?: string; mimeType?: string } }
export interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }
export interface GeminiResponse { candidates?: { content?: { parts?: GeminiPart[] } }[] }

/** One chat line sent by the browser / phone loop. role is 'ai' | 'cust' | 'agent'. */
export interface ChatMessage { role: string; text: unknown }
export interface Lead { name?: string; product?: string; price?: number | string }
export interface Persona {
  name?: string; product?: string; budget?: string; trait?: string; concerns?: string[];
  lang?: string; scenario?: string; boss?: string;
}
export interface ReplyResult { reply: string | null; source: string }
export interface CoachNote { delta: number; whisper: string }
export interface CoachResult { coach: CoachNote | null; source: string }
export interface SpeakResult { audio: string | null; rate?: number; source: string }
export interface CallReview {
  score: number; summary: string;
  skills: { greeting: number; discovery: number; objections: number; closing: number; tone: number; empathy: number };
  strengths: string[]; improve: string[];
}
export interface ReviewResult { review: CallReview | null; source: string }
export interface Csat { stars: number; mood: string; comment: string }
export interface CsatResult { csat: Csat | null; source: string }
export interface CrmNotes {
  summary: string; budget: string; timeline: string; objection: string; nextStep: string; siteVisit: boolean; interest: string;
}
export interface NotesResult { notes: CrmNotes | null; source: string }

// ---------- AI phone call state (travels inside the webhook URL) ----------
export interface AiCallState {
  p: string; n: number; sil: number; c: number; h: [string, string][]; l: Lead;
}
/** A Vonage NCCO instruction (talk / input ...). */
export interface NccoAction { action: string; [key: string]: unknown }

// ---------- Redis / store ----------
export type RedisArg = string | number;
/** A live-transcript / provider-webhook event kept in a Redis list. */
export interface CallEvent {
  t?: string | number; ev?: string; d?: string; v?: string; said?: string; who?: string; text?: string; src?: string;
}
export interface ConvMemory { items: Map<string, Conversation>; order: string[] }
export interface SaveResult { duplicate: boolean }

// ---------- Twilio / Vonage REST ----------
export interface TwilioEnv {
  sid?: string; token?: string; apiKey?: string; apiSecret?: string; appSid?: string; number?: string; passcode: string;
}
export interface TwilioRestData {
  sid?: string; status?: string; code?: number | string; message?: string; type?: string; voice_url?: string;
  incoming_phone_numbers?: unknown[]; outgoing_caller_ids?: { phone_number?: string }[];
  low_risk_numbers_enabled?: boolean;
}
export interface TwilioResponse { ok: boolean; status: number; data: TwilioRestData }
export interface VonageEnv { appId: string; key: string; from: string }
export interface VonageRestData {
  uuid?: string; status?: string; title?: string; detail?: string; error_title?: string; message?: string; raw?: string;
  [key: string]: unknown;
}
export interface VonageResponse { ok: boolean; status: number; data: VonageRestData }
export interface VonageKeyStatus {
  appIdSet: boolean; appIdLooksRight: boolean; keySet: boolean; keyLength: number; keyHasBeginLine: boolean; keyParses: boolean;
}
export interface FriendlyError { error: string; code?: number; detail?: string }

// ---------- Diagnose ----------
export interface DiagnoseCheck { name: string; ok: boolean; fix?: string; verified?: string[] }

// ---------- Telephony ----------
export type ProviderId = 'vobiz' | 'plivo' | 'twilio' | 'exotel' | 'ozonetel' | 'knowlarity' | 'tata' | 'custom';
/** Provider credentials / settings: string fields keyed by name (e.g. vobiz: id, token, base; exotel: sid, key, token, sub;
 *  ozonetel: key, user, campaign, agentId, base; knowlarity: key, auth, number; tata: token, base; custom: url, method, headers, body, idPath). */
export type ProviderFields = Record<string, string>;
export type VobizConfig = ProviderFields;
export type PlivoConfig = ProviderFields;
export type TwilioProviderConfig = ProviderFields;
export type ExotelConfig = ProviderFields;
export type OzonetelConfig = ProviderFields;
export type KnowlarityConfig = ProviderFields;
export type TataConfig = ProviderFields;
export type CustomProviderConfig = ProviderFields;

/** Stored telephony configuration (Redis `tel:config`, or built from env vars). */
export interface TelephonyConfig {
  provider: string; callerId: string; dids: string[];
  vobiz: VobizConfig; plivo: PlivoConfig; twilio: TwilioProviderConfig; exotel: ExotelConfig;
  ozonetel: OzonetelConfig; knowlarity: KnowlarityConfig; tata: TataConfig; custom: CustomProviderConfig;
  saved?: boolean;
}
export type TelephonyPatch = { provider?: string; callerId?: string; dids?: string[] } & { [K in ProviderId]?: ProviderFields };
/** What the browser may see (no secrets). */
export interface TelephonyView {
  provider: string; ready: boolean; missing: string[]; callerId: string | null; dids: string[]; saved: boolean; authIdHint: string;
}
export interface CallUrls { answer: string; ring: string; hangup: string }
export interface StartParams { agentPhone: string | null; to: string; urls: CallUrls; ref: string; agentId?: string }
export type StartResult = { ok: true; id: string } | { ok: false; error: string; status?: number };
export interface StatusResult { status: string; detail?: string }
export type AnswerXmlFn = (to: string, cid: string, base: string, ref: string) => string;
export interface TelephonyAdapter {
  /** Returns '' when the keys are accepted, otherwise a sentence saying what is wrong. */
  verify(c: TelephonyConfig): Promise<string>;
  start(c: TelephonyConfig, p: StartParams): Promise<StartResult>;
  status(c: TelephonyConfig, ref: string): Promise<StatusResult>;
  hangup(c: TelephonyConfig, ref: string): Promise<void>;
  answerXml?: AnswerXmlFn;
}
export interface XmlTelephonyAdapter extends TelephonyAdapter { answerXml: AnswerXmlFn }
/** Per-call context kept in Redis for the provider's answer URL. */
export interface TelCtx { to: string; cid: string | null; agentPhone: string | null; provider: string }
/** Vendor JSON: shape differs per provider, so it is read loosely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProviderJson = { [key: string]: any };
export interface WebSetupStep { step: string; status: number; body: string }

// ---------- Ingest ----------
export interface IngestPayload {
  conversation_id?: string; source?: string; type?: string; direction?: string; vertical?: string; tenant?: string; project_code?: string;
  started_at?: string; ended_at?: string; duration_sec?: number | string; language?: string;
  handled_by?: string; ai_agent?: string; handover?: boolean;
  agent?: { employee_id?: string; name?: string; email?: string };
  customer?: { phone?: string; name?: string; crm_id?: string; lead_id?: string };
  consent?: { status?: string; captured_at?: string; proof_ref?: string };
  transcript?: { speaker?: string; text?: string; t?: number | string }[];
  audio_url?: string; summary?: string; outcome?: string; csat?: number | string; csat_comment?: string;
  sop?: { step?: string; passed?: boolean; quote?: string }[];
  signals?: { category?: string; quote?: string }[];
  interest?: { product?: string; price?: number | string; cross_sell?: string };
  scores?: { icp?: number | string; intent?: number | string };
  follow_up?: { type?: string; at?: string; title?: string };
  tags?: string[];
}
export interface SopResult { step: string; label: string; passed: boolean; quote: string }
export interface SignalHit { category: string; quote: string }
export interface TranscriptLine { speaker: 'customer' | 'agent'; text: string; t: number | undefined }
export interface LandedSurface { surface: string; where: string; action?: string }
export interface Conversation {
  conversation_id: string; source: string | undefined; type: string | undefined; direction: string | undefined;
  vertical: string; tenant: string | undefined; project_code: string | undefined;
  started_at: string; ended_at: string | undefined; duration_sec: number; language: string | undefined;
  handled_by: 'ai' | 'human'; ai_agent: string | undefined; handover: boolean;
  agent: { employee_id: string | undefined; name: string | undefined; email: string | undefined };
  customer: { phone: string | undefined; name: string | undefined; crm_id: string | undefined; lead_id: string | undefined };
  consent: { status: string; captured_at: string | undefined; proof_ref: string | undefined };
  transcript: TranscriptLine[]; audio_url: string | undefined; summary: string;
  outcome: string | undefined; csat_comment: string | undefined; csat: number | undefined;
  sop: SopResult[]; sop_score: number | undefined; signals: SignalHit[];
  interest: { product: string | undefined; price: number | undefined; cross_sell: string | undefined } | undefined;
  scores: { icp: number | undefined; intent: number | undefined } | undefined;
  follow_up: { type: 'callback' | 'site_visit'; at: string; title: string | undefined } | undefined;
  received_at: string;
  tags?: string[]; landed?: LandedSurface[];
}
export interface IngestOneResult {
  ok: boolean; conversation_id?: string; duplicate?: boolean; tags?: string[]; landed?: LandedSurface[]; details?: string[];
}

// ---------- Handler helpers ----------
export interface StepRow { name: string; ok: boolean; detail: string }
