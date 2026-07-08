/* Caminho dos Guardioes - dados centrais do jogo (defesas, inimigos, raridades, classes, ondas, mapa) */
(function (global) {
  'use strict';

  const MAP = {
    width: 1600,
    height: 900,
    path: [
      { x: -80, y: 512 },
      { x: 135, y: 515 },
      { x: 286, y: 446 },
      { x: 318, y: 284 },
      { x: 520, y: 267 },
      { x: 612, y: 376 },
      { x: 598, y: 575 },
      { x: 774, y: 640 },
      { x: 940, y: 548 },
      { x: 1034, y: 426 },
      { x: 1226, y: 392 },
      { x: 1425, y: 350 },
      { x: 1680, y: 348 }
    ],
    trapPathRadius: 78,
    towerPathRadius: 72,
    towerMinGap: 64
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
    archer: {
      id: 'archer', name: 'Arqueiro', rarity: 'comum', role: 'Dano rápido',
      cost: 40, damage: 9, range: 190, rate: 550, projectileSpeed: 620,
      onPath: false, color: 0x6b8f52, shape: 'archer',
      upgrades: ['damage', 'range', 'rate'],
      desc: 'Atira rápido em um único alvo. Base confiável de qualquer build.'
    },
    fire: {
      id: 'fire', name: 'Braseiro', rarity: 'rara', role: 'Dano em área contínua',
      cost: 90, damage: 4, range: 130, rate: 900, aoeRadius: 70, dot: true,
      onPath: false, color: 0xc65b2b, shape: 'fire',
      upgrades: ['damage', 'aoeRadius', 'rate'],
      desc: 'Queima uma área continuamente, ótimo contra grupos.'
    },
    trap: {
      id: 'trap', name: 'Armadilha', rarity: 'comum', role: 'Controle de velocidade',
      cost: 35, damage: 6, range: 0, rate: 1200, slowFactor: 0.45, slowDuration: 1800,
      onPath: true, color: 0x5a4632, shape: 'trap',
      upgrades: ['slowDuration', 'damage', 'slowFactor'],
      desc: 'Só pode ser colocada sobre o caminho. Machuca e retarda quem passa.'
    },
    ballista: {
      id: 'ballista', name: 'Balista', rarity: 'epica', role: 'Dano pesado',
      cost: 160, damage: 42, range: 260, rate: 1700, projectileSpeed: 820, pierce: 2,
      onPath: false, color: 0x394456, shape: 'ballista',
      upgrades: ['damage', 'pierce', 'range'],
      desc: 'Tiro lento e pesado que atravessa vários inimigos na linha.'
    },
    relic: {
      id: 'relic', name: 'Relíquia do Arcanjo', rarity: 'lendaria', role: 'Explosão em área',
      cost: 320, damage: 70, range: 240, rate: 3200, aoeRadius: 150,
      onPath: false, color: 0xe8c65a, shape: 'relic',
      upgrades: ['damage', 'aoeRadius', 'rate'],
      desc: 'Libera uma onda de luz sagrada em área a cada recarga. Rara de se conseguir, decisiva quando aparece.'
    }
  };

  const DEFENSE_ORDER = ['archer', 'fire', 'trap', 'ballista', 'relic'];

  const ENEMIES = {
    raider: { id: 'raider', name: 'Saqueador', hp: 34, speed: 78, bounty: 6, color: 0x8a3a3a, shape: 'raider' },
    shield: { id: 'shield', name: 'Escudeiro', hp: 70, speed: 60, bounty: 10, armor: 4, color: 0x6a6a78, shape: 'shield' },
    ram: { id: 'ram', name: 'Aríete', hp: 160, speed: 40, bounty: 18, armor: 2, color: 0x5a4632, shape: 'ram' },
    boss: { id: 'boss', name: 'Chefe Saqueador', hp: 620, speed: 34, bounty: 80, armor: 6, color: 0x3a1f1f, shape: 'boss', isBoss: true }
  };

  // Ondas: cada entrada é {enemy, count, interval(ms), delay(ms antes de comecar)}
  const WAVES = [
    { label: 'Onda 1', spawns: [{ enemy: 'raider', count: 6, interval: 700 }] },
    { label: 'Onda 2', spawns: [{ enemy: 'raider', count: 6, interval: 600 }, { enemy: 'shield', count: 3, interval: 900, delay: 1500 }] },
    { label: 'Onda 3', spawns: [{ enemy: 'raider', count: 10, interval: 450 }, { enemy: 'shield', count: 4, interval: 800, delay: 1000 }] },
    { label: 'Onda 4', spawns: [{ enemy: 'shield', count: 6, interval: 700 }, { enemy: 'ram', count: 3, interval: 1200, delay: 1500 }] },
    { label: 'Onda 5 - Chefe', spawns: [{ enemy: 'raider', count: 8, interval: 500 }, { enemy: 'ram', count: 2, interval: 1400, delay: 2000 }, { enemy: 'boss', count: 1, interval: 0, delay: 5000 }] }
  ];

  // Classes: cada ramo tem ate 4 nos lineares. Efeitos aplicados via applyClassEffects().
  const CLASSES = {
    merchant: {
      id: 'merchant', name: 'Comerciante', desc: 'Economia melhor: compras mais baratas e mais moedas por vitória.',
      branches: {
        precos: { id: 'precos', name: 'Preços Baixos', nodes: [
          { id: 1, name: 'Barganha I', desc: '-4% custo de compra', effect: { buyCostMult: -0.04 } },
          { id: 2, name: 'Barganha II', desc: '-4% custo de compra', effect: { buyCostMult: -0.04 } },
          { id: 3, name: 'Barganha III', desc: '-5% custo de compra', effect: { buyCostMult: -0.05 } },
          { id: 4, name: 'Monopólio', desc: '-8% custo de compra', effect: { buyCostMult: -0.08 } }
        ] },
        rendimento: { id: 'rendimento', name: 'Rendimento', nodes: [
          { id: 1, name: 'Cofre I', desc: '+5% moedas por abate', effect: { bountyMult: 0.05 } },
          { id: 2, name: 'Cofre II', desc: '+5% moedas por abate', effect: { bountyMult: 0.05 } },
          { id: 3, name: 'Cofre III', desc: '+6% moedas por abate', effect: { bountyMult: 0.06 } },
          { id: 4, name: 'Tesouro Real', desc: '+10% moedas por abate', effect: { bountyMult: 0.10 } }
        ] },
        recompensa: { id: 'recompensa', name: 'Recompensa de Vitória', nodes: [
          { id: 1, name: 'Bônus I', desc: '+8% XP ao vencer', effect: { xpMult: 0.08 } },
          { id: 2, name: 'Bônus II', desc: '+8% XP ao vencer', effect: { xpMult: 0.08 } },
          { id: 3, name: 'Bônus III', desc: '+10% fragmentos ganhos', effect: { fragmentMult: 0.10 } },
          { id: 4, name: 'Fortuna', desc: '+15% moedas ao vencer', effect: { winCoinMult: 0.15 } }
        ] }
      }
    },
    fortune: {
      id: 'fortune', name: 'Sortudo', desc: 'Mais chance de raras, épicas e lendárias na compra.',
      branches: {
        sorte: { id: 'sorte', name: 'Sorte Bruta', nodes: [
          { id: 1, name: 'Trevo I', desc: '+2% chance rara/épica/lendária', effect: { luckShift: 0.02 } },
          { id: 2, name: 'Trevo II', desc: '+2% chance rara/épica/lendária', effect: { luckShift: 0.02 } },
          { id: 3, name: 'Trevo III', desc: '+3% chance rara/épica/lendária', effect: { luckShift: 0.03 } },
          { id: 4, name: 'Estrela da Sorte', desc: '+5% chance rara/épica/lendária', effect: { luckShift: 0.05 } }
        ] },
        raridade: { id: 'raridade', name: 'Caça a Raridades', nodes: [
          { id: 1, name: 'Faro I', desc: '+3% chance épica/lendária', effect: { epicLuckShift: 0.03 } },
          { id: 2, name: 'Faro II', desc: '+3% chance épica/lendária', effect: { epicLuckShift: 0.03 } },
          { id: 3, name: 'Faro III', desc: '+4% chance épica/lendária', effect: { epicLuckShift: 0.04 } },
          { id: 4, name: 'Bênção Rara', desc: '+6% chance épica/lendária', effect: { epicLuckShift: 0.06 } }
        ] },
        pacotes: { id: 'pacotes', name: 'Pacotes Generosos', nodes: [
          { id: 1, name: 'Bônus de Loja I', desc: '+5% fragmentos em pacotes', effect: { packFragmentMult: 0.05 } },
          { id: 2, name: 'Bônus de Loja II', desc: '+5% fragmentos em pacotes', effect: { packFragmentMult: 0.05 } },
          { id: 3, name: 'Bônus de Loja III', desc: '+6% fragmentos em pacotes', effect: { packFragmentMult: 0.06 } },
          { id: 4, name: 'Cofre Aberto', desc: '10% chance de pacote grátis', effect: { freePackChance: 0.10 } }
        ] }
      }
    },
    strategist: {
      id: 'strategist', name: 'Estrategista', desc: 'Fusões melhores, upgrades mais fortes, posicionamento vantajoso.',
      branches: {
        fusao: { id: 'fusao', name: 'Domínio da Fusão', nodes: [
          { id: 1, name: 'Sinergia I', desc: '+4% dano após fundir', effect: { fusionDamageMult: 0.04 } },
          { id: 2, name: 'Sinergia II', desc: '+4% dano após fundir', effect: { fusionDamageMult: 0.04 } },
          { id: 3, name: 'Sinergia III', desc: '+5% dano após fundir', effect: { fusionDamageMult: 0.05 } },
          { id: 4, name: 'Fusão Suprema', desc: 'Permite nível 4 de fusão', effect: { maxFusionBonus: 1 } }
        ] },
        upgrades: { id: 'upgrades', name: 'Engenharia', nodes: [
          { id: 1, name: 'Precisão I', desc: '+5% efeito dos upgrades de fragmento', effect: { upgradeEffectMult: 0.05 } },
          { id: 2, name: 'Precisão II', desc: '+5% efeito dos upgrades de fragmento', effect: { upgradeEffectMult: 0.05 } },
          { id: 3, name: 'Precisão III', desc: '+6% efeito dos upgrades de fragmento', effect: { upgradeEffectMult: 0.06 } },
          { id: 4, name: 'Maestria', desc: '+10% efeito dos upgrades de fragmento', effect: { upgradeEffectMult: 0.10 } }
        ] },
        posicionamento: { id: 'posicionamento', name: 'Terreno', nodes: [
          { id: 1, name: 'Alcance de Terreno I', desc: '+3% alcance de todas as torres', effect: { rangeMult: 0.03 } },
          { id: 2, name: 'Alcance de Terreno II', desc: '+3% alcance de todas as torres', effect: { rangeMult: 0.03 } },
          { id: 3, name: 'Alcance de Terreno III', desc: '+4% alcance de todas as torres', effect: { rangeMult: 0.04 } },
          { id: 4, name: 'Visão Total', desc: '+6% alcance de todas as torres', effect: { rangeMult: 0.06 } }
        ] }
      }
    }
  };

  const CLASS_ORDER = ['merchant', 'fortune', 'strategist'];

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

  global.GuardioesData = {
    MAP, RARITY, RARITY_ORDER, MAX_FUSION_LEVEL,
    DEFENSES, DEFENSE_ORDER, ENEMIES, WAVES,
    CLASSES, CLASS_ORDER,
    rarityWeights, pickRarity, defensesByRarity
  };
})(window);
