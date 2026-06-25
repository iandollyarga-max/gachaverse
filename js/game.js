// ── game.js ───────────────────────────────────────────────────────────────────
const SAVE_KEY = 'gachaverse_v2';

const DEFAULT_STATE = {
  coins:500, tickets:5, pity:0, totalPulls:0,
  owned:[],       // [{ id, affection, shards, starBonus, marriedAt? }]
  spouseId:null,
  workSlots:[],   // [{ charId, jobId, startTime, endTime, pay }]
  lastDaily:null,
  pullHistory:[],
  lastReaction:{},  // charId → reaction text
};

let S = structuredClone(DEFAULT_STATE);

// ── Persistence ───────────────────────────────────────────────────────────────
function loadGame() {
  try { const r = localStorage.getItem(SAVE_KEY); if (r) S = {...DEFAULT_STATE,...JSON.parse(r)}; }
  catch { S = structuredClone(DEFAULT_STATE); }
}
function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }
function hardReset() { localStorage.removeItem(SAVE_KEY); S = structuredClone(DEFAULT_STATE); }

// ── Selectors ─────────────────────────────────────────────────────────────────
function gs()         { return S; }
function ownedEntry(id){ return S.owned.find(c => c.id === id) || null; }
function charData(id)  { return CHARACTERS_DATA.find(c => c.id === id) || null; }

function fullChar(id) {
  const e = ownedEntry(id), d = charData(id);
  if (!e || !d) return null;
  return { ...d, ...e, effectiveRarity: Math.min(5, d.rarity + (e.starBonus||0)) };
}

function ownedFull()  { return S.owned.map(e => fullChar(e.id)).filter(Boolean); }
function spouse()     { return S.spouseId ? fullChar(S.spouseId) : null; }
function isOwned(id)  { return !!ownedEntry(id); }
function isMarried(id){ return S.spouseId === id; }

function affectionLevel(aff) {
  return AFFECTION_LEVELS.findLast(l => aff >= l.min) || AFFECTION_LEVELS[0];
}

function marriageBonus() {
  const sp = spouse();
  if (!sp) return 1.0;
  return 1.0 + sp.workBonus + 0.30;
}

function canClaimDaily() { return S.lastDaily !== new Date().toDateString(); }

// ── Mutations ─────────────────────────────────────────────────────────────────
function addCoins(n)   { S.coins = Math.max(0, S.coins + n); saveGame(); }
function spendCoins(n) { if (S.coins < n) return false; S.coins -= n; saveGame(); return true; }
function spendTicket() { if (S.tickets < 1) return false; S.tickets--; saveGame(); return true; }
function addTickets(n) { S.tickets += n; saveGame(); }

// Returns { isDuplicate, upgraded, shardsNow }
function grantChar(id) {
  const existing = ownedEntry(id);
  if (existing) {
    existing.shards = (existing.shards || 0) + 1;
    existing.affection = Math.min(200, (existing.affection || 0) + 15);
    let upgraded = false;
    if (existing.shards >= SHARDS_PER_UPGRADE && (existing.starBonus || 0) < MAX_STAR_BONUS) {
      existing.shards -= SHARDS_PER_UPGRADE;
      existing.starBonus = (existing.starBonus || 0) + 1;
      upgraded = true;
    }
    saveGame();
    return { isDuplicate:true, upgraded, shardsNow: existing.shards };
  }
  S.owned.push({ id, affection:0, shards:0, starBonus:0 });
  saveGame();
  return { isDuplicate:false, upgraded:false, shardsNow:0 };
}

function addAffection(id, n) {
  const e = ownedEntry(id);
  if (e) { e.affection = Math.min(200, (e.affection||0) + n); saveGame(); }
}

function setLastReaction(charId, text) {
  S.lastReaction = S.lastReaction || {};
  S.lastReaction[charId] = text;
  saveGame();
}

function recordPull(id) {
  S.pullHistory.unshift(id);
  if (S.pullHistory.length > 20) S.pullHistory.pop();
  S.pity = (S.pity + 1) % 10;
  S.totalPulls++;
  saveGame();
}

function claimDaily() {
  if (!canClaimDaily()) return false;
  S.lastDaily = new Date().toDateString();
  addCoins(200); addTickets(1); saveGame(); return true;
}

// ── Marriage ──────────────────────────────────────────────────────────────────
function canPropose(id) {
  const e = ownedEntry(id);
  return e && e.affection >= 80 && !S.spouseId;
}

function propose(id) {
  if (!canPropose(id) || !spendCoins(500)) return false;
  S.spouseId = id;
  const e = ownedEntry(id); if (e) e.marriedAt = new Date().toISOString();
  saveGame(); return true;
}

function divorce() {
  if (!S.spouseId) return false;
  const e = ownedEntry(S.spouseId); if (e) delete e.marriedAt;
  S.spouseId = null; saveGame(); return true;
}

// ── Work ──────────────────────────────────────────────────────────────────────
function isWorking(id) { return S.workSlots.some(w => w.charId === id); }
function workSlot(id)  { return S.workSlots.find(w => w.charId === id) || null; }

function startWork(charId, jobId) {
  if (isWorking(charId)) return { ok:false, msg:'Already working.' };
  if (!isOwned(charId))  return { ok:false, msg:'Not owned.' };
  const job = JOBS_DATA.find(j => j.id === jobId), c = charData(charId);
  if (!job || !c) return { ok:false, msg:'Invalid.' };
  const pay = Math.round(job.basePay * (1 + c.workBonus) * marriageBonus());
  const now = Date.now();
  S.workSlots.push({ charId, jobId, startTime:now, endTime:now + job.duration*1000, pay });
  saveGame(); return { ok:true, pay, duration:job.duration };
}

function collectWork(charId) {
  const slot = workSlot(charId);
  if (!slot) return { ok:false, msg:'Not working.' };
  if (Date.now() < slot.endTime) return { ok:false, msg:'Not done yet.', remaining: slot.endTime - Date.now() };
  S.workSlots = S.workSlots.filter(w => w.charId !== charId);
  addCoins(slot.pay); saveGame(); return { ok:true, pay:slot.pay };
}

function cancelWork(charId) {
  S.workSlots = S.workSlots.filter(w => w.charId !== charId); saveGame();
}
