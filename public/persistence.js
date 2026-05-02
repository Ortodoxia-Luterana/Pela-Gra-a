(function () {
  const saveId = window.__SAVE_ID__;
  const statusEl = () => document.getElementById('save-status');
  let lastSaved = '';
  let saveTimer = null;

  function setStatus(text, bad = false) {
    const el = statusEl();
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('bad', bad);
  }

  function serializeGame(game) {
    return {
      ...game,
      lastEv: Array.from(game.lastEv || []),
      foundedDenoms: Array.from(game.foundedDenoms || [])
    };
  }

  function reviveGame(raw) {
    if (!raw) return null;
    return {
      ...raw,
      lastEv: new Set(raw.lastEv || []),
      foundedDenoms: new Set(raw.foundedDenoms || [])
    };
  }

  async function loadInto(game) {
    try {
      const response = await fetch(`/api/saves/${saveId}`);
      if (!response.ok) throw new Error('Falha ao carregar save');
      const payload = await response.json();
      const saved = reviveGame(payload.state);
      if (saved) {
        Object.keys(game).forEach(key => delete game[key]);
        Object.assign(game, saved);
        setStatus('Save carregado do SQLite');
      } else {
        setStatus('História nova');
      }
    } catch (error) {
      console.error(error);
      setStatus('Sem persistência SQLite', true);
    }
  }

  async function save(game) {
    const state = serializeGame(game);
    const body = JSON.stringify({ state });
    if (body === lastSaved) return;
    lastSaved = body;

    try {
      const response = await fetch(`/api/saves/${saveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!response.ok) throw new Error('Falha ao salvar');
      setStatus('Salvo no SQLite');
    } catch (error) {
      console.error(error);
      setStatus('Erro ao salvar', true);
    }
  }

  function start(game) {
    saveTimer = setInterval(() => save(game), 3000);
    window.addEventListener('beforeunload', () => {
      if (saveTimer) clearInterval(saveTimer);
      navigator.sendBeacon?.(`/api/saves/${saveId}`, JSON.stringify({ state: serializeGame(game) }));
    });
  }

  function replaceExact(source, from, to) {
    if (!source.includes(from)) throw new Error('Trecho esperado não encontrado em game.js');
    return source.replace(from, to);
  }

  function patchGameSource(source) {
    source = replaceExact(source,
      'const CHURCH_SUBSIDY_MONTHS=60;',
      'const CHURCH_SUBSIDY_MONTHS=60;\nconst MEMBER_COST_STEP=50;\nconst MISSION_STEP_UPKEEP=0.10;\nconst CONGREGATION_STEP_UPKEEP=0.16;\nconst DOCTRINE_MEMBER_LOSS=0.25;\nconst DOCTRINE_MAX_WRONG_STREAK=4;'
    );

    source = replaceExact(source,
      `function recalcInfluence(){
  ALL_STATES.forEach(id=>{
    const st=G.states[id];
    DENOM_KEYS.forEach(d=>{
      const info=DENOMS[d], slot=st.denomData[d];
      syncDenomMembers(id,d);
      const churches=slot.churches.length;
      const memberPower=slot.churches.reduce((sum,c,i)=>{
        const scale=i===0?1:1/(1+i*0.18);
        const pastoralPower=d==='IELB'?churchInfluenceMult(id,i):1;
        return sum+Math.pow(Math.max(0,c.members),0.86)*(1+c.level*0.18)*scale*pastoralPower;
      },0);
      const overloaded=d==='IELB'?slot.churches.filter((_,i)=>churchNeedsPastorRelief(id,i)).length:0;
      const networkMult=overloaded?Math.max(0.62,1-overloaded*0.08):1;
      const networkPower=churches ? (churches*18+Math.sqrt(slot.members)*2.6)*networkMult : 0;
      const doctrineFactor=d==='IELB'
        ? Math.max(0.82,Math.min(1.1,0.9+(G.doc/100)*0.14+(G.mods.doctrineGrowth-1)*0.08))
        : 1;
      const historical=slot.historicalPresence ? Math.pow(slot.historicalPresence,0.82)*0.55 : 0;
      const raw=(memberPower+networkPower)*info.identity*(st.modifiers.receptivity||1)*doctrineFactor+historical;
      const popDamp=Math.pow((STATE_POP[id]||100)/350,0.32);
      slot.influence=Math.max(0, raw/Math.max(0.75,popDamp));
    });
  });
}`,
      `function statePopulationPeople(id){return Math.max(1,(STATE_POP[id]||100)*1000);}
function influencePercent(v){if(v>0&&v<0.01)return '<0,01%';if(v<1)return v.toFixed(2).replace('.',',')+'%';if(v<10)return v.toFixed(1).replace('.',',')+'%';return v.toFixed(0)+'%';}
function denomPopulationMembers(id,d){const slot=G.states[id].denomData[d];if(d!=='CAT')return Math.max(0,slot.members||0);const nonCath=DENOM_KEYS.filter(x=>x!=='CAT').reduce((sum,x)=>sum+Math.max(0,G.states[id].denomData[x].members||0),0);return Math.max(0,statePopulationPeople(id)-nonCath);}
function recalcInfluence(){
  ALL_STATES.forEach(id=>{
    const pop=statePopulationPeople(id);
    DENOM_KEYS.forEach(d=>{
      syncDenomMembers(id,d);
      G.states[id].denomData[d].influence=Math.max(0,Math.min(100,denomPopulationMembers(id,d)/pop*100));
    });
  });
}`
    );

    source = replaceExact(source,
      `function churchInternalBalance(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  const pastoral=pastoralStatus(stateId,index);
  const mul=STATE_MULTI[stateId]||{of:1};
  const scale=index===0?1:1/(1+index*0.08);
  const memberIncome=Math.max(0,ch.members)*OFFER_ROOT_GAIN;
  const grossIncome=memberIncome*mul.of*scale*pastoral.offerMult*G.rateMult*ECONOMY_SCALE;
  const income=grossIncome*(ch.offerRate||0.7);
  const cost=PLAYER_CHURCH_UPKEEP+(ch.type==='missao'?0.08:0.18)+ch.members*PLAYER_MEMBER_CARE_UPKEEP;
  const net=income-cost;
  return {income,cost,net,deficit:Math.max(0,-net),pastoral};
}`,
      `function churchMemberStepUpkeep(ch){const steps=Math.floor(Math.max(0,(ch.members||0)-1)/MEMBER_COST_STEP);return steps*(ch.type==='missao'?MISSION_STEP_UPKEEP:CONGREGATION_STEP_UPKEEP);}
function churchInternalBalance(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  const pastoral=pastoralStatus(stateId,index);
  const mul=STATE_MULTI[stateId]||{of:1};
  const scale=index===0?1:1/(1+index*0.08);
  const memberIncome=Math.max(0,ch.members)*OFFER_ROOT_GAIN;
  const grossIncome=memberIncome*mul.of*scale*pastoral.offerMult*G.rateMult*ECONOMY_SCALE;
  const income=grossIncome*(ch.offerRate||0.7);
  const baseCost=PLAYER_CHURCH_UPKEEP+(ch.type==='missao'?0.08:0.18);
  const cost=baseCost+churchMemberStepUpkeep(ch)+ch.members*PLAYER_MEMBER_CARE_UPKEEP;
  const net=income-cost;
  return {income,cost,net,deficit:Math.max(0,-net),pastoral};
}`
    );

    source = replaceExact(source,
      `function stateInfluenceSorted(id){
  return DENOM_KEYS.map(d=>[d,G.states[id].denomData[d].influence]).filter(([,v])=>v>0.01).sort((a,b)=>b[1]-a[1]);
}`,
      `function stateInfluenceSorted(id){
  return DENOM_KEYS.map(d=>[d,G.states[id].denomData[d].influence]).filter(([,v])=>v>0.0001).sort((a,b)=>b[1]-a[1]);
}`
    );

    source = replaceExact(source,
      `function nationalDisplayInfluenceRows(){
  const nonCath=DENOM_KEYS.filter(d=>d!=='CAT').map(d=>[d,ALL_STATES.reduce((a,id)=>a+G.states[id].denomData[d].influence,0)]).filter(([,v])=>v>0);
  const nonCathRaw=nonCath.reduce((a,[,v])=>a+v,0);
  const cathRaw=ALL_STATES.reduce((a,id)=>a+G.states[id].denomData.CAT.influence,0);
  const nonCathPct=Math.min(78,Math.max(0,100*nonCathRaw/Math.max(1,cathRaw*5+nonCathRaw)));
  const cathPct=Math.max(0,100-nonCathPct);
  const rows=[['CAT',cathPct]];
  const nonCathSum=nonCathRaw||1;
  nonCath.forEach(([d,v])=>rows.push([d,nonCathPct*(v/nonCathSum)]));
  return rows.filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]);
}`,
      `function nationalDisplayInfluenceRows(){
  const totalPop=ALL_STATES.reduce((sum,id)=>sum+statePopulationPeople(id),0);
  return DENOM_KEYS.map(d=>[d,ALL_STATES.reduce((sum,id)=>sum+denomPopulationMembers(id,d),0)/totalPop*100]).filter(([,v])=>v>=0.01).sort((a,b)=>b[1]-a[1]);
}`
    );

    source = replaceExact(source,
      `tip.textContent=STATES[id].name+' | Pop: '+(STATE_POP[id]||'?')+'k | IELB: '+pct+'%';`,
      `tip.textContent=STATES[id].name+' | Pop: '+(STATE_POP[id]||'?')+'k | IELB: '+influencePercent(G.states[id].denomData.IELB.influence||0);`
    );

    source = replaceExact(source,
      `r.innerHTML='<span class="inf-dot" style="background:'+DENOMS[d].color+'"></span>'+DENOMS[d].name+': '+(v/tot*100).toFixed(0)+'%';`,
      `r.innerHTML='<span class="inf-dot" style="background:'+DENOMS[d].color+'"></span>'+DENOMS[d].name+': '+influencePercent(v);`
    );

    source = replaceExact(source,
      `addR(body,'Taxa de oferta',Math.round((c.offerRate||0.7)*100)+'%');if(c.struggleMonths>=3)addR(body,'Dificuldade financeira','há '+c.struggleMonths+' meses');`,
      `addR(body,'Taxa de oferta',Math.round((c.offerRate||0.7)*100)+'%');addR(body,'Custo mensal','-'+churchInternalBalance(id,i).cost.toFixed(2));if(c.struggleMonths>=3)addR(body,'Dificuldade financeira','há '+c.struggleMonths+' meses');`
    );

    source = replaceExact(source,
      `const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Resposta correta: +20 membros e +20 ofertas.';`,
      `const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Resposta correta: +20 membros e +20 ofertas. Resposta incorreta: cada igreja e missão perde 25% dos membros.';`
    );

    source = replaceExact(source,
      `if(correct){
    G.of+=20;
    addMembersToIelbChurches(20,G.sel!=='BR'?G.sel:null);
  }else{
    G.doc=Math.max(0,G.doc-8);
    ielbChurchRefs().forEach(r=>{r.ch.members=Math.max(1,(r.ch.members||1)-30);syncDenomMembers(r.id,'IELB');});
  }`,
      `if(correct){
    G.doctrineWrongStreak=0;
    G.of+=20;
    addMembersToIelbChurches(20,G.sel!=='BR'?G.sel:null);
  }else{
    G.doctrineWrongStreak=(G.doctrineWrongStreak||0)+1;
    G.doc=Math.max(0,G.doc-8);
    G.fi=Math.max(0,G.fi*(1-DOCTRINE_MEMBER_LOSS));
    ielbChurchRefs().forEach(r=>{r.ch.members=Math.max(1,(r.ch.members||1)*(1-DOCTRINE_MEMBER_LOSS));syncDenomMembers(r.id,'IELB');});
  }`
    );

    source = replaceExact(source,
      `result.textContent=correct?'Resposta correta: +20 membros e +20 ofertas.':'Resposta incorreta: doutrina enfraquecida e -30 membros por igreja.';`,
      `result.textContent=correct?'Resposta correta: +20 membros e +20 ofertas.':'Resposta incorreta: cada igreja e missão perdeu 25% dos membros. Erros seguidos: '+(G.doctrineWrongStreak||0)+'/'+DOCTRINE_MAX_WRONG_STREAK+'.';`
    );

    source = replaceExact(source,
      `mc.appendChild(result);
  const cont=document.createElement('button');`,
      `mc.appendChild(result);
  if(!correct&&G.doctrineWrongStreak>=DOCTRINE_MAX_WRONG_STREAK){endCampaign(false,'Você perdeu porque abandonou os ensinamentos puros das Escrituras. Quatro respostas doutrinárias incorretas seguidas enfraqueceram a igreja.');return;}
  const cont=document.createElement('button');`
    );

    return source;
  }

  function loadPatchedGame() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/assets/game.js', false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) throw new Error('Falha ao carregar game.js');
    const patched = patchGameSource(xhr.responseText).replace(/<\/script/gi, '<\\/script');
    document.write('<script>' + patched + '<\/script><!--');
  }

  window.CultivandoPersistence = { loadInto, start, save };
  loadPatchedGame();
})();
