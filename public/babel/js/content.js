export const GAME_ID = 'a-queda-de-babel';

export const ASSETS = Object.freeze({
  map: '/assets/babel/assets/environment/campos-fronteiras-map.png',
  heroMale: '/assets/babel/assets/characters/hero-male.png',
  heroFemale: '/assets/babel/assets/characters/hero-female.png',
  enemies: '/assets/babel/assets/enemies/frontier-enemies.png',
  boss: '/assets/babel/assets/enemies/senhor-das-estacas.png',
  companion: '/assets/babel/assets/companions/lagarto-de-brasa.png'
});

export const WORLD = Object.freeze({
  width: 1400,
  height: 2240,
  start: { x: 705, y: 2070 },
  checkpoint: { x: 705, y: 2070 }
});

export const WEAPONS = Object.freeze({
  sword: { id: 'sword', name: 'Espada de Fronteira', attack: 20, range: 116, speed: 0.86, icon: '⚔', color: '#55b7ff' },
  bow: { id: 'bow', name: 'Arco do Vento', attack: 17, range: 250, speed: 0.74, icon: '➶', color: '#8dcf4c' },
  staff: { id: 'staff', name: 'Cajado da Aurora', attack: 23, range: 220, speed: 1.06, icon: '✦', color: '#a56de7' },
  spear: { id: 'spear', name: 'Lança da Estrada', attack: 19, range: 158, speed: 0.8, icon: '↟', color: '#e1aa40' }
});

export const SKILLS = Object.freeze([
  { id: 'guard', name: 'Guarda do Peregrino', cooldown: 10, priority: 1, description: 'Recupera 22% da vida quando ela cai abaixo de 62%.' },
  { id: 'cleave', name: 'Varredura da Estrada', cooldown: 6.5, priority: 2, description: 'Atinge inimigos próximos quando dois ou mais cercam o aventureiro.' },
  { id: 'rend', name: 'Ruptura de Pedra', cooldown: 4.2, priority: 3, description: 'Golpe forte contra o alvo atual, com bônus contra elite e boss.' },
  { id: 'shard', name: 'Estilhaço de Babel', cooldown: 8, priority: 4, description: 'Projétil mágico que busca o inimigo mais ameaçador.' }
]);

export const ENCOUNTERS = Object.freeze([
  { id: 'raider-south', name: 'Saqueador Alterado', frame: 0, x: 700, y: 1880, hp: 62, attack: 7, defense: 5, speed: 70, xp: 38, gold: 18, scale: 92, kind: 'common' },
  { id: 'wolf-pond', name: 'Lobo de Pedra', frame: 2, x: 520, y: 1740, hp: 76, attack: 8, defense: 8, speed: 92, xp: 42, gold: 21, scale: 100, kind: 'common' },
  { id: 'ranged-way', name: 'Vigia sem Voz', frame: 1, x: 910, y: 1650, hp: 58, attack: 10, defense: 4, speed: 64, xp: 44, gold: 23, scale: 94, kind: 'ranged' },
  { id: 'raider-camp-a', name: 'Batedor do Acampamento', frame: 0, x: 405, y: 1390, hp: 88, attack: 11, defense: 7, speed: 76, xp: 50, gold: 27, scale: 98, kind: 'common' },
  { id: 'wolf-bridge', name: 'Lobo de Pedra Alfa', frame: 2, x: 1030, y: 1260, hp: 104, attack: 12, defense: 10, speed: 100, xp: 55, gold: 31, scale: 110, kind: 'common' },
  { id: 'elite-waypoint', name: 'Brutamonte Cristalino', frame: 3, x: 870, y: 1110, hp: 190, attack: 17, defense: 18, speed: 54, xp: 92, gold: 55, scale: 155, kind: 'elite' },
  { id: 'ranged-ruin', name: 'Arqueiro da Ruína', frame: 1, x: 460, y: 875, hp: 98, attack: 15, defense: 9, speed: 68, xp: 62, gold: 36, scale: 102, kind: 'ranged' },
  { id: 'elite-gate', name: 'Guardião da Pedra Morta', frame: 3, x: 720, y: 610, hp: 250, attack: 20, defense: 22, speed: 50, xp: 125, gold: 72, scale: 170, kind: 'elite' },
  { id: 'boss-stakes', name: 'O Senhor das Estacas', boss: true, x: 700, y: 245, hp: 930, attack: 25, defense: 26, speed: 42, xp: 340, gold: 260, scale: 280, kind: 'boss' }
]);

export const LOOT_TABLE = Object.freeze([
  { id: 'rusted-blade', name: 'Lâmina do Posto Caído', slot: 'weapon', rarity: 'Incomum', color: '#68bf62', attack: 5, defense: 0 },
  { id: 'stone-hood', name: 'Capuz de Pedra Leve', slot: 'armor', rarity: 'Raro', color: '#54a6df', attack: 0, defense: 5 },
  { id: 'bronze-wraps', name: 'Faixas do Coletor', slot: 'gloves', rarity: 'Raro', color: '#54a6df', attack: 3, defense: 2 },
  { id: 'violet-amulet', name: 'Amuleto do Fragmento', slot: 'amulet', rarity: 'Épico', color: '#9a68da', attack: 7, defense: 3 }
]);
