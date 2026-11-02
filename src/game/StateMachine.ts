import type { GameState } from './types';

// Legal state transitions
const TRANSITIONS: Record<GameState, GameState[]> = {
  IDLE:         ['COUNTDOWN'],
  COUNTDOWN:    ['WAITING', 'IDLE'],
  WAITING:      ['GO', 'FALSE_START', 'IDLE'],
  GO:           ['RESULT', 'IDLE'],
  RESULT:       ['NEXT_ROUND', 'IDLE'],
  FALSE_START:  ['NEXT_ROUND', 'IDLE'],
  NEXT_ROUND:   ['WAITING', 'FINAL_RESULT', 'IDLE'],
  FINAL_RESULT: ['IDLE'],
};

export class StateMachine {
  private _state: GameState = 'IDLE';

  get state(): GameState {
    return this._state;
  }

  canTransition(to: GameState): boolean {
    return TRANSITIONS[this._state]?.includes(to) ?? false;
  }

  transition(to: GameState): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid transition: ${this._state} → ${to}`);
    }
    this._state = to;
  }

  reset(): void {
    this._state = 'IDLE';
  }
}
