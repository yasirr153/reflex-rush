/**
 * Sharing — Web Share API with clipboard fallback.
 * Challenge URL encoding/decoding.
 */

export interface ShareData {
  averageMs: number | null;
  bestMs: number | null;
  falseStarts: number;
  category: string;
}

export class Sharing {
  private _supportsShare: boolean;
  private _supportsClipboard: boolean;

  constructor() {
    this._supportsShare = typeof navigator.share === 'function';
    this._supportsClipboard =
      typeof navigator.clipboard !== 'undefined' &&
      typeof navigator.clipboard.writeText === 'function';
  }

  get canShare(): boolean {
    return this._supportsShare;
  }

  get canCopy(): boolean {
    return this._supportsClipboard;
  }

  private _buildText(data: ShareData): string {
    const avg = data.averageMs !== null ? `${Math.round(data.averageMs)} ms` : 'N/A';
    const best = data.bestMs !== null ? `${Math.round(data.bestMs)} ms` : 'N/A';
    const url = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const challengeParam = data.averageMs ? `?challenge=${Math.round(data.averageMs)}` : '';
    return [
      `⚡ FLASH REACT`,
      `Average: ${avg} | Best: ${best} | Category: ${data.category}`,
      `False starts: ${data.falseStarts}`,
      `Can you beat me? ${url}${challengeParam}`,
    ].join('\n');
  }

  async share(data: ShareData): Promise<'shared' | 'cancelled' | 'unsupported' | 'error'> {
    if (!this._supportsShare) return 'unsupported';
    const avg = data.averageMs !== null ? `${Math.round(data.averageMs)} ms` : 'N/A';
    try {
      await navigator.share({
        title: 'FLASH REACT — My Reaction Time',
        text: `I got ${avg} on FLASH REACT. Can you beat me?`,
        url: typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname +
            (data.averageMs ? `?challenge=${Math.round(data.averageMs)}` : '')
          : '',
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      return 'error';
    }
  }

  async copyToClipboard(data: ShareData): Promise<boolean> {
    const text = this._buildText(data);
    if (this._supportsClipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to execCommand
      }
    }
    // Legacy fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  // Challenge URL helpers
  static getChallengeScore(): number | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('challenge');
      if (!raw) return null;
      const n = parseInt(raw, 10);
      if (isNaN(n) || n <= 0 || n > 9999) return null;
      return n;
    } catch {
      return null;
    }
  }
}
