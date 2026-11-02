/**
 * Storage — LocalStorage wrapper with full error isolation.
 * All methods are safe to call even when localStorage is blocked or unavailable.
 */

import type { PersonalBest } from './types';

const STORAGE_KEY = 'flash-react-pb';

export class Storage {
  private _available: boolean;

  constructor() {
    this._available = this._checkAvailability();
  }

  private _checkAvailability(): boolean {
    try {
      const test = '__flash-react-test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  get isAvailable(): boolean {
    return this._available;
  }

  getPersonalBest(): PersonalBest | null {
    if (!this._available) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersonalBest;
      // Validate shape
      if (
        typeof parsed.bestAverage === 'number' &&
        typeof parsed.bestSingle === 'number' &&
        typeof parsed.dateAchieved === 'string'
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  savePersonalBest(pb: PersonalBest): boolean {
    if (!this._available) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pb));
      return true;
    } catch {
      return false;
    }
  }

  clearPersonalBest(): void {
    if (!this._available) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silent
    }
  }
}
