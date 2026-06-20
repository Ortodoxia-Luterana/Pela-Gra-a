(function initSantaConquistaApp() {
  const data = window.SANTA_CONQUISTA_DATA;
  const lobby = document.getElementById('sc-lobby');
  const game = document.getElementById('sc-game');
  const roomList = document.getElementById('sc-room-list');
  const mapEl = document.getElementById('sc-map');
  const roomNameEl = document.getElementById('sc-room-name');
  const dateEl = document.getElementById('sc-date');
  const resourcesEl = document.getElementById('sc-resources');
  const selectionEl = document.getElementById('sc-selection');
  const actionsEl = document.getElementById('sc-actions');
  const diplomacyEl = document.getElementById('sc-diplomacy');
  const eventsEl = document.getElementById('sc-events');
  const logEl = document.getElementById('sc-log');
  const chatEl = document.getElementById('sc-chat');
  const rankingEl = document.getElementById('sc-ranking');
  const nationDialog = document.getElementById('sc-nation-dialog');
  const nationList = document.getElementById('sc-nation-list');
  const openNations = document.getElementById('sc-open-nations');
  const refresh = document.getElementById('sc-refresh');
  const pause = document.getElementById('sc-pause');
  const chatForm = document.getElementById('sc-chat-form');
  const chatInput = document.getElementById('sc-chat-input');

  let client = null;
  let currentRoomId = null;
  let state = null;
  let mapMode = 'political';
  let selectedProvinceId = 'jerusalem';

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function formatNumber(value) {
    return Math.round(Number(value || 0)).toLocaleString('pt-BR');
  }

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'sc-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  async function loadRooms() {
    try {
      const res = await fetch('/api/santa-conquista/rooms', { headers: { Accept: 'application/json' } });
      if (res.status === 403) {
        window.location.href = '/santa-conquista';
        return;
      }
      const payload = await res.json();
      renderRooms(payload.rooms || []);
    } catch (error) {
      roomList.innerHTML = '<p>Nao foi possivel carregar os mapas.</p>';
    }
  }

  function renderRooms(rooms) {
    roomList.innerHTML = rooms.map(room => `
      <article class="sc-room">
        <div>
          <h2>${escapeHtml(room.name)}</h2>
          <p>${escapeHtml(room.flavor)}</p>
          <div class="sc-room-meta">
            <span>${escapeHtml(room.year)} ${escapeHtml(room.monthName)}</span>
            <span>${room.players} jogadores</span>
            <span>${room.online} online</span>
            <span>Geracao ${room.generation}</span>
            ${room.stale ? '<span>reinicia ao entrar</span>' : ''}
          </div>
        </div>
        <button type="button" data-room="${escapeHtml(room.id)}">Entrar</button>
      </article>
    `).join('');
    roomList.querySelectorAll('[data-room]').forEach(button => {
      button.addEventListener('click', () => joinRoom(button.dataset.room));
    });
  }

  function ensureClient() {
    if (client) return client;
    client = window.SantaConquistaNet.createClient({
      status: message => console.debug('[Santa Conquista]', message),
      error: message => toast(message),
      joined: payload => {
        state = payload.state;
        currentRoomId = payload.room.id;
        selectedProvinceId = state.provinces[selectedProvinceId] ? selectedProvinceId : 'jerusalem';
        lobby.hidden = true;
        game.hidden = false;
        render();
        if (!state.me?.nationId) openNationDialog();
      },
      state: nextState => {
        if (!nextState.me && state?.me) {
          const nationId = nextState.players?.[state.me.id]?.nationId || state.me.nationId || null;
          nextState.me = { ...state.me, nationId };
        }
        state = nextState;
        currentRoomId = nextState.roomId;
        render();
      }
    });
    return client;
  }

  function joinRoom(roomId) {
    ensureClient().joinRoom(roomId);
  }

  function myNation() {
    return state?.me?.nationId ? state.nations[state.me.nationId] : null;
  }

  function selectedProvince() {
    return state?.provinces?.[selectedProvinceId] || null;
  }

  function resource(label, value) {
    return `<span>${label}<b>${formatNumber(value)}</b></span>`;
  }

  function armiesInProvince(provinceId) {
    return Object.values(state?.armies || {}).filter(army => army.provinceId === provinceId);
  }

  function garrisonSize(province) {
    const local = province.localTroops || {};
    return Math.round((local.infantry || 0) + (local.archers || 0) + (local.cavalry || 0) + province.fortress * 95);
  }

  function activeWarBetween(a, b) {
    return state.wars.find(war => war.status === 'active' && ((war.attacker === a && war.defender === b) || (war.defender === a && war.attacker === b)));
  }

  function render() {
    if (!state) return;
    const nation = myNation();
    roomNameEl.textContent = nation ? nation.name : 'Santa Conquista';
    dateEl.textContent = `${state.monthName} de ${state.year} d.C. - ${state.roomName} - ${state.paused ? 'Pausado' : `${state.speed}x`}`;
    pause.textContent = state.paused ? 'Retomar' : 'Pausar';
    resourcesEl.innerHTML = nation ? [
      resource('Ouro', nation.resources.gold),
      resource('Homens', nation.resources.manpower),
      resource('Prestigio', nation.resources.prestige),
      resource('Piedade', nation.resources.piety),
      resource('Estab.', nation.resources.stability),
      resource('Autor.', nation.resources.authority)
    ].join('') : '<span>Nacao<b>Escolha</b></span>';

    window.SantaConquistaMap.render(mapEl, data, state, {
      mode: mapMode,
      selectedId: selectedProvinceId,
      onSelect: id => {
        selectedProvinceId = id;
        render();
      }
    });
    renderSelection();
    renderActions();
    renderDiplomacy();
    renderEvents();
    renderLogChatRanking();
    renderNationList();
  }

  function renderSelection() {
    const province = selectedProvince();
    if (!province) {
      selectionEl.innerHTML = '<div class="sc-info"><h3>Nenhuma provincia</h3><p>Toque no mapa para inspecionar.</p></div>';
      return;
    }
    const owner = state.nations[province.owner];
    const occupier = province.occupier ? state.nations[province.occupier] : null;
    const armies = armiesInProvince(province.id);
    const armyText = armies.length
      ? armies.map(army => `${state.nations[army.nationId]?.shortName || army.nationId}: ${formatNumber(army.size)} homens`).join('<br>')
      : 'Nenhum exercito em campo.';
    selectionEl.innerHTML = `
      <div class="sc-info sc-province-card">
        <div class="sc-province-title">
          <h3>${escapeHtml(province.name)}</h3>
          <span class="sc-owner-chip" style="border-color:${escapeHtml(owner?.color || '#d6a64a')}">${escapeHtml(owner?.shortName || province.owner)}</span>
        </div>
        <div class="sc-stat-grid">
          <span class="sc-stat">Guarnicao<b>${formatNumber(garrisonSize(province))}</b></span>
          <span class="sc-stat">Fortaleza<b>Nivel ${province.fortress}</b></span>
          <span class="sc-stat">Renda<b>${province.wealth}</b></span>
          <span class="sc-stat">Lealdade<b>${Math.round(province.loyalty)}%</b></span>
          <span class="sc-stat">Religiao<b>${escapeHtml(data.religions[province.religion]?.name || province.religion)}</b></span>
          <span class="sc-stat">Terreno<b>${escapeHtml(province.terrain)}</b></span>
        </div>
        <p><b>Exercitos:</b><br>${armyText}</p>
        ${occupier ? `<p><b>Ocupante:</b> ${escapeHtml(occupier.name)}</p>` : ''}
        <p><b>Cultura:</b> ${escapeHtml(province.culture)}. <b>Heresia:</b> ${province.heresy ? escapeHtml(province.heresy) : `risco ${Math.round(province.heresyRisk)}%`}.</p>
        <p><b>Edificios:</b> ${province.buildings.length ? province.buildings.map(id => data.buildings[id]?.name || id).join(', ') : 'nenhum'}</p>
      </div>
      <div class="sc-info">
        <h4>${escapeHtml(owner?.name || '')}</h4>
        <p><b>Governante:</b> ${escapeHtml(owner?.ruler || '')}</p>
        <p><b>Capital:</b> ${escapeHtml(state.provinces[owner?.capital]?.name || '')}</p>
        <p><b>Provincias:</b> ${owner?.provinces?.length || 0}</p>
        <p>${escapeHtml(window.SantaConquistaAi.posture(owner, state))}</p>
      </div>
    `;
  }

  function renderActions() {
    const nation = myNation();
    const province = selectedProvince();
    if (!nation) {
      actionsEl.innerHTML = '<button type="button" id="sc-choose-first">Escolher nacao</button><div class="sc-info"><p>Voce pode observar o mapa antes de assumir um reino. Quando escolher uma nacao, comandos militares e administrativos aparecem aqui.</p></div>';
      document.getElementById('sc-choose-first')?.addEventListener('click', openNationDialog);
      return;
    }
    if (!province) {
      actionsEl.innerHTML = '<div class="sc-info"><p>Selecione uma provincia no mapa.</p></div>';
      return;
    }
    const army = state.armies[nation.id];
    const current = state.provinces[army?.provinceId];
    const isNeighbor = current?.neighbors?.includes(province.id);
    const owns = province.owner === nation.id;
    const war = activeWarBetween(nation.id, province.owner);
    const allied = nation.diplomacy?.allies?.includes(province.owner);
    const buttons = [];
    if (owns) {
      buttons.push(`<button data-train="${province.id}" type="button">Recrutar 120 homens</button>`);
      if (army?.provinceId !== province.id && isNeighbor) buttons.push(`<button data-move="${province.id}" type="button">Mover exercito</button>`);
      Object.entries(data.buildings).forEach(([id, building]) => {
        if (!province.buildings.includes(id)) buttons.push(`<button data-build="${id}" type="button">${escapeHtml(building.name)}</button>`);
      });
      buttons.push(`<button data-religion="preach" type="button">Patrocinar igreja</button>`);
      buttons.push(`<button data-religion="tolerate" type="button">Aumentar tolerancia</button>`);
      buttons.push(`<button data-religion="force" type="button">Forcar conversao</button>`);
    } else if (isNeighbor) {
      if (!war) {
        if (allied) {
          buttons.push('<button disabled type="button">Aliado diplomatico</button>');
        } else {
          buttons.push(`<button data-alliance="${province.owner}" type="button">Propor alianca</button>`);
          buttons.push(`<button data-war="${province.owner}" type="button">Declarar guerra</button>`);
        }
        buttons.push('<button disabled type="button">Atacar exige guerra ativa</button>');
      } else {
        buttons.push(`<button data-move="${province.id}" type="button">Atacar / cercar</button>`);
        if (province.occupier === nation.id) buttons.push(`<button data-peace="${war.id}" type="button">Exigir provincia em paz</button>`);
      }
    } else if (war && province.occupier === nation.id) {
      buttons.push(`<button data-peace="${war.id}" type="button">Exigir provincia em paz</button>`);
      buttons.push('<button disabled type="button">Provincia ocupada</button>');
    } else {
      buttons.push('<button disabled type="button">Fora do alcance do exercito</button>');
    }
    actionsEl.innerHTML = `
      <div class="sc-info">
        <h4>${escapeHtml(nation.name)}</h4>
        <p>Exercito em ${escapeHtml(current?.name || 'campo')}: ${formatNumber(army?.size || 0)} homens, moral ${Math.round(army?.morale || 0)}.</p>
        <p>Alvo selecionado: ${escapeHtml(province.name)}. Guarnicao estimada: ${formatNumber(garrisonSize(province))} homens.</p>
      </div>
      <div class="sc-action-grid">${buttons.join('')}</div>
    `;
    actionsEl.querySelectorAll('[data-build]').forEach(button => button.addEventListener('click', () => client.build(currentRoomId, province.id, button.dataset.build)));
    actionsEl.querySelectorAll('[data-train]').forEach(button => button.addEventListener('click', () => client.trainArmy(currentRoomId, button.dataset.train, 120)));
    actionsEl.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => client.moveArmy(currentRoomId, button.dataset.move)));
    actionsEl.querySelectorAll('[data-war]').forEach(button => button.addEventListener('click', () => client.declareWar(currentRoomId, button.dataset.war, province.id)));
    actionsEl.querySelectorAll('[data-alliance]').forEach(button => button.addEventListener('click', () => client.proposeAlliance(currentRoomId, button.dataset.alliance)));
    actionsEl.querySelectorAll('[data-peace]').forEach(button => button.addEventListener('click', () => client.offerPeace(currentRoomId, button.dataset.peace, province.id)));
    actionsEl.querySelectorAll('[data-religion]').forEach(button => button.addEventListener('click', () => client.religion(currentRoomId, province.id, button.dataset.religion)));
  }

  function renderDiplomacy() {
    const nation = myNation();
    if (!nation) {
      diplomacyEl.innerHTML = '<p class="sc-empty">Escolha uma nacao para ver guerras, tratados e propostas.</p>';
      return;
    }
    const wars = state.wars.filter(war => war.status === 'active' && (war.attacker === nation.id || war.defender === nation.id));
    const treaties = state.treaties.filter(treaty => treaty.status === 'pending' && treaty.to === nation.id);
    const allies = (nation.diplomacy?.allies || []).map(id => state.nations[id]).filter(Boolean);
    diplomacyEl.innerHTML = `
      ${allies.length ? `<div class="sc-info"><h4>Aliancas</h4><p>${allies.map(ally => escapeHtml(ally.shortName)).join(', ')}</p></div>` : ''}
      ${wars.length ? wars.map(war => {
        const enemy = state.nations[war.attacker === nation.id ? war.defender : war.attacker];
        return `<div class="sc-info"><h4>Guerra contra ${escapeHtml(enemy?.shortName || 'rival')}</h4><p>Placar: ${Math.round(war.warScore)}</p><p>Objetivo: ${escapeHtml(state.provinces[war.objective]?.name || war.objective || 'fronteira')}</p></div>`;
      }).join('') : '<p class="sc-empty">Nenhuma guerra ativa.</p>'}
      ${treaties.map(treaty => treaty.type === 'alliance_offer'
        ? `<div class="sc-info"><h4>Proposta de alianca</h4><p>${escapeHtml(state.nations[treaty.from]?.shortName || treaty.from)} quer firmar alianca.</p><button data-accept-alliance="${escapeHtml(treaty.id)}" type="button">Aceitar alianca</button></div>`
        : `<div class="sc-info"><h4>Proposta de paz</h4><p>${escapeHtml(state.nations[treaty.from]?.shortName || treaty.from)} pede acordo por ${escapeHtml(state.provinces[treaty.terms?.cedeProvince]?.name || 'provincia')}.</p><button data-accept-peace="${escapeHtml(treaty.id)}" type="button">Aceitar paz</button></div>`).join('')}
    `;
    diplomacyEl.querySelectorAll('[data-accept-peace]').forEach(button => button.addEventListener('click', () => client.acceptPeace(currentRoomId, button.dataset.acceptPeace)));
    diplomacyEl.querySelectorAll('[data-accept-alliance]').forEach(button => button.addEventListener('click', () => client.acceptAlliance(currentRoomId, button.dataset.acceptAlliance)));
  }

  function renderEvents() {
    if (!state.events?.length) {
      eventsEl.innerHTML = '<p class="sc-empty">Sem alerta diplomatico ou acontecimento mundial no momento.</p>';
      return;
    }
    const me = state.me?.id;
    eventsEl.innerHTML = state.events.slice(-2).reverse().map(event => {
      const resolved = me && event.resolvedBy?.[me];
      return `<div class="sc-info"><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml(event.body)}</p>${resolved ? `<p>Escolha feita: ${escapeHtml(resolved)}</p>` : `<div class="sc-action-grid">${(event.choices || []).map(choice => `<button data-event="${escapeHtml(event.id)}" data-choice="${escapeHtml(choice.id)}" type="button">${escapeHtml(choice.label)}</button>`).join('')}</div>`}</div>`;
    }).join('');
    eventsEl.querySelectorAll('[data-event]').forEach(button => button.addEventListener('click', () => client.eventChoice(currentRoomId, button.dataset.event, button.dataset.choice)));
  }

  function renderLogChatRanking() {
    logEl.innerHTML = (state.log || []).slice(0, 14).map(item => `<p>${escapeHtml(item)}</p>`).join('');
    chatEl.innerHTML = (state.chat || []).slice(-16).map(item => `<p><b>${escapeHtml(item.userName)}:</b> ${escapeHtml(item.message)}</p>`).join('');
    rankingEl.innerHTML = (state.ranking || []).slice(0, 8).map(row => `<p><b>${row.position}. ${escapeHtml(row.player)}</b> - ${escapeHtml(row.nation)} - ${row.score}</p>`).join('') || '<p>Sem ranking ainda.</p>';
  }

  function openNationDialog() {
    renderNationList();
    if (typeof nationDialog.showModal === 'function') nationDialog.showModal();
    else nationDialog.hidden = false;
  }

  function renderNationList() {
    if (!state) return;
    const me = state.me?.id;
    const nations = Object.values(state.nations).sort((a, b) => a.name.localeCompare(b.name));
    nationList.innerHTML = nations.map(nation => {
      const taken = nation.playerId && nation.playerId !== me;
      const provinceCount = nation.provinces?.length || 0;
      return `<button class="sc-nation-option" style="border-left-color:${escapeHtml(nation.color)}" data-nation="${escapeHtml(nation.id)}" ${taken ? 'disabled' : ''} type="button"><b>${escapeHtml(nation.name)}</b><small>${escapeHtml(nation.ruler)} - ${escapeHtml(data.religions[nation.religion]?.name || nation.religion)}</small><small>${provinceCount} provincias - ouro ${formatNumber(nation.resources.gold)} - homens ${formatNumber(nation.resources.manpower)}</small>${taken ? '<small>Escolhida por outro jogador</small>' : ''}</button>`;
    }).join('');
    nationList.querySelectorAll('[data-nation]').forEach(button => button.addEventListener('click', () => {
      client.chooseNation(currentRoomId, button.dataset.nation);
      if (nationDialog.open) nationDialog.close();
      nationDialog.hidden = true;
    }));
  }

  document.querySelectorAll('.sc-map-modes button').forEach(button => {
    button.addEventListener('click', () => {
      mapMode = button.dataset.mode;
      document.querySelectorAll('.sc-map-modes button').forEach(item => item.classList.toggle('active', item === button));
      render();
    });
  });

  document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => client?.speed(currentRoomId, Number(button.dataset.speed))));
  pause.addEventListener('click', () => client?.pause(currentRoomId, !state?.paused));
  refresh.addEventListener('click', () => client?.joinRoom(currentRoomId));
  openNations.addEventListener('click', openNationDialog);
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    client?.chat(currentRoomId, message);
    chatInput.value = '';
  });

  loadRooms();
})();
