import type {
  GameState,
  GameConfig,
  RoundResult,
  ScoreSummary,
  PersonalBest,
  PerformanceCategory,
  StateChangedPayload,
  GameCompletePayload,
} from './types';
import { StateMachine } from './StateMachine';
import { Storage } from './Storage';
import { AudioEngine } from './Audio';

type Listener<T> = (payload: T) => void;

const DEFAULT_CONFIG: GameConfig = {
  totalRounds: 5,
  minWaitMs: 1500,
  maxWaitMs: 4500,
  countdownSeconds: 3,
  resultDisplayMs: 1400,
  nextRoundDelayMs: 600,
  suspiciousThresholdMs: 80,
};

export class GameEngine {
  private _sm = new StateMachine();
  private _storage: Storage;
  private _audio: AudioEngine;
  private _config: GameConfig;

  // Round state
  private _currentRound = 0;
  private _rounds: RoundResult[] = [];
  private _goTimestamp: number | null = null;
  private _roundLocked = false; // prevents duplicate input within a round

  // Timers
  private _waitTimer: ReturnType<typeof setTimeout> | null = null;
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;
  private _countdownValue = 0;

  // Pending next-round / result timers (so we can cancel on destroy)
  private _pendingTimers: ReturnType<typeof setTimeout>[] = [];

  // Page visibility
  private _visibilityHandler: (() => void) | null = null;

  // Event listeners
  private _stateListeners: Listener<StateChangedPayload>[] = [];
  private _completeListeners: Listener<GameCompletePayload>[] = [];

