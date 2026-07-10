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
    banner: {
      id: 'banner', name: 'Estandarte de Guerra', rarity: 'rara', role: 'Suporte',
      cost: 110, damage: 0, range: 0, rate: 0, auraRadius: 170, auraDamageMult: 0.25,
      onPath: false, color: 0x8a2f3f, shape: 'banner',
      upgrades: ['auraRadius', 'auraDamageMult'],
      desc: 'Não ataca. Todas as torres próximas causam +25% de dano. Fundir amplia o bônus.'
    },
    relic: {
      id: 'relic', name: 'Obelisco Prismático', rarity: 'lendaria', role: 'Explosão em área',
      cost: 320, damage: 70, range: 240, rate: 3200, aoeRadius: 150,
      onPath: false, color: 0xe8c65a, shape: 'relic',
      upgrades: ['damage', 'aoeRadius', 'rate'],
      desc: 'Libera uma onda de energia em área a cada recarga. Rara de se conseguir, decisiva quando aparece.'
    }
  };

  const DEFENSE_ORDER = ['archer', 'fire', 'trap', 'banner', 'ballista', 'relic'];

  // Bounties recalibrados: a economia antiga so dava para gerar 1 torre por
  // onda mesmo limpando tudo. Subiu ~35-45% em cada inimigo.
  const ENEMIES = {
    raider: { id: 'raider', name: 'Saqueador', hp: 34, speed: 78, bounty: 9, color: 0x8a3a3a, shape: 'raider' },
    runner: { id: 'runner', name: 'Batedor', hp: 20, speed: 135, bounty: 7, color: 0xb07a2a, shape: 'runner' },
    shield: { id: 'shield', name: 'Escudeiro', hp: 70, speed: 60, bounty: 14, armor: 4, color: 0x6a6a78, shape: 'shield' },
    // Voadora: passa POR CIMA das armadilhas (imune a dano/lentidao delas) - forca
    // o jogador a ter dano de projetil na build, nao so controle de chao.
    flyer: { id: 'flyer', name: 'Harpia', hp: 45, speed: 95, bounty: 13, flying: true, color: 0x6a4a8a, shape: 'flyer' },
    // Curandeiro: cura inimigos proximos enquanto vivo - vira alvo prioritario
    // (o modo de mira "Mais Forte" e a Balista perfurante brilham contra ele).
    healer: { id: 'healer', name: 'Curandeiro', hp: 55, speed: 55, bounty: 18, healRadius: 130, healAmount: 9, color: 0x3a7a4a, shape: 'healer' },
    ram: { id: 'ram', name: 'Aríete', hp: 160, speed: 40, bounty: 25, armor: 2, color: 0x5a4632, shape: 'ram' },
    boss: { id: 'boss', name: 'Chefe Saqueador', hp: 620, speed: 34, bounty: 110, armor: 6, color: 0x3a1f1f, shape: 'boss', isBoss: true }
  };

  // Escala geometrica de HP por onda: onda N usa hp * HP_GROWTH^(N-1).
  // Mantem pressao de upgrade sem trivializar o comeco (ref: skill tower-defense).
  const HP_GROWTH = 1.13;
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
        { label: 'Onda 1', spawns: [{ enemy: 'raider', count: 6, interval: 700 }] },
        { label: 'Onda 2', spawns: [{ enemy: 'raider', count: 8, interval: 550 }] },
        { label: 'Onda 3', spawns: [{ enemy: 'raider', count: 6, interval: 600 }, { enemy: 'shield', count: 3, interval: 900, delay: 1500 }] },
        { label: 'Onda 4', spawns: [{ enemy: 'shield', count: 5, interval: 750 }, { enemy: 'raider', count: 6, interval: 500, delay: 1200 }] },
        { label: 'Onda 5 - Chefe', spawns: [{ enemy: 'raider', count: 8, interval: 500 }, { enemy: 'boss', count: 1, interval: 0, delay: 4000 }] }
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
