(function () {
  const MEMBER_COST_STEP = 50;
  const MISSION_STEP_UPKEEP = 0.10;
  const CONGREGATION_STEP_UPKEEP = 0.16;
  const DOCTRINE_MEMBER_LOSS = 0.25;
  const DOCTRINE_MAX_WRONG_STREAK = 4;

  function populationPeople(stateId) {
    return Math.max(1, (STATE_POP[stateId] || 100) * 1000);
  }

  function formatInfluencePercent(value) {
    if (value > 0 && value < 0.01) return '<0,01%';
    if (value < 1) return value.toFixed(2).replace('.', ',') + '%';
    if (value < 10) return value.toFixed(1).replace('.', ',') + '%';
    return value.toFixed(0) + '%';
  }

  function churchMemberStepUpkeep(ch) {
    const steps = Math.floor(Math.max(0, (ch.members || 0) - 1) / MEMBER_COST_STEP);
    const stepCost = ch.type === 'missao' ? MISSION_STEP_UPKEEP : CONGREGATION_STEP_UPKEEP;
    return steps * stepCost;
  }

  function denomPopulationMembers(stateId, denom) {
    const slot = G.states[stateId].denomData[denom];
    if (denom !== 'CAT') return Math.max(0, slot.members || 0);
    const nonCath = DENOM_KEYS
      .filter(d => d !== 'CAT')
      .reduce((sum, d) => sum + Math.max(0, G.states[stateId].denomData[d].members || 0), 0);
    return Math.max(0, populationPeople(stateId) - nonCath);
  }

  churchInternalBalance = function patchedChurchInternalBalance(stateId, index) {
    const ch = G.states[stateId].denomData.IELB.churches[index];
    const pastoral = pastoralStatus(stateId, index);
    const mul = STATE_MULTI[stateId] || { of: 1 };
    const scale = index === 0 ? 1 : 1 / (1 + index * 0.08);
    const memberIncome = Math.max(0, ch.members) * OFFER_ROOT_GAIN;
    const grossIncome = memberIncome * mul.of * scale * pastoral.offerMult * G.rateMult * ECONOMY_SCALE;
    const income = grossIncome * (ch.offerRate || 0.7);
    const baseCost = PLAYER_CHURCH_UPKEEP + (ch.type === 'missao' ? 0.08 : 0.18);
    const cost = baseCost + churchMemberStepUpkeep(ch) + ch.members * PLAYER_MEMBER_CARE_UPKEEP;
    const net = income - cost;
    return { income, cost, net, deficit: Math.max(0, -net), pastoral };
  };

  recalcInfluence = function patchedRecalcInfluence() {
    ALL_STATES.forEach(id => {
      const population = populationPeople(id);
      DENOM_KEYS.forEach(d => {
        syncDenomMembers(id, d);
        const slot = G.states[id].denomData[d];
        slot.influence = Math.max(0, Math.min(100, denomPopulationMembers(id, d) / population * 100));
      });
    });
  };

  stateInfluenceSorted = function patchedStateInfluenceSorted(id) {
    return DENOM_KEYS
      .map(d => [d, G.states[id].denomData[d].influence])
      .filter(([, v]) => v > 0.0001)
      .sort((a, b) => b[1] - a[1]);
  };

  nationalDisplayInfluenceRows = function patchedNationalDisplayInfluenceRows() {
    const totalPop = ALL_STATES.reduce((sum, id) => sum + populationPeople(id), 0);
    const rows = DENOM_KEYS.map(d => {
      const members = ALL_STATES.reduce((sum, id) => sum + denomPopulationMembers(id, d), 0);
      return [d, members / totalPop * 100];
    });
    return rows.filter(([, v]) => v >= 0.01).sort((a, b) => b[1] - a[1]);
  };

  renderLeft = function patchedRenderLeft() {
    const id = G.sel;
    if (id === 'BR') return renderBrazilLeft();
    const st = G.states[id];
    document.getElementById('state-name').textContent = STATES[id].name;
    const body = document.getElementById('left-body');
    body.innerHTML = '';
    const mul = STATE_MULTI[id] || { fe: 1, of: 1 };
    const ielbC = st.denomData.IELB.churches;

    addT(body, 'Perfil da Região');
    addR(body, 'População', (STATE_POP[id] || '?') + 'k hab.');
    addR(body, 'Receptividade', st.modifiers.receptivity >= 1.2 ? 'Alta' : st.modifiers.receptivity >= 0.95 ? 'Normal' : 'Baixa');
    addR(body, 'Ofertas por membro', mul.of >= 1.5 ? 'Alta' : mul.of >= 0.9 ? 'Normal' : 'Baixa');

    if (st.missionary) {
      addT(body, 'Missionário em Campo');
      const p = getPastor(st.missionPastorId);
      const mp = document.createElement('div');
      mp.innerHTML = '<div style="font-size:12px;color:#7a6a40;margin-bottom:3px">' + (p ? p.name + ' | ' : '') + Math.floor(st.missionProg) + '% concluído</div><div class="miss-bar"><div class="miss-fill" style="width:' + st.missionProg + '%"></div></div>';
      body.appendChild(mp);
    }

    if (ielbC.length) {
      addT(body, 'Congregações IELB');
      ielbC.forEach((c, i) => {
        const ps = pastoralStatus(id, i);
        const bal = churchInternalBalance(id, i);
        addR(body, 'Igreja ' + (i + 1) + ' | Nível ' + c.level, Math.floor(c.members) + ' membros | ' + ps.label);
        addR(body, 'Taxa de oferta', Math.round((c.offerRate || 0.7) * 100) + '%');
        addR(body, 'Custo mensal', '-' + bal.cost.toFixed(2));
        if (c.struggleMonths >= 3) addR(body, 'Dificuldade financeira', 'há ' + c.struggleMonths + ' meses');
      });
    }

    addT(body, 'Influência Religiosa');
    const sorted = stateInfluenceSorted(id);
    const tot = sorted.reduce((a, [, v]) => a + v, 0) || 1;
    const track = document.createElement('div');
    track.className = 'inf-track';
    sorted.forEach(([d, v]) => {
      if (v / tot < 0.005) return;
      const seg = document.createElement('div');
      seg.className = 'inf-seg';
      seg.style.width = (v / tot * 100) + '%';
      seg.style.background = DENOMS[d].color;
      track.appendChild(seg);
    });
    body.appendChild(track);

    const il = document.createElement('div');
    il.className = 'inf-leg';
    sorted.slice(0, 6).forEach(([d, v]) => {
      const r = document.createElement('div');
      r.className = 'inf-row';
      r.innerHTML = '<span class="inf-dot" style="background:' + DENOMS[d].color + '"></span>' + DENOMS[d].name + ': ' + formatInfluencePercent(v);
      il.appendChild(r);
    });
    body.appendChild(il);

    const rivals = DENOM_KEYS.filter(d => d !== 'IELB' && churchCount(id, d) > 0).sort((a, b) => churchCount(id, b) - churchCount(id, a));
    if (rivals.length) {
      addT(body, 'Igrejas Rivais');
      rivals.forEach(d => addColorRow(body, d, churchCount(id, d) + ' igrejas / ' + Math.floor(st.denomData[d].members) + ' membros'));
    }
  };

  showTip = function patchedShowTip(id, e) {
    const rect = document.getElementById('center').getBoundingClientRect();
    const pct = G.states[id].denomData.IELB.influence || 0;
    const tip = document.getElementById('tooltip');
    tip.style.display = 'block';
    tip.style.left = (e.clientX - rect.left + 12) + 'px';
    tip.style.top = (e.clientY - rect.top - 28) + 'px';
    tip.textContent = STATES[id].name + ' | Pop: ' + (STATE_POP[id] || '?') + 'k | IELB: ' + formatInfluencePercent(pct);
  };

  showTheologyQuestionModal = function patchedShowTheologyQuestionModal(question) {
    G.paused = true;
    document.getElementById('pausebtn').textContent = '▶ Retomar';
    const modal = document.getElementById('modal');
    const tag = document.getElementById('m-tag');
    tag.textContent = 'CATECISMO';
    tag.className = 'doctrine';
    document.getElementById('m-title').textContent = 'Pergunta de doutrina';
    document.getElementById('m-yr').textContent = 'Relatório de ' + G.year;
    document.getElementById('m-txt').textContent = question.q;
    const ref = document.getElementById('m-ref');
    ref.style.display = 'block';
    ref.textContent = 'Resposta correta: +20 membros e +20 ofertas. Resposta incorreta: cada igreja e missão perde 25% dos membros.';
    const mc = document.getElementById('m-choices');
    mc.innerHTML = '';
    question.a.forEach((answer, index) => {
      const btn = document.createElement('button');
      btn.className = 'mcbtn';
      btn.textContent = String.fromCharCode(65 + index) + ') ' + answer;
      btn.onclick = () => resolveTheologyQuestion(question, index);
      mc.appendChild(btn);
    });
    modal.classList.add('show');
  };

  resolveTheologyQuestion = function patchedResolveTheologyQuestion(question, index) {
    const mc = document.getElementById('m-choices');
    [...mc.querySelectorAll('.mcbtn')].forEach(b => { b.disabled = true; });
    const correct = index === question.correct;

    if (correct) {
      G.doctrineWrongStreak = 0;
      G.of += 20;
      addMembersToIelbChurches(20, G.sel !== 'BR' ? G.sel : null);
    } else {
      G.doctrineWrongStreak = (G.doctrineWrongStreak || 0) + 1;
      G.doc = Math.max(0, G.doc - 8);
      G.fi = Math.max(0, G.fi * (1 - DOCTRINE_MEMBER_LOSS));
      ielbChurchRefs().forEach(r => {
        r.ch.members = Math.max(1, (r.ch.members || 1) * (1 - DOCTRINE_MEMBER_LOSS));
        syncDenomMembers(r.id, 'IELB');
      });
    }

    recalc();
    updateRes();
    renderLeft();
    renderRight();
    redrawDots();

    const result = document.createElement('div');
    result.className = 'event-result ' + (correct ? 'good' : 'bad');
    result.textContent = correct
      ? 'Resposta correta: +20 membros e +20 ofertas.'
      : 'Resposta incorreta: cada igreja e missão perdeu 25% dos membros. Erros seguidos: ' + (G.doctrineWrongStreak || 0) + '/' + DOCTRINE_MAX_WRONG_STREAK + '.';
    mc.appendChild(result);

    if (!correct && G.doctrineWrongStreak >= DOCTRINE_MAX_WRONG_STREAK) {
      endCampaign(false, 'Você perdeu porque abandonou os ensinamentos puros das Escrituras. Quatro respostas doutrinárias incorretas seguidas enfraqueceram a igreja.');
      return;
    }

    const cont = document.createElement('button');
    cont.className = 'mcbtn';
    cont.textContent = 'Continuar';
    cont.onclick = () => {
      document.getElementById('modal').classList.remove('show');
      G.paused = false;
      document.getElementById('pausebtn').textContent = '⏸ Pausar';
      processEventQueue();
    };
    mc.appendChild(cont);
  };

  recalc();
  updateRes();
  renderLeft();
  renderRight();
  redrawDots();
})();
