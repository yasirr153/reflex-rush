import { trackEvent } from './game/Analytics';

type ModeId = 'quick' | 'colour' | 'fake' | 'survival' | 'memory';
type Phase = 'home' | 'intro' | 'playing' | 'feedback' | 'result';
interface Mode { id: ModeId; icon: string; name: string; tagline: string; detail: string; }
const modes: Mode[] = [
  { id: 'quick', icon: '⚡', name: 'QUICK REFLEX', tagline: 'Beat the flash.', detail: 'Wait for green, then react as fast as you can. Five rounds.' },
  { id: 'colour', icon: '🎯', name: 'COLOUR RUSH', tagline: 'Hit the right colour.', detail: 'Find the target colour before the timer runs out. Wrong taps cost a life.' },
  { id: 'fake', icon: '🧠', name: 'FAKE OUT', tagline: 'Trust your instincts. Not every signal.', detail: 'Tap on GO. Hold your nerve when the fake signals appear.' },
  { id: 'survival', icon: '🔥', name: 'SPEED SURVIVAL', tagline: 'Keep up or get knocked out.', detail: 'Smash 20 targets as they appear. Three misses and it is over.' },
  { id: 'memory', icon: '🟣', name: 'MEMORY FLASH', tagline: 'Watch. Remember. Repeat.', detail: 'Memorise the colour sequence, then repeat it without mistakes.' },
];
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const app = $('#app')!;
function readSavedBest(): number { try { return Number(localStorage.getItem('reflex-rush-best') || 0); } catch { return 0; } }
let phase: Phase = 'home';
let mode: Mode | null = null;
let score = 0, best = readSavedBest(), lives = 3, round = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let deadline = 0, timeLeft = 0, sequence: string[] = [], sequenceIndex = 0;
let signalCount = 0, targetCount = 0, misses = 0, waitingForGo = false, currentTarget = '';
let startedAt = 0;
const palette = ['coral', 'cyan', 'violet', 'lime'];
const clearTimers = () => { if (timer) clearTimeout(timer); if (interval) clearInterval(interval); timer = null; interval = null; };
const safeBest = () => { try { best = Math.max(best, Number(localStorage.getItem('reflex-rush-best') || 0)); } catch { /* storage may be blocked */ } };
const saveBest = () => { if (score > best) { best = score; try { localStorage.setItem('reflex-rush-best', String(best)); } catch { /* continue without persistence */ } } };
function renderHome() {
  phase = 'home'; mode = null; clearTimers();
  safeBest();
  app.innerHTML = `
    <main class="arcade-home">
      <header class="arcade-header"><div class="brand-mark">✳</div><div class="brand-name">REFLEX<span>RUSH</span></div><div class="best-pill">🏆 BEST <b>${best}</b></div></header>
      <section class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> THE REFLEX ARCADE</div><h1>HOW FAST<br>IS YOUR <em>BRAIN?</em></h1><p>Five challenges. Five ways to test your limits.<br>Think fast. Move faster. Beat your best.</p></section>
      <section class="mode-section"><div class="section-heading"><span>CHOOSE YOUR CHALLENGE</span><small>01 — 05</small></div><div class="mode-grid">${modes.map((m,i)=>`<button class="mode-card mode-${m.id}" data-mode="${m.id}"><span class="mode-number">0${i+1}</span><span class="mode-icon">${m.icon}</span><span class="mode-name">${m.name}</span><span class="mode-tagline">${m.tagline}</span><span class="mode-arrow">↗</span></button>`).join('')}</div></section>
      <footer class="arcade-footer"><span>FREE TO PLAY · NO DOWNLOAD</span><span>BUILT FOR QUICK BRAINS <b>✦</b></span></footer>
    </main>`;
}
function renderIntro() {
  if (!mode) return;
  phase = 'intro';
  app.innerHTML = `<main class="play-shell"><header class="play-top"><button class="back-btn" data-action="home">← ARCADE</button><div class="mini-brand">REFLEX<span>RUSH</span></div><span class="mode-chip">${mode.icon} ${mode.name}</span></header><section class="intro-panel"><div class="intro-icon">${mode.icon}</div><div class="eyebrow">YOUR NEXT CHALLENGE</div><h1>${mode.name}</h1><p>${mode.detail}</p><div class="rule-pills"><span>♥ 3 LIVES</span><span>⚡ PERSONAL BEST</span><span>↻ REPLAY</span></div><button class="launch-btn" data-action="start">LET'S GO <span>→</span></button><small>READY? YOUR SCORE COUNTS.</small></section></main>`;
}
function shell(content: string, subtitle: string) {
  app.innerHTML = `<main class="play-shell"><header class="play-top"><button class="back-btn" data-action="home">← QUIT</button><div class="mini-brand">REFLEX<span>RUSH</span></div><span class="mode-chip">${mode?.icon} ${mode?.name}</span></header><section class="arena"><div class="arena-meta"><span>${subtitle}</span><span class="score-live">SCORE <b id="score-live">${score}</b></span></div>${content}</section><div class="play-hint">${mode?.detail}</div></main>`;
}
function startMode() {
  clearTimers(); phase = 'playing'; score = 0; lives = 3; round = 0; misses = 0; signalCount = 0; targetCount = 0; sequence = []; sequenceIndex = 0;
  if (!mode) return;
  trackEvent('game_start', {
  game_mode: mode.id,
  game_name: mode.name
});
  if (mode.id === 'quick') quickRound();
  if (mode.id === 'colour') startColour();
  if (mode.id === 'fake') startFake();
  if (mode.id === 'survival') startSurvival();
  if (mode.id === 'memory') startMemory();
}
function scoreUpdate(points: number) { score = Math.max(0, score + points); const el = $('#score-live'); if (el) el.textContent = String(score); }
function quickRound() {
  round++;
  shell(`<div class="quick-target" id="quick-target"><div class="target-core">${round === 1 ? 'GET READY' : `ROUND ${round} / 5`}</div><small>WAIT FOR THE GREEN FLASH</small></div><div class="game-stats"><span>ROUND <b>${round}/5</b></span><span>LIVES <b>${'♥'.repeat(lives)}</b></span></div>`, 'REACTION TEST');
  waitingForGo = true;
  timer = setTimeout(() => { if (phase !== 'playing') return; waitingForGo = false; startedAt = performance.now(); const target = $('#quick-target'); if (target) { target.classList.add('target-go'); target.innerHTML = '<div class="target-core">TAP NOW!</div><small>GO GO GO</small>'; } }, 1100 + Math.random()*2200);
}
function handleQuickTap() {
  if (phase !== 'playing') return;
  if (waitingForGo) { clearTimers(); lives--; if (lives <= 0) finish('FALSE STARTS CAUGHT YOU'); else if (round >= 5) finish('REFLEXES: TESTED'); else { showFeedback('TOO EARLY!', 'You jumped the signal. One life lost.', '✕'); timer = setTimeout(quickRound, 950); } return; }
  const ms = Math.round(performance.now() - startedAt); const points = Math.max(10, 650 - ms); scoreUpdate(points);
  if (round >= 5) finish('REFLEXES: TESTED'); else { showFeedback(`${ms} MS`, `+${points} POINTS · ${ms < 220 ? 'LIGHTNING FAST' : ms < 320 ? 'NICE REFLEXES' : 'KEEP SHARPENING'}`, '⚡'); timer = setTimeout(quickRound, 1000); }
}
function startColour() { timeLeft = 25; deadline = Date.now()+25000; nextColour(); interval = setInterval(() => { timeLeft = Math.max(0, Math.ceil((deadline-Date.now())/1000)); const el=$('#time-live'); if(el)el.textContent=String(timeLeft); if(timeLeft<=0)finish('TIME IS UP'); },250); }
function nextColour() {
  phase='playing'; currentTarget=palette[Math.floor(Math.random()*palette.length)]; const choices=[...palette].sort(()=>Math.random()-.5);
  shell(`<div class="challenge-instruction">TAP THE <b class="colour-word word-${currentTarget}">${currentTarget.toUpperCase()}</b> TILE</div><div class="colour-grid">${choices.map(c=>`<button class="colour-tile tile-${c}" data-colour="${c}" aria-label="${c}"></button>`).join('')}</div><div class="game-stats"><span>TIME <b id="time-live">${timeLeft}</b>s</span><span>LIVES <b>${'♥'.repeat(lives)}</b></span><span>HITS <b>${targetCount}</b></span></div>`, 'COLOUR ACCURACY'); }
