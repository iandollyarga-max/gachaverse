// ── main.js ───────────────────────────────────────────────────────────────────
function handlePull(type) {
  let r;
  if(type==='single')  r=singlePull();
  else if(type==='ticket') r=ticketPull();
  else r=tenPull();
  if(!r.ok){toast(r.msg,'error');return;}
  showGachaResult(r.results);
  updateHeader();
}

function handleStartWork(charId) {
  const sel=document.getElementById(`job-sel-${charId}`); if(!sel) return;
  const res=startWork(charId,sel.value);
  if(!res.ok){toast(res.msg,'error');return;}
  SFX.play('click');
  const job=JOBS_DATA.find(j=>j.id===sel.value);
  toast(`${charData(charId)?.name} started working! ⏱️ ${timeLeft(job.duration*1000)}`,'success');
  switchTab('work');
}

function handleCollect(charId) {
  const res=collectWork(charId);
  if(!res.ok){toast(res.msg,'error');return;}
  SFX.play('collect');
  toast(`Collected +${res.pay} 💰!`,'success');
  updateHeader(); switchTab('work');
}

function handleCancelWork(charId) {
  cancelWork(charId); toast('Cancelled.','info'); switchTab('work');
}

function selectBondChar(id) {
  bondSelectedId=id; SFX.play('click'); switchTab('bond');
}

function handleInteract(charId,interactionId) {
  const res=doInteraction(charId,interactionId);
  if(!res.ok){toast(res.msg,'error');return;}
  toast(`${res.act.emoji} ${res.act.name} · ${res.level.title} (${res.newAff} ❤️)`,'success');
  updateHeader(); switchTab('bond');
}

function handlePropose(charId) {
  if(!propose(charId)){toast('Cannot propose.','error');return;}
  SFX.play('marry');
  toast(`💍 Married to ${charData(charId)?.name}! Work income boosted!`,'success');
  updateHeader(); switchTab('bond');
}

function handleDivorce() {
  if(!confirm('Divorce?')) return;
  divorce(); toast('💔 Divorced.','info');
  bondSelectedId=null; updateHeader(); switchTab('bond');
}

function handleDaily() {
  if(!claimDaily()){toast('Already claimed today!','info');return;}
  SFX.play('coin'); toast('🎁 Daily! +200 💰 +1 🎫','success');
  updateHeader(); switchTab('home');
}

// Global click delegation
document.addEventListener('click',e=>{
  const t=e.target.closest('[id]'); if(!t) return;
  const sfxTargets=['btn-single-pull','btn-ticket-pull','btn-ten-pull','btn-daily'];
  if(sfxTargets.includes(t.id)) SFX.play('click');
  if(t.id==='btn-single-pull')    handlePull('single');
  if(t.id==='btn-ticket-pull')    handlePull('ticket');
  if(t.id==='btn-ten-pull')       handlePull('ten');
  if(t.id==='btn-daily')          handleDaily();
  if(t.id==='gacha-modal-close')  document.getElementById('gacha-modal').classList.add('hidden');
});

document.addEventListener('click',e=>{
  if(e.target.classList.contains('modal-overlay'))
    document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));
});

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{ SFX.play('click'); switchTab(btn.dataset.tab); });
});

window.addEventListener('DOMContentLoaded',()=>{
  loadGame(); updateHeader(); switchTab('home');
});
