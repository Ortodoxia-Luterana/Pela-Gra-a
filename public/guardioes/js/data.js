/* Tower Defense - dados centrais do jogo: torres, inimigos, ondas e mapas. */
(function (global) {
  'use strict';

  // Mobile-first: canvas vertical. Os caminhos de cada nivel vivem em LEVELS;
  // aqui ficam so as dimensoes e as regras de posicionamento.
  const BASE_MAP = { width: 720, height: 1280 };

  const MAP = {
    width: BASE_MAP.width,
    height: BASE_MAP.height,
    trapPathRadius: 70,
    towerPathRadius: 66,
    towerMinGap: 58,
    slotSnapRadius: 54
  };

  const RARITY = {
    comum: { key: 'comum', label: 'Comum', color: 0xb8b0a0, weight: 62, order: 0 },
    rara: { key: 'rara', label: 'Rara', color: 0x3d8bcf, weight: 26, order: 1 },
    epica: { key: 'epica', label: 'Épica', color: 0x9b4fd6, weight: 10, order: 2 },
    lendaria: { key: 'lendaria', label: 'Lendária', color: 0xe0a52a, weight: 2, order: 3 }
  };

  const RARITY_ORDER = ['comum', 'rara', 'epica', 'lendaria'];

  // Fusão: nível 1 + nível 1 = nível 2, até MAX_FUSION_LEVEL.
  const MAX_FUSION_LEVEL = 3;

  const DEFENSES = {
    spearman: {
      id: 'spearman', name: 'Soldado de Lanca', rarity: 'comum', role: 'Dano direto de curta distancia',
      cost: 38, damage: 14, range: 112, rate: 680, melee: true,
      onPath: false, color: 0x6b8f52, upgrades: ['damage', 'range', 'rate'],
      desc: 'Ataca de perto fora do caminho. Barato, firme e bom para segurar o comeco.'
    },
    archer: {
      id: 'archer', name: 'Arqueiro', rarity: 'comum', role: 'Tiro rapido de alvo unico',
      cost: 42, damage: 11, range: 230, rate: 560, projectileSpeed: 720,
      onPath: false, color: 0x6b8f52, upgrades: ['damage', 'range', 'rate'],
      desc: 'Atira com regularidade em um alvo. Simples, confiavel e comum.'
    },
    'burning-oil': {
      id: 'burning-oil', name: 'Oleo em Chamas', rarity: 'comum', role: 'Dano de fogo no caminho',
      cost: 46, damage: 7, range: 0, rate: 680, slowFactor: 0.10, slowDuration: 420,
      burnDamage: 3, burnDuration: 1600, onPath: true, color: 0xc65b2b,
      upgrades: ['damage', 'burnDuration', 'rate'],
      desc: 'Fica no caminho. Causa dano constante e deixa o inimigo queimando por um tempo curto.'
    },
    barbarian: {
      id: 'barbarian', name: 'Barbaro de Machado', rarity: 'rara', role: 'Golpe em area',
      cost: 82, damage: 18, range: 116, rate: 980, aoeRadius: 76, melee: true,
      onPath: false, color: 0x9a5a2a, upgrades: ['damage', 'aoeRadius', 'rate'],
      desc: 'Entra no combate de perto e acerta inimigos em volta do alvo.'
    },
    slinger: {
      id: 'slinger', name: 'Fundibulario', rarity: 'rara', role: 'Longo alcance em area',
      cost: 78, damage: 13, range: 275, rate: 1250, projectileSpeed: 650, aoeRadius: 78,
      onPath: false, color: 0x3d8bcf, upgrades: ['damage', 'aoeRadius', 'range'],
      desc: 'Arremessa pedras de longe. Mais lento que o arqueiro, mas atinge grupos.'
    },
    shieldbearer: {
      id: 'shieldbearer', name: 'Escudeiro', rarity: 'rara', role: 'Bloqueio com vida',
      cost: 88, damage: 4, range: 0, rate: 860, guard: true, guardHp: 96,
      slowFactor: 0.94, slowDuration: 1000, onPath: true, color: 0x3d6fa8,
      upgrades: ['guardHp', 'slowDuration', 'rate'],
      desc: 'Fica no caminho, entra em combate e segura inimigos enquanto tiver vida.'
    },
    zealot: {
      id: 'zealot', name: 'Zelote', rarity: 'rara', role: 'Duelista no caminho',
      cost: 76, damage: 16, range: 0, rate: 650, guard: true, guardHp: 70,
      slowFactor: 0.35, slowDuration: 260, onPath: true, color: 0x9b4f2f,
      upgrades: ['damage', 'guardHp', 'rate'],
      desc: 'Tambem luta no caminho, mas troca defesa por dano frontal.'
    },
    priest: {
      id: 'priest', name: 'Sacerdote', rarity: 'epica', role: 'Cura e bencao',
      cost: 128, damage: 0, range: 0, rate: 0, auraRadius: 210, auraDamageMult: 0,
      auraRateMult: 0.22, healGuardAmount: 9, healRate: 900,
      onPath: false, color: 0xe8dcb8, upgrades: ['auraRadius', 'auraRateMult', 'healGuardAmount'],
      desc: 'Cura escudeiros e zelotes no alcance e acelera o ataque dos aliados proximos.'
    },
    'fire-archer': {
      id: 'fire-archer', name: 'Arqueiro de Fogo', rarity: 'epica', role: 'Flecha incendiaria',
      cost: 116, damage: 16, range: 238, rate: 760, projectileSpeed: 720,
      burnDamage: 4, burnDuration: 2200, burnTick: 500,
      onPath: false, color: 0xc65b2b, upgrades: ['damage', 'burnDamage', 'rate'],
      desc: 'Acerta um alvo e deixa fogo queimando depois do impacto.'
    }
  };

  const DEFENSE_ORDER = ['spearman', 'archer', 'burning-oil', 'barbarian', 'slinger', 'shieldbearer', 'zealot', 'priest', 'fire-archer'];

  // Bounties recalibrados: a economia antiga so dava para gerar 1 torre por
  // onda mesmo limpando tudo. Subiu ~35-45% em cada inimigo.
  const ENEMIES = {
    raider: { id: 'raider', name: 'Saqueador', hp: 28, speed: 72, bounty: 10, color: 0x8a3a3a, shape: 'raider' },
    runner: { id: 'runner', name: 'Batedor', hp: 18, speed: 128, bounty: 8, color: 0xb07a2a, shape: 'runner' },
    shield: { id: 'shield', name: 'Escudeiro', hp: 58, speed: 56, bounty: 15, armor: 2, color: 0x6a6a78, shape: 'shield' },
    // Voadora: passa POR CIMA das armadilhas (imune a dano/lentidao delas) - forca
    // o jogador a ter dano de projetil na build, nao so controle de chao.
    flyer: { id: 'flyer', name: 'Harpia', hp: 40, speed: 90, bounty: 13, flying: true, color: 0x6a4a8a, shape: 'flyer' },
    // Curandeiro: cura inimigos proximos enquanto vivo - vira alvo prioritario
    // (o modo de mira "Mais Forte" e a Balista perfurante brilham contra ele).
    healer: { id: 'healer', name: 'Curandeiro', hp: 52, speed: 52, bounty: 18, healRadius: 130, healAmount: 8, color: 0x3a7a4a, shape: 'healer' },
    ram: { id: 'ram', name: 'Aríete', hp: 145, speed: 38, bounty: 27, armor: 2, color: 0x5a4632, shape: 'ram' },
    boss: { id: 'boss', name: 'Chefe Saqueador', hp: 420, speed: 32, bounty: 110, armor: 4, color: 0x3a1f1f, shape: 'boss', isBoss: true }
  };

  // Escala geometrica de HP por onda: onda N usa hp * HP_GROWTH^(N-1).
  // Mantem pressao de upgrade sem trivializar o comeco (ref: skill tower-defense).
  const HP_GROWTH = 1.09;
  // Bonus de suprimentos ao limpar cada onda (alem do bounty por abate). Cresce por
  // onda porque o custo de gerar torre tambem sobe ao longo da partida - sem isso o
  // jogador ficava sem suprimentos para gerar mais de uma torre por onda cedo demais.
  const WAVE_CLEAR_BONUS = 30;
  const WAVE_CLEAR_BONUS_GROWTH = 18;

  // Niveis: cada um tem mapa (path proprio no canvas 720x1280), 5 ondas,
  // multiplicador de HP e recompensas crescentes. Vencer um nivel libera o proximo.
  // Ondas: {enemy, count, interval(ms), delay(ms)}. Ritmo: pico -> respiro -> pico.
  const LEVELS = [
    {
      id: 'portoes', name: 'Portões da Cidade', desc: 'Saqueadores testam as defesas da entrada. Bom lugar pra aprender.',
      hpMult: 1.0,
      rewards: { coins: 120, xp: 60, fragments: 4 },
      path: [
        { x: 360, y: -80 }, { x: 360, y: 170 }, { x: 610, y: 210 }, { x: 630, y: 420 },
        { x: 360, y: 460 }, { x: 100, y: 500 }, { x: 90, y: 710 }, { x: 380, y: 750 },
        { x: 630, y: 790 }, { x: 620, y: 1000 }, { x: 340, y: 1040 }, { x: 340, y: 1360 }
      ],
      waves: [
        { label: 'Onda 1', spawns: [{ enemy: 'raider', count: 4, interval: 850 }] },
        { label: 'Onda 2', spawns: [{ enemy: 'raider', count: 6, interval: 760 }] },
        { label: 'Onda 3', spawns: [{ enemy: 'raider', count: 5, interval: 720 }, { enemy: 'shield', count: 2, interval: 1100, delay: 1800 }] },
        { label: 'Onda 4', spawns: [{ enemy: 'shield', count: 3, interval: 1050 }, { enemy: 'raider', count: 5, interval: 680, delay: 1600 }] },
        { label: 'Onda 5 - Chefe', spawns: [{ enemy: 'raider', count: 5, interval: 700 }, { enemy: 'boss', count: 1, interval: 0, delay: 4600 }] }
      ]
    },
    {
      id: 'estrada', name: 'Estrada do Mosteiro', desc: 'Batedores velozes cortam a estrada. Lentidão vale ouro aqui.',
      hpMult: 1.35,
      rewards: { coins: 170, xp: 85, fragments: 5 },
      path: [
        { x: -80, y: 200 }, { x: 360, y: 200 }, { x: 620, y: 240 }, { x: 620, y: 440 },
        { x: 120, y: 480 }, { x: 100, y: 700 }, { x: 600, y: 740 }, { x: 620, y: 960 },
        { x: 120, y: 1000 }, { x: 120, y: 1200 }, { x: 360, y: 1240 }, { x: 360, y: 1360 }
      ],
      waves: [
        { label: 'Onda 1', spawns: [{ enemy: 'raider', count: 8, interval: 550 }] },
        { label: 'Onda 2', spawns: [{ enemy: 'runner', count: 6, interval: 350 }] },
        { label: 'Onda 3', spawns: [{ enemy: 'runner', count: 6, interval: 320 }, { enemy: 'shield', count: 4, interval: 850, delay: 1500 }] },
        { label: 'Onda 4', spawns: [{ enemy: 'runner', count: 8, interval: 280 }, { enemy: 'flyer', count: 3, interval: 900, delay: 2000 }] },
        { label: 'Onda 5 - Chefe', spawns: [{ enemy: 'runner', count: 8, interval: 300 }, { enemy: 'flyer', count: 2, interval: 1000, delay: 2500 }, { enemy: 'boss', count: 1, interval: 0, delay: 4500 }] }
      ]
    },
    {
      id: 'biblioteca', name: 'Biblioteca em Chamas', desc: 'Corredores longos e retos: arqueiros brilham, mas os aríetes chegam.',
      hpMult: 1.75,
      rewards: { coins: 230, xp: 115, fragments: 6 },
      path: [
        { x: 360, y: -80 }, { x: 360, y: 150 }, { x: 120, y: 190 }, { x: 110, y: 1020 },
        { x: 600, y: 1060 }, { x: 620, y: 320 }, { x: 360, y: 360 }, { x: 350, y: 840 },
        { x: 470, y: 890 }, { x: 480, y: 1360 }
      ],
      waves: [
        { label: 'Onda 1', spawns: [{ enemy: 'shield', count: 6, interval: 700 }] },
        { label: 'Onda 2', spawns: [{ enemy: 'ram', count: 3, interval: 1200 }, { enemy: 'raider', count: 6, interval: 500, delay: 1500 }] },
        { label: 'Onda 3', spawns: [{ enemy: 'runner', count: 8, interval: 300 }, { enemy: 'flyer', count: 4, interval: 800, delay: 2200 }] },
        { label: 'Onda 4', spawns: [{ enemy: 'shield', count: 7, interval: 650 }, { enemy: 'healer', count: 2, interval: 1500, delay: 1800 }, { enemy: 'ram', count: 3, interval: 1100, delay: 3000 }] },
        { label: 'Onda 5 - Chefe', spawns: [{ enemy: 'ram', count: 3, interval: 1300 }, { enemy: 'boss', count: 1, interval: 0, delay: 5000 }] }
      ]
    },
    {
      id: 'muralhas', name: 'Muralhas Antigas', desc: 'Vaivém de patrulhas em massa. Área e economia decidem.',
      hpMult: 2.2,
      rewards: { coins: 300, xp: 150, fragments: 7 },
      path: [
        { x: -80, y: 150 }, { x: 600, y: 160 }, { x: 620, y: 400 }, { x: 120, y: 430 },
        { x: 100, y: 660 }, { x: 600, y: 690 }, { x: 620, y: 930 }, { x: 120, y: 960 },
        { x: 100, y: 1190 }, { x: 360, y: 1220 }, { x: 360, y: 1360 }
      ],
      waves: [
        { label: 'Onda 1', spawns: [{ enemy: 'raider', count: 12, interval: 400 }] },
        { label: 'Onda 2', spawns: [{ enemy: 'flyer', count: 6, interval: 700 }, { enemy: 'shield', count: 4, interval: 800, delay: 2000 }] },
        { label: 'Onda 3', spawns: [{ enemy: 'shield', count: 8, interval: 600 }, { enemy: 'healer', count: 2, interval: 1600, delay: 1200 }, { enemy: 'ram', count: 3, interval: 1100, delay: 2500 }] },
        { label: 'Onda 4', spawns: [{ enemy: 'raider', count: 10, interval: 350 }, { enemy: 'runner', count: 8, interval: 300, delay: 2500 }] },
        { label: 'Onda 5 - Chefe', spawns: [{ enemy: 'shield', count: 6, interval: 600 }, { enemy: 'healer', count: 2, interval: 1800, delay: 1500 }, { enemy: 'boss', count: 1, interval: 0, delay: 5000 }] }
      ]
    },
    {
      id: 'arquivo', name: 'O Grande Arquivo', desc: 'A última defesa. Tudo que o inimigo tem, de uma vez.',
      hpMult: 2.8,
      rewards: { coins: 400, xp: 200, fragments: 9 },
      path: [
        { x: 360, y: -80 }, { x: 360, y: 130 }, { x: 110, y: 170 }, { x: 100, y: 360 },
        { x: 610, y: 400 }, { x: 620, y: 590 }, { x: 110, y: 630 }, { x: 100, y: 820 },
        { x: 610, y: 860 }, { x: 620, y: 1050 }, { x: 360, y: 1090 }, { x: 360, y: 1360 }
      ],
      waves: [
        { label: 'Onda 1', spawns: [{ enemy: 'runner', count: 8, interval: 300 }, { enemy: 'shield', count: 5, interval: 700, delay: 1500 }] },
        { label: 'Onda 2', spawns: [{ enemy: 'ram', count: 4, interval: 1000 }, { enemy: 'raider', count: 10, interval: 400, delay: 1500 }] },
        { label: 'Onda 3', spawns: [{ enemy: 'flyer', count: 8, interval: 550 }, { enemy: 'healer', count: 2, interval: 1600, delay: 2000 }, { enemy: 'ram', count: 3, interval: 1200, delay: 3500 }] },
        { label: 'Onda 4', spawns: [{ enemy: 'shield', count: 8, interval: 550 }, { enemy: 'ram', count: 4, interval: 1000, delay: 2000 }, { enemy: 'runner', count: 6, interval: 300, delay: 4500 }] },
        { label: 'Onda 5 - Chefe Final', spawns: [{ enemy: 'shield', count: 6, interval: 600 }, { enemy: 'healer', count: 3, interval: 1500, delay: 1200 }, { enemy: 'ram', count: 3, interval: 1200, delay: 2500 }, { enemy: 'boss', count: 2, interval: 4000, delay: 5000 }] }
      ]
    }
  ];

  // Classes simples: uma escolha ativa, sem arvore interna.
  const CLASSES = {
    merchant: {
      id: 'merchant',
      name: 'Mercador',
      short: 'Compra mais barato',
      desc: 'Reduz o custo de gerar defesa e melhora a economia entre ondas.',
      effect: { buyCostMult: -0.18, bountyMult: 0.10, winCoinMult: 0.10 }
    },
    diplomat: {
      id: 'diplomat',
      name: 'Diplomata',
      short: 'Mais sorte no sorteio',
      desc: 'Aumenta a chance de defesas raras, epicas e lendarias aparecerem na batalha.',
      effect: { luckShift: 0.18, epicLuckShift: 0.08 }
    }
  };

  const CLASS_ORDER = ['merchant', 'diplomat'];

  function rarityWeights(luckShift, epicLuckShift) {
    const w = {};
    RARITY_ORDER.forEach(key => { w[key] = RARITY[key].weight; });
    const shift = Math.max(0, luckShift || 0) * 100;
    const epicShift = Math.max(0, epicLuckShift || 0) * 100;
    w.comum = Math.max(5, w.comum - shift - epicShift * 0.5);
    w.rara = w.rara + shift * 0.6;
    w.epica = w.epica + shift * 0.3 + epicShift * 0.7;
    w.lendaria = w.lendaria + shift * 0.1 + epicShift * 0.3;
    return w;
  }

  function pickRarity(rng, luckShift, epicLuckShift) {
    const w = rarityWeights(luckShift, epicLuckShift);
    const total = RARITY_ORDER.reduce((s, k) => s + w[k], 0);
    let roll = rng() * total;
    for (const key of RARITY_ORDER) {
      if (roll < w[key]) return key;
      roll -= w[key];
    }
    return 'comum';
  }

  function defensesByRarity(rarity) {
    return DEFENSE_ORDER.filter(id => DEFENSES[id].rarity === rarity);
  }

  // Gate de progressao dos "predios" do vilarejo (tela inicial estilo hub de RPG mobile).
  // Build e Colecao sempre abertos (o jogador precisa deles pra jogar a 1a fase).
  // Loja abre depois da 1a fase (ja tem moeda/fragmento pra gastar). Classe abre no nivel 2
  // (evita jogador se perder na arvore de habilidade antes de entender o loop principal).
  function isFeatureUnlocked(state, feature) {
    if (feature === 'build' || feature === 'collection') return true;
    if (feature === 'shop') {
      const first = LEVELS[0];
      return Boolean(state.progress.levels[first.id] && state.progress.levels[first.id].completed);
    }
    if (feature === 'class') return state.profile.level >= 2;
    return true;
  }

  global.GuardioesData = {
    BASE_MAP, MAP, RARITY, RARITY_ORDER, MAX_FUSION_LEVEL,
    DEFENSES, DEFENSE_ORDER, ENEMIES, LEVELS,
    HP_GROWTH, WAVE_CLEAR_BONUS, WAVE_CLEAR_BONUS_GROWTH,
    CLASSES, CLASS_ORDER,
    rarityWeights, pickRarity, defensesByRarity, isFeatureUnlocked
  };
})(window);
