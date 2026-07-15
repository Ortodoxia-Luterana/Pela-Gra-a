import { REGION_HEIGHT, REGIONS, WORLD } from './content.js';

const ASSET_CYCLE = ['broadleaf-tree', 'pine-tree', 'rock-cluster', 'broadleaf-tree', 'pine-tree', 'fence-sign'];

function seeded(seed) {
  const value = Math.sin(seed * 91.731) * 43758.5453;
  return value - Math.floor(value);
}

function regionProps(region, regionIndex) {
  const props = [];
  const rows = 92;
  const spacing = (region.height - 720) / rows;
  for (let row = 0; row < rows; row += 1) {
    const y = region.y + 360 + row * spacing;
    const side = row % 2 === 0 ? 'left' : 'right';
    const x = side === 'left'
      ? 105 + seeded(row + regionIndex * 301) * 370
      : WORLD.width - 105 - seeded(row + regionIndex * 719) * 370;
    const asset = ASSET_CYCLE[(row + regionIndex * 2) % ASSET_CYCLE.length];
    const rock = asset === 'rock-cluster';
    const sign = asset === 'fence-sign';
    const scale = rock ? .32 + seeded(row * 3.1) * .16 : sign ? .28 + seeded(row * 4.7) * .1 : .38 + seeded(row * 2.3) * .18;
    props.push({
      id: `${region.id}-${row}`,
      asset,
      x,
      y,
      scale,
      tint: region.id === 'ruinas-coroa' ? 0xb8c6d4 : region.id === 'floresta-vozes' ? 0xc4e5bc : 0xffffff,
      collider: rock
        ? { width: 96, height: 42, offsetY: -20 }
        : sign
          ? { width: 92, height: 24, offsetY: -12 }
          : { width: 55, height: 38, offsetY: -18 }
    });
  }
  return props;
}

const camps = [
  { id: 'frontier-tent', asset: 'frontier-tent', x: 1200, y: WORLD.height - 610, scale: .52, collider: { width: 178, height: 72, offsetY: -34 } },
  { id: 'frontier-crates', asset: 'supply-crates', x: 1370, y: WORLD.height - 560, scale: .4, collider: { width: 112, height: 48, offsetY: -22 } },
  { id: 'forest-camp', asset: 'frontier-tent', x: 1260, y: REGION_HEIGHT * 2 - 620, scale: .48, tint: 0xb8d8b3, collider: { width: 164, height: 68, offsetY: -32 } },
  { id: 'ruins-camp', asset: 'supply-crates', x: 1320, y: REGION_HEIGHT - 620, scale: .44, tint: 0xb9c8d9, collider: { width: 118, height: 50, offsetY: -23 } }
];

export const REGION_GATES = Object.freeze([
  { id: 'gate-forest', from: 'campos-fronteiras', to: 'floresta-vozes', x: WORLD.width / 2, y: REGION_HEIGHT * 2, label: 'Portal da Floresta das Vozes' },
  { id: 'gate-ruins', from: 'floresta-vozes', to: 'ruinas-coroa', x: WORLD.width / 2, y: REGION_HEIGHT, label: 'Portal das Ruínas da Coroa' }
]);

export const MAP_PROPS = Object.freeze([
  ...REGIONS.flatMap((region, index) => regionProps(region, index)),
  ...camps
]);

export const MAP_COLLIDERS = Object.freeze(MAP_PROPS.map(prop => Object.freeze({
  id: prop.id,
  x: prop.x,
  y: prop.y + prop.collider.offsetY,
  width: prop.collider.width,
  height: prop.collider.height
})));
