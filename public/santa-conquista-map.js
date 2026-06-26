(function initSantaConquistaMap(root) {
  const topology = root.SANTA_CONQUISTA_TOPOLOGY || { provincePaths: {}, centers: {}, landPaths: [] };

  const majorProvinceIds = new Set([
    'paris', 'london', 'rome', 'constantinople', 'jerusalem', 'antioch',
    'cairo', 'sicily', 'venice', 'cologne', 'hungary', 'damascus', 'acre',
    'alexandria', 'toledo', 'anatolia', 'mosul'
  ]);

  const realmLabelIds = new Set([
    'france', 'england', 'holy_roman_empire', 'byzantium', 'jerusalem_kingdom',
    'egypt', 'rum', 'almoravids', 'hungary', 'sicily', 'leon_castile',
    'poland', 'denmark'
  ]);

  function centerOf(province) {
    const topoCenter = topology.centers?.[province.id];
    if (topoCenter) return { x: Number(topoCenter.x), y: Number(topoCenter.y) };
    const m = province.map || {};
    return {
      x: Number(m.x || 0) + Number(m.w || 50) / 2,
      y: Number(m.y || 0) + Number(m.h || 40) / 2
    };
  }

  function viewBoxFor(container, state, selectedId) {
    const base = String(topology.viewBox || '0 0 1600 950').split(/\s+/).map(Number);
    const [minX = 0, minY = 0, width = 1600, height = 950] = base;
    const cw = container.clientWidth || 900;
    const ch = container.clientHeight || 520;
    const selected = state.provinces[selectedId] || state.provinces.jerusalem || Object.values(state.provinces)[0];
    const center = centerOf(selected);
    if (cw > ch && cw < 1100) {
      const aspect = Math.max(1.55, Math.min(3.1, cw / Math.max(1, ch)));
      const zoomW = Math.min(width, 1180);
      const zoomH = Math.min(height, Math.round(zoomW / aspect));
      const x = Math.max(minX, Math.min(minX + width - zoomW, Math.round(center.x - zoomW * .54)));
      const y = Math.max(minY, Math.min(minY + height - zoomH, Math.round(center.y - zoomH * .58)));
      return `${x} ${y} ${zoomW} ${zoomH}`;
    }
    if (cw >= 760) return `${minX} ${minY} ${width} ${height}`;

    const aspect = Math.max(.52, Math.min(.9, cw / Math.max(1, ch)));
    const zoomH = Math.min(height, 650);
    const zoomW = Math.max(430, Math.min(width, Math.round(zoomH * aspect)));
    const x = Math.max(minX, Math.min(minX + width - zoomW, Math.round(center.x - zoomW * .52)));
    const y = Math.max(minY, Math.min(minY + height - zoomH, Math.round(center.y - zoomH * .54)));
    return `${x} ${y} ${zoomW} ${zoomH}`;
  }

  function fallbackPathForProvince(province) {
    const m = province.map || {};
    const x = Number(m.x || 0);
    const y = Number(m.y || 0);
    const w = Number(m.w || 50);
    const h = Number(m.h || 40);
    return `M ${x} ${y} L ${x + w} ${y + h * .08} L ${x + w * .92} ${y + h} L ${x + w * .08} ${y + h * .92} Z`;
  }

  function provincePath(province) {
    return topology.provincePaths?.[province.id] || fallbackPathForProvince(province);
  }

  function blend(value, low, mid, high) {
    const v = Math.max(0, Math.min(100, Number(value || 0)));
    if (v < 50) return low;
    if (v < 72) return mid;
    return high;
  }

  function colorForProvince(data, state, province, mode, myNationId) {
    const owner = state.nations[province.owner];
    if (mode === 'religion') return data.religions[province.religion]?.color || '#8d806a';
    if (mode === 'war') {
      if (province.occupier) return state.nations[province.occupier]?.color || '#d96a5f';
      const atWar = state.wars.some(war => war.status === 'active' && (war.attacker === province.owner || war.defender === province.owner));
      return atWar ? '#9b3d38' : owner?.color || '#777';
    }
    if (mode === 'stability') return blend(province.loyalty, '#9b3d38', '#c79745', '#4f9d6f');
    if (mode === 'heresy') return province.heresy ? '#9d55a7' : blend(100 - province.heresyRisk, '#9b3d38', '#c79745', '#4f9d6f');
    if (mode === 'diplomacy' && myNationId) {
      if (province.owner === myNationId) return '#d6aa55';
      const mine = state.nations[myNationId];
      if (mine?.diplomacy?.allies?.includes(province.owner)) return '#4f9d6f';
      if (state.wars.some(war => war.status === 'active' && ((war.attacker === myNationId && war.defender === province.owner) || (war.defender === myNationId && war.attacker === province.owner)))) return '#b8423b';
      return '#6d6559';
    }
    if (mode === 'province') return owner?.color || '#806c4d';
    return owner?.color || '#806c4d';
  }

  function append(tag, parent, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      node.setAttribute(key, String(value));
    });
    parent.appendChild(node);
    return node;
  }

  function appendDefs(svg) {
    const defs = append('defs', svg);
    const glow = append('filter', defs, { id: 'scProvinceGlow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
    append('feDropShadow', glow, { dx: '0', dy: '0', stdDeviation: '5', 'flood-color': '#ffe9a5', 'flood-opacity': '.75' });

    const paper = append('filter', defs, { id: 'scPaperGrain' });
    append('feTurbulence', paper, { type: 'fractalNoise', baseFrequency: '.95', numOctaves: '2', seed: '11', result: 'noise' });
    append('feColorMatrix', paper, { in: 'noise', type: 'saturate', values: '0' });
    append('feBlend', paper, { in: 'SourceGraphic', mode: 'multiply' });

    const seaGradient = append('linearGradient', defs, { id: 'scSeaGradient', x1: '0', x2: '0', y1: '0', y2: '1' });
    append('stop', seaGradient, { offset: '0', 'stop-color': '#18384c' });
    append('stop', seaGradient, { offset: '.5', 'stop-color': '#244b60' });
    append('stop', seaGradient, { offset: '1', 'stop-color': '#0d2a3a' });

    const terrain = append('pattern', defs, { id: 'scTerrainHatch', width: '26', height: '26', patternUnits: 'userSpaceOnUse' });
    append('path', terrain, { d: 'M -4 20 L 20 -4 M 8 30 L 30 8', stroke: 'rgba(70,48,25,.24)', 'stroke-width': '2' });
  }

  function appendRoute(svg, d) {
    append('path', svg, { class: 'sc-route', d });
  }

  function appendCapital(svg, province) {
    const pos = centerOf(province);
    const group = append('g', svg, { class: 'sc-capital', transform: `translate(${Math.round(pos.x - 9)} ${Math.round(pos.y - 18)})` });
    append('rect', group, { class: 'tower', x: '3', y: '8', width: '14', height: '14', rx: '1' });
    append('path', group, { class: 'roof', d: 'M 1 8 L 10 0 L 19 8 Z' });
    append('rect', group, { class: 'tower', x: '7', y: '13', width: '6', height: '9', rx: '1' });
  }

  function appendArmy(svg, army, state) {
    const province = state.provinces[army.provinceId];
    const nation = state.nations[army.nationId];
    if (!province || !nation) return;
    const pos = centerOf(province);
    const x = Math.round(pos.x + 6);
    const y = Math.round(pos.y - 20);
    const group = append('g', svg, { class: 'sc-army', transform: `translate(${x} ${y})` });
    append('line', group, { x1: '0', y1: '-20', x2: '0', y2: '14', stroke: '#1b0e07', 'stroke-width': '3' });
    append('path', group, { class: 'sc-army-banner', fill: nation.color, d: 'M 0 -20 L 28 -15 L 28 0 L 0 -5 Z' });
    append('path', group, { d: 'M 4 -17 L 13 -13 L 4 -9 Z', fill: '#f7e7b0', opacity: '.85' });
    append('circle', group, { cx: '0', cy: '14', r: '7', fill: '#20110a', stroke: '#f0d28b', 'stroke-width': '1.3' });
    const text = append('text', group, { class: 'sc-army-label', x: '13', y: '30' });
    text.textContent = String(Math.round(Number(army.size || 0)));
  }

  function realmLabels(state) {
    return Object.values(state.nations)
      .filter(nation => realmLabelIds.has(nation.id) && nation.provinces?.length)
      .map(nation => {
        const centers = nation.provinces.map(id => state.provinces[id]).filter(Boolean).map(centerOf);
        const x = centers.reduce((sum, item) => sum + item.x, 0) / centers.length;
        const y = centers.reduce((sum, item) => sum + item.y, 0) / centers.length;
        return { nation, x: Math.round(x), y: Math.round(y) };
      });
  }

  function render(container, data, state, options) {
    const mode = options.mode || 'political';
    const selectedId = options.selectedId || '';
    const myNationId = state.me?.nationId || null;
    container.innerHTML = '';

    const svg = append('svg', container, {
      viewBox: viewBoxFor(container, state, selectedId),
      preserveAspectRatio: 'xMidYMid meet',
      'aria-label': 'Mapa politico medieval'
    });
    appendDefs(svg);
    append('rect', svg, { class: 'sc-sea', x: '0', y: '0', width: '1600', height: '950' });

    const landGroup = append('g', svg, { class: 'sc-land-layer' });
    (topology.landPaths || []).forEach(d => append('path', landGroup, { class: 'sc-land', d }));
    append('rect', svg, { class: 'sc-terrain-hatch', x: '0', y: '0', width: '1600', height: '950' });

    [
      'M 360 720 C 565 760 790 800 1110 780',
      'M 690 620 C 760 570 880 560 1030 615',
      'M 1080 720 C 1120 690 1165 650 1220 600',
      'M 850 420 C 980 460 1080 460 1210 415'
    ].forEach(path => appendRoute(svg, path));

    const provinceGroup = append('g', svg, { class: 'sc-province-layer' });
    Object.values(state.provinces).forEach(province => {
      const path = append('path', provinceGroup, {
        d: provincePath(province),
        fill: colorForProvince(data, state, province, mode, myNationId),
        class: `sc-province ${province.id === selectedId ? 'active' : ''} ${province.occupier ? 'occupied' : ''}`,
        'data-province-id': province.id,
        tabindex: '0',
        role: 'button',
        'aria-label': province.name
      });
      path.addEventListener('click', () => options.onSelect?.(province.id));
      path.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          options.onSelect?.(province.id);
        }
      });
    });

    if (mode === 'political' || mode === 'province') {
      realmLabels(state).forEach(item => {
        const label = append('text', svg, { class: 'sc-realm-label', x: item.x, y: item.y });
        label.textContent = item.nation.shortName;
      });
    }

    [
      ['Mar Mediterraneo', 795, 760],
      ['Mar Negro', 1190, 535],
      ['Mar Tirreno', 640, 720],
      ['Atlantico', 112, 540],
      ['Mar do Norte', 610, 360]
    ].forEach(([name, x, y]) => {
      const label = append('text', svg, { class: 'sc-water-label', x, y });
      label.textContent = name;
    });

    Object.values(state.provinces).forEach(province => {
      if (province.capital) appendCapital(svg, province);
    });

    Object.values(state.provinces).forEach(province => {
      const shouldLabel = province.id === selectedId || province.capital || majorProvinceIds.has(province.id);
      if (!shouldLabel) return;
      const pos = centerOf(province);
      const label = append('text', svg, {
        class: `sc-label ${province.id === selectedId ? 'is-selected' : ''} ${province.capital ? 'is-capital' : ''}`,
        x: Math.round(pos.x),
        y: Math.round(pos.y + 19)
      });
      label.textContent = province.name;
    });

    Object.values(state.armies || {}).forEach(army => appendArmy(svg, army, state));
    append('rect', svg, { class: 'sc-map-vignette', x: '8', y: '8', width: '1584', height: '934', rx: '16' });
  }

  root.SantaConquistaMap = { render };
})(window);
