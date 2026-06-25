// ── ui.js ─────────────────────────────────────────────────────────────────────
let currentTab = 'home';
let bondSelectedId = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function affBar(aff, max=200) {
  const pct = Math.min(100,(aff/max)*100);
  const lv  = affectionLevel(aff);
  return `<div class="aff-bar-wrap"><div class="aff-bar" style="width:${pct}%;background:${lv.color}"></div></div>`;
}

function timeLeft(ms) {
  if (ms<=0) return 'Done!';
  const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60);
  if(h>0) return `${h}h ${m%60}m`;
  if(m>0) return `${m}m ${s%60}s`;
  return `${s}s`;
}

function toast(msg, type='info') {
  const el=document.createElement('div');
  el.className=`toast toast-${type}`; el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add('show'),10);
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),300); },2800);
}

function updateHeader() {
  const s=gs();
  document.getElementById('stat-coins').textContent  = s.coins.toLocaleString();
  document.getElementById('stat-tickets').textContent= s.tickets;
}

function charAvatar(c, size=48) {
  return `<div class="char-av-wrap" style="width:${size}px;height:${size}px;background:${c.grad}">
    <img class="char-av-img" src="${c.img}" alt="${c.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/>
    <span class="char-av-fb" style="display:none">${c.emoji}</span>
  </div>`;
}

function rarityStars(base, bonus=0) {
  const eff = Math.min(5, base+bonus);
  let s = '';
  for(let i=1;i<=5;i++) s += `<span class="${i<=eff?'star-on':'star-off'}">${i<=base?'★':i<=eff?'✦':'☆'}</span>`;
  return `<span class="stars-row">${s}</span>`;
}

// ── Tab routing ───────────────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const content = document.getElementById('main-content');
  content.classList.add('fade-out');
  setTimeout(()=>{ content.innerHTML=TABS[tab](); content.classList.remove('fade-out'); afterRender(tab); },150);
  updateHeader();
}

