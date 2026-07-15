export const GAME_ID = 'a-queda-de-babel';

export const REGION_HEIGHT = 22400;

export const WORLD = Object.freeze({
  width: 1800,
  height: REGION_HEIGHT * 3,
  start: { x: 900, y: REGION_HEIGHT * 3 - 420 },
  checkpoint: { x: 900, y: REGION_HEIGHT * 3 - 420 }
});

export const REGIONS = Object.freeze([
  { id: 'ruinas-coroa', name: 'Ruínas da Coroa', checkpoint: 'Átrio da Coroa Partida', y: 0, height: REGION_HEIGHT, terrain: 'terrain-ruins', path: 'path-ruins', tier: 3 },
  { id: 'floresta-vozes', name: 'Floresta das Vozes', checkpoint: 'Clareira dos Sussurros', y: REGION_HEIGHT, height: REGION_HEIGHT, terrain: 'terrain-forest', path: 'path-forest', tier: 2 },
  { id: 'campos-fronteiras', name: 'Campos das Fronteiras', checkpoint: 'Acampamento do Sul', y: REGION_HEIGHT * 2, height: REGION_HEIGHT, terrain: 'terrain-grass', path: 'path-frontier', tier: 1 }
]);

export const regionAtY = y => REGIONS.find(region => y >= region.y && y < region.y + region.height) || REGIONS[0];

export const ASSETS = Object.freeze({
  terrainGrass: '/assets/babel/assets/environment/terrain-grass-v2.png',
  windingPath: '/assets/babel/assets/environment/winding-path-v2.png',
  terrainForest: '/assets/babel/assets/environment/forest-terrain-v1.png',
  pathForest: '/assets/babel/assets/environment/forest-path-v1.png',
  terrainRuins: '/assets/babel/assets/environment/ruins-terrain-v1.png',
  pathRuins: '/assets/babel/assets/environment/ruins-path-v1.png',
  regionGate: '/assets/babel/assets/environment/babel-region-gate-v1.png',
  panelTexture: '/assets/babel/assets/ui/panel-texture-v1.png',
  broadleafTree: '/assets/babel/assets/environment/props/broadleaf-tree.png',
  pineTree: '/assets/babel/assets/environment/props/pine-tree.png',
  rockCluster: '/assets/babel/assets/environment/props/rock-cluster.png',
  frontierTent: '/assets/babel/assets/environment/props/frontier-tent.png',
  supplyCrates: '/assets/babel/assets/environment/props/supply-crates.png',
  fenceSign: '/assets/babel/assets/environment/props/fence-sign.png',
  heroMale: '/assets/babel/assets/characters/hero-male.png',
  heroFemale: '/assets/babel/assets/characters/hero-female.png',
  heroMaleWalk: '/assets/babel/assets/characters/hero-male-walk-v2.png',
  heroFemaleWalk: '/assets/babel/assets/characters/hero-female-walk-v2.png',
  enemies: '/assets/babel/assets/enemies/frontier-enemies.png',
  boss: '/assets/babel/assets/enemies/senhor-das-estacas.png',
  petEmber: '/assets/babel/assets/pets/lagarto-de-brasa-v2.png',
  petOwl: '/assets/babel/assets/pets/coruja-do-alvorecer-v2.png',
  petFox: '/assets/babel/assets/pets/raposa-da-fronteira-v2.png'
});

export const EQUIPMENT_SET_IDS = Object.freeze(['ranger', 'forest', 'crystal', 'tower', 'dawn', 'abyss', 'frost', 'desert']);
export const EQUIPMENT_SLOTS = Object.freeze(['helmet', 'armor', 'pants', 'boots']);

const equipmentBody = (setId, body) => Object.freeze(Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, Object.freeze({
  main: `/assets/babel/assets/characters/equipment/${setId}/${body}/${slot}.png`,
  walk: `/assets/babel/assets/characters/equipment/${setId}/${body}/${slot}-walk.png`
})])));

export const EQUIPMENT_SKINS = Object.freeze(Object.fromEntries(EQUIPMENT_SET_IDS.map(setId => [setId, Object.freeze({
  male: equipmentBody(setId, 'male'),
  female: equipmentBody(setId, 'female')
})])));

