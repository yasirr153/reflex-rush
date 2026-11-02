/**
 * Renderer — Single source of truth for DOM updates.
 *
 * Receives game state and data, mutates the DOM.
 * All screen classes are created once and toggled via CSS class.
 */

import type { GameState, RoundResult, ScoreSummary, PersonalBest } from '../game/types';
import { renderHomeScreen } from './screens/HomeScreen';
import { renderGameScreen } from './screens/GameScreen';
import { renderResultsScreen } from './screens/ResultsScreen';

export type Screen = 'home' | 'game' | 'results';

export interface RenderContext {
  state: GameState;
  roundNumber: number;
  totalRounds: number;
  countdownValue?: number;
  lastResult?: RoundResult;
  summary?: ScoreSummary;
  personalBest?: PersonalBest | null;
  challengeScore?: number | null;
}

export class Renderer {
  private _root: HTMLElement;
  private _currentScreen: Screen | null = null;
  private _transitionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(rootId: string) {
    const el = document.getElementById(rootId);
    if (!el) throw new Error(`Root element #${rootId} not found`);
    this._root = el;
  }

  render(ctx: RenderContext): void {
    const targetScreen = this._getTargetScreen(ctx.state);

    if (targetScreen !== this._currentScreen) {
      this._switchScreen(targetScreen, ctx);
    } else {
      this._updateScreen(targetScreen, ctx);
    }
  }

  private _getTargetScreen(state: GameState): Screen {
    switch (state) {
      case 'IDLE':
        return 'home';
      case 'FINAL_RESULT':
        return 'results';
      default:
        return 'game';
    }
  }

  private _switchScreen(screen: Screen, ctx: RenderContext): void {
    this._currentScreen = screen;

    // Render immediately so the initial home screen is never blank and rapid
    // state changes cannot leave an obsolete delayed render on screen.
    if (this._transitionTimer !== null) {
      clearTimeout(this._transitionTimer);
      this._transitionTimer = null;
    }

    this._root.style.opacity = '0';
    this._root.style.transform = 'scale(0.98)';

    switch (screen) {
      case 'home':
        this._root.innerHTML = renderHomeScreen(ctx);
        break;
      case 'game':
        this._root.innerHTML = renderGameScreen(ctx);
        break;
      case 'results':
        this._root.innerHTML = renderResultsScreen(ctx);
        break;
    }

    // Keep the transition cosmetic; the DOM is already available to input.
    this._transitionTimer = setTimeout(() => {
      this._root.style.opacity = '1';
      this._root.style.transform = 'scale(1)';
      this._transitionTimer = null;
    }, 20);
  }

  private _updateScreen(screen: Screen, ctx: RenderContext): void {
    if (screen === 'game') {
      // Partial updates for game screen to avoid full re-renders
      this._updateGameArea(ctx);
    }
    // Home and results are mostly static once rendered
  }

  private _updateGameArea(ctx: RenderContext): void {
    const area = document.getElementById('game-area');
    if (!area) {
      // Full re-render if area missing
      this._switchScreen('game', ctx);
      return;
    }

    // Remove all state classes
    area.className = 'game-area';
    area.classList.add(`state-${ctx.state.toLowerCase()}`);

    const label = document.getElementById('game-label');
    const sub = document.getElementById('game-sublabel');
    const countdown = document.getElementById('countdown-display');
    const roundIndicator = document.getElementById('round-indicator');
    const dots = document.querySelectorAll<HTMLElement>('.round-dot');

    if (roundIndicator) {
      roundIndicator.textContent = `Round ${ctx.roundNumber} of ${ctx.totalRounds}`;
    }

    dots.forEach((dot, index) => {
      const dotState = index < ctx.roundNumber - 1
        ? 'done'
        : index === ctx.roundNumber - 1 ? 'active' : 'pending';
      dot.classList.remove('dot-done', 'dot-active', 'dot-pending');
      dot.classList.add(`dot-${dotState}`);
    });

    switch (ctx.state) {
      case 'COUNTDOWN':
        if (label) label.textContent = String(ctx.countdownValue ?? '');
        if (sub) sub.textContent = 'Get ready…';
        if (countdown) {
          countdown.textContent = String(ctx.countdownValue ?? '');
          countdown.style.display = 'block';
        }
        area.setAttribute('aria-label', `Get ready. ${ctx.countdownValue}`);
        break;

      case 'WAITING':
        if (label) label.textContent = '⚡';
        if (sub) sub.textContent = 'Wait for it…';
        if (countdown) countdown.style.display = 'none';
        area.setAttribute('aria-label', 'Waiting for signal. Do not react yet.');
        break;

      case 'GO':
        if (label) label.textContent = 'TAP!';
        if (sub) sub.textContent = 'React now!';
        if (countdown) countdown.style.display = 'none';
        area.setAttribute('aria-label', 'Go! Tap now!');
        break;

      case 'RESULT': {
        const rt = ctx.lastResult;
        if (rt?.status === 'valid' || rt?.status === 'suspicious') {
          const ms = rt.reactionTime ?? 0;
          if (label) label.textContent = `${ms} ms`;
          if (sub) {
            const isSuspicious = rt.status === 'suspicious';
            sub.textContent = isSuspicious
              ? 'That was very fast — double-check reaction!'
              : ms < 200 ? '🔥 Insane!' : ms < 280 ? '⚡ Great!' : 'Good!';
          }
        }
        area.setAttribute('aria-label', `Result: ${ctx.lastResult?.reactionTime ?? 0} milliseconds`);
        break;
      }

      case 'FALSE_START':
        if (label) label.textContent = '✗';
        if (sub) sub.textContent = 'Too early! Wait for the flash.';
        area.setAttribute('aria-label', 'False start. You reacted too early.');
        break;

      case 'NEXT_ROUND':
        if (label) label.textContent = '→';
        if (sub) sub.textContent = 'Next round…';
        area.setAttribute('aria-label', 'Next round starting.');
        break;
    }
  }
}