function handleColour(c:string) { if(phase!=='playing')return; if(c===currentTarget){targetCount++;scoreUpdate(100+Math.max(0,timeLeft));nextColour();} else {lives--; if(lives<=0)finish('OUT OF LIVES'); else {const stats=$('.game-stats');if(stats)stats.innerHTML=`<span>TIME <b id="time-live">${timeLeft}</b>s</span><span>LIVES <b>${'♥'.repeat(lives)}</b></span><span>HITS <b>${targetCount}</b></span>`; const arena=$('.arena');arena?.classList.add('wrong-flash');setTimeout(()=>arena?.classList.remove('wrong-flash'),180);}} }
function startFake() { signalCount=0; fakeSignal(); }
function fakeSignal() { if(signalCount>=15){finish('SIGNAL MASTER');return;} signalCount++; waitingForGo=Math.random()>.38; shell(`<button class="signal-button ${waitingForGo?'signal-go':'signal-fake'}" id="signal-button" data-action="signal"><span>${waitingForGo?'GO!':'FAKE'}</span><small>${waitingForGo?'TAP NOW':'DO NOT TAP'}</small></button><div class="game-stats"><span>SIGNAL <b>${signalCount}/15</b></span><span>LIVES <b>${'♥'.repeat(lives)}</b></span><span>SCORE <b>${score}</b></span></div>`, 'REAL OR FAKE?'); timer=setTimeout(()=>{if(phase!=='playing')return;if(waitingForGo){lives--; if(lives<=0)finish('MISSED TOO MANY');else{showFeedback('TOO SLOW!', 'You missed a real GO signal.', '⌛');timer=setTimeout(fakeSignal,700);}}else{scoreUpdate(80);fakeSignal();}}, 950+Math.random()*700); }
function handleSignal() {if(phase!=='playing')return;clearTimers();if(waitingForGo){scoreUpdate(150);showFeedback('NICE REACTION!', '+150 POINTS', '⚡');}else{lives--;if(lives<=0){finish('THE FAKES GOT YOU');return;}showFeedback('FOOLED YOU!', 'That was a fake signal. One life lost.', '✕');}timer=setTimeout(fakeSignal,750);}
function startSurvival() {targetCount=0;misses=0;spawnTarget();}
function spawnTarget() {if(targetCount>=20){finish('SURVIVOR!');return;}phase='playing';const x=10+Math.random()*75,y=12+Math.random()*62; shell(`<div class="survival-field"><div class="field-count">TARGETS <b>${targetCount}/20</b></div><button class="pop-target" data-action="hit" style="left:${x}%;top:${y}%" aria-label="Hit target">✦</button></div><div class="game-stats"><span>HITS <b>${targetCount}/20</b></span><span>MISSES <b>${misses}/3</b></span><span>SCORE <b>${score}</b></span></div>`, 'TARGET PRACTICE');timer=setTimeout(()=>{if(phase!=='playing')return;misses++;if(misses>=3)finish('THREE TARGETS ESCAPED');else spawnTarget();},1150);}
function hitTarget(){if(phase!=='playing')return;clearTimers();targetCount++;scoreUpdate(100+Math.max(0,3-misses)*10);spawnTarget();}
function startMemory(){sequence=[];for(let i=0;i<4;i++)sequence.push(palette[Math.floor(Math.random()*palette.length)]);showSequence(0);}
function showSequence(index:number){phase='playing';const c=sequence[index];shell(`<div class="memory-display"><div class="memory-count">MEMORISE THE SEQUENCE</div><div class="memory-flash flash-${c}"></div><div class="memory-count">${index+1} OF ${sequence.length}</div></div>`, 'MEMORY TRAINING');timer=setTimeout(()=>{if(index+1<sequence.length)showSequence(index+1);else memoryInput();},720);}
function memoryInput(){phase='playing';sequenceIndex=0;shell(`<div class="memory-display"><div class="memory-count">REPEAT THE SEQUENCE</div><div class="memory-progress" id="memory-progress">0 / ${sequence.length}</div><div class="memory-pad">${palette.map(c=>`<button class="memory-key tile-${c}" data-memory="${c}" aria-label="${c}"></button>`).join('')}</div><small>Tap the colours in the same order.</small></div>`, 'MEMORY RECALL');}
function handleMemory(c:string){if(phase!=='playing')return;if(sequence[sequenceIndex]!==c){lives--;if(lives<=0){finish('MEMORY OVERLOAD');return;}showFeedback('NOT QUITE!', 'One mistake. Watch the sequence again.', '✕');timer=setTimeout(()=>showSequence(0),950);return;}sequenceIndex++;const p=$('#memory-progress');if(p)p.textContent=`${sequenceIndex} / ${sequence.length}`;if(sequenceIndex===sequence.length){scoreUpdate(sequence.length*250);if(sequence.length>=8){finish('MEMORY CHAMPION');return;}showFeedback('PERFECT MEMORY!', `+${sequence.length*250} POINTS`, '🧠');sequence.push(palette[Math.floor(Math.random()*palette.length)]);timer=setTimeout(()=>showSequence(0),900);}}
function showFeedback(title:string,desc:string,icon:string){phase='feedback';shell(`<div class="feedback-panel"><div>${icon}</div><h2>${title}</h2><p>${desc}</p></div>`, 'NICE TRY');}
function finish(title:string){clearTimers();phase='result';const previousBest=best;saveBest();const newBest=score>previousBest;if (mode) {
  trackEvent('game_complete', {
    game_mode: mode.id,
    game_name: mode.name,
    score: score,
    new_personal_best: newBest
  });
}app.innerHTML=`<main class="play-shell result-shell"><header class="play-top"><button class="back-btn" data-action="home">← ARCADE</button><div class="mini-brand">REFLEX<span>RUSH</span></div><span class="mode-chip">${mode?.icon} ${mode?.name}</span></header><section class="result-panel"><div class="result-confetti">✦ ✧ ✦</div><div class="eyebrow">CHALLENGE COMPLETE</div><h1>${title}</h1><div class="final-score">${score.toLocaleString()}<small>PTS</small></div><p>${newBest?'NEW PERSONAL BEST!':'YOUR BEST: '+best.toLocaleString()}</p><div class="result-actions"><button class="launch-btn" data-action="replay">PLAY AGAIN ↻</button><button class="secondary-btn" data-action="home">BACK TO ARCADE</button><button class="secondary-btn" data-action="share">SHARE SCORE ↗</button></div></section></main>`;}
app.addEventListener('click',(event)=>{const target=event.target as HTMLElement;const button=target.closest<HTMLElement>('button');if(!button)return;
 const action=button.dataset.action; if(action==='home'){renderHome();return;} if(action==='start'){startMode();return;} if(action==='replay'){renderIntro();return;} if(action==='signal'){handleSignal();return;} if(action==='hit'){hitTarget();return;} if (action === 'share') {
  const text = `I scored ${score} points in ${mode?.name} on REFLEX RUSH. Can you beat me?`;

  if (navigator.share) {
    navigator.share({
      title: 'REFLEX RUSH',
      text
    }).then(() => {
      trackEvent('share_score', {
        game_mode: mode?.id ?? 'unknown',
        share_method: 'native'
      });
    }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        button.textContent = 'COPIED!';

        trackEvent('share_score', {
          game_mode: mode?.id ?? 'unknown',
          share_method: 'clipboard'
        });
      })
      .catch(() => {});
  }

  return;
}
 if(button.dataset.mode){mode=modes.find(m=>m.id===button.dataset.mode as ModeId)||null;renderIntro();return;} if(button.dataset.colour){handleColour(button.dataset.colour);return;} if(button.dataset.memory){handleMemory(button.dataset.memory);return;} if(mode?.id==='quick'&&button.id==='quick-target')handleQuickTap();
});
app.addEventListener('pointerdown',(event)=>{const target=event.target as HTMLElement;if(mode?.id==='quick'&&target.closest('#quick-target'))handleQuickTap();},{passive:true});
app.addEventListener('keydown',(event)=>{if((event.code==='Space'||event.code==='Enter')&&mode?.id==='quick'&&phase==='playing'){const active=document.activeElement;if(active===document.body||active===document.documentElement){event.preventDefault();handleQuickTap();}}});
renderHome();
