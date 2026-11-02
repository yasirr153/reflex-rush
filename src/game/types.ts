// ─── Game State Machine Types ────────────────────────────────────────────────

export type GameState =
  | 'IDLE'
  | 'COUNTDOWN'
  | 'WAITING'
  | 'GO'
  | 'RESULT'
  | 'FALSE_START'
  | 'NEXT_ROUND'
  | 'FINAL_RESULT';

// ─── Round Data ───────────────────────────────────────────────────────────────

export type RoundStatus = 'pending' | 'valid' | 'false_start' | 'suspicious';

export interface RoundResult {
  roundNumber: number;
  status: RoundStatus;
  reactionTime: number | null; // ms, null for false starts
  goTimestamp: number | null;   // performance.now() when GO fired
  inputTimestamp: number | null; // performance.now() when player reacted
}

// ─── Personal Best ────────────────────────────────────────────────────────────

export interface PersonalBest {
  bestAverage: number;
  bestSingle: number;
  dateAchieved: string; // ISO string
}

// ─── Final Score Summary ──────────────────────────────────────────────────────

export interface ScoreSummary {
  rounds: RoundResult[];
  validTimes: number[];
  average: number | null;
  best: number | null;
  worst: number | null;
  falseStartCount: number;
  performanceCategory: PerformanceCategory;
  isNewBestAverage: boolean;
  isNewBestSingle: boolean;
}

// ─── Performance Categories ───────────────────────────────────────────────────

export type PerformanceCategory =
  | 'Lightning'
  | 'Excellent'
  | 'Very Fast'
  | 'Fast'
  | 'Average'
  | 'Slow'
  | 'Keep Practising'
  | 'N/A';

// ─── Game Config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  totalRounds: number;
  minWaitMs: number;
  maxWaitMs: number;
  countdownSeconds: number;
  resultDisplayMs: number;
  nextRoundDelayMs: number;
  suspiciousThresholdMs: number; // below this → flag as suspicious
}

// ─── Engine Events ────────────────────────────────────────────────────────────

export type EngineEventType =
  | 'stateChanged'
  | 'countdownTick'
  | 'roundComplete'
  | 'gameComplete';

export interface EngineEvent<T = unknown> {
  type: EngineEventType;
  payload: T;
}

export interface StateChangedPayload {
  state: GameState;
  previousState: GameState;
  roundNumber: number;
  totalRounds: number;
  countdownValue?: number;
  lastResult?: RoundResult;
}

export interface GameCompletePayload {
  summary: ScoreSummary;
  personalBest: PersonalBest | null;
}
