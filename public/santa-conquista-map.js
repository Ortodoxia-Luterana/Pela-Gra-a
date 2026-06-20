(function initSantaConquistaMap(root) {
  const majorProvinceIds = new Set([
    'paris', 'london', 'rome', 'constantinople', 'jerusalem', 'antioch',
    'cairo', 'sicily', 'venice', 'cologne', 'hungary', 'damascus'
  ]);

  const realmLabelIds = new Set([
    'france', 'england', 'holy_roman_empire', 'byzantium', 'jerusalem_kingdom',
    'egypt', 'rum', 'almoravids', 'hungary', 'sicily', 'leon_castile'
  ]);

  function hash(id) {
    return String(id).split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
  }

  function jitter(seed, index, amount) {
    const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
    return (value - Math.floor(value) - .5) * amount;
  }

  function centerOf(province) {
    const m = province.map || {};
    return {
      x: Number(m.x || 0) + Number(m.w || 50) / 2,
      y: Number(m.y || 0) + Number(m.h || 40) / 2
    };
  }

  function viewBoxFor(container, data, state, selectedId) {
    const base = String(data.viewBox || '0 0 1260 790').split(/\s+/).map(Number);
    const [minX = 0, minY = 0, width = 1260, height = 790] = base;
    if ((container.clientWidth || 0) >= 620) return `${minX} ${minY} ${width} ${height}`;
    const selected = state.provinces[selectedId] || state.provinces.jerusalem || Object.values(state.provinces)[0];
    const center = centerOf(selected);
    const aspect = Math.max(.56, Math.min(.95, (container.clientWidth || 390) / Math.max(1, container.clientHeight || 650)));
    const zoomH = 700;
    const zoomW = Math.max(470, Math.min(650, Math.round(zoomH * aspect)));
    const x = Math.max(minX, Math.min(minX + width - zoomW, Math.round(center.x - zoomW * .52)));
    const y = Math.max(minY, Math.min(minY + height - zoomH, Math.round(center.y - zoomH * .54)));
    return `${x} ${y} ${zoomW} ${zoomH}`;
  }

  function pathForProvince(province) {
    const m = province.map || {};
    const x = Number(m.x || 0);
    const y = Number(m.y || 0);
    const w = Number(m.w || 50);
    const h = Number(m.h || 40);
    const seed = hash(province.id);
    const rough = Math.min(18, Math.max(7, Math.min(w, h) * .22));
    const points = [
      [x + w * .12, y + h * .12],
      [x + w * .36, y + h * .02],
      [x + w * .68, y + h * .06],
      [x + w * .94, y + h * .2],
      [x + w * .98, y + h * .48],
      [x + w * .88, y + h * .8],
      [x + w * .6, y + h * .98],
      [x + w * .28, y + h * .9],
      [x + w * .04, y + h * .68],
      [x + w * .02, y + h * .34]
    ].map(([px, py], index) => [
      Math.round(px + jitter(seed, index, rough)),
      Math.round(py + jitter(seed, index + 17, rough))
    ]);
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const current = points[i];
      const mx = Math.round((prev[0] + current[0]) / 2);
      const my = Math.round((prev[1] + current[1]) / 2);
      d += ` Q ${prev[0]} ${prev[1]} ${mx} ${my}`;
    }
    const last = points[points.length - 1];
    const first = points[0];
    const mx = Math.round((last[0] + first[0]) / 2);
    const my = Math.round((last[1] + first[1]) / 2);
    d += ` Q ${last[0]} ${last[1]} ${mx} ${my} Z`;
    return d;
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
    const glow = append('filter', defs, { id: 'scProvinceGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    append('feDropShadow', glow, { dx: '0', dy: '0', stdDeviation: '5', 'flood-color': '#ffe9a5', 'flood-opacity': '.75' });

    const paper = append('filter', defs, { id: 'scPaperGrain' });
    append('feTurbulence', paper, { type: 'fractalNoise', baseFrequency: '.75', numOctaves: '2', seed: '7', result: 'noise' });
    append('feColorMatrix', paper, { in: 'noise', type: 'saturate', values: '0' });
    append('feBlend', paper, { in: 'SourceGraphic', mode: 'multiply' });
  }

  function appendRoutes(svg) {
    [
      'M 412 520 C 530 560 644 585 748 604 C 888 632 1015 672 1124 720',
      'M 542 448 C 655 428 756 450 855 505 C 965 565 1048 618 1110 650',
      'M 735 688 C 790 640 820 612 858 606 C 925 596 990 620 1078 702',
      'M 325 352 C 430 372 520 390 610 452 C 705 520 790 582 904 720'
    ].forEach(d => append('path', svg, { class: 'sc-route', d }));
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
    const seed = hash(army.id);
    const x = Math.round(pos.x + jitter(seed, 2, 20));
    const y = Math.round(pos.y - 22 + jitter(seed, 5, 16));
    const group = append('g', svg, { class: 'sc-army', transform: `translate(${x} ${y})` });
    append('line', group, { x1: '0', y1: '-20', x2: '0', y2: '14', stroke: '#1b0e07', 'stroke-width': '3' });
    append('path', group, { class: 'sc-army-banner', fill: nation.color, d: 'M 0 -20 L 26 -15 L 26 0 L 0 -5 Z' });
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
      viewBox: viewBoxFor(container, data, state, selectedId),
      preserveAspectRatio: 'xMidYMid meet',
      'aria-label': 'Mapa politico medieval'
    });
    appendDefs(svg);
    append('rect', svg, { class: 'sc-sea', x: '0', y: '0', width: '1260', height: '790' });
    append('image', svg, {
      class: 'sc-map-paper',
      href: '/assets/santa-conquista-map-bg.webp',
      x: '0',
      y: '0',
      width: '1260',
      height: '790',
      preserveAspectRatio: 'xMidYMid slice'
    });
    appendRoutes(svg);

    Object.values(state.provinces).forEach(province => {
      const path = append('path', svg, {
        d: pathForProvince(province),
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
      ['Mar Mediterraneo', 710, 640],
      ['Mar Negro', 1045, 430],
      ['Mar Tirreno', 680, 585]
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
    append('rect', svg, { class: 'sc-map-vignette', x: '6', y: '6', width: '1248', height: '778', rx: '12' });
  }

  root.SantaConquistaMap = { render };
})(window);
