// ── gacha.js ──────────────────────────────────────────────────────────────────
const PULL_COST = 100;

function rollRarity(forcePity) {
  const w = { ...RARITY_WEIGHTS };
  if (forcePity) { w[2] = 0; w[3] = 0; }
  const pool = [];
  for (const [r, wt] of Object.entries(w)) for (let i=0;i<wt;i++) pool.push(Number(r));
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickCharacter(rarity) {
  const pool = CHARACTERS_DATA.filter(c => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function doPull() {
  const isPityPull = gs().pity === 9;
  const rarity = rollRarity(isPityPull);
  const char   = pickCharacter(rarity);
  if (!char) return null;
  const { isDuplicate, upgraded, shardsNow } = grantChar(char.id);
  recordPull(char.id);
  return { char, rarity, isDuplicate, upgraded, shardsNow, isPityPull };
}

function singlePull() {
  if (!spendCoins(PULL_COST)) return { ok:false, msg:`Need ${PULL_COST} 💰` };
  SFX.play('pull');
  const r = doPull();
  return r ? { ok:true, results:[r] } : { ok:false, msg:'No characters.' };
}

function ticketPull() {
  if (!spendTicket()) return { ok:false, msg:'No tickets 🎫' };
  SFX.play('pull');
  const r = doPull();
  return r ? { ok:true, results:[r] } : { ok:false, msg:'No characters.' };
}

function tenPull() {
  if (!spendCoins(900)) return { ok:false, msg:'Need 900 💰' };
  SFX.play('pull');
  const results = [];
  for (let i=0;i<10;i++) { const r = doPull(); if(r) results.push(r); }
  return { ok:true, results };
}