export const ENEMY_ASSETS = Object.freeze({
  'rune-scarecrow': '/assets/babel/assets/enemies/frontier/rune-scarecrow.png',
  'bark-skeleton': '/assets/babel/assets/enemies/forest/bark-skeleton.png',
  'moss-wolf': '/assets/babel/assets/enemies/forest/moss-wolf.png',
  'whisper-moth': '/assets/babel/assets/enemies/forest/whisper-moth.png',
  'vine-cultist': '/assets/babel/assets/enemies/forest/vine-cultist.png',
  'hollow-treant': '/assets/babel/assets/enemies/forest/hollow-treant.png',
  'crystal-boar': '/assets/babel/assets/enemies/forest/crystal-boar.png',
  'forest-archer': '/assets/babel/assets/enemies/forest/forest-archer.png',
  'antlered-king': '/assets/babel/assets/enemies/forest/antlered-king.png',
  'tower-automaton': '/assets/babel/assets/enemies/ruins/tower-automaton.png',
  'rune-eye': '/assets/babel/assets/enemies/ruins/rune-eye.png',
  'royal-sentinel': '/assets/babel/assets/enemies/ruins/royal-sentinel.png',
  'shard-scorpion': '/assets/babel/assets/enemies/ruins/shard-scorpion.png',
  'clockwork-mage': '/assets/babel/assets/enemies/ruins/clockwork-mage.png',
  'crystal-gargoyle': '/assets/babel/assets/enemies/ruins/crystal-gargoyle.png',
  'chain-warden': '/assets/babel/assets/enemies/ruins/chain-warden.png',
  'fallen-architect': '/assets/babel/assets/enemies/ruins/fallen-architect.png'
});

export const WEAPONS = Object.freeze({
  fists: { id: 'fists', name: 'Punhos', attack: 6, range: 68, speed: .72, icon: '/assets/babel/assets/ui/combat/attack-v2.png', color: '#d5a76b' },
  sword: { id: 'sword', name: 'Espada de Fronteira', attack: 16, range: 82, speed: 1.02, icon: '/assets/babel/assets/items/weapons/frontier-sword.png', color: '#55b7ff' },
  bow: { id: 'bow', name: 'Arco do Vento', attack: 13, range: 148, speed: 1.16, icon: '/assets/babel/assets/items/weapons/oak-bow.png', color: '#8dcf4c' },
  staff: { id: 'staff', name: 'Cajado da Aurora', attack: 17, range: 132, speed: 1.28, icon: '/assets/babel/assets/items/weapons/verdant-staff.png', color: '#a56de7' },
  spear: { id: 'spear', name: 'Lança da Estrada', attack: 15, range: 108, speed: 1.08, icon: '/assets/babel/assets/items/weapons/iron-spear.png', color: '#e1aa40' }
});

export const SKILLS = Object.freeze([
  { id: 'guard', name: 'Guarda do Peregrino', cooldown: 10, priority: 1, rarity: 'Incomum', color: '#68bf62', description: 'Recupera 22% da vida quando ela cai abaixo de 62%.' },
  { id: 'cleave', name: 'Varredura da Estrada', cooldown: 6.5, priority: 2, rarity: 'Raro', color: '#54a6df', description: 'Atinge inimigos próximos quando dois ou mais cercam o aventureiro.' },
  { id: 'rend', name: 'Ruptura de Pedra', cooldown: 4.2, priority: 3, rarity: 'Épico', color: '#9a68da', description: 'Golpe forte contra o alvo atual, com bônus contra elite e chefe.' },
  { id: 'shard', name: 'Estilhaço de Babel', cooldown: 8, priority: 4, rarity: 'Lendário', color: '#e5a63f', description: 'Projétil mágico contra a ameaça mais perigosa.' }
]);

