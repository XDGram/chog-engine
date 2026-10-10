import './style.css'

type BossKind = 'heavy' | 'erratic' | 'gravity'
type Phase = 'idle' | 'windup' | 'burst' | 'recovery' | 'flip' | 'won' | 'lost'
type Point = { x: number; y: number }

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header class="topbar"><a class="wordmark" href="#" aria-label="Chog Engine home"><span class="mark">C</span> CHOG<span class="wordmark-light">ENGINE</span></a><div class="top-status"><i></i> REAL-TIME COMBAT <span class="divider">/</span> PROTOTYPE 01</div><a class="repo-link" href="https://github.com/XDGram/chog-engine" target="_blank" rel="noreferrer">SOURCE ↗</a></header>
  <main>
    <section class="intro"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE CHOG ARENA <span class="eyebrow-index">01 — 03</span></div><h1>READ THE MOVE.<br><em>BREAK THE CORE.</em></h1><p class="lede">One clean counter ends each phase. Three cores. Three lives. No chip damage.</p></div><div class="rank-chip"><span class="rank-icon">✳</span><div><small>RANKED RULESET</small><strong>UNINTERRUPTED RUN</strong></div></div></section>
    <section class="boss-select" aria-label="Choose a boss"><div class="select-label">SELECT YOUR OPPONENT</div><div class="boss-tabs"><button class="boss-tab active" data-boss="heavy"><span class="tab-index">01</span><span><b>HEAVY</b><small>POWER / RECOVERY</small></span><span class="tab-arrow">↗</span></button><button class="boss-tab" data-boss="erratic"><span class="tab-index">02</span><span><b>ERRATIC</b><small>BURST / EXHAUST</small></span><span class="tab-arrow">↗</span></button><button class="boss-tab" data-boss="gravity"><span class="tab-index">03</span><span><b>GRAVITY</b><small>FLIP / COUNTER</small></span><span class="tab-arrow">↗</span></button></div></section>
    <section class="game-frame"><div class="game-head"><div class="fight-title"><span class="live-dot"></span><span id="fight-label">HEAVY CHOG</span><span class="fight-sub">— THE ANVIL</span></div><div class="run-stats"><span>TIME <b id="timer">00:00.0</b></span><span>BEST <b id="best-time">—:—.—</b></span></div></div><div class="arena-wrap"><canvas id="arena" aria-label="CHOG ENGINE boss arena"></canvas><div id="announcement" class="announcement" aria-live="polite"></div><div id="result" class="result hidden"><div class="result-kicker" id="result-kicker">RUN COMPLETE</div><h2 id="result-title">CORE SHATTERED</h2><p id="result-copy"></p><button id="restart" class="restart-btn">RUN IT BACK <span>↗</span></button></div><div class="arena-hud"><div class="hud-boss"><span class="hud-label">BOSS INTEGRITY</span><div class="cores" id="cores"></div><span class="phase-caption" id="phase-caption">PHASE 01 / 03</span></div><div class="hud-lives"><span class="hud-label">LIVES</span><div class="life-pips" id="lives"><i></i><i></i><i></i></div></div></div><div class="arena-corner">CHOG ENGINE <span>·</span> BUILD 0.1</div></div><div class="game-foot"><div class="boss-brief"><span class="brief-symbol">↘</span><div><strong id="move-name">POWER SWING</strong><small id="move-copy">Dodge the marked impact. Counter during recovery.</small></div></div><div class="event-log" id="event-log"><span class="log-pulse"></span><span id="log-copy">ARENA READY — MOVE TO TAKE POSITION</span></div><button id="start-btn" class="start-btn">ENTER ARENA <span>↗</span></button></div></section>
    <section class="below"><div class="controls"><div class="section-label">FIELD MANUAL</div><div class="control"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>MOVE</span></div><div class="control"><kbd>SPACE</kbd><span>DODGE / EVADE</span></div><div class="control"><kbd>J</kbd><span>COUNTER IN RECOVERY</span></div></div><div class="rule-note"><div class="section-label">THE RULE</div><p>Attacks deal <b>zero chip damage</b>. Read the telegraph, evade the strike, then counter in the opening. One successful counter breaks one core and advances the fight.</p></div><div class="version-note"><span>01</span><span>TRAINING BUILD</span></div></section>
  </main><footer><span>CHOG ENGINE © 2026</span><span>DETERMINISTIC COMBAT <i>·</i> SKILL DECIDES</span></footer>
