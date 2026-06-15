(function () {
  const MISSION_OFFER_COST = typeof PLAYER_EXPANSION_COST !== 'undefined' ? PLAYER_EXPANSION_COST : 60;

  function ready() {
    return typeof G !== 'undefined' && typeof renderRight === 'function' && typeof ielbChurchRefs === 'function';
  }

  function canPayMission() {
    return G.of >= MISSION_OFFER_COST;
  }

  function payMissionCost() {
    if (!canPayMission()) return false;
    G.of -= MISSION_OFFER_COST;
    return true;
  }

  function missionCostText(extra) {
    return 'Custo: ' + MISSION_OFFER_COST + ' Ofertas' + (extra || '');
  }

  function repaint() {
    if (typeof recalc === 'function') recalc();
    if (typeof redrawDots === 'function') redrawDots();
    if (typeof renderLeft === 'function') renderLeft();
    if (typeof renderRight === 'function') renderRight();
    if (typeof updateRes === 'function') updateRes();
  }

  function closeMissionModal(wasPaused) {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('show');
    G.paused = wasPaused;
    const pause = document.getElementById('pausebtn');
    if (pause) pause.textContent = G.paused ? '▶ Retomar' : '⏸ Pausar';
    repaint();
  }

  function chooseCities(id) {
    return (STATE_CITIES[id] || [STATES[id].name]).slice(0, 10);
  }

  window.sendMission = function (id) {
    const p = availablePastor();
    if (!p) { setTick('Sem pastores disponíveis. Aguarde as próximas formaturas.'); return; }
    if (!payMissionCost()) return;
    removeAvailablePastor(p.id);
    p.assignedStateId = id;
    p.assignedChurchIndex = null;
    G.states[id].missionary = true;
    G.states[id].missionProg = 0;
    G.states[id].missionPastorId = p.id;
    repaint();
    setTick('Pastor ' + p.name + ' enviado para ' + STATES[id].name + '. A implantação foi paga com ofertas.');
  };

  window.showChurchCityModal = function (id) {
    const p = availablePastor();
    if (!p || !canPayMission()) return;
    const wasPaused = G.paused;
    G.paused = true;
    document.getElementById('pausebtn').textContent = '▶ Retomar';
    document.getElementById('m-tag').textContent = 'MISSÃO';
    document.getElementById('m-tag').className = 'good';
    document.getElementById('m-title').textContent = 'Abrir missão neste estado';
    document.getElementById('m-yr').textContent = STATES[id].name;
    document.getElementById('m-txt').textContent = 'Como ainda não há presença da IELB neste estado, um pastor disponível será enviado para iniciar a missão.';
    const ref = document.getElementById('m-ref');
    ref.style.display = 'block';
    ref.textContent = 'Pastor dedicado: ' + p.name + ' | ' + missionCostText('');
    const mc = document.getElementById('m-choices');
    mc.innerHTML = '';
    chooseCities(id).forEach(function (city) {
      const b = document.createElement('button');
      b.className = 'mcbtn';
      b.textContent = city;
      b.onclick = function () { window.commitDedicatedChurch(id, city, wasPaused); };
      mc.appendChild(b);
    });
    const cancel = document.createElement('button');
    cancel.className = 'mcbtn';
    cancel.textContent = 'Cancelar';
    cancel.onclick = function () { closeMissionModal(wasPaused); };
    mc.appendChild(cancel);
    document.getElementById('modal').classList.add('show');
  };

  window.commitDedicatedChurch = function (id, city, wasPaused) {
    const p = availablePastor();
    if (!p || !payMissionCost()) { closeMissionModal(wasPaused); return; }
    const slot = G.states[id].denomData.IELB;
    const ch = addChurch(id, 'IELB', 12, 1, G.year, 'missao', city);
    const idx = slot.churches.indexOf(ch);
    assignPastorToChurch(p, id, idx);
    setTick('Missão aberta em ' + ch.city + ', ' + STATES[id].name + ' — Pastor ' + p.name + ' dedicado ao novo campo.');
    closeMissionModal(wasPaused);
  };

  window.showMissionCityModal = function (id) {
    const route = routePastorForNewChurch(id);
    const dedicated = availablePastor();
    if (!canPayMission() || (!route && !dedicated)) return;
    const wasPaused = G.paused;
    G.paused = true;
    document.getElementById('pausebtn').textContent = '▶ Retomar';
    document.getElementById('m-tag').textContent = 'MISSÃO';
    document.getElementById('m-tag').className = 'good';
    document.getElementById('m-title').textContent = 'Abrir mais um ponto de missão no estado';
    document.getElementById('m-yr').textContent = STATES[id].name;
    document.getElementById('m-txt').textContent = 'Escolha a cidade onde a missão será aberta.';
    const ref = document.getElementById('m-ref');
    ref.style.display = 'block';
    ref.textContent = missionCostText('');
    const mc = document.getElementById('m-choices');
    mc.innerHTML = '';
    chooseCities(id).forEach(function (city) {
      const b = document.createElement('button');
      b.className = 'mcbtn';
      b.textContent = city;
      b.onclick = function () { window.showMissionPastorChoice(id, city, wasPaused); };
      mc.appendChild(b);
    });
    const cancel = document.createElement('button');
    cancel.className = 'mcbtn';
    cancel.textContent = 'Cancelar';
    cancel.onclick = function () { closeMissionModal(wasPaused); };
    mc.appendChild(cancel);
    document.getElementById('modal').classList.add('show');
  };

  window.openMission = function (id) { window.showMissionCityModal(id); };
  window.newChurch = function (id) { window.showMissionCityModal(id); };

  window.showMissionPastorChoice = function (id, city, wasPaused) {
    const route = routePastorForNewChurch(id, city);
    const dedicated = availablePastor();
    document.getElementById('m-tag').textContent = 'MISSÃO';
    document.getElementById('m-tag').className = 'good';
    document.getElementById('m-title').textContent = 'Definir pastor da missão';
    document.getElementById('m-yr').textContent = city + ', ' + STATES[id].name;
    document.getElementById('m-txt').textContent = 'Escolha se este ponto ficará com um pastor já em atividade no estado ou com um novo pastor disponível.';
    const ref = document.getElementById('m-ref');
    ref.style.display = 'block';
    ref.textContent = missionCostText('');
    const mc = document.getElementById('m-choices');
    mc.innerHTML = '';
    if (route) {
      const b = document.createElement('button');
      b.className = 'mcbtn';
      b.textContent = 'Usar pastor já em atividade';
      b.onclick = function () { window.commitMissionPoint(id, city, wasPaused, 'route'); };
      mc.appendChild(b);
    }
    if (dedicated) {
      const b = document.createElement('button');
      b.className = 'mcbtn';
      b.textContent = 'Enviar um novo pastor disponível';
      b.onclick = function () { window.commitMissionPoint(id, city, wasPaused, 'dedicated'); };
      mc.appendChild(b);
    }
    const back = document.createElement('button');
    back.className = 'mcbtn';
    back.textContent = 'Voltar para cidades';
    back.onclick = function () { window.showMissionCityModal(id); };
    mc.appendChild(back);
    const cancel = document.createElement('button');
    cancel.className = 'mcbtn';
    cancel.textContent = 'Cancelar';
    cancel.onclick = function () { closeMissionModal(wasPaused); };
    mc.appendChild(cancel);
  };

  window.commitMissionPoint = function (id, city, wasPaused, mode) {
    const slot = G.states[id].denomData.IELB;
    const route = mode === 'dedicated' ? null : routePastorForNewChurch(id, city);
    const dedicated = mode === 'dedicated' ? availablePastor() : null;
    const pastor = dedicated || route;
    if (!pastor || !payMissionCost()) { closeMissionModal(wasPaused); return; }
    const ch = addChurch(id, 'IELB', 12, 1, G.year, 'missao', city);
    const idx = slot.churches.indexOf(ch);
    if (dedicated) assignPastorToChurch(dedicated, id, idx);
    else { addPastorRoute(route, idx); ch.pastorId = route.id; }
    setTick('Ponto de missão aberto em ' + ch.city + ', ' + STATES[id].name + ' — Pastor ' + pastor.name + (dedicated ? ' dedicado ao novo campo.' : ' encarregado.'));
    closeMissionModal(wasPaused);
  };

  const originalAddBtn = addBtn;
  window.addBtn = addBtn = function (p, lbl, note, cls, fn, dis, bid) {
    if (lbl === 'Enviar missionário') {
      const id = G.sel;
      const cooldown = G.states[id].denomData.IELB.cooldown;
      note = missionCostText(cooldown > 0 ? ' | ' + cooldown + ' meses' : '');
      dis = !canPayMission() || cooldown > 0;
      fn = function () { window.sendMission(id); };
    } else if (String(lbl).indexOf('Abrir missão') === 0) {
      const id = G.sel;
      const cooldown = G.states[id].denomData.IELB.cooldown;
      note = missionCostText(cooldown > 0 ? ' | ' + cooldown + ' meses' : '');
      dis = !canPayMission() || cooldown > 0;
      fn = function () { window.showMissionCityModal(id); };
    }
    return originalAddBtn(p, lbl, note, cls, fn, dis, bid);
  };

  window.__pelaGracaMissionCostHotfix = true;
  repaint();
})();