const FRONTIER_TYPES = [
  { key: 'frontier-enemies', frame: 0, name: 'Saqueador Alterado', kind: 'common' },
  { key: 'frontier-enemies', frame: 1, name: 'Vigia sem Voz', kind: 'ranged' },
  { key: 'frontier-enemies', frame: 2, name: 'Lobo de Pedra', kind: 'common' },
  { key: 'frontier-enemies', frame: 3, name: 'Brutamonte Cristalino', kind: 'elite' },
  { key: 'rune-scarecrow', name: 'Espantalho Rúnico', kind: 'common' }
];
const FOREST_TYPES = [
  ['bark-skeleton', 'Esqueleto de Casca', 'common'], ['moss-wolf', 'Lobo de Musgo', 'common'],
  ['whisper-moth', 'Mariposa do Sussurro', 'ranged'], ['vine-cultist', 'Cultista das Vinhas', 'common'],
  ['hollow-treant', 'Ent Vazio', 'elite'], ['crystal-boar', 'Javali de Cristal', 'elite'],
  ['forest-archer', 'Arqueiro Mascarado', 'ranged']
].map(([key, name, kind]) => ({ key, name, kind }));
const RUINS_TYPES = [
  ['tower-automaton', 'Autômato da Torre', 'common'], ['rune-eye', 'Olho Rúnico', 'ranged'],
  ['royal-sentinel', 'Sentinela Real Partida', 'elite'], ['shard-scorpion', 'Escorpião de Fragmentos', 'common'],
  ['clockwork-mage', 'Mago de Engrenagens', 'ranged'], ['crystal-gargoyle', 'Gárgula de Cristal', 'common'],
  ['chain-warden', 'Carcereiro das Correntes', 'elite']
].map(([key, name, kind]) => ({ key, name, kind }));

function buildRegionEncounters(region, types, copiesPerType, baseHp, baseAttack, baseDefense, baseXp, baseGold) {
  const list = [];
  const count = types.length * copiesPerType;
  const lanes = [260, 480, 700, 900, 1100, 1320, 1540];
  for (let index = 0; index < count; index += 1) {
    const type = types[index % types.length];
    const rowGap = (region.height - 1550) / Math.max(1, count - 1);
    const yJitter = index === 0 || index === count - 1 ? 0 : (index * 53 % 71) - 35;
    const y = region.y + region.height - 650 - index * rowGap + yJitter;
    const lane = lanes[(index * 5 + Math.floor(index / types.length)) % lanes.length];
    const x = Math.max(150, Math.min(WORLD.width - 150, lane + (index * 97 % 181) - 90));
    const elite = type.kind === 'elite';
    const ranged = type.kind === 'ranged';
    const rank = Math.floor(index / types.length);
    const difficultyIndex = count <= 1 ? 0 : index / (count - 1) * 63;
    const speciesId = type.key === 'frontier-enemies' ? `${type.key}-${type.frame || 0}` : type.key;
    list.push({
      id: `${region.id}-${type.key}-${index}`,
      name: `${type.name}${rank ? ` ${rank + 1}` : ''}`,
      assetKey: type.key,
      frame: type.frame || 0,
      speciesId,
      regionId: region.id,
      x, y,
      hp: Math.round((baseHp + difficultyIndex * 8) * (elite ? 1.55 : 1)),
      attack: Math.round((baseAttack + difficultyIndex * .35) * (elite ? 1.28 : 1)),
      defense: Math.round((baseDefense + difficultyIndex * .28) * (elite ? 1.25 : 1)),
      speed: ranged ? 58 : elite ? 48 : 68,
      xp: Math.round((baseXp + difficultyIndex * .18) * (elite ? 1.8 : 1)),
      gold: Math.round((baseGold + difficultyIndex * .35) * (elite ? 1.7 : 1)),
      scale: elite ? 142 : ranged ? 98 : 108,
      kind: type.kind
    });
  }
  return list;
}

const frontierRegion = REGIONS.find(region => region.id === 'campos-fronteiras');
const forestRegion = REGIONS.find(region => region.id === 'floresta-vozes');
const ruinsRegion = REGIONS.find(region => region.id === 'ruinas-coroa');

export const ENCOUNTERS = Object.freeze([
  ...buildRegionEncounters(frontierRegion, FRONTIER_TYPES, 30, 170, 7, 4, 5, 12),
  { id: 'boss-stakes', name: 'O Senhor das Estacas', assetKey: 'stakes-boss', regionId: 'campos-fronteiras', boss: true, x: 900, y: frontierRegion.y + 520, hp: 1450, attack: 22, defense: 24, speed: 42, xp: 60, gold: 240, scale: 280, kind: 'boss' },
  ...buildRegionEncounters(forestRegion, FOREST_TYPES, 30, 310, 13, 10, 8, 20),
  { id: 'boss-antlered-king', name: 'O Rei dos Galhos', assetKey: 'antlered-king', regionId: 'floresta-vozes', boss: true, x: 900, y: forestRegion.y + 520, hp: 2850, attack: 34, defense: 36, speed: 44, xp: 95, gold: 420, scale: 300, kind: 'boss' },
  ...buildRegionEncounters(ruinsRegion, RUINS_TYPES, 30, 540, 22, 20, 12, 30),
  { id: 'boss-fallen-architect', name: 'O Arquiteto Caído', assetKey: 'fallen-architect', regionId: 'ruinas-coroa', boss: true, x: 900, y: ruinsRegion.y + 520, hp: 5200, attack: 48, defense: 52, speed: 38, xp: 150, gold: 700, scale: 330, kind: 'boss' }
]);

