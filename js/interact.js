// ── interact.js ───────────────────────────────────────────────────────────────
function doInteraction(charId, interactionId) {
  const act  = INTERACTIONS_DATA.find(i => i.id === interactionId);
  const char = fullChar(charId);
  if (!act)  return { ok:false, msg:'Unknown interaction.' };
  if (!char) return { ok:false, msg:'Not owned.' };
  if (!spendCoins(act.cost)) return { ok:false, msg:`Need ${act.cost} 💰` };
  addAffection(charId, act.affection);
  // Save character reaction for display
  const reaction = char.reactions?.[interactionId] || '…';
  setLastReaction(charId, reaction);
  const newAff = ownedEntry(charId).affection;
  const level  = affectionLevel(newAff);
  SFX.play('heart');
  return { ok:true, char, act, newAff, level, reaction,
    msg:`You ${act.msg} with ${char.name}! (+${act.affection} ❤️)` };
}
