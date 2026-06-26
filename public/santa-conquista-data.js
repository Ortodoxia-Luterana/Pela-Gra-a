(function initSantaConquistaData(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.SANTA_CONQUISTA_DATA = data;
})(typeof globalThis !== 'undefined' ? globalThis : window, function santaConquistaDataFactory() {
  const religions = {
    catholic: { name: 'Catolica Latina', color: '#c9a646' },
    orthodox: { name: 'Ortodoxa Grega', color: '#7b8fd6' },
    oriental: { name: 'Oriental Armenia', color: '#b46a55' },
    sunni: { name: 'Isla Sunita', color: '#2d9b72' },
    shia: { name: 'Isla Xiita', color: '#198b8b' },
    mixed: { name: 'Mista', color: '#9a8a75' }
  };

  const buildings = {
    castle: { name: 'Castelo', costGold: 70, effect: 'defense' },
    walls: { name: 'Muralhas', costGold: 55, effect: 'fortress' },
    church: { name: 'Igreja', costGold: 45, costPiety: 10, effect: 'conversion' },
    market: { name: 'Mercado', costGold: 40, effect: 'wealth' },
    barracks: { name: 'Quartel', costGold: 50, effect: 'manpower' },
    road: { name: 'Estrada', costGold: 35, effect: 'supply' },
    monastery: { name: 'Mosteiro', costGold: 65, costPiety: 15, effect: 'piety' }
  };

  const nations = {
    france: {
      id: 'france', name: 'Reino da Franca', shortName: 'Franca', type: 'kingdom', religion: 'catholic',
      culture: 'franca', capital: 'paris', color: '#2f5fb3', ruler: 'Filipe II Augusto',
      resources: { gold: 130, manpower: 950, prestige: 72, piety: 58, stability: 64, authority: 52 },
      bonuses: { cavalry: 1.1, manpower: 1.12 }, rivals: ['england']
    },
    england: {
      id: 'england', name: 'Reino da Inglaterra', shortName: 'Inglaterra', type: 'kingdom', religion: 'catholic',
      culture: 'normanda', capital: 'london', color: '#b33a3a', ruler: 'Henrique II Plantageneta',
      resources: { gold: 125, manpower: 760, prestige: 68, piety: 55, stability: 58, authority: 62 },
      bonuses: { archers: 1.15, navy: 1.12 }, rivals: ['france']
    },
    leon_castile: {
      id: 'leon_castile', name: 'Leao e Castela', shortName: 'Castela', type: 'kingdom', religion: 'catholic',
      culture: 'iberica', capital: 'leon', color: '#9d4a2f', ruler: 'Afonso VII',
      resources: { gold: 105, manpower: 720, prestige: 58, piety: 66, stability: 61, authority: 56 },
      bonuses: { reconquest: 1.15 }, rivals: ['almoravids']
    },
    aragon: {
      id: 'aragon', name: 'Reino de Aragao', shortName: 'Aragao', type: 'kingdom', religion: 'catholic',
      culture: 'aragonesa', capital: 'aragon', color: '#d79a2b', ruler: 'Afonso II',
      resources: { gold: 90, manpower: 560, prestige: 48, piety: 55, stability: 62, authority: 54 },
      bonuses: { diplomacy: 1.08 }, rivals: ['almoravids']
    },
    portugal: {
      id: 'portugal', name: 'Condado de Portugal', shortName: 'Portugal', type: 'county', religion: 'catholic',
      culture: 'portuguesa', capital: 'portugal', color: '#287c57', ruler: 'Afonso Henriques',
      resources: { gold: 74, manpower: 420, prestige: 42, piety: 62, stability: 60, authority: 45 },
      bonuses: { reconquest: 1.12 }, rivals: ['almoravids']
    },
    holy_roman_empire: {
      id: 'holy_roman_empire', name: 'Sacro Imperio', shortName: 'Imperio', type: 'empire', religion: 'catholic',
      culture: 'germanica', capital: 'cologne', color: '#6f6f76', ruler: 'Conrado III',
      resources: { gold: 145, manpower: 1050, prestige: 85, piety: 54, stability: 48, authority: 42 },
      bonuses: { manpower: 1.18 }, rivals: ['papal_states']
    },
    papal_states: {
      id: 'papal_states', name: 'Estados Papais', shortName: 'Papado', type: 'theocracy', religion: 'catholic',
      culture: 'italica', capital: 'rome', color: '#d8c07a', ruler: 'Lucio III',
      resources: { gold: 95, manpower: 360, prestige: 80, piety: 95, stability: 68, authority: 78 },
      bonuses: { piety: 1.25, diplomacy: 1.18 }, rivals: ['holy_roman_empire']
    },
    sicily: {
      id: 'sicily', name: 'Reino da Sicilia', shortName: 'Sicilia', type: 'kingdom', religion: 'catholic',
      culture: 'normando-sicula', capital: 'sicily', color: '#8e4e9d', ruler: 'Guilherme II',
      resources: { gold: 105, manpower: 560, prestige: 62, piety: 54, stability: 62, authority: 60 },
      bonuses: { navy: 1.15 }, rivals: ['byzantium']
    },
    denmark: {
      id: 'denmark', name: 'Reino da Dinamarca', shortName: 'Dinamarca', type: 'kingdom', religion: 'catholic',
      culture: 'nordica', capital: 'denmark', color: '#b84a5a', ruler: 'Erik III',
      resources: { gold: 88, manpower: 560, prestige: 50, piety: 52, stability: 63, authority: 55 },
      bonuses: { navy: 1.1 }, rivals: []
    },
    poland: {
      id: 'poland', name: 'Reino da Polonia', shortName: 'Polonia', type: 'kingdom', religion: 'catholic',
      culture: 'eslava', capital: 'poland', color: '#d24a58', ruler: 'Boleslau IV',
      resources: { gold: 92, manpower: 680, prestige: 50, piety: 56, stability: 57, authority: 48 },
      bonuses: { manpower: 1.08 }, rivals: []
    },
    hungary: {
      id: 'hungary', name: 'Reino da Hungria', shortName: 'Hungria', type: 'kingdom', religion: 'catholic',
      culture: 'magiar', capital: 'hungary', color: '#52a36f', ruler: 'Bela III',
      resources: { gold: 102, manpower: 760, prestige: 55, piety: 60, stability: 60, authority: 52 },
      bonuses: { cavalry: 1.08 }, rivals: ['byzantium']
    },
    byzantium: {
      id: 'byzantium', name: 'Imperio Bizantino', shortName: 'Bizancio', type: 'empire', religion: 'orthodox',
      culture: 'grega', capital: 'constantinople', color: '#7f56c5', ruler: 'Andronico I Comneno',
      resources: { gold: 150, manpower: 900, prestige: 86, piety: 72, stability: 54, authority: 64 },
      bonuses: { walls: 1.25, diplomacy: 1.12 }, rivals: ['rum', 'sicily']
    },
    georgia: {
      id: 'georgia', name: 'Reino da Georgia', shortName: 'Georgia', type: 'kingdom', religion: 'orthodox',
      culture: 'georgiana', capital: 'georgia', color: '#bf6a42', ruler: 'Demetrio I',
      resources: { gold: 72, manpower: 430, prestige: 48, piety: 70, stability: 64, authority: 50 },
      bonuses: { mountain: 1.15 }, rivals: ['rum']
    },
    armenian_cilicia: {
      id: 'armenian_cilicia', name: 'Armenia Cilicia', shortName: 'Cilicia', type: 'principality', religion: 'oriental',
      culture: 'armenia', capital: 'cilicia', color: '#b45b40', ruler: 'Toros II',
      resources: { gold: 68, manpower: 390, prestige: 45, piety: 72, stability: 62, authority: 48 },
      bonuses: { mountain: 1.12 }, rivals: ['rum']
    },
    jerusalem_kingdom: {
      id: 'jerusalem_kingdom', name: 'Reino de Jerusalem', shortName: 'Jerusalem', type: 'kingdom', religion: 'catholic',
      culture: 'latina-levantina', capital: 'jerusalem', color: '#e0c857', ruler: 'Balduino IV',
      resources: { gold: 78, manpower: 390, prestige: 92, piety: 88, stability: 52, authority: 50 },
      bonuses: { holy: 1.2 }, rivals: ['damascus', 'egypt']
    },
    antioch_principality: {
      id: 'antioch_principality', name: 'Principado de Antioquia', shortName: 'Antioquia', type: 'principality', religion: 'catholic',
      culture: 'latina-levantina', capital: 'antioch', color: '#ba8748', ruler: 'Raimundo de Poitiers',
      resources: { gold: 66, manpower: 340, prestige: 54, piety: 66, stability: 50, authority: 44 },
      bonuses: { fortresses: 1.08 }, rivals: ['aleppo']
    },
    tripoli_county: {
      id: 'tripoli_county', name: 'Condado de Tripoli', shortName: 'Tripoli', type: 'county', religion: 'catholic',
      culture: 'latina-levantina', capital: 'tripoli', color: '#c96c4d', ruler: 'Raimundo II',
      resources: { gold: 58, manpower: 270, prestige: 42, piety: 62, stability: 54, authority: 42 },
      bonuses: { trade: 1.08 }, rivals: ['damascus']
    },
    edessa_county: {
      id: 'edessa_county', name: 'Condado de Edessa', shortName: 'Edessa', type: 'county', religion: 'catholic',
      culture: 'latina-levantina', capital: 'edessa', color: '#cf8f54', ruler: 'Joscelino II',
      resources: { gold: 54, manpower: 260, prestige: 45, piety: 60, stability: 46, authority: 38 },
      bonuses: { frontier: 1.08 }, rivals: ['mosul', 'aleppo']
    },
    rum: {
      id: 'rum', name: 'Sultanato de Rum', shortName: 'Rum', type: 'sultanate', religion: 'sunni',
      culture: 'turca', capital: 'anatolia', color: '#358f5b', ruler: 'Kilij Arslan II',
      resources: { gold: 112, manpower: 780, prestige: 60, piety: 66, stability: 58, authority: 55 },
      bonuses: { cavalry: 1.18 }, rivals: ['byzantium', 'armenian_cilicia']
    },
    egypt: {
      id: 'egypt', name: 'Sultanato Aiubida', shortName: 'Ayyubidas', type: 'sultanate', religion: 'sunni',
      culture: 'egipcia', capital: 'cairo', color: '#2b8d82', ruler: 'Saladino',
      resources: { gold: 150, manpower: 980, prestige: 82, piety: 82, stability: 58, authority: 68 },
      bonuses: { wealth: 1.2, cavalry: 1.1 }, rivals: ['jerusalem_kingdom', 'antioch_principality', 'tripoli_county']
    },
    damascus: {
      id: 'damascus', name: 'Emirado de Damasco', shortName: 'Damasco', type: 'emirate', religion: 'sunni',
      culture: 'arabe-siria', capital: 'damascus', color: '#4a9b64', ruler: 'Muin ad-Din Unur',
      resources: { gold: 82, manpower: 520, prestige: 48, piety: 68, stability: 58, authority: 45 },
      bonuses: { diplomacy: 1.08 }, rivals: ['jerusalem_kingdom']
    },
    aleppo: {
      id: 'aleppo', name: 'Alepo', shortName: 'Alepo', type: 'emirate', religion: 'sunni',
      culture: 'arabe-siria', capital: 'aleppo', color: '#5aa268', ruler: 'Nur ad-Din',
      resources: { gold: 84, manpower: 580, prestige: 52, piety: 72, stability: 60, authority: 50 },
      bonuses: { cavalry: 1.08 }, rivals: ['antioch_principality']
    },
    mosul: {
      id: 'mosul', name: 'Mosul', shortName: 'Mosul', type: 'emirate', religion: 'sunni',
      culture: 'arabe-mesopotamica', capital: 'mosul', color: '#6aa75a', ruler: 'Qutb ad-Din',
      resources: { gold: 86, manpower: 620, prestige: 52, piety: 68, stability: 58, authority: 48 },
      bonuses: { manpower: 1.08 }, rivals: ['edessa_county']
    },
    almoravids: {
      id: 'almoravids', name: 'Califado Almohada', shortName: 'Almohadas', type: 'caliphate', religion: 'sunni',
      culture: 'berbere-andalusi', capital: 'al_andalus', color: '#31795f', ruler: 'Abu Yaqub Yusuf',
      resources: { gold: 110, manpower: 720, prestige: 55, piety: 72, stability: 50, authority: 52 },
      bonuses: { cavalry: 1.1 }, rivals: ['leon_castile', 'aragon', 'portugal']
    }
  };

  const provinceList = [
    ['galicia', 'Galicia', 'leon_castile', 70, 330, 66, 48, ['portugal', 'leon'], 'hills', 'catholic', 'iberica'],
    ['portugal', 'Portugal', 'portugal', 50, 388, 66, 76, ['galicia', 'leon', 'toledo'], 'hills', 'catholic', 'portuguesa'],
    ['leon', 'Leao', 'leon_castile', 135, 330, 80, 56, ['galicia', 'portugal', 'castile', 'toledo'], 'plains', 'catholic', 'iberica'],
    ['castile', 'Castela', 'leon_castile', 212, 365, 82, 64, ['leon', 'toledo', 'aragon'], 'plains', 'catholic', 'iberica'],
    ['toledo', 'Toledo', 'leon_castile', 145, 430, 92, 70, ['portugal', 'leon', 'castile', 'al_andalus', 'valencia'], 'plains', 'catholic', 'iberica'],
    ['aragon', 'Aragao', 'aragon', 305, 352, 72, 58, ['castile', 'barcelona', 'valencia', 'toulouse'], 'hills', 'catholic', 'aragonesa'],
    ['barcelona', 'Barcelona', 'aragon', 378, 344, 62, 54, ['aragon', 'valencia', 'toulouse', 'provence'], 'coast', 'catholic', 'catalan'],
    ['valencia', 'Valencia', 'almoravids', 280, 432, 86, 62, ['toledo', 'aragon', 'barcelona', 'al_andalus'], 'coast', 'sunni', 'andalusi'],
    ['al_andalus', 'Al-Andalus', 'almoravids', 182, 520, 120, 76, ['toledo', 'valencia', 'maghreb'], 'plains', 'sunni', 'andalusi'],
    ['dublin', 'Dublin', 'england', 260, 160, 70, 62, ['london'], 'coast', 'catholic', 'gaelica'],
    ['edinburgh', 'Escocia', 'england', 325, 54, 76, 68, ['york'], 'hills', 'catholic', 'gaelica'],
    ['york', 'York', 'england', 352, 128, 78, 64, ['edinburgh', 'london'], 'plains', 'catholic', 'anglo-normanda'],
    ['london', 'Londres', 'england', 378, 205, 76, 60, ['york', 'dublin', 'normandy'], 'plains', 'catholic', 'anglo-normanda'],
    ['normandy', 'Normandia', 'england', 398, 270, 74, 54, ['london', 'paris', 'aquitaine'], 'coast', 'catholic', 'normanda'],
    ['paris', 'Paris', 'france', 478, 286, 80, 60, ['normandy', 'reims', 'aquitaine', 'toulouse'], 'plains', 'catholic', 'franca'],
    ['reims', 'Reims', 'france', 558, 268, 78, 58, ['paris', 'flanders', 'cologne', 'bavaria'], 'plains', 'catholic', 'franca'],
    ['flanders', 'Flandres', 'holy_roman_empire', 538, 210, 76, 50, ['reims', 'cologne'], 'coast', 'catholic', 'flamenga'],
    ['aquitaine', 'Aquitania', 'france', 398, 350, 82, 70, ['normandy', 'paris', 'toulouse', 'aragon'], 'plains', 'catholic', 'occitana'],
    ['toulouse', 'Toulouse', 'france', 486, 372, 82, 64, ['aquitaine', 'paris', 'provence', 'aragon'], 'hills', 'catholic', 'occitana'],
    ['provence', 'Provence', 'france', 572, 392, 76, 58, ['toulouse', 'barcelona', 'lombardy', 'tuscany'], 'coast', 'catholic', 'occitana'],
    ['cologne', 'Colonia', 'holy_roman_empire', 625, 252, 80, 58, ['flanders', 'reims', 'saxony', 'bavaria'], 'plains', 'catholic', 'germanica'],
    ['saxony', 'Saxonia', 'holy_roman_empire', 708, 232, 82, 62, ['cologne', 'denmark', 'bohemia', 'poland'], 'forest', 'catholic', 'germanica'],
    ['denmark', 'Dinamarca', 'denmark', 700, 158, 78, 54, ['saxony', 'norway', 'sweden'], 'coast', 'catholic', 'nordica'],
    ['norway', 'Noruega', 'denmark', 668, 76, 74, 70, ['denmark', 'sweden'], 'mountains', 'catholic', 'nordica'],
    ['sweden', 'Suecia', 'denmark', 780, 78, 82, 76, ['denmark', 'norway', 'poland'], 'forest', 'catholic', 'nordica'],
    ['poland', 'Polonia', 'poland', 812, 245, 90, 66, ['saxony', 'sweden', 'bohemia', 'hungary'], 'plains', 'catholic', 'eslava'],
    ['bohemia', 'Boemia', 'holy_roman_empire', 718, 300, 74, 58, ['saxony', 'bavaria', 'austria', 'poland'], 'hills', 'catholic', 'tcheca'],
    ['bavaria', 'Baviera', 'holy_roman_empire', 650, 330, 82, 60, ['cologne', 'reims', 'bohemia', 'austria', 'lombardy'], 'hills', 'catholic', 'germanica'],
    ['austria', 'Austria', 'holy_roman_empire', 744, 360, 78, 58, ['bavaria', 'bohemia', 'hungary', 'venice'], 'hills', 'catholic', 'germanica'],
    ['hungary', 'Hungria', 'hungary', 828, 372, 96, 66, ['poland', 'austria', 'croatia', 'serbia', 'bulgaria'], 'plains', 'catholic', 'magiar'],
    ['lombardy', 'Lombardia', 'holy_roman_empire', 610, 452, 70, 54, ['provence', 'bavaria', 'venice', 'tuscany'], 'plains', 'catholic', 'italica'],
    ['venice', 'Veneza', 'holy_roman_empire', 690, 450, 60, 52, ['lombardy', 'austria', 'croatia', 'tuscany'], 'coast', 'catholic', 'italica'],
    ['tuscany', 'Toscana', 'papal_states', 628, 510, 70, 56, ['provence', 'lombardy', 'venice', 'rome'], 'hills', 'catholic', 'italica'],
    ['rome', 'Roma', 'papal_states', 660, 574, 68, 58, ['tuscany', 'naples'], 'coast', 'catholic', 'italica'],
    ['naples', 'Napoles', 'sicily', 716, 624, 72, 58, ['rome', 'sicily'], 'coast', 'catholic', 'italica'],
    ['sicily', 'Sicilia', 'sicily', 748, 690, 70, 48, ['naples', 'ifriqiya', 'athens'], 'coast', 'catholic', 'sicula'],
    ['croatia', 'Croacia', 'hungary', 772, 438, 76, 56, ['venice', 'hungary', 'serbia'], 'hills', 'catholic', 'eslava'],
    ['serbia', 'Servia', 'byzantium', 860, 454, 72, 60, ['croatia', 'hungary', 'bulgaria', 'thessalonica'], 'mountains', 'orthodox', 'eslava'],
    ['bulgaria', 'Bulgaria', 'byzantium', 930, 444, 84, 60, ['hungary', 'serbia', 'thessalonica', 'constantinople'], 'plains', 'orthodox', 'bulgara'],
    ['thessalonica', 'Tessalonica', 'byzantium', 896, 526, 76, 58, ['serbia', 'bulgaria', 'athens', 'constantinople'], 'coast', 'orthodox', 'grega'],
    ['athens', 'Atenas', 'byzantium', 860, 606, 72, 56, ['thessalonica', 'sicily', 'constantinople'], 'coast', 'orthodox', 'grega'],
    ['constantinople', 'Constantinopla', 'byzantium', 1010, 500, 72, 58, ['bulgaria', 'thessalonica', 'athens', 'nicaea'], 'coast', 'orthodox', 'grega'],
    ['nicaea', 'Niceia', 'byzantium', 1084, 486, 72, 58, ['constantinople', 'anatolia', 'trebizond'], 'hills', 'orthodox', 'grega'],
    ['anatolia', 'Anatolia', 'rum', 1086, 562, 88, 68, ['nicaea', 'trebizond', 'cilicia', 'edessa'], 'hills', 'sunni', 'turca'],
    ['trebizond', 'Trebizonda', 'rum', 1080, 400, 82, 60, ['nicaea', 'anatolia', 'georgia'], 'mountains', 'orthodox', 'grega'],
    ['georgia', 'Georgia', 'georgia', 1138, 350, 72, 64, ['trebizond', 'mosul'], 'mountains', 'orthodox', 'georgiana'],
    ['cilicia', 'Cilicia', 'armenian_cilicia', 1054, 640, 72, 52, ['anatolia', 'antioch', 'edessa'], 'mountains', 'oriental', 'armenia'],
    ['edessa', 'Edessa', 'edessa_county', 1128, 584, 62, 52, ['anatolia', 'cilicia', 'antioch', 'aleppo', 'mosul'], 'hills', 'catholic', 'armenia'],
    ['antioch', 'Antioquia', 'antioch_principality', 1110, 650, 64, 52, ['cilicia', 'edessa', 'aleppo', 'tripoli'], 'coast', 'catholic', 'levantina'],
    ['tripoli', 'Tripoli', 'tripoli_county', 1078, 682, 58, 44, ['antioch', 'tyre', 'damascus'], 'coast', 'catholic', 'levantina'],
    ['tyre', 'Tiro', 'jerusalem_kingdom', 1068, 720, 42, 34, ['tripoli', 'acre', 'tiberias'], 'coast', 'catholic', 'levantina'],
    ['acre', 'Acre', 'jerusalem_kingdom', 1088, 744, 40, 34, ['tyre', 'tiberias', 'jaffa'], 'coast', 'catholic', 'levantina'],
    ['tiberias', 'Tiberiades', 'jerusalem_kingdom', 1122, 704, 44, 36, ['tyre', 'acre', 'jerusalem', 'damascus'], 'hills', 'catholic', 'levantina'],
    ['jaffa', 'Jafa', 'jerusalem_kingdom', 1096, 770, 42, 30, ['acre', 'ascalon', 'jerusalem'], 'coast', 'catholic', 'levantina'],
    ['ascalon', 'Ascalao', 'jerusalem_kingdom', 1132, 766, 44, 30, ['jaffa', 'jerusalem', 'cairo'], 'coast', 'catholic', 'levantina'],
    ['jerusalem', 'Jerusalem', 'jerusalem_kingdom', 1148, 738, 46, 42, ['tiberias', 'jaffa', 'ascalon', 'kerak', 'damascus'], 'hills', 'catholic', 'levantina'],
    ['kerak', 'Kerak', 'jerusalem_kingdom', 1188, 752, 48, 34, ['jerusalem', 'damascus', 'cairo'], 'hills', 'catholic', 'levantina'],
    ['aleppo', 'Alepo', 'aleppo', 1168, 624, 62, 54, ['edessa', 'antioch', 'damascus', 'mosul'], 'plains', 'sunni', 'arabe-siria'],
    ['damascus', 'Damasco', 'damascus', 1160, 704, 64, 56, ['tripoli', 'tiberias', 'jerusalem', 'kerak', 'aleppo', 'mosul'], 'plains', 'sunni', 'arabe-siria'],
    ['mosul', 'Mosul', 'mosul', 1190, 548, 66, 58, ['georgia', 'edessa', 'aleppo', 'damascus'], 'plains', 'sunni', 'arabe-mesopotamica'],
    ['alexandria', 'Alexandria', 'egypt', 904, 720, 82, 52, ['cairo', 'cyrenaica', 'jerusalem'], 'coast', 'sunni', 'egipcia'],
    ['cairo', 'Cairo', 'egypt', 1000, 724, 78, 56, ['alexandria', 'ascalon', 'kerak'], 'river', 'sunni', 'egipcia'],
    ['cyrenaica', 'Cirenaica', 'egypt', 800, 724, 92, 54, ['alexandria', 'ifriqiya'], 'desert', 'sunni', 'berbere'],
    ['ifriqiya', 'Ifriqiya', 'almoravids', 690, 716, 96, 56, ['cyrenaica', 'maghreb', 'sicily'], 'coast', 'sunni', 'berbere'],
    ['maghreb', 'Magrebe', 'almoravids', 560, 700, 118, 62, ['ifriqiya', 'al_andalus'], 'coast', 'sunni', 'berbere']
  ];

  const holySites = ['rome', 'constantinople', 'antioch', 'jerusalem', 'alexandria'];
  const provinces = {};
  provinceList.forEach((entry, index) => {
    const [id, name, owner, x, y, w, h, neighbors, terrain, religion, culture] = entry;
    const nation = nations[owner];
    provinces[id] = {
      id,
      name,
      owner,
      occupier: null,
      capital: nation?.capital === id,
      neighbors,
      terrain,
      fortress: holySites.includes(id) ? 4 : (terrain === 'mountains' ? 3 : terrain === 'coast' ? 2 : 1),
      wealth: 5 + (index % 5) + (holySites.includes(id) ? 3 : 0),
      population: 4 + (index % 4) + (terrain === 'desert' ? -1 : 0),
      religion,
      minorityReligion: religion === 'catholic' ? 'orthodox' : religion === 'orthodox' ? 'catholic' : 'oriental',
      heresy: null,
      heresyRisk: 5 + (index % 12),
      loyalty: 58 + (index % 30),
      culture,
      supply: 4 + (index % 5),
      development: 3 + (index % 6),
      buildings: holySites.includes(id) ? ['walls', 'church', 'market'] : (terrain === 'coast' ? ['market'] : []),
      localTroops: { infantry: 90 + (index % 5) * 18, archers: 30 + (index % 4) * 10, cavalry: 15 + (index % 3) * 8 },
      map: { x, y, w, h }
    };
  });

  Object.values(nations).forEach(nation => {
    nation.provinces = Object.values(provinces).filter(province => province.owner === nation.id).map(province => province.id);
    nation.diplomacy = { allies: [], enemies: nation.rivals || [], truces: {}, vassals: [] };
    nation.playerId = null;
  });

  return {
    gameId: 'santa-conquista',
    title: 'Santa Conquista',
    subtitle: 'Reinos, fe e guerra na era das Cruzadas',
    startYear: 1183,
    startMonth: 5,
    viewBox: '0 0 1600 950',
    religions,
    buildings,
    holySites,
    nations,
    provinces,
    modes: ['political', 'province', 'religion', 'war', 'stability', 'heresy', 'diplomacy']
  };
});
