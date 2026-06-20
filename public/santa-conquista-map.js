(function initSantaConquistaMap(root) {
  function hash(id) {
    return String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  function pathForProvince(province) {
    const m = province.map || {};
    const x = Number(m.x || 0);
    const y = Number(m.y || 0);
    const w = Number(m.w || 50);
    const h = Number(m.h || 40);
    const n = hash(province.id);
    const a = (n % 9) - 4;
    const b = (n % 7) - 3;
    const c = (n % 5) - 2;
    return [
      `M ${x + a} ${y + 6 + b}`,
      `L ${x + w * .48 + c} ${y + a}`,
      `L ${x + w - 5 + b} ${y + 7 + c}`,
      `L ${x + w + a} ${y + h * .55 + b}`,
      `L ${x + w - 8 + c} ${y + h - 3 + a}`,
      `L ${x + w * .5 + b} ${y + h + c}`,
      `L ${x + 5 + c} ${y + h - 6 + b}`,
      `L ${x + b} ${y + h * .48 + a}`,
      'Z'
    ].join(' ');
  }

  function labelPosition(province) {
    const m = province.map || {};
    return {
      x: Number(m.x || 0) + Number(m.w || 50) / 2,
      y: Number(m.y || 0) + Number(m.h || 40) / 2 + 4
    };
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
    if (mode === 'province') return owner?.color ? `${owner.color}` : '#806c4d';
    return owner?.color || '#806c4d';
  }

  function render(container, data, state, options) {
    const mode = options.mode || 'political';
    const selectedId = options.selectedId || '';
    const myNationId = state.me?.nationId || null;
    const svgNS = 'http://www.w3.org/2000/svg';
    container.innerHTML = '';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', data.viewBox);
    svg.setAttribute('aria-label', 'Mapa politico medieval');

    const sea = document.createElementNS(svgNS, 'rect');
    sea.setAttribute('class', 'sc-sea');
    sea.setAttribute('x', '0');
    sea.setAttribute('y', '0');
    sea.setAttribute('width', '1260');
    sea.setAttribute('height', '790');
    svg.appendChild(sea);

    const coast = document.createElementNS(svgNS, 'path');
    coast.setAttribute('class', 'sc-coast');
    coast.setAttribute('d', 'M48 370 C160 290 260 318 350 260 C470 178 590 226 690 168 C790 112 874 208 918 310 C982 450 1130 390 1196 532 C1250 650 1118 780 930 738 C730 692 600 760 442 704 C300 654 206 606 136 536 C82 482 34 436 48 370 Z');
    svg.appendChild(coast);

    Object.values(state.provinces).forEach(province => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', pathForProvince(province));
      path.setAttribute('fill', colorForProvince(data, state, province, mode, myNationId));
      path.setAttribute('class', `sc-province ${province.id === selectedId ? 'active' : ''} ${province.occupier ? 'occupied' : ''}`);
      path.setAttribute('data-province-id', province.id);
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', province.name);
      path.addEventListener('click', () => options.onSelect?.(province.id));
      path.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          options.onSelect?.(province.id);
        }
      });
      svg.appendChild(path);
    });

    Object.values(state.provinces).forEach(province => {
      const pos = labelPosition(province);
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('class', 'sc-label');
      label.setAttribute('x', String(pos.x));
      label.setAttribute('y', String(pos.y));
      label.textContent = province.capital || province.id === selectedId ? province.name : province.name.split(' ')[0];
      svg.appendChild(label);
    });

    container.appendChild(svg);
  }

  root.SantaConquistaMap = { render };
})(window);