const rarityAt = index => index % 4 === 3 ? { rarity: 'Épico', color: '#9a68da' } : index % 4 === 2 ? { rarity: 'Raro', color: '#54a6df' } : { rarity: 'Incomum', color: '#68bf62' };

const weaponDefinitions = [
  ['frontier-sword','Lâmina da Fronteira'],['crescent-sword','Sabre da Lua Nova'],['obsidian-sword','Espada de Obsidiana'],['azure-sword','Lâmina de Cristal Azul'],
  ['oak-bow','Arco de Carvalho'],['gilded-bow','Arco Dourado'],['thorn-bow','Arco de Espinhos'],['crystal-bow','Arco Prismático'],
  ['iron-spear','Lança de Ferro'],['royal-spear','Lança Real'],['sky-halberd','Alabarda do Céu'],['crystal-lance','Lança de Cristal'],
  ['verdant-staff','Cajado Verdejante'],['sun-staff','Cajado Solar'],['void-staff','Cajado do Vazio'],['babel-staff','Cajado de Babel']
];
const exoticWeaponDefinitions = [
  ['celestial-sword','Lâmina Celestial'],['bone-greatsword','Montante de Ossos'],['floral-blade','Florete das Flores'],['magma-sword','Espada de Magma'],
  ['moon-bow','Arco da Lua'],['mechanical-bow','Arco Mecânico'],['living-bow','Arco Vivo'],['void-bow','Arco do Vazio'],
  ['sun-spear','Lança Solar'],['ice-trident','Tridente de Gelo'],['serpent-glaive','Glaive da Serpente'],['eclipse-lance','Lança do Eclipse'],
  ['angelic-staff','Cajado Angelical'],['necro-staff','Cajado Necrótico'],['prism-staff','Cajado Prismático'],['clockwork-staff','Cajado do Relógio']
];
const setDefinitions = [
  ['ranger','Vigia da Fronteira','do'],['forest','Guardião dos Ecos','do'],['crystal','Cavaleiro de Cristal','do'],['tower','Relíquia da Torre','da']
];
const exoticSetDefinitions = [
  ['dawn','Aurora Celestial','da'],['abyss','Abismo Violeta','do'],['frost','Soberano do Gelo','do'],['desert','Sol do Deserto','do']
];
const slotNames = [['helmet','Elmo'],['armor','Peitoral'],['pants','Calça'],['boots','Botas']];
const artifactDefinitions = [
  ['sun-amulet','Medalhão Solar','amulet'],['moon-amulet','Lua de Prata','amulet'],['verdant-amulet','Coração Verdejante','amulet'],['spiral-stone','Pedra Espiral','amulet'],
  ['ember-orb','Orbe de Brasa','ring'],['violet-shard','Fragmento Violeta','amulet'],['star-orb','Orbe Estelar','ring'],['tower-idol','Ídolo da Torre','amulet'],
  ['forest-orb','Orbe da Floresta','ring'],['stone-ring','Anel de Pedra','ring'],['sun-relic','Relíquia do Sol','amulet'],['crescent-orb','Orbe Crescente','ring'],
  ['moon-ring','Anel Lunar','ring'],['world-seed','Semente do Mundo','amulet'],['magma-relic','Relíquia de Magma','amulet'],['void-medallion','Medalhão do Vazio','amulet']
];

