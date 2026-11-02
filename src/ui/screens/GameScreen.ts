import type { RenderContext } from '../Renderer';

export function renderGameScreen(ctx: RenderContext): string {
  const { state, roundNumber, totalRounds, countdownValue } = ctx;

  const stateClass = `state-${state.toLowerCase()}`;

  let mainLabel = '⚡';
  let subLabel = 'Wait for it…';
  let ariaLabel = 'Game area';

  switch (state) {
    case 'COUNTDOWN':
      mainLabel = String(countdownValue ?? '');
      subLabel = 'Get ready…';
      ariaLabel = `Get ready. ${countdownValue}`;
      break;
    case 'WAITING':
      mainLabel = '⚡';
      subLabel = 'Wait for it…';
      ariaLabel = 'Wait for the signal';
      break;
    case 'GO':
      mainLabel = 'TAP!';
      subLabel = 'React now!';
      ariaLabel = 'Go! Tap now!';
      break;
    case 'RESULT': {
      const rt = ctx.lastResult?.reactionTime ?? 0;
      mainLabel = `${rt} ms`;
      subLabel = rt < 200 ? '🔥 Insane!' : rt < 280 ? '⚡ Great!' : 'Good!';
      ariaLabel = `Result: ${rt} milliseconds`;
      break;
    }
    case 'FALSE_START':
      mainLabel = '✗';
      subLabel = 'Too early! Wait for the flash.';
      ariaLabel = 'False start';
      break;
    case 'NEXT_ROUND':
      mainLabel = '→';
      subLabel = 'Next round…';
      ariaLabel = 'Next round starting';
      break;
  }

  // Dot indicators
  const dots = Array.from({ length: totalRounds }, (_, i) => {
    const dotState = i < roundNumber - 1 ? 'done' : i === roundNumber - 1 ? 'active' : 'pending';
    return `<span class="round-dot dot-${dotState}" aria-hidden="true"></span>`;
  }).join('');

  return `
    <div class="game-screen" id="game-screen">
      <div class="game-topbar">
        <div class="round-dots" role="group" aria-label="Round progress">${dots}</div>
        <div class="round-text" id="round-indicator" aria-live="polite">
          Round ${roundNumber} of ${totalRounds}
        </div>
      </div>

      <div
        class="game-area ${stateClass}"
        id="game-area"
        role="button"
        tabindex="0"
        aria-label="${ariaLabel}"
        aria-live="assertive"
      >
        <div class="game-area-inner">
          <div class="game-label" id="game-label">${mainLabel}</div>
          <div class="game-sublabel" id="game-sublabel">${subLabel}</div>
          <div class="countdown-display" id="countdown-display"
            style="${state !== 'COUNTDOWN' ? 'display:none' : ''}">
          </div>
        </div>
      </div>

      <div class="game-footer">
        <button id="home-btn" class="btn-text" aria-label="Return to home screen">Home</button>
      </div>
    </div>
  `;
}