function afterRender(tab) {
  if(tab==='work') startWorkTimers();
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function renderHome() {
  const s=gs(), sp=spouse();
  return `<div class="tab-content">
    <div class="section-header">Overview</div>
    <div class="home-stats-grid">
      <div class="stat-card"><div class="stat-val">${s.coins.toLocaleString()}</div><div class="stat-lbl">💰 Coins</div></div>
      <div class="stat-card"><div class="stat-val">${s.tickets}</div><div class="stat-lbl">🎫 Tickets</div></div>
      <div class="stat-card"><div class="stat-val">${s.owned.length}/${CHARACTERS_DATA.length}</div><div class="stat-lbl">👥 Collected</div></div>
      <div class="stat-card"><div class="stat-val">${s.totalPulls}</div><div class="stat-lbl">🎰 Pulls</div></div>
    </div>

    <div class="section-header">Daily Check-In</div>
    <div class="daily-card ${canClaimDaily()?'':'claimed'}">
      <div class="daily-reward">💰 +200 &nbsp; 🎫 +1 Ticket</div>
      <button class="btn btn-primary btn-sm" id="btn-daily" ${canClaimDaily()?'':'disabled'}>
        ${canClaimDaily()?'Claim':'✓ Claimed'}
      </button>
    </div>

    <div class="section-header">Partner</div>
    ${sp ? `
    <div class="spouse-card" style="border-color:${sp.color}">
      <div class="spouse-av-wrap">${charAvatar(sp,72)}</div>
      <div class="spouse-info">
        <div class="spouse-name">${sp.name} <span class="badge badge-married">💍</span></div>
        <div class="spouse-type">${sp.type}</div>
        ${rarityStars(sp.rarity, sp.starBonus||0)}
        <div class="spouse-quote">${sp.quote}</div>
        <div class="stat-row">Work Boost <strong>+${Math.round((marriageBonus()-1)*100)}%</strong></div>
      </div>
    </div>` : `
    <div class="empty-spouse"><div class="empty-icon">💔</div><div>No one special yet.<br><small>Bond with a character to propose!</small></div></div>`}

    <div class="section-header">Recent Pulls</div>
    ${renderPullHistory()}
  </div>`;
}

function renderPullHistory() {
  const h=gs().pullHistory;
  if(!h.length) return '<div class="empty-msg">No pulls yet.</div>';
  return `<div class="history-row">${h.slice(0,12).map(id=>{
    const c=charData(id); if(!c) return '';
    return `<div class="history-chip" style="border-color:${c.color}" title="${c.name}">
      <img src="${c.img}" onerror="this.outerHTML='<span>${c.emoji}</span>'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>
    </div>`;
  }).join('')}</div>`;
}

// ── GACHA ─────────────────────────────────────────────────────────────────────
function renderGacha() {
  const s=gs(), pity=10-s.pity;
  return `<div class="tab-content">
    <div class="gacha-orb-wrap">
      <div class="gacha-orb" id="gacha-orb">
        <div class="orb-inner">✨</div>
        <div class="orb-ring r1"></div>
        <div class="orb-ring r2"></div>
      </div>
      <div class="orb-particles" id="orb-particles"></div>
    </div>
    <div class="pity-info">Guaranteed 4★+ in <strong>${pity}</strong> pull${pity===1?'':'s'}</div>
    <div class="gacha-btns">
      <button class="btn btn-secondary" id="btn-ticket-pull">🎫 Ticket Pull <span class="btn-sub">(1 Ticket)</span></button>
      <button class="btn btn-primary"   id="btn-single-pull">🎰 Single Pull <span class="btn-sub">(100 💰)</span></button>
      <button class="btn btn-gold"      id="btn-ten-pull">✨ 10-Pull <span class="btn-sub">(900 💰 · 10% off)</span></button>
    </div>
    <div class="section-header">Character Pool</div>
    <div class="pool-grid">
      ${CHARACTERS_DATA.map(c=>`
        <div class="pool-chip ${isOwned(c.id)?'owned':''}" style="border-color:${c.color}">
          <div class="pool-av">${charAvatar(c,36)}</div>
          <div class="pool-info"><div class="pool-name">${c.name}</div><div class="pool-type">${c.type}</div></div>
          <div class="pool-stars">${'★'.repeat(c.rarity)}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

// ── COLLECTION ────────────────────────────────────────────────────────────────
function renderCollection() {
  const owned=ownedFull();
  if(!owned.length) return `<div class="tab-content"><div class="empty-state"><div class="empty-icon">📭</div><div>No characters yet!</div></div></div>`;
  return `<div class="tab-content">
    <div class="section-header">Collection (${owned.length}/${CHARACTERS_DATA.length})</div>
    <div class="char-grid">${owned.map(renderCharCard).join('')}</div>
  </div>`;
}

function renderCharCard(c) {
  const e=ownedEntry(c.id), aff=e?.affection||0, lv=affectionLevel(aff);
  const meta=RARITY_META[c.effectiveRarity||c.rarity];
  const shards=e?.shards||0, starBonus=e?.starBonus||0;
  return `<div class="char-card" style="border-color:${c.color}">
    <div class="char-av-col" style="background:${c.grad}">
      ${charAvatar(c,80)}
      ${isMarried(c.id)?'<div class="ring-badge">💍</div>':''}
    </div>
    <div class="char-body">
      <div class="char-name">${c.name} <span class="badge" style="background:${meta.color}">${meta.name}</span></div>
      <div class="char-type">${c.type}</div>
      ${rarityStars(c.rarity, starBonus)}
      ${starBonus < MAX_STAR_BONUS ? `<div class="shard-row">💎 ${shards}/${SHARDS_PER_UPGRADE} shards ${starBonus>0?`(★+${starBonus})`:''}→ next upgrade</div>` : '<div class="shard-row maxed">⭐ MAX UPGRADED</div>'}
      <div class="aff-label" style="color:${lv.color}">${lv.title} · ${aff}/200 ❤️</div>
      ${affBar(aff)}
      <div class="char-stats">${Object.entries(c.stats).map(([k,v])=>`<div class="stat-pill"><span>${k[0].toUpperCase()}</span>${v}</div>`).join('')}</div>
    </div>
  </div>`;
}

// ── WORK ──────────────────────────────────────────────────────────────────────
let workTimerInterval=null;

function renderWork() {
  const owned=ownedFull(), sp=spouse(), bonus=marriageBonus();
  if(!owned.length) return `<div class="tab-content"><div class="empty-state"><div class="empty-icon">🏭</div><div>No characters!</div></div></div>`;
  return `<div class="tab-content">
    ${sp?`<div class="marriage-banner">💍 <strong>${sp.name}</strong> · Work income <strong>+${Math.round((bonus-1)*100)}%</strong></div>`:''}
    <div class="section-header">Characters</div>
    <div class="work-list" id="work-list">${owned.map(renderWorkRow).join('')}</div>
  </div>`;
}

function renderWorkRow(c) {
  const slot=workSlot(c.id), now=Date.now();
  if(slot){
    const done=now>=slot.endTime, rem=slot.endTime-now;
    const pct=Math.min(100,((now-slot.startTime)/(slot.endTime-slot.startTime))*100);
    const job=JOBS_DATA.find(j=>j.id===slot.jobId);
    return `<div class="work-row working" data-charid="${c.id}">
      <div class="wr-av">${charAvatar(c,44)}</div>
      <div class="wr-info">
        <div class="wr-name">${c.name}</div>
        <div class="wr-job">${job?.emoji} ${job?.name}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${c.color}"></div></div>
        <div class="wr-timer" data-end="${slot.endTime}">${done?'Ready!':timeLeft(rem)}</div>
      </div>
      <div class="wr-actions">${done
        ?`<button class="btn btn-sm btn-gold" onclick="handleCollect('${c.id}')">+${slot.pay}💰</button>`
        :`<button class="btn btn-sm btn-ghost" onclick="handleCancelWork('${c.id}')">✕</button>`}
      </div>
    </div>`;
  }
  return `<div class="work-row idle" data-charid="${c.id}">
    <div class="wr-av">${charAvatar(c,44)}</div>
    <div class="wr-info">
      <div class="wr-name">${c.name} <span class="badge-idle">Idle</span></div>
      <select class="job-select" id="job-sel-${c.id}">
        ${JOBS_DATA.map(j=>{
          const pay=Math.round(j.basePay*(1+c.workBonus)*marriageBonus());
          return `<option value="${j.id}">${j.emoji} ${j.name} · ${pay}💰 / ${timeLeft(j.duration*1000)}</option>`;
        }).join('')}
      </select>
    </div>
    <div class="wr-actions"><button class="btn btn-sm btn-primary" onclick="handleStartWork('${c.id}')">Send</button></div>
  </div>`;
}

function startWorkTimers() {
  clearInterval(workTimerInterval);
  workTimerInterval=setInterval(()=>{
    const rows=document.querySelectorAll('.work-row.working');
    if(!rows.length){clearInterval(workTimerInterval);return;}
    rows.forEach(row=>{
      const cid=row.dataset.charid, slot=workSlot(cid); if(!slot) return;
      const now=Date.now(), done=now>=slot.endTime, rem=slot.endTime-now;
      const pct=Math.min(100,((now-slot.startTime)/(slot.endTime-slot.startTime))*100);
      const c=charData(cid);
      const fill=row.querySelector('.progress-fill'), timer=row.querySelector('.wr-timer'), actions=row.querySelector('.wr-actions');
      if(fill)  fill.style.width=pct.toFixed(1)+'%';
      if(timer) timer.textContent=done?'Ready!':timeLeft(rem);
      if(done&&actions&&!actions.querySelector('.btn-gold'))
        actions.innerHTML=`<button class="btn btn-sm btn-gold" onclick="handleCollect('${cid}')">+${slot.pay}💰</button>`;
    });
  },1000);
}

// ── BOND (redesigned) ─────────────────────────────────────────────────────────
function renderBond() {
  const owned=ownedFull();
  if(!owned.length) return `<div class="tab-content"><div class="empty-state"><div class="empty-icon">💔</div><div>No characters yet!</div></div></div>`;
  const sel=bondSelectedId?fullChar(bondSelectedId):null;
  const selE=bondSelectedId?ownedEntry(bondSelectedId):null;
  return `<div class="tab-content bond-page">
    <div class="bond-char-scroll">
      ${owned.map(c=>`
        <div class="bond-chip ${bondSelectedId===c.id?'selected':''}" onclick="selectBondChar('${c.id}')" style="border-color:${c.color}">
          ${charAvatar(c,44)}
          <div class="bond-chip-name">${c.name}</div>
          ${isMarried(c.id)?'<div class="bond-ring">💍</div>':''}
        </div>`).join('')}
    </div>
    ${sel&&selE ? renderBondPanel(sel,selE) : '<div class="empty-msg bond-hint">← Select a character</div>'}
  </div>`;
}

function renderBondPanel(c,e) {
  const aff=e.affection||0, lv=affectionLevel(aff);
  const reaction=(gs().lastReaction||{})[c.id];
  return `
  <div class="bond-panel" style="--char-color:${c.color}">
    <!-- Portrait -->
    <div class="bond-portrait" style="background:${c.grad}">
      <img class="bond-portrait-img" src="${c.img}" alt="${c.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/>
      <span class="bond-portrait-fb" style="display:none">${c.emoji}</span>
      <div class="bond-portrait-overlay"></div>
      <div class="bond-portrait-info">
        <div class="bond-name">${c.name} ${isMarried(c.id)?'<span class="badge badge-married">💍</span>':''}</div>
        <div class="bond-type">${c.type}</div>
        ${rarityStars(c.rarity,e.starBonus||0)}
      </div>
    </div>

    <!-- Dialogue box -->
    <div class="bond-dialogue ${reaction?'has-reaction':'idle'}">
      <div class="dialogue-name">${c.name}</div>
      <div class="dialogue-text">${reaction || c.quote}</div>
    </div>

    <!-- Affection -->
    <div class="bond-aff-row">
      <span class="aff-title" style="color:${lv.color}">❤️ ${lv.title}</span>
      <span class="aff-num">${aff}/200</span>
    </div>
    ${affBar(aff)}

    <!-- Marriage section -->
    ${renderMarriageSection(c,e)}

    <!-- Activities -->
    <div class="section-header">Activities</div>
    <div class="act-grid">
      ${INTERACTIONS_DATA.map(act=>`
        <button class="act-btn" onclick="handleInteract('${c.id}','${act.id}')">
          <div class="act-emoji">${act.emoji}</div>
          <div class="act-name">${act.name}</div>
          <div class="act-meta">+${act.affection}❤️ · ${act.cost}💰</div>
        </button>`).join('')}
    </div>
  </div>`;
}

function renderMarriageSection(c,e) {
  if(isMarried(c.id)) return `
    <div class="marriage-block married">
      <div>💍 Married to <strong>${c.name}</strong></div>
      <div class="marriage-date">Since ${new Date(e.marriedAt).toLocaleDateString()}</div>
      <button class="btn btn-ghost btn-sm mt" onclick="handleDivorce()">💔 Divorce</button>
    </div>`;
  if(gs().spouseId) return `<div class="marriage-block"><div>Already married to <strong>${spouse()?.name}</strong>.</div></div>`;
  const can=canPropose(c.id), aff=e.affection||0;
  return `<div class="marriage-block ${can?'can-propose':''}">
    <div class="propose-title">💍 Propose <span class="propose-cost">(500 💰)</span></div>
    <div class="propose-req">${can?'Ready to propose!': `Need ${Math.max(0,80-aff)} more ❤️ (${aff}/80)`}</div>
    ${!can?affBar(Math.min(aff,80),80):''}
    <button class="btn btn-primary mt" ${can?'':'disabled'} onclick="handlePropose('${c.id}')">
      ${can?'💍 Propose!':`${Math.max(0,80-aff)} ❤️ needed`}
    </button>
  </div>`;
}

// ── GACHA MODAL ───────────────────────────────────────────────────────────────
function showGachaResult(results) {
  const modal=document.getElementById('gacha-modal');
  const wrap=document.getElementById('gacha-result-content');
  // Particle burst
  spawnParticles();
  modal.classList.remove('hidden');
  wrap.innerHTML='';
  results.forEach(({char,rarity,isDuplicate,upgraded,shardsNow,isPityPull},i)=>{
    const meta=RARITY_META[rarity];
    const e=ownedEntry(char.id);
    setTimeout(()=>{
      SFX.play(`reveal${rarity}`);
      const card=document.createElement('div');
      card.className=`pull-result rarity-${rarity}`;
      card.style.cssText=`border-color:${char.color};animation-delay:0ms`;
      card.innerHTML=`
        <div class="pull-av" style="background:${char.grad}">
          <img src="${char.img}" onerror="this.outerHTML='<span style=\\'font-size:2rem\\'>${char.emoji}</span>'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>
        </div>
        <div class="pull-info">
          <div class="pull-name">${char.name}
            ${isDuplicate?'<span class="badge-dup">+Shard</span>':'<span class="badge-new">NEW!</span>'}
            ${upgraded?'<span class="badge-up">⭐ UPGRADED!</span>':''}
          </div>
          <div class="pull-type">${char.type}</div>
          <div class="pull-rarity" style="color:${meta.color}">${meta.stars} ${meta.name}</div>
          ${isDuplicate&&!upgraded?`<div class="pull-shards">💎 ${shardsNow}/${SHARDS_PER_UPGRADE} shards</div>`:''}
          ${isPityPull?'<div class="pity-badge">⚡ Pity</div>':''}
        </div>`;
      wrap.appendChild(card);
    },i*120);
  });
}

function spawnParticles() {
  const container=document.getElementById('orb-particles');
  if(!container) return;
  container.innerHTML='';
  const colors=['#FF2D78','#C084FC','#FFD700','#60A5FA','#4ADE80'];
  for(let i=0;i<20;i++){
    const p=document.createElement('div');
    p.className='particle';
    p.style.cssText=`
      --tx:${(Math.random()-0.5)*200}px;
      --ty:${(Math.random()-0.5)*200}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-delay:${Math.random()*0.3}s;
      left:50%;top:50%;
    `;
    container.appendChild(p);
    setTimeout(()=>p.remove(),1200);
  }
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = { home:renderHome, gacha:renderGacha, collection:renderCollection, work:renderWork, bond:renderBond };
