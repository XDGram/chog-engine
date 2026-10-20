import './style.css'

type BossKind = 'heavy' | 'erratic' | 'gravity'
type Phase = 'menu' | 'windup' | 'attack' | 'recovery' | 'won' | 'lost'
type Fighter = {name:string; title:string; color:string; glyph:string; detail:string}
const fighters:Fighter[]=[
 {name:'VOLT',title:'RIFT RUNNER',color:'#c6ff6b',glyph:'ϟ',detail:'Fast dodge recovery'},
 {name:'ONYX',title:'VOID KNIGHT',color:'#b69cff',glyph:'◈',detail:'Abyss-born counter style'},
 {name:'EMBER',title:'ASH WARDEN',color:'#ff986b',glyph:'✦',detail:'Flame-forged champion'},
 {name:'GLITCH',title:'PHASE GHOST',color:'#6be8ff',glyph:'⌁',detail:'Unstable rift movement'}
]
const bosses:Record<BossKind,{name:string;subtitle:string;color:string;glyph:string;desc:string;attack:string}> = {
 heavy:{name:'THE COLOSSUS',subtitle:'HEAVY / IMPACT CLASS',color:'#ff6879',glyph:'⬟',desc:'A siege-born titan. Bait the slam, escape the marked impact zone, then punish its recovery.',attack:'GROUND ZERO'},
 erratic:{name:'THE WILDCARD',subtitle:'ERRATIC / CHAOS CLASS',color:'#d28aff',glyph:'✳',desc:'A fractured predator. Survive three tracking pulses, read the safe pocket, then strike the exposed core.',attack:'TRIPLE FRACTURE'},
 gravity:{name:'THE NULL KING',subtitle:'GRAVITY / CONTROL CLASS',color:'#6bc9ff',glyph:'◉',desc:'A singularity given a crown. Break away from the pull zone during the field flip, then counter the collapse.',attack:'EVENT HORIZON'}
}
const $=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!
const app=$<HTMLDivElement>('#app')
app.innerHTML=`
<header class="topbar"><div class="brand"><div class="brand-mark">C</div><div>CHOG ENGINE<small>RIFTBREAKERS // BUILD 01</small></div></div><div class="top-right"><span class="live">RIFT STABLE</span><span>MONAD UNIVERSE</span></div></header>
<main>
<section class="hero"><div><div class="kicker">THE RIFT IS OPEN // ENTER THE GAUNTLET</div><h1>READ THE MOVE.<br><span>BREAK THE CORE.</span></h1><p>Every Chog is a boss. Every opening is earned. Choose your fighter, step into the fracture, and survive three phases of pure counter-combat.</p></div><div class="season"><small>COMBAT PROTOCOL</small><strong>NO FREE HITS</strong></div></section>
<div class="section-head"><h2>01 / Choose your Riftbreaker</h2><span>FIGHTER LOADOUT // <b id="fighter-count">01</b> OF 04</span></div><section class="fighters" id="fighters"></section>
<div class="section-head"><h2>02 / Select your Chog</h2><span>UNIQUE NFT BOSS IDENTITIES</span></div><section class="boss-grid" id="bosses"></section>
<section class="game-frame"><div class="game-head"><div><strong>RIFT ARENA</strong> &nbsp;/&nbsp; <span id="fight-class">HEAVY CLASS</span></div><div class="run-stats"><span>TIME <b id="timer">00:00.0</b></span><span>BEST <b id="best">--:--.-</b></span></div></div>
<div class="arena" id="arena"><canvas id="world" aria-label="Interactive 2.5D boss battle arena"></canvas><div class="hud"><div><div class="hud-label">BOSS CORES / <span id="phase-label">DORMANT</span></div><div class="pips" id="cores"><i class="pip"></i><i class="pip"></i><i class="pip"></i></div></div><div class="hud-right"><div class="hud-label">SURVIVAL / LIVES</div><div class="lives" id="lives"><i class="on"></i><i class="on"></i><i class="on"></i></div></div></div><div class="telegraph" id="telegraph">AWAITING CHALLENGER</div><div class="arena-bottom"><span>ARENA 07 <b>///</b> RIFT SECTOR</span><span id="fighter-tag">VOLT / RIFT RUNNER</span></div><div class="screen-flash" id="flash"></div><div class="overlay" id="overlay"><div class="overlay-inner"><div class="kicker">CHOG ENGINE PRESENTS</div><h2>ENTER THE<br>FRACTURE</h2><p>Three cores. Three lives. One clean counter at a time.<br>Nothing hurts the boss except perfect timing.</p><button class="primary" id="start">INITIATE RUN ↗</button></div></div></div>
<div class="mobile-controls"><button id="dodge-mobile">↗ DODGE</button><button class="counter" id="counter-mobile">✦ COUNTER</button></div>
<div class="game-foot"><div class="boss-blurb"><strong id="boss-name">THE COLOSSUS</strong><small id="boss-sub">HEAVY / IMPACT CLASS</small></div><div class="event" id="event">SYSTEM READY. SELECT A BOSS AND INITIATE THE RUN.</div><button class="primary" id="main-action">START FIGHT ↗</button></div></section>
<section class="lower"><div><h3>COMBAT INPUT</h3><div class="keys"><div class="key"><kbd>W A S D</kbd> MOVE</div><div class="key"><kbd>SPACE</kbd> DODGE</div><div class="key"><kbd>J</kbd> COUNTER</div><div class="key"><kbd>ENTER</kbd> START</div></div></div><div><h3>THE THREE-CORE LAW</h3><p class="rules"><b>Read.</b> The boss telegraphs its attack. <b>Evade.</b> Leave the danger zone before impact. <b>Counter.</b> Only the exposed recovery window breaks a core. Three successful counters win. Three hits end the run and reset the gauntlet.</p></div></section>
</main><footer class="footer"><span>CHOG ENGINE © RIFTBREAKERS</span><span>OFFLINE COMBAT PROTOTYPE <b>///</b> NO WALLET REQUIRED</span></footer>`
const canvas=$<HTMLCanvasElement>('#world'),ctx=canvas.getContext('2d')!
const fighterRoot=$<HTMLElement>('#fighters'),bossRoot=$<HTMLElement>('#bosses')
let fighterIndex=0,kind:BossKind='heavy',phase:Phase='menu',cores=0,lives=3,startedAt=0,elapsed=0,best=0
let player={x:.26,y:.68},boss={x:.72,y:.48},attackPoint={x:.26,y:.68},safePoint={x:.28,y:.65}
let phaseAt=0,lastFrame=0,lastAttackTick=0,dodgeUntil=0,invulnerableUntil=0,shake=0,particles:{x:number;y:number;vx:number;vy:number;life:number;color:string;size:number}[]=[]
const keys=new Set<string>()
const now=()=>performance.now()
const timeText=(ms:number)=>{const t=Math.max(0,ms)/1000;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}.${Math.floor(t%1*10)}`}
function renderChoices(){
 fighterRoot.innerHTML=fighters.map((f,i)=>`<button class="fighter ${i===fighterIndex?'active':''}" style="--fighter:${f.color}" data-fighter="${i}"><div class="fighter-top"><span>RB-0${i+1}</span><span class="fighter-glyph">${f.glyph}</span></div><strong>${f.name}</strong><small>${f.title}</small></button>`).join('')
 bossRoot.innerHTML=(Object.keys(bosses) as BossKind[]).map(k=>{const b=bosses[k];return `<button class="boss-card ${k===kind?'active':''}" style="--boss:${b.color}" data-boss="${k}"><span class="boss-icon">${b.glyph}</span><span class="boss-info"><strong>${b.name}</strong><small>${b.subtitle}</small></span><span class="boss-arrow">↗</span></button>`}).join('')
 fighterRoot.querySelectorAll<HTMLButtonElement>('[data-fighter]').forEach(b=>b.onclick=()=>{if(phase==='windup'||phase==='attack'||phase==='recovery')return;fighterIndex=Number(b.dataset.fighter);renderChoices();updateMeta()})
 bossRoot.querySelectorAll<HTMLButtonElement>('[data-boss]').forEach(b=>b.onclick=()=>{if(phase==='windup'||phase==='attack'||phase==='recovery')return;kind=b.dataset.boss as BossKind;renderChoices();updateMeta();resetMenu()})
}
function bestKey(){return `chog-engine-best-${kind}`}
function updateMeta(){
 const b=bosses[kind],f=fighters[fighterIndex]
 $<HTMLElement>('#boss-name').textContent=b.name;$<HTMLElement>('#boss-sub').textContent=b.subtitle
 $<HTMLElement>('#fight-class').textContent=b.subtitle;$<HTMLElement>('#fighter-tag').textContent=`${f.name} / ${f.title}`
 $<HTMLElement>('#fighter-count').textContent=String(fighterIndex+1).padStart(2,'0')
 $<HTMLElement>('#event').textContent=b.desc
 best=Number(localStorage.getItem(bestKey())||0);$<HTMLElement>('#best').textContent=best?timeText(best):'--:--.-'
}
function resetMenu(){phase='menu';cores=0;lives=3;elapsed=0;player={x:.25,y:.7};boss={x:.73,y:.46};updateHud();$<HTMLElement>('#overlay').classList.remove('hidden');$<HTMLElement>('#overlay').innerHTML='<div class="overlay-inner"><div class="kicker">TARGET LOCKED</div><h2>FACE THE<br>FRACTURE</h2><p>Read its tell. Survive its pattern. Break its core.</p><button class="primary" id="start">INITIATE RUN ↗</button></div>';wireStart();$<HTMLElement>('#main-action').textContent='START FIGHT ↗';showTelegraph('AWAITING CHALLENGER','')}
function wireStart(){$<HTMLButtonElement>('#start').onclick=startRun}
function startRun(){phase='windup';cores=0;lives=3;elapsed=0;startedAt=now();phaseAt=startedAt+1250;lastAttackTick=0;player={x:.24,y:.72};boss={x:.72,y:.43};particles=[];invulnerableUntil=0;updateHud();$<HTMLElement>('#overlay').classList.add('hidden');$<HTMLElement>('#main-action').textContent='COUNTER WINDOW: J';$<HTMLElement>('#event').textContent='BOSS TELEGRAPHING. READ THE FLOOR.';showTelegraph('LOCK IN. WATCH THE FLOOR.','')}
function updateHud(){const c=$<HTMLElement>('#cores');c.innerHTML=[0,1,2].map(i=>`<i class="pip ${i>=cores?'on':''}"></i>`).join('');$<HTMLElement>('#lives').innerHTML=[0,1,2].map(i=>`<i class="${i<lives?'on':''}"></i>`).join('');$<HTMLElement>('#phase-label').textContent=phase==='menu'?'DORMANT':phase==='won'?'CLEARED':phase==='lost'?'FAILED':`PHASE 0${cores+1}`; $<HTMLElement>('#timer').textContent=timeText(elapsed)}
function showTelegraph(text:string,type:string){const t=$<HTMLElement>('#telegraph');t.textContent=text;t.className=`telegraph ${type}`}
function announce(text:string,type=''){showTelegraph(text,type);setTimeout(()=>{if($<HTMLElement>('#telegraph').textContent===text)$<HTMLElement>('#telegraph').className='telegraph'},900)}
function burst(x:number,y:number,color:string,count=22){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=0.4+Math.random()*3.8;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:25+Math.random()*35,color,size:1+Math.random()*3})}}
function hit(){if(now()<invulnerableUntil||phase==='lost'||phase==='won')return;lives--;invulnerableUntil=now()+1100;shake=15;burst(player.x,player.y,'#ff6879',28);$<HTMLElement>('#event').textContent='IMPACT TAKEN. FIND SPACE BEFORE THE NEXT ATTACK.';updateHud();if(lives<=0){phase='lost';finish(false)}else announce('IMPACT / DODGE NOW','danger')}
function dodge(){const t=now();if(phase==='menu'||phase==='won'||phase==='lost'||t<dodgeUntil)return;let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;if(!dx&&!dy){dx=player.x<.5? -1:1;dy=player.y<.5?-1:1}const n=Math.hypot(dx,dy)||1;player.x=Math.max(.08,Math.min(.92,player.x+dx/n*.16));player.y=Math.max(.2,Math.min(.86,player.y+dy/n*.12));dodgeUntil=t+280;invulnerableUntil=t+390;burst(player.x,player.y,fighters[fighterIndex].color,12);$<HTMLElement>('#event').textContent='PHASE STEP. INVULNERABILITY ACTIVE.'}
function counter(){if(phase!=='recovery'){announce('NO OPENING. COUNTER ONLY ON EXHAUST.','danger');return}cores++;burst(boss.x,boss.y,bosses[kind].color,48);shake=20;updateHud();if(cores>=3){phase='won';finish(true);return}phase='windup';phaseAt=now()+1150;lastAttackTick=0;$<HTMLElement>('#event').textContent=`CORE ${cores} SHATTERED. PHASE ${cores+1} IS ENRAGED.`;announce('CORE SHATTERED','open')}
function finish(win:boolean){elapsed=now()-startedAt;updateHud();$<HTMLElement>('#main-action').textContent=win?'RUN AGAIN ↗':'RETRY GAUNTLET ↗';if(win&&(!best||elapsed<best)){localStorage.setItem(bestKey(),String(elapsed));best=elapsed;$<HTMLElement>('#best').textContent=timeText(best)}$<HTMLElement>('#overlay').classList.remove('hidden');$<HTMLElement>('#overlay').innerHTML=`<div class="overlay-inner"><div class="kicker">${win?'RIFTBREAKER // VICTORY':'RUN TERMINATED // 03 LIVES SPENT'}</div><h2>${win?'CORE\nDESTROYED':'RIFT\nCONSUMED'}</h2><p>${win?`Three cores shattered in ${timeText(elapsed)}. ${lives===3?'NO-HIT CLEAR. Untouched. Unbroken.':'The rift remembers your name.'}`:'The gauntlet resets to Phase 01. Study the tell and return.'}</p><button class="primary" id="start">${win?'RUN IT BACK':'RE-ENTER RIFT'} ↗</button></div>`;wireStart();$<HTMLElement>('#event').textContent=win?'ALL THREE CORES DESTROYED. RIFT SECURED.':'RUN FAILED. THE BOSS HAS RESET.'}
function beginAttack(){phase='attack';phaseAt=now();lastAttackTick=0;attackPoint={...player};safePoint={x:player.x<.5?.25:.75,y:player.y<.52?.34:.73};$<HTMLElement>('#event').textContent=bosses[kind].attack+' / EVASIVE ACTION';announce(kind==='heavy'?'SLAM INCOMING':kind==='erratic'?'THREE PULSES INCOMING':'GRAVITY FLIP / BREAK THE FIELD','danger')}
function update(t:number,dt:number){const speed=(dt/16.67)*.0065;if(phase!=='menu'&&phase!=='won'&&phase!=='lost'){let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;if(dx||dy){const n=Math.hypot(dx,dy);player.x=Math.max(.07,Math.min(.93,player.x+dx/n*speed));player.y=Math.max(.19,Math.min(.88,player.y+dy/n*speed))}}
 if(phase==='windup'&&t>=phaseAt)beginAttack()
 if(phase==='attack'){const elapsedAttack=t-phaseAt;if(kind==='heavy'&&elapsedAttack>850&&lastAttackTick===0){lastAttackTick=1;if(Math.hypot(player.x-attackPoint.x,player.y-attackPoint.y)<.17&&t>dodgeUntil)hit();if(phase!=='lost'){phase='recovery';phaseAt=t;announce('THE COLOSSUS IS EXPOSED / COUNTER','open');$<HTMLElement>('#event').textContent='SLAM MISSED. CORE EXPOSED. PRESS J.'}}
 else if(kind==='erratic'){const pulse=Math.floor(elapsedAttack/470);if(pulse<3&&pulse!==lastAttackTick&&elapsedAttack>0){lastAttackTick=pulse;attackPoint={...player};if(Math.hypot(player.x-safePoint.x,player.y-safePoint.y)>.18&&t>dodgeUntil)hit();burst(attackPoint.x,attackPoint.y,bosses[kind].color,15)}if(elapsedAttack>1650&&phase==='attack'){phase='recovery';phaseAt=t;announce('PATTERN EXHAUSTED / COUNTER','open');$<HTMLElement>('#event').textContent='THREE PULSES COMPLETE. COUNTER THE CORE.'}}
 else if(kind==='gravity'&&elapsedAttack>1000){if(Math.hypot(player.x-attackPoint.x,player.y-attackPoint.y)<.16&&t>dodgeUntil)hit();if(phase!=='lost'){phase='recovery';phaseAt=t;announce('SINGULARITY COLLAPSE / COUNTER','open');$<HTMLElement>('#event').textContent='GRAVITY SETTLED. COUNTER THE EXPOSED CORE.'}}}
 if(phase==='recovery'&&t-phaseAt>1450){phase='windup';phaseAt=t+Math.max(650,1150-cores*130);$<HTMLElement>('#event').textContent='OPENING CLOSED. NEXT TELEGRAPH INCOMING.'}
 if(phase!=='menu'&&phase!=='won'&&phase!=='lost'){elapsed=t-startedAt;$<HTMLElement>('#timer').textContent=timeText(elapsed)}
 for(const p of particles){p.x+=p.vx*.006;p.y+=p.vy*.006;p.vx*=.985;p.vy*=.985;p.life-=dt*.06}particles=particles.filter(p=>p.life>0);shake*=.88}
function polygon(points:{x:number;y:number}[],fill:string,stroke?:string){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}}
function drawChog(x:number,y:number,r:number,color:string,t:number,bossBody:boolean){ctx.save();ctx.translate(x,y+Math.sin(t/260)*4);ctx.shadowColor=color;ctx.shadowBlur=bossBody?26:16;ctx.fillStyle='#06080d';ctx.beginPath();ctx.ellipse(0,r*.8,r*.8,r*.23,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0
 if(bossBody){ctx.strokeStyle=color;ctx.globalAlpha=.4;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,0,r*1.3,r*.52,t/800,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
 // Distinctive horned silhouette, angular armor and glowing face.
 polygon([{x:-r*.68,y:-r*.15},{x:-r*.88,y:-r*.85},{x:-r*.32,y:-r*.58},{x:0,y:-r*.73},{x:r*.36,y:-r*.58},{x:r*.84,y:-r*.9},{x:r*.68,y:-r*.08},{x:r*.55,y:r*.57},{x:0,y:r*.78},{x:-r*.58,y:r*.5}],bossBody?'#202b3c':'#27303b',color)
 polygon([{x:-r*.46,y:-r*.3},{x:-r*.25,y:-r*.48},{x:-r*.06,y:-r*.28},{x:-r*.2,y:-r*.08}],color)
 polygon([{x:r*.46,y:-r*.3},{x:r*.25,y:-r*.48},{x:r*.06,y:-r*.28},{x:r*.2,y:-r*.08}],color)
 ctx.fillStyle='#f6f8ff';ctx.globalAlpha=.94;ctx.fillRect(-r*.34,-r*.18,r*.18,r*.045);ctx.fillRect(r*.16,-r*.18,r*.18,r*.045);ctx.globalAlpha=1
 polygon([{x:-r*.2,y:r*.1},{x:r*.2,y:r*.1},{x:0,y:r*.28}],bossBody?'#090d14':'#10151e')
 if(bossBody){for(let i=0;i<3;i++){ctx.fillStyle=i<cores? '#343b49':color;ctx.beginPath();ctx.arc((i-1)*r*.25,r*.49,r*.055,0,Math.PI*2);ctx.fill()}}
 ctx.restore()}
function draw(t:number){const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr)}const w=rect.width,h=rect.height;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();if(shake>1)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake)
 const b=bosses[kind],f=fighters[fighterIndex];const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#131a2a');sky.addColorStop(.48,'#0d1421');sky.addColorStop(1,'#090b12');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h)
 // Rift moon and layered distant silhouettes.
 const moon=ctx.createRadialGradient(w*.74,h*.22,2,w*.74,h*.22,h*.24);moon.addColorStop(0,b.color+'48');moon.addColorStop(.35,b.color+'15');moon.addColorStop(1,b.color+'00');ctx.fillStyle=moon;ctx.fillRect(0,0,w,h)
 ctx.fillStyle='#151b29';ctx.beginPath();ctx.moveTo(0,h*.47);for(let x=0;x<=w+40;x+=40)ctx.lineTo(x,h*.37+Math.sin(x*.013)*h*.035);ctx.lineTo(w,h*.66);ctx.lineTo(0,h*.66);ctx.fill()
 ctx.fillStyle='#101622';for(let i=0;i<12;i++){const x=i*w/11;ctx.beginPath();ctx.moveTo(x,h*.49);ctx.lineTo(x+18,h*(.31+(i%4)*.027));ctx.lineTo(x+38,h*.5);ctx.fill()}
 // Isometric arena floor: layered perspective planes and glowing grid.
 const horizon=h*.47;polygon([{x:w*.12,y:horizon},{x:w*.88,y:horizon},{x:w*1.15,y:h},{x:-w*.15,y:h}],'#111925','#344156')
 ctx.save();ctx.beginPath();ctx.moveTo(w*.12,horizon);ctx.lineTo(w*.88,horizon);ctx.lineTo(w*1.15,h);ctx.lineTo(-w*.15,h);ctx.closePath();ctx.clip()
 for(let i=0;i<14;i++){const p=i/13,y=horizon+(h-horizon)*p*p;ctx.strokeStyle=`rgba(115,151,190,${.07+p*.12})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-w*.2,y);ctx.lineTo(w*1.2,y);ctx.stroke()}
 for(let i=-10;i<=10;i++){ctx.strokeStyle='rgba(111,145,185,.13)';ctx.beginPath();ctx.moveTo(w*.5+i*9,horizon);ctx.lineTo(w*.5+i*w*.09,h);ctx.stroke()}
 ctx.restore()
 // Perimeter rails and rune pillars.
 ctx.strokeStyle='#52617a';ctx.globalAlpha=.5;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(w*.12,horizon);ctx.lineTo(w*.88,horizon);ctx.lineTo(w*1.15,h);ctx.moveTo(w*.12,horizon);ctx.lineTo(-w*.15,h);ctx.stroke();ctx.globalAlpha=1
 for(let i=0;i<5;i++){const x=w*(.17+i*.165);ctx.fillStyle='#202b3c';ctx.fillRect(x,h*.39,3,h*.14);ctx.fillStyle=b.color;ctx.globalAlpha=.45+Math.sin(t/500+i)*.2;ctx.fillRect(x-2,h*.39,7,3);ctx.globalAlpha=1}
 const px=player.x*w,py=horizon+(player.y-.2)/(0.7)*(h-horizon),bx=boss.x*w,by=horizon+.25*(h-horizon)
 // Danger markers are projected onto the floor before attacks land.
 if(phase==='windup'||phase==='attack'){const ax=attackPoint.x*w,ay=horizon+(attackPoint.y-.2)/.7*(h-horizon);const radius=kind==='heavy'?w*.115:kind==='erratic'?w*.075:w*.12;ctx.beginPath();ctx.ellipse(ax,ay,radius,radius*.32,0,0,Math.PI*2);ctx.fillStyle='rgba(255,74,105,.12)';ctx.fill();ctx.strokeStyle='#ff6879';ctx.setLineDash([7,7]);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(ax,ay,radius*(1+.04*Math.sin(t/80)),radius*.32,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
 if(kind==='erratic'&&phase==='attack'){for(let i=0;i<3;i++){const a=t/500+i*Math.PI*2/3;ctx.beginPath();ctx.arc(bx+Math.cos(a)*w*.12,by+Math.sin(a)*h*.06,8+Math.sin(t/70)*3,0,Math.PI*2);ctx.fillStyle=b.color;ctx.fill()}}
 if(kind==='gravity'&&(phase==='attack'||phase==='recovery')){ctx.save();ctx.translate(bx,by);ctx.rotate(t/800);ctx.strokeStyle=b.color;ctx.globalAlpha=.6;ctx.setLineDash([8,7]);ctx.beginPath();ctx.ellipse(0,0,w*.17,h*.07,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();ctx.beginPath();ctx.arc(attackPoint.x*w,horizon+(attackPoint.y-.2)/.7*(h-horizon),w*.08,0,Math.PI*2);ctx.strokeStyle=b.color;ctx.globalAlpha=.55;ctx.stroke();ctx.globalAlpha=1}
 // Depth-sort combatants so the arena reads as 2.5D.
 const actors=[{x:px,y:py,r:Math.max(15,w*.025),isBoss:false},{x:bx,y:by,r:Math.max(38,w*.072),isBoss:true}].sort((a,b)=>a.y-b.y)
 for(const a of actors){if(a.isBoss)drawChog(a.x,a.y,a.r,b.color,t,true);else{if(t<dodgeUntil){ctx.globalAlpha=.22;drawChog(a.x-w*.025,a.y,a.r,f.color,t,false);ctx.globalAlpha=1}if(t<invulnerableUntil)ctx.globalAlpha=.65+.35*Math.sin(t/35);drawChog(a.x,a.y,a.r,f.color,t,false);ctx.globalAlpha=1;ctx.fillStyle='#e7edf8';ctx.font='9px DM Mono,monospace';ctx.textAlign='center';ctx.fillText(f.name,a.x,a.y+a.r+14)}}
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/45);ctx.fillStyle=p.color;ctx.fillRect(p.x*w,p.y*h,p.size,p.size);ctx.globalAlpha=1}
 // Boss silhouette scale and attack animation.
 if(phase==='attack'&&kind==='heavy'){ctx.strokeStyle=b.color;ctx.globalAlpha=.6;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx-w*.07,by+h*.09);ctx.stroke();ctx.globalAlpha=1}
 ctx.restore();const vignette=ctx.createRadialGradient(w/2,h/2,h*.22,w/2,h/2,h*.82);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#03050ac9');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h)}
function frame(t:number){const dt=Math.min(40,t-(lastFrame||t));lastFrame=t;update(t,dt);draw(t);requestAnimationFrame(frame)}
renderChoices();updateMeta();resetMenu();wireStart()
$<HTMLButtonElement>('#main-action').onclick=()=>{if(phase==='menu'||phase==='won'||phase==='lost')startRun();else if(phase==='recovery')counter();else dodge()}
$<HTMLButtonElement>('#dodge-mobile').onclick=dodge;$<HTMLButtonElement>('#counter-mobile').onclick=counter
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(!e.repeat&&(k===' '||k==='shift'))dodge();if(!e.repeat&&k==='j')counter();if(k==='enter'&&(phase==='menu'||phase==='won'||phase==='lost'))startRun()})
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear())
canvas.addEventListener('pointerdown',()=>{if(phase==='recovery')counter();else dodge()})
requestAnimationFrame(frame)