const weaponTypes = ['sword', 'bow', 'spear', 'staff'];
const weaponLoot = weaponDefinitions.map(([id, name], index) => ({ id, name, slot: 'weapon', weaponType: weaponTypes[Math.floor(index / 4)], icon: `/assets/babel/assets/items/weapons/${id}.png`, attack: 4 + index, defense: Math.floor(index / 5), ...rarityAt(index) }));
const exoticWeaponLoot = exoticWeaponDefinitions.map(([id, name], index) => ({ id, name, slot: 'weapon', weaponType: weaponTypes[Math.floor(index / 4)], icon: `/assets/babel/assets/items/weapons-exotic/${id}.png`, attack: 18 + index, defense: 2 + Math.floor(index / 4), rarity: index % 4 === 3 ? 'Lendário' : 'Épico', color: index % 4 === 3 ? '#e5a63f' : '#9a68da' }));
const armorLoot = setDefinitions.flatMap(([setId, setName, article], setIndex) => slotNames.map(([slot, slotName], slotIndex) => {
  const id = `${setId}-${slot}`;
  return { id, setId, name: `${slotName} ${article} ${setName}`, slot, icon: `/assets/babel/assets/items/armor/${id}.png`, attack: setIndex + (slot === 'pants' ? 2 : 0), defense: 3 + setIndex * 3 + slotIndex, ...rarityAt(setIndex * 4 + slotIndex) };
}));
const exoticArmorLoot = exoticSetDefinitions.flatMap(([setId, setName, article], setIndex) => slotNames.map(([slot, slotName], slotIndex) => {
  const id = `${setId}-${slot}`;
  return { id, setId, name: `${slotName} ${article} ${setName}`, slot, icon: `/assets/babel/assets/items/armor-exotic/${id}.png`, attack: 5 + setIndex * 2 + (slot === 'pants' ? 3 : 0), defense: 16 + setIndex * 4 + slotIndex, rarity: slotIndex === 0 ? 'Lendário' : 'Épico', color: slotIndex === 0 ? '#e5a63f' : '#9a68da' };
}));
const artifactLoot = artifactDefinitions.map(([id, name, slot], index) => ({ id, name, slot, icon: `/assets/babel/assets/items/artifacts/${id}.png`, attack: 3 + Math.floor(index * .8), defense: 2 + Math.floor(index * .55), ...rarityAt(index) }));

export const LOOT_TABLE = Object.freeze([...weaponLoot, ...exoticWeaponLoot, ...armorLoot, ...exoticArmorLoot, ...artifactLoot]);

export const PETS = Object.freeze([
  { id: 'ember-lizard', name: 'Lagarto de Brasa', assetKey: 'pet-ember', role: 'Atacante', attackMultiplier: .58, cooldown: 2.35, rarity: 'Incomum', color: '#e68a32', description: 'Morde o alvo próximo e mantém pressão constante no combate.' },
  { id: 'dawn-owl', name: 'Coruja do Alvorecer', assetKey: 'pet-owl', role: 'Batedora', attackMultiplier: .46, cooldown: 1.8, rarity: 'Raro', color: '#e4c969', description: 'Ataca com frequência e ajuda a localizar ameaças.' },
  { id: 'frontier-fox', name: 'Raposa da Fronteira', assetKey: 'pet-fox', role: 'Caçadora', attackMultiplier: .82, cooldown: 3.05, rarity: 'Épico', color: '#d76a32', description: 'Dispara um golpe forte contra inimigos resistentes.' }
]);

export const MISSIONS = Object.freeze([
  { id: 'first-steps', name: 'Primeiros passos', description: 'Derrote 5 ameaças nos Campos das Fronteiras.', metric: 'defeats', target: 5, gems: 80 },
  { id: 'growing-hero', name: 'A força da estrada', description: 'Alcance o nível 3 com seu aventureiro.', metric: 'level', target: 3, gems: 100 },
  { id: 'frontier-scout', name: 'Reconhecer a fronteira', description: 'Percorra 1.500 metros pelo continente.', metric: 'distance', target: 1500, gems: 120 },
  { id: 'first-summon', name: 'O chamado do fragmento', description: 'Realize sua primeira invocação.', metric: 'summons', target: 1, gems: 100 },
  { id: 'auto-march', name: 'Marcha autônoma', description: 'Alcance o nível 10 e libere a batalha automática.', metric: 'level', target: 10, gems: 220 },
  { id: 'forest-gate', name: 'Além da fronteira', description: 'Entre na Floresta das Vozes.', metric: 'region', target: 2, gems: 180 },
  { id: 'crown-gate', name: 'Sob a Coroa Partida', description: 'Alcance as Ruínas da Coroa.', metric: 'region', target: 3, gems: 300 }
]);
