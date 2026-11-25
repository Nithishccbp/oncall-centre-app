// Types for src/services/** (AI agent, call notes, CSAT, live call, phone call, practice engine, practice review).

import type { PracticePersona as DataPersona } from './data';

// ---------- Browser speech recognition ----------
export interface SpeechRecognitionAlternativeLike { transcript: string; confidence: number }
export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}
export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: SpeechRecognitionResultLike };
}
export interface SpeechRecognitionErrorEventLike { readonly error: string }
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    webkitAudioContext?: typeof AudioContext;
    Vobiz?: VobizCtor & { default?: VobizCtor };
  }
}

// ---------- Shared ----------
export type Role = 'user' | 'agent' | 'cust' | 'assistant' | 'model';
export interface ChatMessage { role: string; text: string }
export type CallParty = 'agent' | 'cust';
export interface TranscriptLine { who: CallParty; text: string; ai?: boolean }
export type TextLine = { who: string; text: string };

/** Lead facts handed to the AI agent / calls. */
export interface AiLead {
  name?: string;
  product?: string;
  price?: number | string;
  crossSell?: unknown;
  [key: string]: any;
}

// ---------- aiAgent ----------
export interface AiAgentRequest { messages: ChatMessage[]; lead?: AiLead }
export interface AiAgentResponse { reply?: string; source?: string }
export interface AiReply { text: string; source: string }

// ---------- callNotes ----------
export type ObjectionKey = 'price' | 'loan' | 'possession' | 'location' | 'family' | 'competitor' | 'time' | 'trust' | 'none';
export type InterestLevel = 'hot' | 'warm' | 'cold';
export interface CallNotes {
  summary: string;
  budget: string;
  timeline: string;
  objection: string;
  nextStep: string;
  siteVisit: boolean;
  interest: string;
  source: string;
  [key: string]: any;
}
export interface NotesResponse { notes?: Record<string, unknown> }

// ---------- csatEstimate ----------
export interface CsatEstimate { stars: number; comment: string; source: string }
export interface CsatResponse { csat?: { stars?: number; comment?: string } }

// ---------- liveCall ----------
export type LiveCallMode = 'human' | 'ai' | 'webphone' | 'staffphone' | 'phone' | 'aiphone';
export interface PeerOptionsLike { host?: string; port?: number; path?: string; secure?: boolean }
export interface CaptionsHandle { stop(): void }
export interface LiveCallHandlers {
  onLine: (line: TranscriptLine) => void;
  onEnd: (reason: string) => void;
  onConsent?: (v: string) => void;
}
export interface LiveCallOptions {
  mode: LiveCallMode;
  code?: string | number;
  phone?: string;
  lead?: AiLead;
  handlers: LiveCallHandlers;
}
export type LiveSignal = { type: string; [key: string]: unknown };
/** Wire messages arriving from the customer page over PeerJS. */
export interface PeerMessage { type: string; who?: CallParty; text?: string; ai?: boolean }

// ---------- phoneCall / telephony ----------
export interface ApiOptions { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }
export interface TelephonyConfig {
  reachable: boolean;
  phone?: boolean;
  aiPhone?: boolean;
  transcripts?: boolean;
  gemini?: boolean;
  [key: string]: any;
}
export interface WebCreds { u?: string; p?: string }
export interface PhoneHandlers {
  onEnd: (reason: string) => void;
  onLine?: (line: TranscriptLine) => void;
  onConsent?: (v: string) => void;
}
export interface PhoneCallOptions { phone?: string; handlers: PhoneHandlers }
export interface AiPhoneCallOptions { phone?: string; lead?: AiLead; handlers: PhoneHandlers }
export interface VoiceTokenResponse { token: string; identity: string; mode: string }
export interface CallStatusResponse {
  status?: string;
  detail?: string;
  next?: number;
  events: Array<{ t: string; v?: string; who?: string; text?: string }>;
}
export interface TelephonyStatusResponse { status?: string; detail?: string }

/** Minimal Vobiz WebRTC SDK surface used by phoneCall. */
export interface VobizClientLike {
  on(ev: string, cb: (...a: unknown[]) => void): void;
  login(user: string, pass: string): void;
  call(to: string): boolean | void;
  hangup(): void;
  mute(): void;
  unmute(): void;
}
export interface VobizInstanceLike { client: VobizClientLike }
export type VobizCtor = new (opts: Record<string, unknown>) => VobizInstanceLike;
export interface VobizCallbacks { [ev: string]: ((...a: unknown[]) => void) | undefined }

// ---------- practice engine ----------
export type PracticeMood = 'angry' | 'confused' | 'impatient' | 'worried' | 'friendly' | 'mixed';
export type PracticeLangKey = 'en' | 'hi' | 'te' | 'switch';
export type PracticeResult = 'won' | 'lost' | null;
export type PracticePersona = DataPersona & { lang?: string };
export interface PracticeTurn { role: 'agent' | 'cust'; text: string }
export interface TtsAudio { audio: string; rate?: number; source?: string }
export interface PracticeCoach { delta: number; whisper: string }
export interface TrustMeter { trust: number; delta: number; whisper: string }
export interface PracticeStartOptions {
  persona: PracticePersona;
  mood?: PracticeMood | string;
  lang?: PracticeLangKey | string;
  onLine: (line: TranscriptLine) => void;
  onEnd: (reason: string, result: PracticeResult) => void;
  onError?: (msg: string) => void;
  onMeter?: (m: TrustMeter) => void;
}
export interface PracticeSession {
  persona: PracticePersona;
  mood: string;
  lang: string;
  trust: number;
  result: PracticeResult;
  plan: string[];
  history: PracticeTurn[];
  busy: boolean;
  muted: boolean;
  alive: boolean;
  endAfter: boolean;
  rec: SpeechRecognitionLike | null;
  spokeAt: number;
}
export interface RingHandle { ctx: AudioContext; t: ReturnType<typeof setInterval> }

// ---------- practiceReview ----------
export type SkillKey = 'greeting' | 'discovery' | 'objections' | 'closing' | 'tone' | 'empathy';
export type SkillRow = readonly [SkillKey, string, number];
export type SkillScores = Record<SkillKey, number>;
export interface PracticeReview {
  score: number;
  stars: number;
  skills: SkillScores;
  strengths: string[];
  improve: string[];
  summary: string;
  source: string;
  seconds?: number;
  [key: string]: any;
}
export interface ReviewResponse { review?: { score?: number; skills?: unknown; [key: string]: unknown } }