`

const canvas = document.querySelector<HTMLCanvasElement>('#arena')!
const ctx = canvas.getContext('2d')!
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const announcement = $('#announcement')
const stage = { w: 1000, h: 570 }
const player: Point = { x: 300, y: 340 }
const boss: Point = { x: 700, y: 285 }
const input = new Set<string>()
const bossInfo: Record<BossKind, { name: string; epithet: string; move: string; hint: string; color: string }> = {
  heavy: { name: 'HEAVY CHOG', epithet: 'THE ANVIL', move: 'POWER SWING', hint: 'Dodge the marked impact. Counter during recovery.', color: '#e5a35e' },
  erratic: { name: 'ERRATIC CHOG', epithet: 'THE SPARK', move: 'TRIPLE BURST', hint: 'Survive the burst. Counter from the safe pocket during exhaust.', color: '#dc8bde' },
  gravity: { name: 'GRAVITY CHOG', epithet: 'THE ORBITER', move: 'GRAVITY FLIP', hint: 'Move against the pull. Counter just after the flip settles.', color: '#78b7e7' },
}
let kind: BossKind = 'heavy'
let phase: Phase = 'idle'
let phaseIndex = 0
let lives = 3
let startedAt = 0
let elapsed = 0
let lastFrame = 0
let phaseAt = 0
let attackTarget: Point = { x: 300, y: 340 }
let dodgeUntil = 0
let playerInvulnerableUntil = 0
let facing: Point = { x: 1, y: 0 }
let playerMove = { x: 0, y: 0 }
let gravityDirection = 1
let pocket: Point = { x: 230, y: 420 }
let gravityOrigin: Point = { x: 300, y: 340 }
let messageUntil = 0
let eventMessage = 'ARENA READY — MOVE TO TAKE POSITION'
let noHit = true

const timeText = (ms: number) => {
  const sec = ms / 1000
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec) % 60).padStart(2, '0')}.${Math.floor((sec % 1) * 10)}`
}
const bestKey = () => `chog-engine-best-v1-${kind}`
function setEvent(text: string) { eventMessage = text; $('#log-copy').textContent = text }
function announce(text: string, duration = 1400) { announcement.textContent = text; announcement.classList.add('show'); messageUntil = performance.now() + duration }
function setBoss(next: BossKind) {
  if (phase !== 'idle' && phase !== 'won' && phase !== 'lost') return
  kind = next
  document.querySelectorAll<HTMLButtonElement>('.boss-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.boss === next))
  $('#fight-label').textContent = bossInfo[next].name
  $('.fight-sub').textContent = `— ${bossInfo[next].epithet}`
  $('#move-name').textContent = bossInfo[next].move
  $('#move-copy').textContent = bossInfo[next].hint
  $('#best-time').textContent = localStorage.getItem(bestKey()) ? timeText(Number(localStorage.getItem(bestKey()))) : '—:—.—'
  if (phase === 'won' || phase === 'lost') resetRun(false)
  draw(performance.now())
}
function resetRun(announceStart = true) {
  phase = 'idle'; phaseIndex = 0; lives = 3; elapsed = 0; noHit = true
  player.x = 300; player.y = 340; boss.x = 700; boss.y = 285; gravityDirection = 1
  $('#timer').textContent = timeText(0); $('#phase-caption').textContent = 'PHASE 01 / 03'
  $('#start-btn').classList.remove('hidden'); $('#start-btn').innerHTML = 'ENTER ARENA <span>↗</span>'
  $('#result').classList.add('hidden'); updateHud()
  setEvent('ARENA READY — MOVE TO TAKE POSITION')
  if (announceStart) announce('FIGHT STARTED', 950)
  draw(performance.now())
}
function startRun() {
  resetRun(false); phase = 'windup'; startedAt = performance.now(); phaseAt = startedAt + 1550
  $('#start-btn').classList.add('hidden'); $('#result').classList.add('hidden')
  attackTarget = { x: player.x, y: player.y }
  setEvent(`${bossInfo[kind].move} TELEGRAPH — WATCH THE FIELD`)
  announce('READ THE TELEGRAPH', 1100)
}
function updateHud() {
  $('#cores').innerHTML = [0, 1, 2].map(i => `<i class="core ${i < phaseIndex ? 'broken' : ''}"></i>`).join('')
  $('#lives').innerHTML = [0, 1, 2].map(i => `<i class="${i < lives ? 'alive' : ''}"></i>`).join('')
  $('#phase-caption').textContent = `PHASE ${String(Math.min(phaseIndex + 1, 3)).padStart(2, '0')} / 03`
}
function takeHit() {
  if (performance.now() < playerInvulnerableUntil) return
  lives--; noHit = false; updateHud(); setEvent('HIT TAKEN — NO CHIP DAMAGE, ONE LIFE LOST')
  announce(lives ? 'KEEP YOUR FOOTING' : 'RUN ENDED', 900)
  if (lives <= 0) finishRun(false)
}
function finishRun(won: boolean) {
  phase = won ? 'won' : 'lost'
  if (won) {
    elapsed = performance.now() - startedAt
    const previous = Number(localStorage.getItem(bestKey()) || 0)
    if (!previous || elapsed < previous) localStorage.setItem(bestKey(), String(Math.round(elapsed)))
    $('#best-time').textContent = timeText(Number(localStorage.getItem(bestKey())))
    $('#timer').textContent = timeText(elapsed)
  }
  $('#result-kicker').textContent = won ? 'CLEAR — ALL CORES BROKEN' : 'RUN OVER — THREE LIVES LOST'
  $('#result-title').textContent = won ? 'CHOG DEFEATED' : 'THE CHOG HOLDS'
  $('#result-copy').textContent = won ? `${timeText(elapsed)} clear time${noHit ? ' · NO-HIT RUN' : ''}${Number(localStorage.getItem(bestKey())) === Math.round(elapsed) ? ' · PERSONAL BEST' : ''}` : 'The ranked run resets from phase one. Take another read.'
  $('#result').classList.remove('hidden'); $('#start-btn').classList.remove('hidden'); $('#start-btn').innerHTML = 'NEW RUN <span>↗</span>'
  setEvent(won ? 'CLEAR CONFIRMED — RUN RECORDED LOCALLY' : 'RANKED RUN RESET — TRY AGAIN')
}
function counter() {
  if (phase !== 'recovery') { setEvent('NO OPENING — COUNTERS ONLY LAND DURING THE RECOVERY WINDOW'); return }
  if (kind === 'erratic' && Math.hypot(player.x - pocket.x, player.y - pocket.y) > 100) { setEvent('TOO FAR FROM THE SAFE POCKET — MOVE IN AND COUNTER'); return }
  if (kind === 'heavy' && Math.hypot(player.x - boss.x, player.y - boss.y) > 480) { setEvent('OUT OF RANGE — CLOSE DISTANCE DURING RECOVERY'); return }
  phaseIndex++; updateHud(); setEvent(`CORE ${phaseIndex} SHATTERED — PHASE ${Math.min(phaseIndex + 1, 3)} INCOMING`)
  announce(phaseIndex === 3 ? 'FINAL CORE BROKEN' : 'CORE SHATTERED', 1100)
  if (phaseIndex >= 3) { finishRun(true); return }
  phase = 'windup'; phaseAt = performance.now() + 950
  attackTarget = { x: player.x, y: player.y }
}
function doDodge(now: number) {
  if (phase === 'idle' || phase === 'won' || phase === 'lost' || now < dodgeUntil) return
  let dx = playerMove.x, dy = playerMove.y
  if (!dx && !dy) { dx = player.x < boss.x ? -1 : 1; dy = (player.y - boss.y) / Math.max(1, Math.abs(player.y - boss.y)); if (!dy) dy = -1 }
  const length = Math.hypot(dx, dy) || 1
  player.x = Math.max(62, Math.min(stage.w - 62, player.x + dx / length * 120))
  player.y = Math.max(122, Math.min(stage.h - 44, player.y + dy / length * 120))
  facing = { x: dx / length, y: dy / length }
  dodgeUntil = now + 520; playerInvulnerableUntil = now + 430
  setEvent('DODGE — INVULNERABLE WINDOW ACTIVE')
}
function update(now: number, dt: number) {
  const speed = 220 * dt / 1000
  let dx = Number(input.has('d') || input.has('arrowright')) - Number(input.has('a') || input.has('arrowleft'))
  let dy = Number(input.has('s') || input.has('arrowdown')) - Number(input.has('w') || input.has('arrowup'))
  if (kind === 'gravity' && phase === 'flip') { dx *= -gravityDirection; dy *= -gravityDirection }
  const len = Math.hypot(dx, dy)
  if (len) { dx /= len; dy /= len; facing = { x: dx, y: dy }; player.x = Math.max(48, Math.min(stage.w - 48, player.x + dx * speed)); player.y = Math.max(112, Math.min(stage.h - 36, player.y + dy * speed)) }
  playerMove = { x: dx, y: dy }
  if (phase === 'idle' || phase === 'won' || phase === 'lost') return
  if (phase === 'windup' && now >= phaseAt) {
    if (kind === 'gravity') { phase = 'flip'; phaseAt = now; gravityOrigin = { x: player.x, y: player.y }; gravityDirection *= -1; setEvent('GRAVITY FLIP — MOVE AGAINST THE PULL'); announce('FIELD FLIPPED', 850) }
    else if (kind === 'erratic') { phase = 'burst'; phaseAt = now; setEvent('TRIPLE BURST — DODGE EACH PULSE'); announce('BURST INCOMING', 750) }
    else { if (Math.hypot(player.x - attackTarget.x, player.y - attackTarget.y) < 125) takeHit(); if (phase !== 'lost') { phase = 'recovery'; phaseAt = now; setEvent('POWER SWING MISSED — COUNTER WINDOW OPEN'); announce('COUNTER NOW', 850) } }
  }
  if (phase === 'burst') {
    const burstIndex = Math.floor((now - phaseAt) / 620)
    if (burstIndex < 3 && Math.floor((now - phaseAt) / 620) !== Math.floor((now - dt - phaseAt) / 620)) {
      if (Math.hypot(player.x - attackTarget.x, player.y - attackTarget.y) < 105) takeHit()
      attackTarget = { x: player.x, y: player.y }
      setEvent(`BURST ${Math.min(burstIndex + 1, 3)} / 3 — FIND THE POCKET`)
    }
    if (now - phaseAt >= 1900 && phase !== 'lost') { phase = 'recovery'; phaseAt = now; pocket = { x: player.x < stage.w / 2 ? 230 : 770, y: player.y < stage.h / 2 ? 165 : 420 }; setEvent('BURST EXHAUST — SAFE POCKET OPEN, COUNTER'); announce('EXHAUST — COUNTER', 850) }
  }
  if (phase === 'flip' && now - phaseAt > 950) { if (Math.hypot(player.x - gravityOrigin.x, player.y - gravityOrigin.y) < 65) takeHit(); if (phase !== 'lost') { phase = 'recovery'; phaseAt = now; setEvent('GRAVITY SETTLED — COUNTER WINDOW OPEN'); announce('COUNTER NOW', 850) } }
  if (phase === 'recovery' && now - phaseAt > 1550) { phase = 'windup'; phaseAt = now + Math.max(720, 1320 - phaseIndex * 180); attackTarget = { x: player.x, y: player.y }; setEvent('OPENING CLOSED — NEXT TELEGRAPH') }
  if (now > messageUntil) announcement.classList.remove('show')
  elapsed = now - startedAt; $('#timer').textContent = timeText(elapsed)
}

function draw(now: number) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr) }
  ctx.setTransform(canvas.width / stage.w, 0, 0, canvas.height / stage.h, 0, 0)
  ctx.clearRect(0, 0, stage.w, stage.h)
  const bg = ctx.createLinearGradient(0, 0, stage.w, stage.h); bg.addColorStop(0, '#171919'); bg.addColorStop(.55, '#111514'); bg.addColorStop(1, '#101414'); ctx.fillStyle = bg; ctx.fillRect(0, 0, stage.w, stage.h)
  ctx.save(); ctx.strokeStyle = 'rgba(194,209,193,.055)'; ctx.lineWidth = 1
  for (let x = 24; x < stage.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, stage.h); ctx.stroke() }
  for (let y = 0; y < stage.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(stage.w, y); ctx.stroke() }
  ctx.restore()
  ctx.strokeStyle = 'rgba(204,227,205,.18)'; ctx.lineWidth = 1.2; ctx.strokeRect(22, 22, stage.w - 44, stage.h - 44)
  const color = bossInfo[kind].color
  // The attack warning tracks the danger region so the timing remains readable.
  if (phase === 'windup' || phase === 'burst') {
    const radius = phase === 'burst' ? 99 : 112
    ctx.beginPath(); ctx.arc(attackTarget.x, attackTarget.y, radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(236,105,87,${.05 + Math.sin(now / 95) * .025})`; ctx.fill(); ctx.strokeStyle = 'rgba(239,117,95,.78)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([])
    ctx.beginPath(); ctx.arc(attackTarget.x, attackTarget.y, radius + 16 + Math.sin(now / 100) * 5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(239,117,95,.22)'; ctx.lineWidth = 1; ctx.stroke()
  }
  if (kind === 'gravity' && phase === 'flip') {
    ctx.save(); ctx.translate(boss.x, boss.y); ctx.rotate(now / 250); ctx.strokeStyle = 'rgba(120,183,231,.5)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.ellipse(0, 0, 220, 86, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(gravityOrigin.x, gravityOrigin.y, 72, 0, Math.PI * 2); ctx.fillStyle = 'rgba(120,183,231,.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,183,231,.82)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(120,183,231,.75)'; ctx.font = '700 13px monospace'; ctx.textAlign = 'center'; ctx.fillText(gravityDirection > 0 ? 'PULL ↑' : 'PULL ↓', 500, 85)
  }
  if (kind === 'erratic' && phase === 'recovery') { ctx.beginPath(); ctx.arc(pocket.x, pocket.y, 85, 0, Math.PI * 2); ctx.fillStyle = 'rgba(194,119,208,.11)'; ctx.fill(); ctx.strokeStyle = 'rgba(214,145,221,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#e9b2e9'; ctx.font = '700 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('SAFE POCKET', pocket.x, pocket.y + 4) }
  // Boss body, halo, and core markers.
  ctx.beginPath(); ctx.arc(boss.x, boss.y, 88, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); ctx.beginPath(); ctx.arc(boss.x, boss.y - 4, 67, 0, Math.PI * 2); ctx.fillStyle = '#252b27'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
  ctx.beginPath(); ctx.arc(boss.x, boss.y - 4, 48, now / 900, now / 900 + Math.PI * 1.55); ctx.strokeStyle = `${color}80`; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = '#d6ead5'; ctx.font = '800 22px monospace'; ctx.textAlign = 'center'; ctx.fillText('CHOG', boss.x, boss.y + 3)
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(boss.x - 22 + i * 22, boss.y + 27, 5, 0, Math.PI * 2); ctx.fillStyle = i < phaseIndex ? '#47544a' : color; ctx.fill() }
  // Player and dodge after-image.
  if (now < dodgeUntil) { ctx.beginPath(); ctx.arc(player.x - facing.x * 25, player.y - facing.y * 25, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(198,233,168,.17)'; ctx.fill() }
  ctx.beginPath(); ctx.arc(player.x, player.y + 5, 29, 0, Math.PI * 2); ctx.fillStyle = now < playerInvulnerableUntil ? 'rgba(210,242,175,.22)' : 'rgba(0,0,0,.42)'; ctx.fill()
  ctx.beginPath(); ctx.arc(player.x, player.y, 19, 0, Math.PI * 2); ctx.fillStyle = now < playerInvulnerableUntil ? '#d5f0b2' : '#c3e38e'; ctx.fill(); ctx.strokeStyle = '#f3ffd9'; ctx.lineWidth = 2; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(player.x + facing.x * 9, player.y + facing.y * 9); ctx.lineTo(player.x + facing.x * 24, player.y + facing.y * 24); ctx.strokeStyle = '#f3ffd9'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt'
  ctx.fillStyle = '#d0d8cd'; ctx.font = '700 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('YOU', player.x, player.y + 42)
  if (phase === 'recovery') { ctx.fillStyle = color; ctx.font = '800 12px monospace'; ctx.fillText('COUNTER WINDOW', boss.x, boss.y - 113) }
}
function frame(now: number) { const dt = Math.min(40, now - (lastFrame || now)); lastFrame = now; update(now, dt); draw(now); requestAnimationFrame(frame) }

document.querySelectorAll<HTMLButtonElement>('.boss-tab').forEach(button => button.addEventListener('click', () => setBoss(button.dataset.boss as BossKind)))
$('#start-btn').addEventListener('click', () => { if (phase === 'won' || phase === 'lost') setBoss(kind); startRun() })
$('#restart').addEventListener('click', () => startRun())
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase()
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault()
  input.add(key)
  if (!event.repeat && (key === ' ' || key === 'shift')) doDodge(performance.now())
  if (!event.repeat && key === 'j') counter()
  if (key === 'enter' && phase === 'idle') startRun()
})
window.addEventListener('keyup', event => input.delete(event.key.toLowerCase()))
window.addEventListener('blur', () => input.clear())
canvas.addEventListener('pointerdown', () => { if (phase === 'recovery') counter(); else doDodge(performance.now()) })
$('#best-time').textContent = localStorage.getItem(bestKey()) ? timeText(Number(localStorage.getItem(bestKey()))) : '—:—.—'
updateHud(); requestAnimationFrame(frame)
