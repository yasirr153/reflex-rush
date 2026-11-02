import type { RenderContext } from '../Renderer';
import type { RoundResult } from '../../game/types';

const CATEGORY_EMOJI: Record<string, string> = {
  'Lightning':        '⚡',
  'Excellent':        '🏆',
  'Very Fast':        '🔥',
  'Fast':             '💨',
  'Average':          '👍',
  'Slow':             '🐢',
  'Keep Practising':  '💪',
  'N/A':              '—',
};

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  return `${ms} ms`;
}

function roundRow(r: RoundResult): string {
  if (r.status === 'false_start') {
    return `
      <tr>
        <td>Round ${r.roundNumber}</td>
        <td class="result-false-start" aria-label="False start">FALSE START</td>
      </tr>
    `;
  }
  const isSuspicious = r.status === 'suspicious';
  return `
    <tr>
      <td>Round ${r.roundNumber}</td>
      <td class="${isSuspicious ? 'result-suspicious' : ''}" aria-label="${r.reactionTime} milliseconds">
        ${formatMs(r.reactionTime)}${isSuspicious ? ' <span class="suspicious-flag" title="Unusually fast — may be a device glitch">⚠️</span>' : ''}
      </td>
    </tr>
  `;
}

export function renderResultsScreen(ctx: RenderContext): string {
  const { summary, personalBest, challengeScore } = ctx;
  if (!summary) return '<div class="error">No results data.</div>';

  const { rounds, average, best, worst, falseStartCount, performanceCategory,
          isNewBestAverage, isNewBestSingle } = summary;

  const newBestHtml = (isNewBestAverage || isNewBestSingle)
    ? `<div class="new-pb" role="status" aria-live="polite" aria-label="New personal best!">
         <div class="new-pb-star">★</div>
         <div class="new-pb-text">NEW PERSONAL BEST!</div>
       </div>`
    : '';

  const pbHtml = personalBest && isFinite(personalBest.bestAverage)
    ? `<div class="pb-summary">
         <span>Your best average: <strong>${personalBest.bestAverage} ms</strong></span>
         <span class="pb-date">set ${new Date(personalBest.dateAchieved).toLocaleDateString()}</span>
       </div>`
    : '';

  // Challenge comparison
  let challengeHtml = '';
  if (challengeScore !== null && challengeScore !== undefined && average !== null) {
    const diff = Math.round(average - challengeScore);
    const beaten = diff < 0;
    challengeHtml = `
      <div class="challenge-result ${beaten ? 'challenge-win' : 'challenge-loss'}"
           role="status" aria-live="polite">
        ${beaten
          ? `<div class="challenge-win-text">🏆 CHALLENGE BEATEN!</div>
             <div class="challenge-detail">You beat ${challengeScore} ms by ${Math.abs(diff)} ms!</div>`
          : `<div class="challenge-loss-text">Close one!</div>
             <div class="challenge-detail">You were ${diff} ms away from beating ${challengeScore} ms.</div>`
        }
      </div>
    `;
  }

  const categoryEmoji = CATEGORY_EMOJI[performanceCategory] ?? '';
  const falseStartNote = falseStartCount > 0
    ? `<p class="false-start-note">* Average calculated from ${rounds.length - falseStartCount} valid rounds (${falseStartCount} false start${falseStartCount > 1 ? 's' : ''} excluded).</p>`
    : '';

  return `
    <div class="results-screen" id="results-screen">
      <div class="results-inner">

        ${newBestHtml}

        <header class="results-header">
          <div class="results-logo">⚡ FLASH REACT</div>
          <div class="results-category" aria-label="Performance category: ${performanceCategory}">
            <span class="category-emoji">${categoryEmoji}</span>
            <span class="category-name">${performanceCategory}</span>
          </div>
          ${average !== null
            ? `<div class="results-avg" aria-label="Average reaction time: ${average} milliseconds">
                 <span class="avg-label">5-round average</span>
                 <span class="avg-value">${average}<small> ms</small></span>
               </div>`
            : `<div class="results-avg">
                 <span class="avg-label">No valid rounds</span>
               </div>`
          }
        </header>

        ${challengeHtml}

        <div class="stats-row" role="list">
          <div class="stat-card" role="listitem">
            <span class="stat-label">Best</span>
            <span class="stat-value${isNewBestSingle ? ' stat-new' : ''}">${formatMs(best)}</span>
          </div>
          <div class="stat-card" role="listitem">
            <span class="stat-label">Worst</span>
            <span class="stat-value">${formatMs(worst)}</span>
          </div>
          <div class="stat-card" role="listitem">
            <span class="stat-label">False Starts</span>
            <span class="stat-value">${falseStartCount}</span>
          </div>
        </div>

        <table class="rounds-table" aria-label="Round results">
          <thead>
            <tr><th>Round</th><th>Reaction Time</th></tr>
          </thead>
          <tbody>
            ${rounds.map(roundRow).join('')}
          </tbody>
        </table>

        ${falseStartNote}
        ${pbHtml}

        <div class="share-row">
          <button id="share-btn" class="btn btn-secondary" aria-label="Share my score">
            📤 SHARE MY SCORE
          </button>
          <button id="copy-btn" class="btn btn-outline" aria-label="Copy result to clipboard">
            📋 COPY RESULT
          </button>
          <div id="copy-confirmation" class="copy-confirm" aria-live="polite" role="status"></div>
        </div>

        <div class="action-row">
          <button id="play-again-btn" class="btn btn-primary" aria-label="Play again">
            ▶ PLAY AGAIN
          </button>
          <button id="results-home-btn" class="btn-text" aria-label="Go to home screen">
            Home
          </button>
        </div>

      </div>
    </div>
  `;
}
