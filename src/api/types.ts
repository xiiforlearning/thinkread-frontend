/**
 * Shapes returned by the ThinkRead REST API (`src/infra/api/me/serializers.ts`
 * in the backend). Keep in sync by hand — the API is the source of truth.
 */

export type AccessStatus = 'NOT_MEMBER' | 'PENDING_NAME' | 'ACTIVE' | 'ARCHIVED' | 'STAFF';
export type ApiRole = 'STUDENT' | 'TEACHER' | 'OWNER';

export type GroupLevel =
  'PRE_INTERMEDIATE' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED' | 'IELTS';
export type ListeningMethod = 'PODCAST_WITH_SCRIPT' | 'SERIES' | 'PODCAST_NO_TRANSCRIPT';

export type ReportType = 'READING' | 'LISTENING';
/** REMOVED = deleted by the student or the teacher (W5); never listed, revived on a re-add. */
export type WordStatus = 'LEARNING' | 'LEARNED' | 'REMOVED';
export type WordPriority = 'HIGH' | 'NORMAL';
export type WordSource = 'READING' | 'PODCAST' | 'SERIES' | 'MANUAL' | 'IMPORT' | 'TEACHER';
export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface WebAppAuth {
  status: AccessStatus;
  roles: ApiRole[];
  token: string | null;
  startParam: string | null;
}

export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  username: string | null;
  status: string;
  level: GroupLevel | null;
  listeningMethod: ListeningMethod;
  retellingRequired: boolean;
  groups: Array<{ chatId: string; title: string; level: GroupLevel | null }>;
  calmMode: boolean;
  calmUntil: string | null;
  registeredAt: string | null;
  /** Interface language the student chose; null until chosen (the app then uses Telegram's). */
  language: 'ru' | 'en' | null;
}

/** One submission window of the week (N1): Mon–Tue, Wed–Thu, Fri–Sun. */
export interface Slot {
  slot: number;
  /** First and last local day, `YYYY-MM-DD`. */
  from: string;
  to: string;
  state: 'done' | 'open' | 'missed' | 'upcoming';
}

export interface NormPart {
  /** Windows filled, not reports handed in: two reports in one window count once. */
  done: number;
  norm: number;
  /** Absent in the dashboard's calendar, present in the Mini App's week. */
  slots?: Slot[];
}

export interface Week {
  weekStart: string;
  reading: NormPart;
  listening: NormPart;
}

export interface Progress {
  week: Week;
  cards: TodayCards & { due: number; available: boolean };
  words: { total: number; learning: number; learned: number; priority: number };
}

export interface TodayCards {
  /** Answered today (right or wrong) — the daily norm counts these. */
  done: number;
  correct: number;
  norm: number;
}

export interface CardView {
  attemptId: string;
  wordId: string;
  word: string;
  stage: 1 | 2 | 3;
  stageLabel: string;
  question: string;
  /** Big text on the card: the translation (stage 1), nothing (stage 2), the word (stage 3). */
  shown: string | null;
  hint: string | null;
  placeholder: string;
  canGiveUp: boolean;
  today: TodayCards;
}

/** The cards screen gets numbers only: the words themselves would be the answers of the next cards. */
export interface CardQueueCounts {
  due: number;
  overdue: number;
  priority: number;
}

/**
 * A row of the queue screen, in card order. `label` is what the student may see without a
 * spoiler: the translation on stages 1–2, the word on stage 3 (`word` is set only then).
 */
export interface CardQueueEntry {
  id: string;
  label: string;
  word: string | null;
  stage: 1 | 2 | 3;
  priority: WordPriority;
  source: WordSource;
  overdue: boolean;
  reason: 'OVERDUE' | 'PRIORITY' | 'DUE';
  nextDueAt: string;
}

export interface CardsState {
  today: TodayCards;
  queue: CardQueueCounts;
  current: CardView | null;
}

export interface CardAnswer {
  attemptId: string;
  correct: boolean;
  expected: string;
  message: string;
  feedback: string | null;
  advanced: boolean;
  learned: boolean;
  word: { id: string; stage: 1 | 2 | 3; status: WordStatus; nextDueAt: string };
  today: TodayCards;
}

export interface Word {
  id: string;
  word: string;
  translation: string | null;
  example: string | null;
  cefr: Cefr | null;
  status: WordStatus;
  stage: 1 | 2 | 3;
  priority: WordPriority;
  source: WordSource;
  sourceReportId: string | null;
  sourceListId: string | null;
  nextDueAt: string | null;
  createdAt: string;
  learnedAt: string | null;
}

