import type { RenderContext } from '../Renderer';

export function renderHomeScreen(ctx: RenderContext): string {
  const pb = ctx.personalBest;
  const challenge = ctx.challengeScore;

  const pbHtml = pb && isFinite(pb.bestAverage)
    ? `<div class="pb-badge" aria-label="Personal best: ${pb.bestAverage} milliseconds">
         <span class="pb-label">Your Best</span>
         <span class="pb-value">${pb.bestAverage} <small>ms</small></span>
       </div>`
    : '';

  const challengeHtml = challenge
    ? `<div class="challenge-banner" role="status" aria-live="polite">
         <div class="challenge-icon">🏆</div>
         <div class="challenge-text">
           <strong>You've been challenged!</strong>
           <span>Can you beat <em>${challenge} ms</em>?</span>
         </div>
       </div>`
    : '';

  return `
    <div class="home-screen" id="home-screen">
      <div class="home-inner">
        ${challengeHtml}

        <header class="home-header">
          <div class="logo-container">
            <div class="logo-bolt">⚡</div>
            <h1 class="logo-title">FLASH<span class="logo-accent">REACT</span></h1>
          </div>
          <p class="tagline">How fast are your reflexes?</p>
        </header>

        <div class="home-cta">
          ${pbHtml}
          <button
            id="start-btn"
            class="btn btn-primary btn-xl"
            aria-label="Start the reaction time game"
          >
            START GAME
          </button>
          <p class="hint-text">5 rounds · tap when you see the flash</p>
        </div>

        <div class="sound-control">
          <button
            id="sound-toggle"
            class="btn-icon"
            aria-label="Toggle sound"
            aria-pressed="false"
          >
            <span class="sound-icon" aria-hidden="true">🔇</span>
            <span class="sound-label">Sound OFF</span>
          </button>
        </div>
      </div>
    </div>
  `;
}