  constructor(audio: AudioEngine, storage: Storage, config: Partial<GameConfig> = {}) {
    this._audio = audio;
    this._storage = storage;
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._registerVisibilityHandler();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get state(): GameState {
    return this._sm.state;
  }

  get currentRound(): number {
    return this._currentRound;
  }

  get totalRounds(): number {
    return this._config.totalRounds;
  }

  get rounds(): RoundResult[] {
    return [...this._rounds];
  }

  get countdownValue(): number {
    return this._countdownValue;
  }

  onStateChanged(listener: Listener<StateChangedPayload>): void {
    this._stateListeners.push(listener);
  }

  onGameComplete(listener: Listener<GameCompletePayload>): void {
    this._completeListeners.push(listener);
  }

  startGame(): void {
    if (this._sm.state !== 'IDLE') return;
    this._reset();
    this._runCountdown();
  }

  /**
   * Primary input handler — called by UI for all mouse, touch, keyboard events.
   * Returns true if the input was consumed (prevents duplicate handling).
   */
  handleInput(): boolean {
    const state = this._sm.state;

    // Prevent any duplicate processing within a single round
    if (this._roundLocked) return false;

    if (state === 'WAITING') {
      // False start
      this._roundLocked = true;
      this._clearWaitTimer();
      this._recordFalseStart();
      return true;
    }

    if (state === 'GO') {
      this._roundLocked = true;
      const inputTime = performance.now();
      this._recordReaction(inputTime);
      return true;
    }

    return false;
  }

  playAgain(): void {
    this._cleanup();
    this._sm.reset();
    this._notifyState('IDLE');
  }

  destroy(): void {
    this._cleanup();
    this._unregisterVisibilityHandler();
    this._stateListeners = [];
    this._completeListeners = [];
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private _reset(): void {
    this._cleanup();
    this._rounds = [];
    this._currentRound = 0;
    this._goTimestamp = null;
    this._roundLocked = false;
  }

  private _cleanup(): void {
    this._clearWaitTimer();
    this._clearCountdownTimer();
    // Cancel all pending result/advance timers
    this._pendingTimers.forEach(t => clearTimeout(t));
    this._pendingTimers = [];
  }

  private _clearWaitTimer(): void {
    if (this._waitTimer !== null) {
      clearTimeout(this._waitTimer);
      this._waitTimer = null;
    }
  }

  private _clearCountdownTimer(): void {
    if (this._countdownTimer !== null) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  private _addPendingTimer(cb: () => void, delayMs: number): void {
    const id = setTimeout(() => {
      // Remove from list when it fires
      this._pendingTimers = this._pendingTimers.filter(t => t !== id);
      cb();
    }, delayMs);
    this._pendingTimers.push(id);
  }

  private _runCountdown(): void {
    this._countdownValue = this._config.countdownSeconds;
    // Transition to COUNTDOWN
    this._sm.transition('COUNTDOWN');
    this._notifyState('COUNTDOWN');
    this._audio.playCountdownTick();

    this._countdownTimer = setInterval(() => {
      this._countdownValue -= 1;
      if (this._countdownValue > 0) {
        this._audio.playCountdownTick();
        this._notifyState('COUNTDOWN');
      } else {
        this._clearCountdownTimer();
        this._startWaiting();
      }
    }, 1000);
  }

  private _startWaiting(): void {
    if (!this._sm.canTransition('WAITING')) return;
    this._roundLocked = false;
    this._goTimestamp = null;
    this._currentRound += 1;
    this._sm.transition('WAITING');
    this._notifyState('WAITING');

    const delay =
      this._config.minWaitMs +
      Math.random() * (this._config.maxWaitMs - this._config.minWaitMs);

    this._waitTimer = setTimeout(() => {
      this._waitTimer = null;
      this._triggerGo();
    }, delay);
  }

  private _triggerGo(): void {
    if (!this._sm.canTransition('GO')) return;
    // Capture timestamp BEFORE DOM update so reaction delta is accurate.
    // The renderer will receive this event and mutate the DOM immediately after.
    this._goTimestamp = performance.now();
    this._sm.transition('GO');
    this._notifyState('GO');
    this._audio.playGo();
  }

  private _recordReaction(inputTime: number): void {
    if (this._goTimestamp === null) return;
    const raw = inputTime - this._goTimestamp;
    const isSuspicious = raw < this._config.suspiciousThresholdMs;

    const round: RoundResult = {
      roundNumber: this._currentRound,
      status: isSuspicious ? 'suspicious' : 'valid',
      reactionTime: Math.round(raw),
      goTimestamp: this._goTimestamp,
      inputTimestamp: inputTime,
    };

    this._rounds.push(round);
    this._audio.playResult(raw);
    this._sm.transition('RESULT');
    this._notifyState('RESULT', round);

    this._addPendingTimer(() => this._advanceRound(), this._config.resultDisplayMs);
  }

  private _recordFalseStart(): void {
    const round: RoundResult = {
      roundNumber: this._currentRound,
      status: 'false_start',
      reactionTime: null,
      goTimestamp: null,
      inputTimestamp: performance.now(),
    };

    this._rounds.push(round);
    this._audio.playFalseStart();
    this._sm.transition('FALSE_START');
    this._notifyState('FALSE_START', round);

    this._addPendingTimer(() => this._advanceRound(), this._config.resultDisplayMs + 200);
  }

  private _advanceRound(): void {
    if (!this._sm.canTransition('NEXT_ROUND')) return;
    this._sm.transition('NEXT_ROUND');
    this._notifyState('NEXT_ROUND');

    if (this._currentRound >= this._config.totalRounds) {
      this._addPendingTimer(() => this._finalise(), this._config.nextRoundDelayMs);
    } else {
      this._addPendingTimer(() => this._startWaiting(), this._config.nextRoundDelayMs);
    }
  }

  private _finalise(): void {
    if (!this._sm.canTransition('FINAL_RESULT')) return;

    const summary = this._buildSummary();
    this._updatePersonalBest(summary);

    if (summary.isNewBestAverage || summary.isNewBestSingle) {
      this._audio.playNewPersonalBest();
    }

    this._sm.transition('FINAL_RESULT');
    const personalBest = this._storage.getPersonalBest();
    this._emitComplete({ summary, personalBest });
  }

  private _buildSummary(): ScoreSummary {
    const validTimes = this._rounds
      .filter(r => r.status === 'valid' || r.status === 'suspicious')
      .map(r => r.reactionTime as number);

    const average = validTimes.length
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : null;

    const best = validTimes.length ? Math.min(...validTimes) : null;
    const worst = validTimes.length ? Math.max(...validTimes) : null;
    const falseStartCount = this._rounds.filter(r => r.status === 'false_start').length;
    const category = this._getCategory(average);

    return {
      rounds: [...this._rounds],
      validTimes,
      average,
      best,
      worst,
      falseStartCount,
      performanceCategory: category,
      isNewBestAverage: false,
      isNewBestSingle: false,
    };
  }

  private _getCategory(ms: number | null): PerformanceCategory {
    if (ms === null) return 'N/A';
    if (ms < 180)  return 'Lightning';
    if (ms < 221)  return 'Excellent';
    if (ms < 261)  return 'Very Fast';
    if (ms < 321)  return 'Fast';
    if (ms < 401)  return 'Average';
    if (ms < 501)  return 'Slow';
    return 'Keep Practising';
  }

  private _updatePersonalBest(summary: ScoreSummary): void {
    const existing = this._storage.getPersonalBest();

    const pb: PersonalBest = {
      bestAverage: existing?.bestAverage ?? Infinity,
      bestSingle:  existing?.bestSingle  ?? Infinity,
      dateAchieved: existing?.dateAchieved ?? '',
    };

    let updated = false;

    if (summary.average !== null && summary.average < pb.bestAverage) {
      pb.bestAverage = summary.average;
      summary.isNewBestAverage = true;
      updated = true;
    }

    if (summary.best !== null && summary.best < pb.bestSingle) {
      pb.bestSingle = summary.best;
      summary.isNewBestSingle = true;
      updated = true;
    }

    if (updated) {
      pb.dateAchieved = new Date().toISOString();
      this._storage.savePersonalBest(pb);
    }
  }

  // ── State & Event emission ───────────────────────────────────────────────────

  private _notifyState(state: GameState, lastResult?: RoundResult): void {
    const payload: StateChangedPayload = {
      state,
      previousState: state, // UI doesn't use previousState
      roundNumber: this._currentRound,
      totalRounds: this._config.totalRounds,
      countdownValue: this._countdownValue,
      lastResult,
    };
    this._stateListeners.forEach(fn => fn(payload));
  }

  private _emitComplete(payload: GameCompletePayload): void {
    // Notify complete listeners first so they can store summary
    this._completeListeners.forEach(fn => fn(payload));
  }

  // ── Page Visibility ─────────────────────────────────────────────────────────

  private _registerVisibilityHandler(): void {
    this._visibilityHandler = () => {
      if (!document.hidden) return; // Only act when page becomes hidden

      const state = this._sm.state;
      if (state !== 'WAITING' && state !== 'GO') return;

      // Invalidate the current round — cancel timers, decrement round counter,
      // then restart that round after the user returns.
      this._clearWaitTimer();
      this._roundLocked = false;
      this._goTimestamp = null;
      this._currentRound -= 1; // will be re-incremented in _startWaiting

      // Force state machine back to a legal re-entry point.
      // We can't go directly to WAITING from GO/WAITING without going through
      // IDLE, so we do a full reset and re-enter COUNTDOWN path.
      this._sm.reset();

      // Emit a "get ready" countdown when visibility returns
      const resume = () => {
        document.removeEventListener('visibilitychange', resume);
        if (this._sm.state !== 'IDLE') return; // engine was destroyed/reset
        this._sm.transition('COUNTDOWN');
        this._countdownValue = 2;
        this._notifyState('COUNTDOWN');
        this._addPendingTimer(() => this._startWaiting(), 1000);
      };

      document.addEventListener('visibilitychange', resume);
      // Also show a paused indicator immediately
      this._notifyState('COUNTDOWN');
    };

    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  private _unregisterVisibilityHandler(): void {
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }
}