export interface WordsQuery {
  q?: string;
  status?: WordStatus;
  cefr?: Cefr;
  source?: WordSource;
  priority?: WordPriority;
  limit?: number;
  cursor?: string;
}

export interface VocabularySummary {
  total: number;
  learning: number;
  learned: number;
  priority: number;
  byCefr: Record<string, number>;
  bySource: Record<string, number>;
}

export interface ImportItem {
  word: string;
  translation: string | null;
  duplicate: boolean;
}

export interface ImportPreview {
  importId: string;
  found: number;
  duplicates: number;
  toAdd: number;
  items: ImportItem[];
}

export type AddWordsResult =
  | ({ preview: true } & ImportPreview)
  | {
      preview: false;
      added: Word[];
      alreadyHad: Word[];
      alreadyLearned: Word[];
      /** Words left out by the daily cap (`dailyMax` per local day). */
      droppedDaily?: number;
      dailyMax?: number;
    };

export interface Report {
  id: string;
  type: ReportType;
  method: ListeningMethod | null;
  sourceTitle: string | null;
  episode: string | null;
  pages: number | null;
  summary: string | null;
  firstPassPct: number | null;
  secondPassPct: number | null;
  listenCount: number | null;
  unclearParts: string | null;
  /** How many new words this report put into the dictionary (`reports.words_added`). */
  wordsAdded: number;
  /** Confirmed with an empty word list — "без новых слов". */
  noNewWords: boolean;
  weekStart: string;
  createdAt: string;
}

export interface ReportPatch {
  sourceTitle?: string;
  episode?: string;
  pages?: number;
  summary?: string;
  firstPassPct?: number;
  secondPassPct?: number;
  listenCount?: number;
}

/** One line of the word list on the confirmation screen. */
export interface DraftWord {
  word: string;
  translation: string | null;
  /** Already in the dictionary — shown, not added. */
  duplicate: boolean;
  /** W6: `translation` is the AI's suggestion by the context of this report, not the student's. */
  suggested?: boolean;
  /** W6: the student's own sentence with the word — becomes the card's example. */
  context?: string | null;
  /** W6: A1 vocabulary — unticked by default, added only if the student ticks it. */
  basic?: boolean;
}

/** A word as the student leaves it on the confirmation screen. */
export interface ConfirmWord {
  word: string;
  translation?: string | null;
}

export type IntakeResult =
  | { status: 'CLARIFY'; draftId: string; missingFields: string[]; question: string }
  | {
      /**
       * The fields are complete; the report is saved and counted only after the student confirms
       * the word list (customer decision 02.11.2026). `hasList` = the student wrote an explicit
       * list; false = the screen asks "any new words?".
       */
      status: 'CONFIRM_WORDS';
      draftId: string;
      type: ReportType;
      hasList: boolean;
      words: DraftWord[];
      /** Words beyond the per-report cap that were left out. */
      dropped: number;
      minWords: number;
      maxWords: number;
    }
  | {
      status: 'SAVED';
      report: Report;
      weekProgress: Week;
      /** The words of the report: new ones (now in the dictionary), the ones the student already had, and how many the daily cap left out. */
      words: { added: string[]; alreadyHad: string[]; droppedDaily: number };
      /** The window the report fell into; `slotClosed` = it was already filled, no new slot opened. */
      slot: number | null;
      slotClosed: boolean;
    };

export interface Recommendation {
  list: { id: string; title: string };
  items: Array<{ id: string; word: string; translation: string | null }>;
}

export interface SpotCheck {
  id: string;
  question: string;
  sourceTitle: string | null;
}

export interface Page<T> {
  data: T[];
  meta: { nextCursor: string | null };
}

/** `{ error: { code, message, details } }` from the API, or a transport failure. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** `{level}{service}{error}` — the last three digits are the error code. */
  get errorCode(): string {
    return this.code.slice(-3);
  }
}

/** Error codes (last three digits of `{level}{service}{error}`) the UI reacts to. */
export const ERR = {
  NOT_FOUND: '002',
  PARSE_EMPTY: '254',
  DAILY_LIMIT: '260',
  NAME_INVALID: '261',
  WORDS_REQUIRED: '262',
  REPORT_TOO_LONG: '263',
  IMPORT_EXPIRED: '258',
  AI_UNAVAILABLE: '310',
  AI_RATE_LIMITED: '311',
  TOO_MANY_REQUESTS: '951',
  INVALID_TOKEN: '952',
  INIT_DATA_INVALID: '953',
  INIT_DATA_EXPIRED: '954',
} as const;
