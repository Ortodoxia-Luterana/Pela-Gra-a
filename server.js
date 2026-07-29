const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { Server: SocketIOServer } = require('socket.io');
const { createCoresDaRosaService } = require('./cores-da-rosa-server');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'cultivando.sqlite');
const QUIZ_QUESTIONS_PATH = path.join(ROOT, 'data', 'quiz-questions.json');
const CROWNS_REGION_CATALOG_PATH = path.join(PUBLIC_DIR, 'crowns-and-councils', 'data', 'regions.json');
const CARD_CATALOG_PATH = path.join(PUBLIC_DIR, 'cards', 'catalog.json');
const CARD_CATALOG = JSON.parse(fs.readFileSync(CARD_CATALOG_PATH, 'utf8'));
const CARD_PACKS = {
  comum: {
    name: 'Pacote Comum',
    cost: 100,
    size: 3,
    summary: '3 figurinhas',
    description: 'Bom para completar o começo do álbum.',
    odds: '62% Comum · 25% Incomum · 11% Épica · 2% Lendária',
    weights: { 'Comum': 62, 'Incomum': 25, 'Épica': 11, 'Lendária': 2 }
  },
  incomum: {
    name: 'Pacote Incomum',
    cost: 250,
    size: 3,
    summary: '3 figurinhas',
    description: 'Garante uma Incomum ou melhor.',
    odds: '30% Comum · 42% Incomum · 22% Épica · 6% Lendária',
    guarantee: ['Incomum', 'Épica', 'Lendária'],
    weights: { 'Comum': 30, 'Incomum': 42, 'Épica': 22, 'Lendária': 6 }
  },
  lendario: {
    name: 'Pacote Lendário',
    cost: 600,
    size: 3,
    summary: '3 figurinhas',
    description: 'Garante uma Épica ou Lendária.',
    odds: '10% Comum · 25% Incomum · 45% Épica · 20% Lendária',
    guarantee: ['Épica', 'Lendária'],
    weights: { 'Comum': 10, 'Incomum': 25, 'Épica': 45, 'Lendária': 20 }
  }
};
const PORT = Number(process.env.PORT || 3000);
const COOKIE_NAME = 'cultivando_session';
const LAUNCH_COOKIE_NAME = 'cultivando_game_launch';
const LAUNCH_SECRET = process.env.LAUNCH_SECRET || crypto.createHash('sha256').update(`pela-graca:${DB_PATH}`).digest('hex');
const LAUNCH_MAX_AGE_SECONDS = 5 * 60;
const CROWNS_LAUNCH_MAX_AGE_SECONDS = 65 * 24 * 60 * 60;
const CROWNS_LAUNCH_COOKIE_NAME = 'cultivando_cc_launch';
const CROWNS_ACTION_MS = Math.max(250, Number(process.env.CROWNS_ACTION_MS || 20_000));
const CROWNS_LOCAL_PREVIEW = process.env.CROWNS_LOCAL_PREVIEW === '1';
const CROWNS_LOCAL_PREVIEW_USER_ID = 'crowns-local-preview';
const CROWNS_LOCAL_PREVIEW_USER_NAME = 'Conselheiro local';
const CORES_DA_ROSA_LOCAL_PREVIEW = process.env.CORES_DA_ROSA_LOCAL_PREVIEW === '1';
const CORES_DA_ROSA_LOCAL_PREVIEW_USER_PREFIX = 'cores-da-rosa-local-';
const CROWNS_ARTICLE_TITLE_MAX = 90;
const CROWNS_ARTICLE_BODY_MAX = 1600;
const CROWNS_ARTICLE_COOLDOWN_MS = 2 * 60 * 1000;
const CROWNS_SERVER_IDS = ['cc-world-1', 'cc-world-2', 'cc-world-3'];
const CROWNS_DEFAULT_SERVER_ID = CROWNS_SERVER_IDS[0];
const CROWNS_SEASON_DAYS = 60;
const CROWNS_TIME_ZONE = 'America/Sao_Paulo';
const CROWNS_GAME_DAY_MS = Math.max(250, Number(process.env.CROWNS_GAME_DAY_MS || 24 * 60 * 60 * 1000));
const CROWNS_RESET_DELAY_MS = Math.max(10_000, Number(process.env.CROWNS_RESET_DELAY_MS || 24 * 60 * 60 * 1000));
const CROWNS_REVOLT_CHECK_MS = Math.max(250, Number(process.env.CROWNS_REVOLT_CHECK_MS || 30 * 1000));
const CROWNS_FORCE_REVOLTS = process.env.CROWNS_FORCE_REVOLTS === '1';
const CROWNS_SAVE_EPOCH = '2026-07-28-provincial-realms-v1';
const CROWNS_COUNCIL_TEMPLATES = [
  { key: 'niceia-i', day: 3, kind: 'historical', name: 'Primeiro Concílio de Niceia', theme: 'A confissão comum sobre a divindade de Cristo' },
  { key: 'constantinopla-i', day: 10, kind: 'historical', name: 'Primeiro Concílio de Constantinopla', theme: 'A fé no Espírito Santo e a unidade da Igreja' },
  { key: 'efeso', day: 18, kind: 'historical', name: 'Concílio de Éfeso', theme: 'A pessoa de Cristo e o título de Mãe de Deus' },
  { key: 'calcedonia', day: 28, kind: 'historical', name: 'Concílio de Calcedônia', theme: 'As duas naturezas de Cristo' },
  { key: 'niceia-ii', day: 42, kind: 'historical', name: 'Segundo Concílio de Niceia', theme: 'O uso e a veneração das imagens' },
  { key: 'sinodo-da-paz', day: 6, kind: 'regional', name: 'Sínodo da Paz dos Peregrinos', theme: 'Trégua para rotas de peregrinação entre todas as fés' },
  { key: 'concilio-das-fronteiras', day: 22, kind: 'regional', name: 'Concílio das Fronteiras', theme: 'Disciplina, missões e resposta às novas seitas' },
  { key: 'assembleia-dos-reinos', day: 34, kind: 'regional', name: 'Assembleia dos Reinos', theme: 'Recepção dos decretos e comunhão entre as coroas' }
];
const CROWNS_RELIGIONS = ['Cristianismo', 'Paganismo nórdico', 'Paganismo romano', 'Islamismo'];
const CROWNS_RELIGIOUS_MOVEMENTS = [
  { key: 'arianismo', day: 4, faith: 'Cristianismo', name: 'Arianismo', description: 'Pregadores questionam a plena divindade de Cristo e atraem cortes inquietas.' },
  { key: 'culto-odin', day: 7, faith: 'Paganismo nórdico', name: 'Culto exclusivo de Odin', description: 'Guerreiros e sacerdotes exigem que Odin seja honrado acima dos demais deuses do Norte.' },
  { key: 'donatismo', day: 10, faith: 'Cristianismo', name: 'Donatismo', description: 'Comunidades rigoristas contestam os sacramentos de clérigos considerados indignos.' },
  { key: 'sol-invicto', day: 13, faith: 'Paganismo romano', name: 'Culto do Sol Invicto', description: 'Templos solares disputam oferendas e autoridade com os cultos tradicionais de Roma.' },
  { key: 'carijismo', day: 16, faith: 'Islamismo', name: 'Carijismo', description: 'Pregadores radicais contestam a legitimidade dos governantes e exigem uma comunidade mais rigorosa.' },
  { key: 'nestorianismo', day: 20, faith: 'Cristianismo', name: 'Nestorianismo', description: 'Escolas orientais propõem uma separação mais forte entre as naturezas de Cristo.' },
  { key: 'mitraismo', day: 25, faith: 'Paganismo romano', name: 'Mistérios de Mitra', description: 'Irmandades militares secretas espalham um culto iniciático pelas guarnições.' },
  { key: 'iconoclasmo', day: 31, faith: 'Cristianismo', name: 'Iconoclasmo', description: 'Um movimento exige a retirada das imagens sagradas e divide o povo.' },
  { key: 'reforma-godar', day: 38, faith: 'Paganismo nórdico', name: 'Reforma dos goðar', description: 'Chefes de culto tentam unificar ritos locais sob uma autoridade religiosa comum.' },
  { key: 'mutazilismo', day: 46, faith: 'Islamismo', name: 'Mutazilismo', description: 'Teólogos defendem uma leitura racional da fé e desafiam juristas tradicionais.' }
];
const CROWNS_RESOURCES = {
  grain: { name: 'Trigo', icon: 'wheat', color: '#c69a45' },
  wood: { name: 'Madeira', icon: 'wood', color: '#6f8356' },
  stone: { name: 'Pedra', icon: 'stone', color: '#8b8981' },
  treasury: { name: 'Moedas', icon: 'coin', color: '#d1aa50' }
};
const CROWNS_BUILDINGS = {
  fazenda: { name: 'Campos de trigo', category: 'produção', treasury: 80, provisions: 0, wood: 70, stone: 25, hours: 4, maxLevel: 5, effect: '+45 trigo/dia por nível', description: 'Celeiros, moinhos e lavouras sustentam obras e exércitos.' },
  serraria: { name: 'Serraria', category: 'produção', treasury: 90, provisions: 45, wood: 0, stone: 35, hours: 5, maxLevel: 5, effect: '+38 madeira/dia por nível', description: 'Amplia o corte e o preparo de madeira para obras e armas.' },
  pedreira: { name: 'Pedreira', category: 'produção', treasury: 110, provisions: 55, wood: 45, stone: 0, hours: 6, maxLevel: 5, effect: '+34 pedra/dia por nível', description: 'Extrai pedra para muralhas, templos e fortalezas.' },
  mercado: { name: 'Mercado', category: 'economia', treasury: 130, provisions: 35, wood: 65, stone: 45, hours: 7, maxLevel: 5, effect: '+28 moedas/dia e +1.000 de capacidade', description: 'Abre ofertas entre jogadores e aumenta a arrecadação local.' },
  armazem: { name: 'Armazém', category: 'economia', treasury: 120, provisions: 40, wood: 95, stone: 60, hours: 7, maxLevel: 5, effect: '+1.500 de capacidade por nível', description: 'Protege estoques e evita desperdício de produção.' },
  quartel: { name: 'Quartel', category: 'militar', treasury: 180, provisions: 100, wood: 100, stone: 70, hours: 8, maxLevel: 5, effect: 'libera infantaria e acelera o treino', description: 'Treina lanceiros e arqueiros; níveis maiores reduzem as filas.' },
  estabulo: { name: 'Estábulo', category: 'militar', treasury: 260, provisions: 160, wood: 130, stone: 80, hours: 10, maxLevel: 3, requires: { quartel: 2 }, effect: 'libera cavaleiros', description: 'Cria montarias de guerra e alojamentos para a cavalaria.' },
  oficina_cerco: { name: 'Oficina de cerco', category: 'militar', treasury: 340, provisions: 130, wood: 220, stone: 170, hours: 14, maxLevel: 3, requires: { quartel: 3 }, effect: 'libera manganelas', description: 'Constrói máquinas lentas, decisivas contra fortificações.' },
  muralha: { name: 'Muralha', category: 'defesa', treasury: 170, provisions: 60, wood: 85, stone: 190, hours: 9, maxLevel: 5, effect: '+16% defesa local por nível', description: 'Protege a guarnição e aumenta o custo de uma invasão.' },
  torre_vigia: { name: 'Torre de vigia', category: 'defesa', treasury: 140, provisions: 55, wood: 100, stone: 110, hours: 7, maxLevel: 3, effect: '+8% defesa e reconhecimento', description: 'Antecipa movimentos inimigos e melhora a resposta da guarnição.' },
  porto: { name: 'Porto', category: 'marítima', treasury: 240, provisions: 80, wood: 180, stone: 120, hours: 10, maxLevel: 5, effect: 'libera pesca e navios por alcance', description: 'Docas, estaleiros e armazéns costeiros sustentam pesca, comércio e campanhas navais.', coastalOnly: true },
  templo: { name: 'Templo', category: 'fé', treasury: 180, provisions: 80, wood: 70, stone: 150, hours: 9, maxLevel: 5, effect: 'missões mais distantes; nível 3 funda uma religião', description: 'Forma missionários, protege a fé local e, em níveis altos, permite organizar uma nova religião.' },
  fortaleza: { name: 'Fortaleza', category: 'defesa', treasury: 440, provisions: 190, wood: 180, stone: 360, hours: 18, maxLevel: 3, requires: { muralha: 2 }, effect: '+35% defesa local por nível', description: 'Um núcleo militar preparado para resistir a campanhas longas.' }
};
const CROWNS_UNITS = {
  spearmen: { name: 'Lanceiros', role: 'linha defensiva', icon: 'spearman', quantity: 80, treasury: 70, provisions: 110, wood: 35, stone: 0, hours: 3, requires: { quartel: 1 }, attack: 8, defense: 15, speed: 7, upkeep: 2, description: 'Baratos, resistentes e fortes contra cargas de cavalaria.' },
  archers: { name: 'Arqueiros', role: 'tiro à distância', icon: 'archer', quantity: 50, treasury: 105, provisions: 90, wood: 80, stone: 0, hours: 4, requires: { quartel: 2 }, attack: 14, defense: 7, speed: 8, upkeep: 2, description: 'Causam dano antes do contato, mas dependem da linha de frente.' },
  cavalry: { name: 'Cavaleiros', role: 'choque e perseguição', icon: 'cavalry', quantity: 24, treasury: 190, provisions: 170, wood: 45, stone: 0, hours: 6, requires: { estabulo: 1 }, attack: 25, defense: 11, speed: 16, upkeep: 5, description: 'Rápidos e letais em campo aberto; caros para manter.' },
  siege: { name: 'Manganelas', role: 'cerco', icon: 'siege', quantity: 8, treasury: 260, provisions: 80, wood: 180, stone: 120, hours: 8, requires: { oficina_cerco: 1 }, attack: 32, defense: 4, speed: 3, upkeep: 6, description: 'Reduzem a proteção de muralhas e fortalezas inimigas.' }
};
const CROWNS_SHIPS = {
  fishing: { name: 'Barcos de pesca', role: 'abastecimento costeiro', quantity: 4, treasury: 90, provisions: 30, wood: 100, stone: 0, hours: 4, portLevel: 1, attack: 0, defense: 2, rangeQuadrants: 1, foodPerDay: 18, description: 'Pequenas embarcações que aumentam o trigo disponível na própria província.' },
  light: { name: 'Navios leves', role: 'patrulha e ataque próximo', quantity: 3, treasury: 170, provisions: 70, wood: 170, stone: 20, hours: 6, portLevel: 2, attack: 16, defense: 10, rangeQuadrants: 2, description: 'Rápidos para defender costas e atacar alvos em mares vizinhos.' },
  medium: { name: 'Navios médios', role: 'campanha regional', quantity: 2, treasury: 310, provisions: 120, wood: 280, stone: 55, hours: 9, portLevel: 3, attack: 31, defense: 24, rangeQuadrants: 5, description: 'Frotas capazes de cruzar vários mares, mas ainda limitadas por abastecimento.' },
  heavy: { name: 'Navios de longo alcance', role: 'projeção oceânica', quantity: 1, treasury: 560, provisions: 190, wood: 430, stone: 110, hours: 14, portLevel: 5, attack: 58, defense: 46, rangeQuadrants: 99, description: 'Grandes embarcações aptas a alcançar qualquer costa do mapa.' }
};
const CROWNS_DOGMAS = {
  caridade: { name: 'Caridade aos pobres', effect: '+10% de chance missionária e +2 lealdade após conversões' },
  peregrinacao: { name: 'Peregrinações', effect: '+1 quadrante de alcance para missionários' },
  disciplina: { name: 'Disciplina clerical', effect: '-2 de agitação por dia em províncias com templo' },
  iconodulia: { name: 'Veneração das imagens', effect: '+8% de resistência contra missões estrangeiras' },
  pobreza: { name: 'Pobreza apostólica', effect: 'missões custam 20% menos moedas' },
  coroa_sagrada: { name: 'Coroa sagrada', effect: '+1 de prestígio quando uma província adere à fé' }
};
const CROWNS_REALM_COLORS = [
  '#c9485b', '#3f72c4', '#d79b2e', '#6f55a6', '#3f9a63', '#8a56c2', '#2f9b9b', '#d4b13e', '#4b83a8', '#b96b3d',
  '#df5f98', '#5c8f32', '#e87842', '#4267a8', '#9b4e87', '#377d71', '#bd4b3f', '#7b6ec8', '#a97b2d', '#3a8ec2',
  '#c15a78', '#668b5a', '#985eb5', '#cf7732', '#4b9b89', '#8d5b42', '#5f72b7', '#b18b3f', '#a64f62', '#527f9e',
  '#d14f3f', '#2e8b57', '#536dfe', '#c27c0e', '#8e5ea2', '#1f8a9e', '#b24c73', '#6c8e3c', '#de6a2e', '#4376a1',
  '#a84545', '#3f8f7a', '#7b55a3', '#b78c27', '#4969a8', '#b85580', '#578a52', '#a4663f'
];
const CROWNS_AI_REALMS = [
  { key: 'francia', name: 'Reino da França', house: 'Casa Capetiana', ruler: 'Hugo de França', heir: 'Roberto', countries: ['FR'], terms: ['Île-de-France', 'Ile-de-France'], color: '#c9485b' },
  { key: 'inglaterra', name: 'Coroa da Inglaterra', house: 'Casa de Wessex', ruler: 'Eduardo de Wessex', heir: 'Edmundo', countries: ['UK'], terms: ['Londres', 'London'], color: '#3f72c4' },
  { key: 'castela', name: 'Reino de Castela', house: 'Casa de Jimena', ruler: 'Sancho de Castela', heir: 'Afonso', countries: ['ES'], terms: ['Madrid'], color: '#d79b2e' },
  { key: 'germania', name: 'Reino da Germânia', house: 'Casa Otoniana', ruler: 'Henrique da Saxônia', heir: 'Otão', countries: ['DE'], terms: ['Sachsen', 'Saxônia', 'Berlin'], color: '#6f55a6' },
  { key: 'italia', name: 'Reino da Itália', house: 'Casa de Saboia', ruler: 'Amadeu de Saboia', heir: 'Humberto', countries: ['IT'], terms: ['Lazio', 'Piemonte'], color: '#3f9a63' },
  { key: 'romanos', name: 'Império dos Romanos', house: 'Dinastia Macedônica', ruler: 'Basílio de Constantinopla', heir: 'Constantino', countries: ['EL', 'TR'], terms: ['Ática', 'Istanbul', 'Constantinopla'], color: '#8a56c2' },
  { key: 'egito', name: 'Reino do Egito', house: 'Casa do Cairo', ruler: 'Marcos do Egito', heir: 'Atanásio', countries: ['EG'], terms: ['Cairo'], color: '#2f9b9b' },
  { key: 'jerusalem', name: 'Reino de Jerusalém', house: 'Casa do Santo Sepulcro', ruler: 'Balduíno de Jerusalém', heir: 'Amalrico', countries: ['IL', 'PS'], terms: ['Jerusalém'], color: '#d4b13e' },
  { key: 'kiev', name: 'Principado de Kiev', house: 'Casa de Rurique', ruler: 'Vladimir de Kiev', heir: 'Jaroslau', countries: ['UA'], terms: ['Kyiv', 'Kiev'], color: '#4b83a8' },
  { key: 'magrebe', name: 'Reino do Magrebe', house: 'Casa de Cartago', ruler: 'Cipriano do Magrebe', heir: 'Agostinho', countries: ['MA'], terms: ['Rabat', 'Casablanca'], color: '#b96b3d' },
  { key: 'polonia', name: 'Reino da Polônia', house: 'Casa Piasta', ruler: 'Miecislau da Polônia', heir: 'Boleslau', countries: ['PL'], terms: ['Warszawski', 'Mazowiecki'], color: '#df5f98' },
  { key: 'rus', name: 'Principado de Vladimir', house: 'Casa de Rurique', ruler: 'André de Vladimir', heir: 'Miquel', countries: ['RU'], terms: ['Vladimir', 'Moscow', 'Moscou'], color: '#668b5a' },
  { key: 'persia', name: 'Reino da Pérsia', house: 'Casa de Ctesifonte', ruler: 'Dario da Pérsia', heir: 'Ciro', countries: ['IR'], terms: ['Tehran', 'Teerã', 'Fars'], color: '#985eb5' },
  { key: 'andalus', name: 'Reino de Al-Andalus', house: 'Casa de Córdova', ruler: 'Isidoro de Córdova', heir: 'Leandro', countries: ['ES'], terms: ['Andalucía', 'Andaluzia'], color: '#cf7732' },
  { key: 'escandinavia', name: 'Reino da Escandinávia', house: 'Casa de Uppsala', ruler: 'Erik do Norte', heir: 'Haroldo', countries: ['SE', 'NO', 'DK'], terms: ['Stockholm', 'Oslo', 'Hovedstaden'], color: '#4b9b89' }
];
const GAME_VERSION = 'v3.41.0';
const GAME_ID = 'pela-graca-1904';
const HEROI_GAME_ID = 'heroi-ortodoxo';
const CRONICAS_GAME_ID = 'cronicas-do-levante';
const REFORMA_GAME_ID = 'a-confissao';
const LUTHER_MATCH_GAME_ID = 'luther-metch';
const QUIZ_GAME_ID = 'quiz-ortodoxia';
const CONCORDIUM_GAME_ID = 'concordium-first-age';
const CONCORDIUM_EXPLORACAO_GAME_ID = 'concordium-exploracao';
const GUARDIOES_GAME_ID = 'caminho-dos-guardioes';
const BABEL_GAME_ID = 'a-queda-de-babel';
const CROWNS_COUNCILS_GAME_ID = 'crowns-and-councils';
const CORES_DA_ROSA_GAME_ID = 'cores-da-rosa';
const CORES_DA_ROSA_LAUNCH_COOKIE_NAME = 'cultivando_cdr_launch';
const CORES_DA_ROSA_LAUNCH_MAX_AGE_SECONDS = 12 * 60 * 60;
const CONCORDIUM_ACCESS_COOKIE = 'concordium_access';
const CONCORDIUM_ACCESS_PIN = process.env.CONCORDIUM_ACCESS_PIN || '5892';
const CONCORDIUM_ROM_PATH = process.env.CONCORDIUM_ROM_PATH || path.join(PUBLIC_DIR, 'concordium.gba');
const LUTHER_MATCH_MAX_LEVEL = 500;
const QUIZ_ROUND_SECONDS = 20;
const QUIZ_QUESTION_COUNT = 8;
const QUIZ_GENERAL_WAIT_SECONDS = 15;
const QUIZ_ONLINE_SECONDS = 45;
const QUIZ_MATCH_ABANDON_SECONDS = 45;
const QUIZ_REVEAL_SECONDS = 2;
const QUIZ_WIN_POINTS = 10;
const QUIZ_WIN_XP = 15;
const PLATFORM_ONLINE_SECONDS = 90;
const CHAT_MESSAGE_LIMIT = 50;
const CHAT_MAX_LENGTH = 180;
const RAW_PUBLIC_URL = 'https://cdn.jsdelivr.net/gh/Ortodoxia-Luterana/Pela-Gra-a@main/public';
const CRONICAS_SAVE_NAME = 'Crônicas do Levante';
const REFORMA_SAVE_NAME = 'A Confissão — Caminhos da Reforma';
const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Para', PB: 'Paraiba', PR: 'Parana', PE: 'Pernambuco',
  PI: 'Piaui', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondonia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'Sao Paulo', SE: 'Sergipe', TO: 'Tocantins'
};
const STATE_ORDER = Object.keys(STATE_NAMES);
const REGION_STATES = {
  norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  sudeste: ['ES', 'MG', 'RJ', 'SP'],
  sul: ['PR', 'RS', 'SC'],
  centroOeste: ['DF', 'GO', 'MT', 'MS']
};
const TITLE_TRACK = [
  { level: 1, title: 'Visitante', xp: 0, pointReward: 0, file: '/assets/title-badges/01-visitante.png' },
  { level: 2, title: 'Peregrino', xp: 300, pointReward: 75, file: '/assets/title-badges/02-peregrino.png' },
  { level: 3, title: 'Companheiro da Fé', xp: 800, pointReward: 100, file: '/assets/title-badges/03-companheiro-da-fe.png' },
  { level: 4, title: 'Servo da Palavra', xp: 1800, pointReward: 150, file: '/assets/title-badges/04-servo-da-palavra.png' },
  { level: 5, title: 'Guardião da Verdade', xp: 3200, pointReward: 200, file: '/assets/title-badges/05-guardiao-da-verdade.png' },
  { level: 6, title: 'Arauto da Graça', xp: 5400, pointReward: 250, file: '/assets/title-badges/06-arauto-da-graca.png' },
  { level: 7, title: 'Defensor da Confissão', xp: 8400, pointReward: 350, file: '/assets/title-badges/07-defensor-da-confissao.png' },
  { level: 8, title: 'Herdeiro da Reforma', xp: 12000, pointReward: 450, file: '/assets/title-badges/08-herdeiro-da-reforma.png' },
  { level: 9, title: 'Cavaleiro da Fé', xp: 16000, pointReward: 600, file: '/assets/title-badges/09-cavaleiro-da-fe.png' },
  { level: 10, title: 'Santificado', xp: 20000, pointReward: 800, file: '/assets/title-badges/10-santificado.png' }
];
const ACHIEVEMENTS = [
  { id: 'primeiros-passos', title: 'Primeiros Passos', description: 'Comecou sua primeira campanha em Pela Graca 1904.', xp: 20, points: 5, file: '/assets/achievements/primeiros-passos.png', condition: stats => Boolean(stats.started || stats.hasSave) },
  { id: 'primeira-missao', title: 'Primeira Missao', description: 'Criou seu primeiro ponto de missao IELB.', xp: 30, points: 5, file: '/assets/achievements/primeira-missao.png', condition: stats => stats.missionChurches >= 1 },
  { id: 'rumo-alem-do-sul', title: 'Rumo Alem do Sul', description: 'Criou a primeira igreja ou missao IELB fora do Rio Grande do Sul.', xp: 45, points: 10, file: '/assets/achievements/rumo-alem-do-sul.png', condition: stats => (stats.statesWithChurches || []).some(code => code !== 'RS') },
  { id: 'dino-luterano', title: 'Dino Luterano', description: 'Criou uma igreja ou missao IELB no Acre.', xp: 125, points: 25, file: '/assets/achievements/dino-luterano.png', condition: stats => stateChurchCount(stats, 'AC') > 0 },
  { id: 'primeiros-pastores', title: 'Primeiros Pastores', description: 'Formou os primeiros pastores no Seminario Concordia.', xp: 55, points: 10, file: '/assets/achievements/primeiros-pastores.png', condition: stats => stats.formedPastors >= 1 },
  { id: 'catequista-atento', title: 'Catequista Atento', description: 'Acertou 10 perguntas doutrinarias.', xp: 45, points: 10, file: '/assets/achievements/catequista-atento.png', condition: stats => stats.doctrineCorrect >= 10 },
  { id: 'doutor-da-doutrina', title: 'Doutor da Doutrina', description: 'Acertou 20 perguntas doutrinarias.', xp: 80, points: 15, file: '/assets/achievements/doutor-da-doutrina.png', condition: stats => stats.doctrineCorrect >= 20 },
  { id: 'dez-igrejas', title: 'Dez Igrejas', description: 'Alcancou 10 igrejas e missoes IELB na campanha.', xp: 75, points: 15, file: '/assets/achievements/dez-igrejas.png', condition: stats => stats.totalChurches >= 10 },
  { id: 'centesima-igreja', title: 'Centesima Igreja', description: 'Alcancou 100 igrejas IELB na campanha.', xp: 125, points: 20, file: '/assets/achievements/centesima-igreja.png', condition: stats => stats.totalChurches >= 100 },
  { id: 'cem-membros', title: 'Cem Membros', description: 'Chegou a 100 membros IELB.', xp: 55, points: 10, file: '/assets/achievements/cem-membros.png', condition: stats => stats.totalMembers >= 100 },
  { id: 'mil-membros', title: 'Mil Membros', description: 'Chegou a 1000 membros IELB.', xp: 160, points: 30, file: '/assets/achievements/mil-membros.png', condition: stats => stats.totalMembers >= 1000 },
  { id: 'cem-pastores', title: 'Cem Pastores', description: 'Formou 100 pastores ao longo da historia da campanha.', xp: 190, points: 35, file: '/assets/achievements/cem-pastores.png', condition: stats => stats.formedPastors >= 100 },
  { id: 'brasil-ielb', title: 'Brasil de Norte a Sul', description: 'Manteve pelo menos uma igreja ou missao IELB em cada estado.', xp: 225, points: 45, file: '/assets/achievements/brasil-ielb.png', condition: stats => (stats.statesWithChurches || []).length >= STATE_ORDER.length },
  { id: 'centenario-ielb', title: 'Centenario IELB', description: 'Conduziu a IELB por 100 anos de historia no jogo.', xp: 225, points: 45, file: '/assets/achievements/centenario-ielb.png', condition: stats => stats.year >= 2004 },
  { id: 'ate-aqui-nos-ajudou', title: 'Ate Aqui nos Ajudou', description: 'Chegou ao ano final da campanha, 2026.', xp: 300, points: 60, file: '/assets/achievements/ate-aqui-nos-ajudou.png', condition: stats => isFinalCampaign(stats) },
  { id: 'missionario-do-sertao', title: 'Missionario do Sertao', description: 'Chegou a 2026 com o Nordeste como a regiao com mais igrejas IELB.', xp: 210, points: 40, file: '/assets/achievements/missionario-do-sertao.png', condition: stats => isFinalCampaign(stats) && dominantRegion(stats, 'nordeste') },
  { id: 'tribo-luterana', title: 'Tribo Luterana', description: 'Chegou a 2026 com o Norte como a regiao com mais igrejas IELB.', xp: 210, points: 40, file: '/assets/achievements/tribo-luterana.png', condition: stats => isFinalCampaign(stats) && dominantRegion(stats, 'norte') },
  { id: 'culto-gauchesco', title: 'Culto Gauchesco', description: 'Chegou a 2026 mantendo igrejas IELB somente no Rio Grande do Sul.', xp: 175, points: 35, file: '/assets/achievements/culto-gauchesco.png', condition: stats => isFinalCampaign(stats) && stats.totalChurches > 0 && stateChurchCount(stats, 'RS') === stats.totalChurches },
  { id: 'xique-xique-e-de-jesus', title: 'Xique-Xique e de Jesus', description: 'Chegou a 2026 com Xique-Xique, na Bahia, como a cidade com mais igrejas IELB.', xp: 250, points: 50, file: '/assets/achievements/xique-xique-e-de-jesus.png', condition: stats => isFinalCampaign(stats) && dominantCity(stats, 'BA', 'Xique-Xique') },
  { id: 'igreja-urbana', title: 'Igreja Urbana', description: 'Chegou a 2026 com a maior parte das igrejas IELB no estado de Sao Paulo.', xp: 200, points: 40, file: '/assets/achievements/igreja-urbana.png', condition: stats => isFinalCampaign(stats) && stats.totalChurches > 0 && stateChurchCount(stats, 'SP') > stats.totalChurches / 2 }
];
const CRONICAS_ACHIEVEMENTS = [
  { id: 'cronicas-primeira-jornada', title: 'Primeira Jornada', description: 'Entrou pela primeira vez em Crônicas do Levante.', xp: 25, points: 5, file: '/assets/achievements/cronicas-primeira-jornada-v1.png' },
  { id: 'cronicas-final-linha-interrompida', title: 'A Linha Interrompida', description: 'Alcançou o final A Linha Interrompida em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-linha-interrompida-v1.png' },
  { id: 'cronicas-final-reino-ferido', title: 'O Reino Ferido', description: 'Alcançou o final O Reino Ferido em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-reino-ferido-v1.png' },
  { id: 'cronicas-final-aviso-escandalo', title: 'O Aviso que Virou Escândalo', description: 'Alcançou o final O Aviso que Virou Escândalo em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-aviso-escandalo-v1.png' },
  { id: 'cronicas-final-semente-distante', title: 'A Semente Distante', description: 'Alcançou o final A Semente Distante em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-semente-distante-v1.png' },
  { id: 'cronicas-final-caminho-cuxe', title: 'O Caminho de Cuxe', description: 'Alcançou o final O Caminho de Cuxe em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-caminho-cuxe-v1.png' },
  { id: 'cronicas-final-sombra-dos-rios', title: 'À Sombra dos Rios', description: 'Alcançou o final À Sombra dos Rios em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-sombra-dos-rios-v1.png' },
  { id: 'cronicas-final-cedros-futuro', title: 'Cedros para o Futuro', description: 'Alcançou o final Cedros para o Futuro em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-cedros-futuro-v1.png' }
];
const REFORMA_ACHIEVEMENTS = [
  { id: 'confissao-primeira-jornada', title: 'À Porta da História', description: 'Iniciou a primeira jornada em A Confissão.', xp: 25, points: 5, file: '/assets/a-confissao/assets/chapter-luther.webp' },
  { id: 'confissao-95-teses', title: 'Noventa e Cinco', description: 'Tornou públicas as 95 Teses em 1517.', xp: 70, points: 15, file: '/assets/a-confissao/assets/chapter-luther.webp' },
  { id: 'confissao-worms', title: 'Aqui Permaneço', description: 'Recusou a retratação na Dieta de Worms.', xp: 100, points: 20, file: '/assets/a-confissao/assets/chapter-worms.webp' },
  { id: 'confissao-wartburg', title: 'Cavaleiro Jorge', description: 'Chegou a Wartburg e iniciou a tradução do Novo Testamento.', xp: 85, points: 15, file: '/assets/a-confissao/assets/chapter-worms.webp' },
  { id: 'confissao-livro-concordia', title: 'Concórdia de 1580', description: 'Publicou o Livro de Concórdia na linha histórica.', xp: 220, points: 45, file: '/assets/a-confissao/assets/chapter-concord.webp' },
  { id: 'confissao-exilio', title: 'Livros na Estrada', description: 'Preservou a confissão no exílio após a Montanha Branca.', xp: 180, points: 35, file: '/assets/a-confissao/assets/chapter-exile.webp' },
  { id: 'confissao-vitoria', title: 'A Confissão Permanece', description: 'Concluiu a jornada histórica de 1483 a 1648.', xp: 350, points: 70, file: '/assets/a-confissao/assets/chapter-exile.webp' }
];
const LUTHER_MATCH_ACHIEVEMENTS = [
  { id: 'luther-match-primeiro-acesso', title: 'Primeiro Match', description: 'Entrou pela primeira vez em Luther Metch.', xp: 20, points: 5, file: `${RAW_PUBLIC_URL}/achievements/luther-match-primeiro-acesso-v2.png`, condition: stats => Boolean(stats.entered) },
  { id: 'luther-match-nivel-10', title: 'Dez Teses', description: 'Completou o nivel 10 em Luther Metch.', xp: 45, points: 10, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-10-v2.png`, condition: stats => stats.completedLevels >= 10 },
  { id: 'luther-match-nivel-50', title: 'Cinco Dezenas', description: 'Completou o nivel 50 em Luther Metch.', xp: 110, points: 20, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-50-v2.png`, condition: stats => stats.completedLevels >= 50 },
  { id: 'luther-match-nivel-100', title: 'Centuria da Reforma', description: 'Completou o nivel 100 em Luther Metch.', xp: 225, points: 45, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-100-v2.png`, condition: stats => stats.completedLevels >= 100 },
  { id: 'luther-match-nivel-200', title: 'Mestre das Tres Solas', description: 'Completou o nivel 200 em Luther Metch e dominou as Tres Solas.', xp: 400, points: 80, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-200-v2.png`, condition: stats => stats.completedLevels >= 200 },
  { id: 'luther-match-combo-3', title: 'Combo 3x', description: 'Fez uma cascata de combo 3x em Luther Metch.', xp: 60, points: 10, file: `${RAW_PUBLIC_URL}/achievements/luther-match-combo-3-v1.png`, condition: stats => stats.maxCombo >= 3 },
  { id: 'luther-match-combo-5', title: 'Combo 5x', description: 'Fez uma cascata de combo 5x em Luther Metch.', xp: 150, points: 30, file: `${RAW_PUBLIC_URL}/achievements/luther-match-combo-5-v1.png`, condition: stats => stats.maxCombo >= 5 },
  { id: 'luther-match-dois-luteros', title: 'Dois Luteros', description: 'Juntou duas pecas especiais de Lutero.', xp: 125, points: 25, file: `${RAW_PUBLIC_URL}/achievements/luther-match-dois-luteros-v1.png`, condition: stats => Boolean(stats.lutherPairUsed) },
  { id: 'luther-match-duas-tres-solas', title: 'Forca das Tres Solas', description: 'Juntou duas pecas especiais criadas por combos de 5.', xp: 190, points: 40, file: `${RAW_PUBLIC_URL}/achievements/luther-match-duas-tres-solas-v1.png`, condition: stats => Boolean(stats.solasPairUsed) }
];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pin_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, slot INTEGER NOT NULL CHECK (slot IN (1, 2)), name TEXT NOT NULL, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (user_id, slot), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS rankings (save_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, save_name TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, total_churches INTEGER NOT NULL, total_members REAL NOT NULL, doctrine_correct INTEGER NOT NULL, reached_final INTEGER NOT NULL, state_churches_json TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS user_achievements (user_id TEXT NOT NULL, game_id TEXT NOT NULL, medal_id TEXT NOT NULL, unlocked_at TEXT NOT NULL, source_save_name TEXT, PRIMARY KEY (user_id, game_id, medal_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS game_rankings (user_id TEXT NOT NULL, game_id TEXT NOT NULL, user_name TEXT NOT NULL, save_name TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, total_churches INTEGER NOT NULL, total_members REAL NOT NULL, doctrine_correct INTEGER NOT NULL, reached_final INTEGER NOT NULL, state_churches_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, game_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS luther_match_rankings (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, level INTEGER NOT NULL, best_level INTEGER NOT NULL, completed_levels INTEGER NOT NULL, score INTEGER NOT NULL, max_combo INTEGER NOT NULL DEFAULT 0, luther_pair_used INTEGER NOT NULL DEFAULT 0, solas_pair_used INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cronicas_saves (user_id TEXT PRIMARY KEY, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS reforma_saves (user_id TEXT PRIMARY KEY, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS heroi_ortodoxo_saves (user_id TEXT PRIMARY KEY, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS guardioes_saves (user_id TEXT PRIMARY KEY, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS babel_saves (user_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS concordium_profiles (user_id TEXT PRIMARY KEY, profile_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS concordium_gba_saves (user_id TEXT PRIMARY KEY, save_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS platform_presence (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, avatar_data TEXT, location TEXT NOT NULL, game_id TEXT NOT NULL, last_seen TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS hub_chat_messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS user_cards (user_id TEXT NOT NULL, card_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, unlocked_at TEXT NOT NULL, PRIMARY KEY (user_id, card_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS card_pack_spend (user_id TEXT PRIMARY KEY, points_spent INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS card_pack_openings (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, pack_id TEXT NOT NULL, cards_json TEXT NOT NULL, opened_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE INDEX IF NOT EXISTS card_pack_openings_user_idx ON card_pack_openings (user_id, opened_at DESC);
  CREATE TABLE IF NOT EXISTS quiz_presence (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, last_seen TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_queue (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, mode TEXT NOT NULL, joined_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_matches (id TEXT PRIMARY KEY, mode TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT NOT NULL, question_ids_json TEXT NOT NULL, round_seconds INTEGER NOT NULL, finalized INTEGER NOT NULL DEFAULT 0, round_index INTEGER NOT NULL DEFAULT 0, round_started_at TEXT, reveal_until TEXT);
  CREATE TABLE IF NOT EXISTS quiz_match_players (match_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, joined_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_match_presence (match_id TEXT NOT NULL, user_id TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_match_leaves (match_id TEXT NOT NULL, user_id TEXT NOT NULL, left_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_match_eliminations (match_id TEXT NOT NULL, user_id TEXT NOT NULL, question_index INTEGER NOT NULL, eliminated_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_answers (match_id TEXT NOT NULL, user_id TEXT NOT NULL, question_index INTEGER NOT NULL, answer_index INTEGER NOT NULL, correct INTEGER NOT NULL, answered_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id, question_index), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_invites (id TEXT PRIMARY KEY, from_user_id TEXT NOT NULL, from_user_name TEXT NOT NULL, to_user_id TEXT NOT NULL, to_user_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, match_id TEXT, FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_rankings (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, best_score INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, duel_wins INTEGER NOT NULL DEFAULT 0, general_wins INTEGER NOT NULL DEFAULT 0, invite_wins INTEGER NOT NULL DEFAULT 0, matches_played INTEGER NOT NULL DEFAULT 0, reward_points INTEGER NOT NULL DEFAULT 0, reward_xp INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cc_seasons (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, geographic_version TEXT NOT NULL, config_json TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS cc_regions (id TEXT PRIMARY KEY, name TEXT NOT NULL, country_code TEXT NOT NULL, iso3_code TEXT NOT NULL, centroid_x INTEGER NOT NULL, centroid_y INTEGER NOT NULL, neighbor_ids_json TEXT NOT NULL, geographic_version TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS cc_realms (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, house_name TEXT NOT NULL, color TEXT NOT NULL, capital_region_id TEXT NOT NULL, treasury INTEGER NOT NULL DEFAULT 1200, provisions INTEGER NOT NULL DEFAULT 800, wood INTEGER NOT NULL DEFAULT 650, stone INTEGER NOT NULL DEFAULT 520, prestige INTEGER NOT NULL DEFAULT 15, is_ai INTEGER NOT NULL DEFAULT 0, realm_kind TEXT NOT NULL DEFAULT 'player', origin_realm_id TEXT, ruler_name TEXT NOT NULL DEFAULT '', heir_name TEXT, legitimacy INTEGER NOT NULL DEFAULT 70, stability INTEGER NOT NULL DEFAULT 65, popular_support INTEGER NOT NULL DEFAULT 60, religion TEXT NOT NULL DEFAULT 'Cristianismo', religious_unity INTEGER NOT NULL DEFAULT 70, heresy_pressure INTEGER NOT NULL DEFAULT 8, last_economy_at TEXT, last_ai_action_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (season_id, user_id), FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (capital_region_id) REFERENCES cc_regions(id));
  CREATE TABLE IF NOT EXISTS cc_season_regions (season_id TEXT NOT NULL, region_id TEXT NOT NULL, owner_realm_id TEXT, status TEXT NOT NULL DEFAULT 'neutral', development INTEGER NOT NULL DEFAULT 1, resource_type TEXT NOT NULL DEFAULT 'grain', resource_yield INTEGER NOT NULL DEFAULT 60, population INTEGER NOT NULL DEFAULT 1200, food_stock INTEGER NOT NULL DEFAULT 650, tax_rate INTEGER NOT NULL DEFAULT 18, loyalty INTEGER NOT NULL DEFAULT 70, unrest INTEGER NOT NULL DEFAULT 8, claim_action_id TEXT, version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (season_id, region_id), FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (region_id) REFERENCES cc_regions(id), FOREIGN KEY (owner_realm_id) REFERENCES cc_realms(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS cc_actions (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, realm_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, region_id TEXT NOT NULL, status TEXT NOT NULL, completes_at TEXT NOT NULL, cost_json TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (region_id) REFERENCES cc_regions(id));
  CREATE TABLE IF NOT EXISTS cc_events (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, event_type TEXT NOT NULL, actor_realm_id TEXT, region_id TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cc_articles (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, user_id TEXT NOT NULL, realm_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL, published_at TEXT NOT NULL, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cc_region_buildings (season_id TEXT NOT NULL, region_id TEXT NOT NULL, building_type TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, PRIMARY KEY (season_id, region_id, building_type), FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (region_id) REFERENCES cc_regions(id));
  CREATE TABLE IF NOT EXISTS cc_armies (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, realm_id TEXT NOT NULL, region_id TEXT NOT NULL, infantry INTEGER NOT NULL DEFAULT 0, archers INTEGER NOT NULL DEFAULT 0, cavalry INTEGER NOT NULL DEFAULT 0, siege INTEGER NOT NULL DEFAULT 0, morale INTEGER NOT NULL DEFAULT 70, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE, FOREIGN KEY (region_id) REFERENCES cc_regions(id));
  CREATE TABLE IF NOT EXISTS cc_fleets (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, realm_id TEXT NOT NULL, region_id TEXT NOT NULL, fishing INTEGER NOT NULL DEFAULT 0, light INTEGER NOT NULL DEFAULT 0, medium INTEGER NOT NULL DEFAULT 0, heavy INTEGER NOT NULL DEFAULT 0, morale INTEGER NOT NULL DEFAULT 70, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (season_id, realm_id, region_id), FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE, FOREIGN KEY (region_id) REFERENCES cc_regions(id));
  CREATE TABLE IF NOT EXISTS cc_custom_faiths (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, founder_realm_id TEXT NOT NULL, founder_region_id TEXT NOT NULL, name TEXT NOT NULL, parent_faith TEXT NOT NULL, dogmas_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (season_id, founder_realm_id), UNIQUE (season_id, name COLLATE NOCASE), FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (founder_realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE, FOREIGN KEY (founder_region_id) REFERENCES cc_regions(id));
  CREATE TABLE IF NOT EXISTS cc_market_orders (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, realm_id TEXT NOT NULL, sell_resource TEXT NOT NULL, sell_amount INTEGER NOT NULL, buy_resource TEXT NOT NULL, buy_amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, accepted_by_realm_id TEXT, accepted_at TEXT, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cc_diplomatic_exchanges (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, sender_realm_id TEXT NOT NULL, recipient_realm_id TEXT NOT NULL, exchange_kind TEXT NOT NULL, resource_type TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, game_day INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, resolved_at TEXT, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (sender_realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE, FOREIGN KEY (recipient_realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cc_season_results (season_id TEXT NOT NULL, rank INTEGER NOT NULL, realm_name TEXT NOT NULL, house_name TEXT NOT NULL, score INTEGER NOT NULL, regions INTEGER NOT NULL, prestige INTEGER NOT NULL, recorded_at TEXT NOT NULL, PRIMARY KEY (season_id, rank));
  CREATE TABLE IF NOT EXISTS cc_treaties (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, proposer_realm_id TEXT NOT NULL, target_realm_id TEXT NOT NULL, treaty_type TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS cc_marriages (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, proposer_realm_id TEXT NOT NULL, target_realm_id TEXT NOT NULL, proposer_spouse TEXT NOT NULL, target_spouse TEXT NOT NULL, child_religion TEXT NOT NULL, inheritance_clause TEXT NOT NULL, dowry INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS cc_wars (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, attacker_realm_id TEXT NOT NULL, defender_realm_id TEXT NOT NULL, objective_region_id TEXT NOT NULL, status TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, result_json TEXT NOT NULL DEFAULT '{}', started_at TEXT NOT NULL, ended_at TEXT);
  CREATE TABLE IF NOT EXISTS cc_region_religions (season_id TEXT NOT NULL, region_id TEXT NOT NULL, majority_religion TEXT NOT NULL, majority_share INTEGER NOT NULL DEFAULT 72, heresy_name TEXT NOT NULL DEFAULT 'Dissidências locais', heresy_share INTEGER NOT NULL DEFAULT 8, updated_at TEXT NOT NULL, PRIMARY KEY (season_id, region_id));
  CREATE TABLE IF NOT EXISTS cc_councils (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, template_key TEXT NOT NULL, name TEXT NOT NULL, theme TEXT NOT NULL, council_kind TEXT NOT NULL, status TEXT NOT NULL, choices_json TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, result_key TEXT, UNIQUE (season_id, template_key));
  CREATE TABLE IF NOT EXISTS cc_council_votes (council_id TEXT NOT NULL, realm_id TEXT NOT NULL, vote_key TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (council_id, realm_id));
  CREATE TABLE IF NOT EXISTS cc_council_receptions (council_id TEXT NOT NULL, realm_id TEXT NOT NULL, reception_key TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (council_id, realm_id));
  CREATE TABLE IF NOT EXISTS cc_religious_movements (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, movement_key TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, starts_day INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (season_id, movement_key));
  CREATE TABLE IF NOT EXISTS cc_religious_responses (movement_id TEXT NOT NULL, realm_id TEXT NOT NULL, response_key TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (movement_id, realm_id));
  CREATE TABLE IF NOT EXISTS cc_religious_crises (id TEXT PRIMARY KEY, season_id TEXT NOT NULL, realm_id TEXT NOT NULL, region_id TEXT NOT NULL, missionary_realm_id TEXT, incoming_faith TEXT NOT NULL, previous_faith TEXT NOT NULL, severity INTEGER NOT NULL DEFAULT 20, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, resolved_at TEXT, resolution_key TEXT, FOREIGN KEY (season_id) REFERENCES cc_seasons(id) ON DELETE CASCADE, FOREIGN KEY (realm_id) REFERENCES cc_realms(id) ON DELETE CASCADE, FOREIGN KEY (region_id) REFERENCES cc_regions(id), FOREIGN KEY (missionary_realm_id) REFERENCES cc_realms(id) ON DELETE SET NULL);
  CREATE TABLE IF NOT EXISTS cc_save_epochs (epoch TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS cc_actions_due_idx ON cc_actions (status, completes_at);
  CREATE INDEX IF NOT EXISTS cc_season_regions_owner_idx ON cc_season_regions (season_id, owner_realm_id);
  CREATE INDEX IF NOT EXISTS cc_articles_published_idx ON cc_articles (season_id, published_at DESC);
  CREATE INDEX IF NOT EXISTS cc_armies_realm_idx ON cc_armies (season_id, realm_id);
  CREATE INDEX IF NOT EXISTS cc_fleets_realm_idx ON cc_fleets (season_id, realm_id);
  CREATE INDEX IF NOT EXISTS cc_wars_season_idx ON cc_wars (season_id, status);
  CREATE INDEX IF NOT EXISTS cc_treaties_season_idx ON cc_treaties (season_id, status);
  CREATE INDEX IF NOT EXISTS cc_market_orders_season_idx ON cc_market_orders (season_id, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS cc_diplomatic_exchanges_idx ON cc_diplomatic_exchanges (season_id, recipient_realm_id, status, game_day);
  CREATE INDEX IF NOT EXISTS cc_religious_crises_realm_idx ON cc_religious_crises (season_id, realm_id, status, created_at DESC);
`);
try { db.exec('ALTER TABLE users ADD COLUMN avatar_data TEXT'); } catch {}
try { db.exec('ALTER TABLE luther_match_rankings ADD COLUMN max_combo INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE luther_match_rankings ADD COLUMN luther_pair_used INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE luther_match_rankings ADD COLUMN solas_pair_used INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_matches ADD COLUMN round_index INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_matches ADD COLUMN round_started_at TEXT'); } catch {}
try { db.exec('ALTER TABLE quiz_matches ADD COLUMN reveal_until TEXT'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN duel_wins INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN general_wins INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN invite_wins INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN reward_points INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN reward_xp INTEGER NOT NULL DEFAULT 0'); } catch {}
try {
  db.exec(`
    UPDATE quiz_invites
    SET status = 'superseded'
    WHERE status = 'pending'
      AND EXISTS (
        SELECT 1
        FROM quiz_invites AS newer
        WHERE newer.status = 'pending'
          AND (
            (newer.from_user_id = quiz_invites.from_user_id AND newer.to_user_id = quiz_invites.to_user_id)
            OR (newer.from_user_id = quiz_invites.to_user_id AND newer.to_user_id = quiz_invites.from_user_id)
          )
          AND (
            newer.created_at > quiz_invites.created_at
            OR (newer.created_at = quiz_invites.created_at AND newer.id > quiz_invites.id)
          )
      )
  `);
} catch {}
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS quiz_invites_pending_pair_idx
    ON quiz_invites (
      CASE WHEN from_user_id < to_user_id THEN from_user_id ELSE to_user_id END,
      CASE WHEN from_user_id < to_user_id THEN to_user_id ELSE from_user_id END
    )
    WHERE status = 'pending'
  `);
} catch {}
try { db.exec('ALTER TABLE cc_regions ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN is_ai INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec("ALTER TABLE cc_realms ADD COLUMN realm_kind TEXT NOT NULL DEFAULT 'player'"); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN origin_realm_id TEXT'); } catch {}
try { db.exec("ALTER TABLE cc_realms ADD COLUMN ruler_name TEXT NOT NULL DEFAULT ''"); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN heir_name TEXT'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN legitimacy INTEGER NOT NULL DEFAULT 70'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN stability INTEGER NOT NULL DEFAULT 65'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN popular_support INTEGER NOT NULL DEFAULT 60'); } catch {}
try { db.exec("ALTER TABLE cc_realms ADD COLUMN religion TEXT NOT NULL DEFAULT 'Cristianismo'"); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN religious_unity INTEGER NOT NULL DEFAULT 70'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN heresy_pressure INTEGER NOT NULL DEFAULT 8'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN last_economy_at TEXT'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN last_ai_action_at TEXT'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN wood INTEGER NOT NULL DEFAULT 650'); } catch {}
try { db.exec('ALTER TABLE cc_realms ADD COLUMN stone INTEGER NOT NULL DEFAULT 520'); } catch {}
try { db.exec("ALTER TABLE cc_season_regions ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'grain'"); } catch {}
try { db.exec('ALTER TABLE cc_season_regions ADD COLUMN resource_yield INTEGER NOT NULL DEFAULT 60'); } catch {}
try { db.exec('ALTER TABLE cc_season_regions ADD COLUMN population INTEGER NOT NULL DEFAULT 1200'); } catch {}
try { db.exec('ALTER TABLE cc_season_regions ADD COLUMN food_stock INTEGER NOT NULL DEFAULT 650'); } catch {}
try { db.exec('ALTER TABLE cc_season_regions ADD COLUMN tax_rate INTEGER NOT NULL DEFAULT 18'); } catch {}
try { db.exec('ALTER TABLE cc_season_regions ADD COLUMN loyalty INTEGER NOT NULL DEFAULT 70'); } catch {}
try { db.exec('ALTER TABLE cc_season_regions ADD COLUMN unrest INTEGER NOT NULL DEFAULT 8'); } catch {}
try { db.exec('ALTER TABLE cc_armies ADD COLUMN siege INTEGER NOT NULL DEFAULT 0'); } catch {}

function applyCrownsSaveEpoch() {
  const applied = db.prepare('SELECT epoch FROM cc_save_epochs WHERE epoch = ?').get(CROWNS_SAVE_EPOCH);
  if (applied) return false;
  const appliedAt = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      DELETE FROM cc_council_votes;
      DELETE FROM cc_council_receptions;
      DELETE FROM cc_religious_responses;
      DELETE FROM cc_religious_crises;
      DELETE FROM cc_actions;
      DELETE FROM cc_articles;
      DELETE FROM cc_events;
      DELETE FROM cc_region_buildings;
      DELETE FROM cc_armies;
      DELETE FROM cc_fleets;
      DELETE FROM cc_custom_faiths;
      DELETE FROM cc_market_orders;
      DELETE FROM cc_diplomatic_exchanges;
      DELETE FROM cc_season_results;
      DELETE FROM cc_treaties;
      DELETE FROM cc_marriages;
      DELETE FROM cc_wars;
      DELETE FROM cc_region_religions;
      DELETE FROM cc_councils;
      DELETE FROM cc_religious_movements;
      DELETE FROM cc_season_regions;
      DELETE FROM cc_realms;
      DELETE FROM cc_seasons;
    `);
    db.prepare('INSERT INTO cc_save_epochs (epoch, applied_at) VALUES (?, ?)').run(CROWNS_SAVE_EPOCH, appliedAt);
    db.exec('COMMIT');
    console.info(`[crowns] Campanhas antigas zeradas; novos saves persistem no marco ${CROWNS_SAVE_EPOCH}.`);
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

applyCrownsSaveEpoch();

function crownsGeneratedColor(seed, attempt = 0) {
  const digest = crypto.createHash('sha256').update(`${seed}:${attempt}`).digest();
  const channel = value => 55 + (value % 146);
  return `#${[channel(digest[0]), channel(digest[1]), channel(digest[2])].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function repairCrownsRealmColors() {
  const rows = db.prepare('SELECT id, season_id, color FROM cc_realms ORDER BY season_id, created_at, id').all();
  const usedBySeason = new Map();
  const updateColor = db.prepare('UPDATE cc_realms SET color = ? WHERE id = ?');
  db.exec('BEGIN IMMEDIATE');
  try {
    rows.forEach(realm => {
      const used = usedBySeason.get(realm.season_id) || new Set();
      usedBySeason.set(realm.season_id, used);
      const current = /^#[0-9a-f]{6}$/i.test(realm.color || '') ? String(realm.color).toLowerCase() : '';
      let replacement = current && !used.has(current) ? current : CROWNS_REALM_COLORS.find(color => !used.has(color));
      for (let attempt = 0; !replacement || used.has(replacement); attempt += 1) replacement = crownsGeneratedColor(`${realm.season_id}:${realm.id}`, attempt);
      if (realm.color !== replacement) updateColor.run(replacement, realm.id);
      used.add(replacement);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS cc_realms_season_color_unique_idx ON cc_realms (season_id, color COLLATE NOCASE)');
}

repairCrownsRealmColors();

const getUserByName = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const getAllUsers = db.prepare('SELECT id, name, avatar_data, created_at FROM users ORDER BY created_at ASC');
const getUserCards = db.prepare('SELECT card_id, quantity, unlocked_at FROM user_cards WHERE user_id = ?');
const upsertUserCard = db.prepare(`
  INSERT INTO user_cards (user_id, card_id, quantity, unlocked_at) VALUES (?, ?, 1, ?)
  ON CONFLICT(user_id, card_id) DO UPDATE SET quantity = quantity + 1
`);
const getCardPackSpend = db.prepare('SELECT points_spent FROM card_pack_spend WHERE user_id = ?');
const upsertCardPackSpend = db.prepare(`
  INSERT INTO card_pack_spend (user_id, points_spent, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET points_spent = points_spent + excluded.points_spent, updated_at = excluded.updated_at
`);
const insertCardPackOpening = db.prepare('INSERT INTO card_pack_openings (id, user_id, pack_id, cards_json, opened_at) VALUES (?, ?, ?, ?, ?)');
const getCardPackOpening = db.prepare('SELECT * FROM card_pack_openings WHERE id = ? AND user_id = ?');
const insertUser = db.prepare('INSERT INTO users (id, name, pin_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)');
const updateUserProfile = db.prepare('UPDATE users SET name = ?, avatar_data = ? WHERE id = ?');
const updateRankingUserName = db.prepare('UPDATE rankings SET user_name = ? WHERE user_id = ?');
const updateLutherMatchUserName = db.prepare('UPDATE luther_match_rankings SET user_name = ? WHERE user_id = ?');
const insertSession = db.prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)');
const getSession = db.prepare('SELECT * FROM sessions WHERE id = ?');
const deleteSession = db.prepare('DELETE FROM sessions WHERE id = ?');
const getSavesByUser = db.prepare('SELECT * FROM saves WHERE user_id = ? ORDER BY slot ASC');
const getSave = db.prepare('SELECT * FROM saves WHERE id = ? AND user_id = ?');
const getSaveSlot = db.prepare('SELECT * FROM saves WHERE user_id = ? AND slot = ?');
const insertSave = db.prepare('INSERT INTO saves (id, user_id, slot, name, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)');
const updateSaveState = db.prepare('UPDATE saves SET state_json = ?, updated_at = ? WHERE id = ? AND user_id = ?');
const deleteSave = db.prepare('DELETE FROM saves WHERE id = ? AND user_id = ?');
const deleteRanking = db.prepare('DELETE FROM rankings WHERE save_id = ?');
const getAllSavedStates = db.prepare('SELECT saves.*, users.name AS user_name FROM saves JOIN users ON users.id = saves.user_id WHERE saves.state_json IS NOT NULL');
const getRankingRows = db.prepare('SELECT * FROM rankings ORDER BY updated_at DESC');
const getGameRankingRows = db.prepare('SELECT * FROM game_rankings ORDER BY updated_at DESC');
const getBestRankingForUser = db.prepare('SELECT * FROM game_rankings WHERE user_id = ? AND game_id = ?');
const upsertBestRanking = db.prepare(`
  INSERT INTO game_rankings (user_id, game_id, user_name, save_name, year, month, total_churches, total_members, doctrine_correct, reached_final, state_churches_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id, game_id) DO UPDATE SET user_name = excluded.user_name, save_name = excluded.save_name, year = excluded.year, month = excluded.month, total_churches = excluded.total_churches, total_members = excluded.total_members, doctrine_correct = excluded.doctrine_correct, reached_final = excluded.reached_final, state_churches_json = excluded.state_churches_json, updated_at = excluded.updated_at
`);
const updateBestRankingUserName = db.prepare('UPDATE game_rankings SET user_name = ? WHERE user_id = ?');
const getUserAchievementRows = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND game_id = ?');
const getAllAchievementRows = db.prepare('SELECT user_achievements.*, users.name AS user_name FROM user_achievements JOIN users ON users.id = user_achievements.user_id WHERE game_id = ?');
const getLutherMatchRanking = db.prepare('SELECT * FROM luther_match_rankings WHERE user_id = ?');
const getLutherMatchRankings = db.prepare('SELECT * FROM luther_match_rankings ORDER BY best_level DESC, completed_levels DESC, score DESC, updated_at ASC');
const upsertLutherMatchRanking = db.prepare(`
  INSERT INTO luther_match_rankings (user_id, user_name, level, best_level, completed_levels, score, max_combo, luther_pair_used, solas_pair_used, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    user_name = excluded.user_name,
    level = excluded.level,
    best_level = max(luther_match_rankings.best_level, excluded.best_level),
    completed_levels = max(luther_match_rankings.completed_levels, excluded.completed_levels),
    score = max(luther_match_rankings.score, excluded.score),
    max_combo = max(luther_match_rankings.max_combo, excluded.max_combo),
    luther_pair_used = max(luther_match_rankings.luther_pair_used, excluded.luther_pair_used),
    solas_pair_used = max(luther_match_rankings.solas_pair_used, excluded.solas_pair_used),
    updated_at = excluded.updated_at
`);
const insertUserAchievement = db.prepare(`
  INSERT OR IGNORE INTO user_achievements (user_id, game_id, medal_id, unlocked_at, source_save_name)
  VALUES (?, ?, ?, ?, ?)
`);
const crownsRegionCatalog = JSON.parse(fs.readFileSync(CROWNS_REGION_CATALOG_PATH, 'utf8'));
const crownsRegionMetadataById = new Map(crownsRegionCatalog.regions.map(region => [region.id, region]));
function crownsRegionResource(region, serverId) {
  const digest = crypto.createHash('sha256').update(`${serverId}:${region.id}:${region.countryCode}`).digest();
  const types = ['grain', 'wood', 'stone', 'treasury'];
  const type = types[digest[0] % types.length];
  return { type, yield: 52 + (digest[1] % 29) };
}
const insertCcSeason = db.prepare('INSERT OR IGNORE INTO cc_seasons (id, name, status, starts_at, ends_at, geographic_version, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const updateCcSeasonGeography = db.prepare('UPDATE cc_seasons SET geographic_version = ?, config_json = ? WHERE id = ?');
const deactivateCcRegions = db.prepare('UPDATE cc_regions SET active = 0');
const upsertCcRegion = db.prepare(`
  INSERT INTO cc_regions (id, name, country_code, iso3_code, centroid_x, centroid_y, neighbor_ids_json, geographic_version, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, country_code = excluded.country_code, iso3_code = excluded.iso3_code, centroid_x = excluded.centroid_x, centroid_y = excluded.centroid_y, neighbor_ids_json = excluded.neighbor_ids_json, geographic_version = excluded.geographic_version, active = 1
`);
const insertCcSeasonRegion = db.prepare("INSERT OR IGNORE INTO cc_season_regions (season_id, region_id, status, development, resource_type, resource_yield, version) VALUES (?, ?, 'neutral', 1, ?, ?, 1)");
const updateCcSeasonRegionResource = db.prepare('UPDATE cc_season_regions SET resource_type = ?, resource_yield = ? WHERE season_id = ? AND region_id = ?');
const getCcSeason = db.prepare('SELECT * FROM cc_seasons WHERE id = ?');
const getCcRealmByUser = db.prepare('SELECT * FROM cc_realms WHERE season_id = ? AND user_id = ?');
const getCcRealmById = db.prepare('SELECT * FROM cc_realms WHERE id = ? AND season_id = ?');
const getCcRealmByColor = db.prepare('SELECT id FROM cc_realms WHERE season_id = ? AND color = ? COLLATE NOCASE LIMIT 1');
function crownsUnusedRealmColor(serverId, preferred, seed) {
  const normalized = /^#[0-9a-f]{6}$/i.test(preferred || '') ? String(preferred).toLowerCase() : '';
  const paletteChoice = [normalized, ...CROWNS_REALM_COLORS].find(color => color && !getCcRealmByColor.get(serverId, color));
  if (paletteChoice) return paletteChoice;
  for (let attempt = 0; attempt < 4096; attempt += 1) {
    const generated = crownsGeneratedColor(`${serverId}:${seed}`, attempt);
    if (!getCcRealmByColor.get(serverId, generated)) return generated;
  }
  throw new Error('N\u00e3o foi poss\u00edvel reservar uma cor exclusiva para esta coroa.');
}
const getCcRealms = db.prepare(`
  SELECT realm.*, region.name AS capital_name, users.name AS player_name, users.avatar_data AS player_avatar, COUNT(owned.region_id) AS region_count
  FROM cc_realms realm
  LEFT JOIN cc_regions region ON region.id = realm.capital_region_id
  LEFT JOIN users ON users.id = realm.user_id
  LEFT JOIN cc_season_regions owned ON owned.season_id = realm.season_id AND owned.owner_realm_id = realm.id
  WHERE realm.season_id = ?
  GROUP BY realm.id
  ORDER BY realm.is_ai DESC, realm.prestige DESC, realm.name
`);
const getCcSeasonRegion = db.prepare('SELECT sr.*, r.name, r.country_code, r.iso3_code, r.neighbor_ids_json FROM cc_season_regions sr JOIN cc_regions r ON r.id = sr.region_id AND r.active = 1 WHERE sr.season_id = ? AND sr.region_id = ?');
const getCcSeasonRegions = db.prepare(`
  SELECT r.id, r.name, r.country_code, r.iso3_code, r.centroid_x, r.centroid_y, r.neighbor_ids_json,
         sr.owner_realm_id, sr.status, sr.development, sr.resource_type, sr.resource_yield,
         sr.population, sr.food_stock, sr.tax_rate, sr.loyalty, sr.unrest, sr.claim_action_id, sr.version,
         owner.name AS owner_name, owner.color AS owner_color, owner.is_ai AS owner_is_ai, owner.realm_kind AS owner_realm_kind,
         reserver.name AS reserved_by_name, reservation.completes_at AS reserved_until
  FROM cc_regions r
  JOIN cc_season_regions sr ON sr.region_id = r.id AND sr.season_id = ?
  LEFT JOIN cc_realms owner ON owner.id = sr.owner_realm_id
  LEFT JOIN cc_actions reservation ON reservation.id = sr.claim_action_id AND reservation.status = 'pending'
  LEFT JOIN cc_realms reserver ON reserver.id = reservation.realm_id
  WHERE r.active = 1
  ORDER BY r.id
`);
const getCcOwnedRegions = db.prepare('SELECT sr.region_id FROM cc_season_regions sr JOIN cc_regions r ON r.id = sr.region_id AND r.active = 1 WHERE sr.season_id = ? AND sr.owner_realm_id = ? ORDER BY sr.region_id');
const getCcOwnedRegionEconomy = db.prepare('SELECT sr.region_id, sr.resource_type, sr.resource_yield, sr.development, sr.population, sr.food_stock, sr.tax_rate, sr.loyalty, sr.unrest, r.name, r.centroid_x, r.centroid_y FROM cc_season_regions sr JOIN cc_regions r ON r.id = sr.region_id AND r.active = 1 WHERE sr.season_id = ? AND sr.owner_realm_id = ? ORDER BY sr.region_id');
const updateCcProvinceEconomy = db.prepare('UPDATE cc_season_regions SET population = ?, food_stock = ?, loyalty = ?, unrest = ?, version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id = ?');
const updateCcProvinceTax = db.prepare('UPDATE cc_season_regions SET tax_rate = ?, unrest = min(100, unrest + ?), version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id = ?');
const getCcPendingActionsForRealm = db.prepare('SELECT * FROM cc_actions WHERE season_id = ? AND realm_id = ? AND status = \'pending\' ORDER BY completes_at');
const getCcPendingClaimsForRealm = db.prepare("SELECT * FROM cc_actions WHERE season_id = ? AND realm_id = ? AND type = 'territory.claim' AND status = 'pending' ORDER BY completes_at");
const getCcDueActions = db.prepare('SELECT * FROM cc_actions WHERE status = \'pending\' AND completes_at <= ? ORDER BY completes_at LIMIT 100');
const getCcAction = db.prepare('SELECT * FROM cc_actions WHERE id = ?');
const insertCcRealm = db.prepare("INSERT INTO cc_realms (id, season_id, user_id, name, house_name, color, capital_region_id, treasury, provisions, prestige, is_ai, realm_kind, ruler_name, heir_name, legitimacy, stability, popular_support, religion, religious_unity, heresy_pressure, last_economy_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1200, 800, 15, 0, 'player', ?, ?, 72, 68, 64, ?, 78, 0, ?, ?, ?)");
const insertCcAiRealm = db.prepare("INSERT INTO cc_realms (id, season_id, user_id, name, house_name, color, capital_region_id, treasury, provisions, prestige, is_ai, realm_kind, origin_realm_id, ruler_name, heir_name, legitimacy, stability, popular_support, religion, religious_unity, heresy_pressure, last_economy_at, last_ai_action_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
const assignCcCapital = db.prepare('UPDATE cc_season_regions SET owner_realm_id = ?, status = \'controlled\', version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id IS NULL AND status = \'neutral\'');
const transferCcRegion = db.prepare("UPDATE cc_season_regions SET owner_realm_id = ?, status = 'controlled', claim_action_id = NULL, version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id = ?");
const relocateCcRealmCapital = db.prepare('UPDATE cc_realms SET capital_region_id = ?, stability = max(10, stability - 6), updated_at = ? WHERE id = ? AND season_id = ? AND capital_region_id = ?');
const retreatCcArmiesFromRegion = db.prepare('UPDATE cc_armies SET region_id = ?, morale = max(25, morale - 12), updated_at = ? WHERE season_id = ? AND realm_id = ? AND region_id = ?');
const insertCcAction = db.prepare('INSERT INTO cc_actions (id, season_id, realm_id, user_id, type, region_id, status, completes_at, cost_json, created_at) VALUES (?, ?, ?, ?, ?, ?, \'pending\', ?, ?, ?)');
const markCcRegionClaiming = db.prepare('UPDATE cc_season_regions SET status = \'claiming\', claim_action_id = ?, version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id IS NULL AND status = \'neutral\'');
const spendCcClaimResources = db.prepare('UPDATE cc_realms SET treasury = treasury - ?, provisions = provisions - ?, updated_at = ? WHERE id = ? AND season_id = ? AND treasury >= ? AND provisions >= ?');
const completeCcRegionClaim = db.prepare('UPDATE cc_season_regions SET owner_realm_id = ?, status = \'controlled\', claim_action_id = NULL, development = max(1, development), version = version + 1 WHERE season_id = ? AND region_id = ? AND claim_action_id = ? AND owner_realm_id IS NULL');
const completeCcAction = db.prepare('UPDATE cc_actions SET status = \'completed\', completed_at = ? WHERE id = ? AND status = \'pending\'');
const cancelCcAction = db.prepare('UPDATE cc_actions SET status = \'cancelled\', completed_at = ? WHERE id = ? AND realm_id = ? AND status = \'pending\'');
const releaseCcClaim = db.prepare('UPDATE cc_season_regions SET status = \'neutral\', claim_action_id = NULL, version = version + 1 WHERE season_id = ? AND claim_action_id = ? AND owner_realm_id IS NULL');
const rewardCcClaim = db.prepare('UPDATE cc_realms SET prestige = prestige + 2, stability = max(10, stability - 2), updated_at = ? WHERE id = ? AND season_id = ?');
const refundCcClaim = db.prepare('UPDATE cc_realms SET treasury = treasury + ?, provisions = provisions + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const spendCcResources = db.prepare('UPDATE cc_realms SET treasury = treasury - ?, provisions = provisions - ?, updated_at = ? WHERE id = ? AND season_id = ? AND treasury >= ? AND provisions >= ?');
const spendCcStrategicResources = db.prepare('UPDATE cc_realms SET treasury = treasury - ?, provisions = provisions - ?, wood = wood - ?, stone = stone - ?, updated_at = ? WHERE id = ? AND season_id = ? AND treasury >= ? AND provisions >= ? AND wood >= ? AND stone >= ?');
const refundCcStrategicResources = db.prepare('UPDATE cc_realms SET treasury = treasury + ?, provisions = provisions + ?, wood = wood + ?, stone = stone + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const applyCcEconomy = db.prepare('UPDATE cc_realms SET treasury = max(0, treasury + ?), provisions = max(0, provisions + ?), wood = max(0, wood + ?), stone = max(0, stone + ?), last_economy_at = ?, updated_at = ? WHERE id = ? AND season_id = ?');
const updateCcAiDecisionAt = db.prepare('UPDATE cc_realms SET last_ai_action_at = ?, updated_at = ? WHERE id = ? AND season_id = ?');
const insertCcEvent = db.prepare('INSERT INTO cc_events (id, season_id, event_type, actor_realm_id, region_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
const getCcJournalEvents = db.prepare(`
  SELECT e.*, realm.name AS actor_realm_name, realm.house_name AS actor_house_name, region.name AS region_name
  FROM cc_events e
  LEFT JOIN cc_realms realm ON realm.id = e.actor_realm_id
  LEFT JOIN cc_regions region ON region.id = e.region_id
  WHERE e.season_id = ?
  ORDER BY e.created_at DESC
  LIMIT ?
`);
const getCcArticles = db.prepare(`
  SELECT article.*, users.name AS author_name, realm.name AS realm_name, realm.house_name AS house_name
  FROM cc_articles article
  JOIN users ON users.id = article.user_id
  JOIN cc_realms realm ON realm.id = article.realm_id
  WHERE article.season_id = ?
  ORDER BY article.published_at DESC
  LIMIT ?
`);
const getCcLatestArticleByUser = db.prepare('SELECT * FROM cc_articles WHERE season_id = ? AND user_id = ? ORDER BY published_at DESC LIMIT 1');
const insertCcArticle = db.prepare('INSERT INTO cc_articles (id, season_id, user_id, realm_id, title, body, created_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const getCcRevoltCandidates = db.prepare(`
  SELECT realm.*, COUNT(owned.region_id) AS region_count
  FROM cc_realms realm
  JOIN cc_season_regions owned ON owned.season_id = realm.season_id AND owned.owner_realm_id = realm.id
  WHERE realm.season_id = ? AND (realm.stability <= 40 OR owned.unrest >= 70 OR owned.loyalty <= 30) AND realm.realm_kind <> 'separatist'
    AND NOT EXISTS (SELECT 1 FROM cc_realms child WHERE child.season_id = realm.season_id AND child.origin_realm_id = realm.id)
  GROUP BY realm.id HAVING COUNT(owned.region_id) >= 3
`);
const getCcRevoltRegion = db.prepare("SELECT sr.* FROM cc_season_regions sr WHERE sr.season_id = ? AND sr.owner_realm_id = ? AND sr.region_id <> ? ORDER BY sr.unrest DESC, sr.loyalty ASC, sr.development DESC, sr.region_id LIMIT 1");
const stabilizeCcRealmAfterRevolt = db.prepare('UPDATE cc_realms SET stability = min(100, stability + 18), popular_support = max(10, popular_support - 8), updated_at = ? WHERE id = ? AND season_id = ?');
const getCcBuildingsForRealm = db.prepare(`SELECT building.* FROM cc_region_buildings building JOIN cc_season_regions sr ON sr.season_id = building.season_id AND sr.region_id = building.region_id WHERE building.season_id = ? AND sr.owner_realm_id = ? ORDER BY building.region_id, building.building_type`);
const getCcBuildingsForRegion = db.prepare('SELECT * FROM cc_region_buildings WHERE season_id = ? AND region_id = ? ORDER BY building_type');
const upsertCcBuilding = db.prepare('INSERT INTO cc_region_buildings (season_id, region_id, building_type, level, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(season_id, region_id, building_type) DO UPDATE SET level = min(5, cc_region_buildings.level + 1), updated_at = excluded.updated_at');
const insertCcArmy = db.prepare('INSERT OR IGNORE INTO cc_armies (id, season_id, realm_id, region_id, infantry, archers, cavalry, morale, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const getCcArmiesForRealm = db.prepare('SELECT army.*, region.name AS region_name FROM cc_armies army JOIN cc_regions region ON region.id = army.region_id WHERE army.season_id = ? AND army.realm_id = ? ORDER BY army.created_at');
const getCcArmyAtRegion = db.prepare('SELECT * FROM cc_armies WHERE season_id = ? AND realm_id = ? AND region_id = ? ORDER BY created_at LIMIT 1');
const reinforceCcArmy = db.prepare('UPDATE cc_armies SET infantry = infantry + ?, archers = archers + ?, cavalry = cavalry + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const reinforceCcSpearmen = db.prepare('UPDATE cc_armies SET infantry = infantry + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const reinforceCcArchers = db.prepare('UPDATE cc_armies SET archers = archers + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const reinforceCcCavalry = db.prepare('UPDATE cc_armies SET cavalry = cavalry + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const reinforceCcSiege = db.prepare('UPDATE cc_armies SET siege = siege + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const getCcArmyById = db.prepare('SELECT * FROM cc_armies WHERE id = ? AND season_id = ?');
const insertCcGarrison = db.prepare('INSERT INTO cc_armies (id, season_id, realm_id, region_id, infantry, archers, cavalry, siege, morale, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const reserveCcArmyTroops = db.prepare('UPDATE cc_armies SET infantry = infantry - ?, archers = archers - ?, cavalry = cavalry - ?, siege = siege - ?, updated_at = ? WHERE id = ? AND season_id = ? AND infantry >= ? AND archers >= ? AND cavalry >= ? AND siege >= ?');
const updateCcArmyAfterBattle = db.prepare('UPDATE cc_armies SET infantry = ?, archers = ?, cavalry = ?, siege = ?, morale = ?, region_id = ?, updated_at = ? WHERE id = ? AND season_id = ?');
const deleteCcArmy = db.prepare('DELETE FROM cc_armies WHERE id = ? AND season_id = ?');
const getCcFleetsForRealm = db.prepare('SELECT fleet.*, region.name AS region_name FROM cc_fleets fleet JOIN cc_regions region ON region.id = fleet.region_id WHERE fleet.season_id = ? AND fleet.realm_id = ? ORDER BY fleet.created_at');
const getCcFleetAtRegion = db.prepare('SELECT * FROM cc_fleets WHERE season_id = ? AND realm_id = ? AND region_id = ?');
const insertCcFleet = db.prepare('INSERT INTO cc_fleets (id, season_id, realm_id, region_id, fishing, light, medium, heavy, morale, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const reinforceCcFleet = db.prepare('UPDATE cc_fleets SET fishing = fishing + ?, light = light + ?, medium = medium + ?, heavy = heavy + ?, updated_at = ? WHERE id = ? AND season_id = ?');
const reserveCcFleet = db.prepare('UPDATE cc_fleets SET light = light - ?, medium = medium - ?, heavy = heavy - ?, updated_at = ? WHERE id = ? AND season_id = ? AND light >= ? AND medium >= ? AND heavy >= ?');
const updateCcFleetAfterBattle = db.prepare('UPDATE cc_fleets SET light = ?, medium = ?, heavy = ?, morale = ?, updated_at = ? WHERE id = ? AND season_id = ?');
const deleteCcFleet = db.prepare('DELETE FROM cc_fleets WHERE id = ? AND season_id = ?');
const insertCcTreaty = db.prepare('INSERT INTO cc_treaties (id, season_id, proposer_realm_id, target_realm_id, treaty_type, status, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const getCcTreaties = db.prepare('SELECT t.*, a.name AS proposer_name, b.name AS target_name FROM cc_treaties t JOIN cc_realms a ON a.id = t.proposer_realm_id JOIN cc_realms b ON b.id = t.target_realm_id WHERE t.season_id = ? ORDER BY t.created_at DESC');
const getCcActiveTreatyBetween = db.prepare("SELECT * FROM cc_treaties WHERE season_id = ? AND status = 'accepted' AND ((proposer_realm_id = ? AND target_realm_id = ?) OR (proposer_realm_id = ? AND target_realm_id = ?)) LIMIT 1");
const insertCcMarriage = db.prepare('INSERT INTO cc_marriages (id, season_id, proposer_realm_id, target_realm_id, proposer_spouse, target_spouse, child_religion, inheritance_clause, dowry, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const getCcMarriages = db.prepare('SELECT m.*, a.name AS proposer_name, b.name AS target_name FROM cc_marriages m JOIN cc_realms a ON a.id = m.proposer_realm_id JOIN cc_realms b ON b.id = m.target_realm_id WHERE m.season_id = ? ORDER BY m.created_at DESC');
const insertCcWar = db.prepare("INSERT INTO cc_wars (id, season_id, attacker_realm_id, defender_realm_id, objective_region_id, status, score, result_json, started_at) VALUES (?, ?, ?, ?, ?, 'active', 0, '{}', ?)");
const getCcWars = db.prepare('SELECT w.*, a.name AS attacker_name, d.name AS defender_name, r.name AS objective_name FROM cc_wars w JOIN cc_realms a ON a.id = w.attacker_realm_id JOIN cc_realms d ON d.id = w.defender_realm_id JOIN cc_regions r ON r.id = w.objective_region_id WHERE w.season_id = ? ORDER BY w.started_at DESC');
const getCcActiveWarForRealm = db.prepare("SELECT * FROM cc_wars WHERE season_id = ? AND status = 'active' AND (attacker_realm_id = ? OR defender_realm_id = ?) LIMIT 1");
const finishCcWar = db.prepare("UPDATE cc_wars SET status = 'ended', score = ?, result_json = ?, ended_at = ? WHERE id = ? AND season_id = ? AND status = 'active'");
const upsertCcRegionReligion = db.prepare('INSERT INTO cc_region_religions (season_id, region_id, majority_religion, majority_share, heresy_name, heresy_share, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(season_id, region_id) DO UPDATE SET majority_religion = excluded.majority_religion, majority_share = excluded.majority_share, heresy_name = excluded.heresy_name, heresy_share = excluded.heresy_share, updated_at = excluded.updated_at');
const getCcRegionReligions = db.prepare('SELECT religion.*, region.name AS region_name FROM cc_region_religions religion JOIN cc_regions region ON region.id = religion.region_id WHERE religion.season_id = ? ORDER BY region.name');
const getCcRegionReligion = db.prepare('SELECT * FROM cc_region_religions WHERE season_id = ? AND region_id = ?');
const insertCcCustomFaith = db.prepare('INSERT INTO cc_custom_faiths (id, season_id, founder_realm_id, founder_region_id, name, parent_faith, dogmas_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const getCcCustomFaithForRealm = db.prepare('SELECT * FROM cc_custom_faiths WHERE season_id = ? AND founder_realm_id = ?');
const getCcCustomFaiths = db.prepare('SELECT faith.*, realm.name AS founder_realm_name, region.name AS founder_region_name FROM cc_custom_faiths faith JOIN cc_realms realm ON realm.id = faith.founder_realm_id JOIN cc_regions region ON region.id = faith.founder_region_id WHERE faith.season_id = ? ORDER BY faith.created_at');
const getCcReligiousCrisesForRealm = db.prepare(`
  SELECT crisis.*, region.name AS region_name, missionary.name AS missionary_realm_name
  FROM cc_religious_crises crisis
  JOIN cc_regions region ON region.id = crisis.region_id
  LEFT JOIN cc_realms missionary ON missionary.id = crisis.missionary_realm_id
  WHERE crisis.season_id = ? AND crisis.realm_id = ? AND crisis.status = 'pending'
  ORDER BY crisis.severity DESC, crisis.created_at DESC
`);
const getCcReligiousCrisis = db.prepare('SELECT * FROM cc_religious_crises WHERE id = ? AND season_id = ?');
const getCcPendingReligiousCrisisForRegion = db.prepare("SELECT * FROM cc_religious_crises WHERE season_id = ? AND region_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1");
const insertCcReligiousCrisis = db.prepare("INSERT INTO cc_religious_crises (id, season_id, realm_id, region_id, missionary_realm_id, incoming_faith, previous_faith, severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)");
const updateCcReligiousCrisis = db.prepare("UPDATE cc_religious_crises SET missionary_realm_id = ?, incoming_faith = ?, previous_faith = ?, severity = max(severity, ?) WHERE id = ? AND season_id = ? AND status = 'pending'");
const resolveCcReligiousCrisis = db.prepare("UPDATE cc_religious_crises SET status = 'resolved', resolution_key = ?, resolved_at = ? WHERE id = ? AND season_id = ? AND realm_id = ? AND status = 'pending'");
const insertCcCouncil = db.prepare('INSERT OR IGNORE INTO cc_councils (id, season_id, template_key, name, theme, council_kind, status, choices_json, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const getCcCouncils = db.prepare('SELECT * FROM cc_councils WHERE season_id = ? ORDER BY starts_at DESC');
const getCcCouncil = db.prepare('SELECT * FROM cc_councils WHERE id = ? AND season_id = ?');
const getCcCouncilVote = db.prepare('SELECT * FROM cc_council_votes WHERE council_id = ? AND realm_id = ?');
const getCcCouncilVotes = db.prepare('SELECT vote_key, COUNT(*) AS total FROM cc_council_votes WHERE council_id = ? GROUP BY vote_key');
const insertCcCouncilVote = db.prepare('INSERT INTO cc_council_votes (council_id, realm_id, vote_key, reason, created_at) VALUES (?, ?, ?, ?, ?)');
const decideCcCouncil = db.prepare("UPDATE cc_councils SET status = 'decided', result_key = ? WHERE id = ? AND status = 'voting'");
const getCcCouncilReception = db.prepare('SELECT * FROM cc_council_receptions WHERE council_id = ? AND realm_id = ?');
const insertCcCouncilReception = db.prepare('INSERT INTO cc_council_receptions (council_id, realm_id, reception_key, created_at) VALUES (?, ?, ?, ?)');
const insertCcReligiousMovement = db.prepare('INSERT OR IGNORE INTO cc_religious_movements (id, season_id, movement_key, name, description, starts_day, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const getCcReligiousMovements = db.prepare('SELECT * FROM cc_religious_movements WHERE season_id = ? ORDER BY starts_day, created_at');
const getCcReligiousMovement = db.prepare('SELECT * FROM cc_religious_movements WHERE id = ? AND season_id = ?');
const getCcReligiousResponse = db.prepare('SELECT * FROM cc_religious_responses WHERE movement_id = ? AND realm_id = ?');
const insertCcReligiousResponse = db.prepare('INSERT INTO cc_religious_responses (movement_id, realm_id, response_key, created_at) VALUES (?, ?, ?, ?)');
const getCcMarketOrders = db.prepare(`
  SELECT orders.*, seller.name AS seller_name, buyer.name AS buyer_name
  FROM cc_market_orders orders
  JOIN cc_realms seller ON seller.id = orders.realm_id
  LEFT JOIN cc_realms buyer ON buyer.id = orders.accepted_by_realm_id
  WHERE orders.season_id = ?
  ORDER BY CASE orders.status WHEN 'open' THEN 0 ELSE 1 END, orders.created_at DESC
  LIMIT 80
`);
const getCcMarketOrder = db.prepare('SELECT * FROM cc_market_orders WHERE id = ? AND season_id = ?');
const insertCcMarketOrder = db.prepare("INSERT OR IGNORE INTO cc_market_orders (id, season_id, realm_id, sell_resource, sell_amount, buy_resource, buy_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)");
const acceptCcMarketOrder = db.prepare("UPDATE cc_market_orders SET status = 'accepted', accepted_by_realm_id = ?, accepted_at = ? WHERE id = ? AND season_id = ? AND status = 'open'");
const cancelCcMarketOrder = db.prepare("UPDATE cc_market_orders SET status = 'cancelled', accepted_at = ? WHERE id = ? AND season_id = ? AND realm_id = ? AND status = 'open'");
const insertCcDiplomaticExchange = db.prepare('INSERT OR IGNORE INTO cc_diplomatic_exchanges (id, season_id, sender_realm_id, recipient_realm_id, exchange_kind, resource_type, amount, status, game_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const getCcDiplomaticExchanges = db.prepare(`
  SELECT exchange.*, sender.name AS sender_name, sender.house_name AS sender_house, recipient.name AS recipient_name, recipient.house_name AS recipient_house
  FROM cc_diplomatic_exchanges exchange
  JOIN cc_realms sender ON sender.id = exchange.sender_realm_id
  JOIN cc_realms recipient ON recipient.id = exchange.recipient_realm_id
  WHERE exchange.season_id = ?
  ORDER BY exchange.created_at DESC
  LIMIT 120
`);
const getCcDiplomaticExchange = db.prepare('SELECT * FROM cc_diplomatic_exchanges WHERE id = ? AND season_id = ?');
const resolveCcDiplomaticRequest = db.prepare("UPDATE cc_diplomatic_exchanges SET status = ?, resolved_at = ? WHERE id = ? AND season_id = ? AND recipient_realm_id = ? AND exchange_kind = 'request' AND status = 'pending'");
const getCcSeasonResults = db.prepare('SELECT * FROM cc_season_results WHERE season_id = ? ORDER BY rank');
const insertCcSeasonResult = db.prepare('INSERT OR REPLACE INTO cc_season_results (season_id, rank, realm_name, house_name, score, regions, prestige, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const updateCcSeasonTiming = db.prepare('UPDATE cc_seasons SET status = ?, starts_at = ?, ends_at = ?, config_json = ? WHERE id = ?');
const updateCcSeasonStatus = db.prepare('UPDATE cc_seasons SET status = ?, config_json = ? WHERE id = ?');
const resetCcSeasonRegions = db.prepare("UPDATE cc_season_regions SET owner_realm_id = NULL, status = 'neutral', development = 1, population = 1200, food_stock = 650, tax_rate = 18, loyalty = 70, unrest = 8, claim_action_id = NULL, version = version + 1 WHERE season_id = ?");
const deleteCcActionsForSeason = db.prepare('DELETE FROM cc_actions WHERE season_id = ?');
const deleteCcArticlesForSeason = db.prepare('DELETE FROM cc_articles WHERE season_id = ?');
const deleteCcEventsForSeason = db.prepare('DELETE FROM cc_events WHERE season_id = ?');
const deleteCcBuildingsForSeason = db.prepare('DELETE FROM cc_region_buildings WHERE season_id = ?');
const deleteCcArmiesForSeason = db.prepare('DELETE FROM cc_armies WHERE season_id = ?');
const deleteCcFleetsForSeason = db.prepare('DELETE FROM cc_fleets WHERE season_id = ?');
const deleteCcCustomFaithsForSeason = db.prepare('DELETE FROM cc_custom_faiths WHERE season_id = ?');
const deleteCcMarketOrdersForSeason = db.prepare('DELETE FROM cc_market_orders WHERE season_id = ?');
const deleteCcDiplomaticExchangesForSeason = db.prepare('DELETE FROM cc_diplomatic_exchanges WHERE season_id = ?');
const deleteCcResultsForSeason = db.prepare('DELETE FROM cc_season_results WHERE season_id = ?');
const deleteCcTreatiesForSeason = db.prepare('DELETE FROM cc_treaties WHERE season_id = ?');
const deleteCcMarriagesForSeason = db.prepare('DELETE FROM cc_marriages WHERE season_id = ?');
const deleteCcWarsForSeason = db.prepare('DELETE FROM cc_wars WHERE season_id = ?');
const deleteCcRegionReligionsForSeason = db.prepare('DELETE FROM cc_region_religions WHERE season_id = ?');
const deleteCcCouncilVotesForSeason = db.prepare('DELETE FROM cc_council_votes WHERE council_id IN (SELECT id FROM cc_councils WHERE season_id = ?)');
const deleteCcCouncilReceptionsForSeason = db.prepare('DELETE FROM cc_council_receptions WHERE council_id IN (SELECT id FROM cc_councils WHERE season_id = ?)');
const deleteCcCouncilsForSeason = db.prepare('DELETE FROM cc_councils WHERE season_id = ?');
const deleteCcReligiousResponsesForSeason = db.prepare('DELETE FROM cc_religious_responses WHERE movement_id IN (SELECT id FROM cc_religious_movements WHERE season_id = ?)');
const deleteCcReligiousMovementsForSeason = db.prepare('DELETE FROM cc_religious_movements WHERE season_id = ?');
const deleteCcReligiousCrisesForSeason = db.prepare('DELETE FROM cc_religious_crises WHERE season_id = ?');
const deleteCcRealmsForSeason = db.prepare('DELETE FROM cc_realms WHERE season_id = ?');

function normalizedCrownsText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function crownsServerId(value) {
  return CROWNS_SERVER_IDS.includes(String(value || '')) ? String(value) : CROWNS_DEFAULT_SERVER_ID;
}

function seededCrownsRandom(seed) {
  let state = [...String(seed)].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffledCrowns(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function baseCrownsFaith(value) {
  const faith = String(value || '');
  return CROWNS_RELIGIONS.find(item => faith === item || faith.startsWith(`${item} — `)) || 'Cristianismo';
}

function crownsFaithForRegion(region) {
  const country = String(region?.countryCode || '');
  if (['SA', 'IR', 'IQ', 'SY', 'JO', 'EG', 'MA', 'DZ', 'TN', 'LY', 'PS'].includes(country)) return 'Islamismo';
  if (['SE', 'NO', 'DK', 'IS'].includes(country)) return 'Paganismo nórdico';
  if (['IT', 'EL'].includes(country)) return 'Paganismo romano';
  return 'Cristianismo';
}

function crownsAiReligion(blueprint, capital) {
  return blueprint?.religion || crownsFaithForRegion(capital);
}

function seedCcStartingAssets(serverId, realmId, capitalId, now, isAi = false) {
  const realm = getCcRealmById.get(realmId, serverId);
  upsertCcBuilding.run(serverId, capitalId, 'fazenda', now);
  upsertCcBuilding.run(serverId, capitalId, 'quartel', now);
  insertCcArmy.run(`army_${serverId}_${realmId}`, serverId, realmId, capitalId, isAi ? 700 : 500, isAi ? 120 : 80, isAi ? 40 : 20, isAi ? 76 : 72, now, now);
  upsertCcRegionReligion.run(serverId, capitalId, realm?.religion || 'Cristianismo', isAi ? 72 : 78, 'Sem heresia organizada', 0, now);
}

function seedCcAiRealms(serverId, now, seed) {
  const random = seededCrownsRandom(seed);
  const reservedRegions = new Set(getCcRealms.all(serverId).map(realm => realm.capital_region_id));
  const blueprints = shuffledCrowns(CROWNS_AI_REALMS, random).slice(0, 10);
  const colors = shuffledCrowns(CROWNS_REALM_COLORS, random);
  blueprints.forEach((blueprint, index) => {
    const realmId = `${serverId}_realm_ai_${blueprint.key}`;
    if (getCcRealmById.get(realmId, serverId)) return;
    const countryRegions = shuffledCrowns(crownsRegionCatalog.regions.filter(region => blueprint.countries.includes(region.countryCode)), random);
    const preferred = countryRegions.find(region => blueprint.terms.some(term => normalizedCrownsText(region.name).includes(normalizedCrownsText(term))));
    const candidates = [preferred, ...countryRegions].filter(Boolean);
    const capital = candidates.find(region => {
      if (reservedRegions.has(region.id)) return false;
      const state = getCcSeasonRegion.get(serverId, region.id);
      return state && !state.owner_realm_id && state.status === 'neutral';
    });
    if (!capital) throw new Error(`Não foi possível reservar uma capital para a IA ${blueprint.name} em ${serverId}.`);
    const userId = `crowns-ai-${blueprint.key}`;
    if (!getUserById.get(userId)) {
      const salt = crypto.randomBytes(16).toString('hex');
      insertUser.run(userId, `IA — ${blueprint.name}`, hashPin(crypto.randomInt(1000, 9999).toString(), salt), salt, now);
    }
    insertCcAiRealm.run(
      realmId, serverId, userId, blueprint.name, blueprint.house, crownsUnusedRealmColor(serverId, colors[index], realmId), capital.id,
      1500 + index * 45, 950 + index * 30, 20 + index, 'ai', null, blueprint.ruler, blueprint.heir,
      68 + (index % 4) * 4, 58 + (index % 5) * 5, 52 + (index % 6) * 5,
      crownsAiReligion(blueprint, capital), 65 + (index % 4) * 5, 7 + (index % 3) * 3, now, now, now, now
    );
    const assigned = assignCcCapital.run(realmId, serverId, capital.id);
    if (Number(assigned.changes) !== 1) throw new Error(`A capital da IA ${blueprint.name} deixou de estar disponível.`);
    seedCcStartingAssets(serverId, realmId, capital.id, now, true);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'realm.created', realmId, capital.id, JSON.stringify({ name: blueprint.name, houseName: blueprint.house, isAi: true }), now);
    reservedRegions.add(capital.id);
  });
}

function seedCcAiMarket(serverId, now) {
  const resources = ['grain', 'wood', 'stone', 'treasury'];
  getCcRealms.all(serverId).filter(realm => realm.is_ai).slice(0, 8).forEach((realm, index) => {
    const sellResource = resources[index % resources.length];
    const buyResource = resources[(index + 1 + (index % 2)) % resources.length];
    const sellAmount = 180 + (index % 3) * 40;
    const buyAmount = 150 + (index % 2) * 35;
    upsertCcBuilding.run(serverId, realm.capital_region_id, 'mercado', now);
    const inserted = insertCcMarketOrder.run(`market_${serverId}_${realm.id}_${sellResource}`, serverId, realm.id, sellResource, sellAmount, buyResource, buyAmount, now);
    if (inserted.changes) crownsAdjustResource(realm.id, serverId, sellResource, -sellAmount, true);
  });
}

function seedCrownsAndCouncils() {
  const now = new Date();
  db.exec('BEGIN IMMEDIATE');
  try {
    deactivateCcRegions.run();
    crownsRegionCatalog.regions.forEach(region => {
      upsertCcRegion.run(region.id, region.name, region.countryCode, region.iso3Code, region.centroid[0], region.centroid[1], JSON.stringify(region.neighborIds), crownsRegionCatalog.geographicVersion);
    });
    CROWNS_SERVER_IDS.forEach((serverId, index) => {
      const existing = getCcSeason.get(serverId);
      const existingConfig = safeJsonParse(existing?.config_json, {});
      const seed = existingConfig.seed || `${Date.now()}-${serverId}-${crypto.randomUUID()}`;
      const starts = existing?.starts_at || now.toISOString();
      const ends = existing?.ends_at || new Date(new Date(starts).getTime() + CROWNS_SEASON_DAYS * CROWNS_GAME_DAY_MS).toISOString();
      const config = { ...existingConfig, seed, serverNumber: index + 1, totalDays: CROWNS_SEASON_DAYS, gameDayMs: CROWNS_GAME_DAY_MS, resetDelayMs: CROWNS_RESET_DELAY_MS, theatre: crownsRegionCatalog.theatre, mode: CROWNS_LOCAL_PREVIEW ? 'teste-acelerado' : 'persistente' };
      insertCcSeason.run(serverId, `Servidor ${index + 1} — Era dos Concílios`, 'waiting', starts, ends, crownsRegionCatalog.geographicVersion, JSON.stringify(config), now.toISOString());
      updateCcSeasonGeography.run(crownsRegionCatalog.geographicVersion, JSON.stringify(config), serverId);
      crownsRegionCatalog.regions.forEach(region => {
        const resource = crownsRegionResource(region, serverId);
        insertCcSeasonRegion.run(serverId, region.id, resource.type, resource.yield);
        updateCcSeasonRegionResource.run(resource.type, resource.yield, serverId, region.id);
      });
      seedCcAiRealms(serverId, now.toISOString(), seed);
      seedCcAiMarket(serverId, now.toISOString());
      const humanCount = getCcRealms.all(serverId).filter(realm => !realm.is_ai).length;
      if (!humanCount && getCcSeason.get(serverId)?.status !== 'ended') {
        const waitingConfig = { ...config };
        delete waitingConfig.activatedAt;
        updateCcSeasonTiming.run('waiting', now.toISOString(), new Date(now.getTime() + CROWNS_SEASON_DAYS * CROWNS_GAME_DAY_MS).toISOString(), JSON.stringify(waitingConfig), serverId);
        for (const ai of getCcRealms.all(serverId).filter(realm => realm.is_ai)) {
          const capital = crownsRegionCatalog.regions.find(region => region.id === ai.capital_region_id);
          const faith = crownsAiReligion(CROWNS_AI_REALMS.find(blueprint => ai.id.endsWith(`_${blueprint.key}`)), capital);
          db.prepare('UPDATE cc_realms SET religion = ?, religious_unity = max(72, religious_unity), heresy_pressure = 0, updated_at = ? WHERE id = ? AND season_id = ?').run(faith, now.toISOString(), ai.id, serverId);
          upsertCcRegionReligion.run(serverId, ai.capital_region_id, faith, 76, 'Sem heresia organizada', 0, now.toISOString());
        }
      }
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
seedCrownsAndCouncils();
const deleteSessionsForUser = db.prepare('DELETE FROM sessions WHERE user_id = ?');
const deleteSavesForUser = db.prepare('DELETE FROM saves WHERE user_id = ?');
const deleteRankingsForUser = db.prepare('DELETE FROM rankings WHERE user_id = ?');
const deleteGameRankingsForUser = db.prepare('DELETE FROM game_rankings WHERE user_id = ?');
const deleteAchievementsForUser = db.prepare('DELETE FROM user_achievements WHERE user_id = ?');
const deleteLutherRankingForUser = db.prepare('DELETE FROM luther_match_rankings WHERE user_id = ?');
const deleteCronicasForUser = db.prepare('DELETE FROM cronicas_saves WHERE user_id = ?');
const deleteReformaForUser = db.prepare('DELETE FROM reforma_saves WHERE user_id = ?');
const deleteHeroiForUser = db.prepare('DELETE FROM heroi_ortodoxo_saves WHERE user_id = ?');
const deleteGuardioesForUser = db.prepare('DELETE FROM guardioes_saves WHERE user_id = ?');
const deleteBabelForUser = db.prepare('DELETE FROM babel_saves WHERE user_id = ?');
const deleteConcordiumForUser = db.prepare('DELETE FROM concordium_profiles WHERE user_id = ?');
const deleteConcordiumGbaSaveForUser = db.prepare('DELETE FROM concordium_gba_saves WHERE user_id = ?');
const deletePlatformPresenceForUser = db.prepare('DELETE FROM platform_presence WHERE user_id = ?');
const deleteHubChatForUser = db.prepare('DELETE FROM hub_chat_messages WHERE user_id = ?');
const deleteUserById = db.prepare('DELETE FROM users WHERE id = ?');
const deleteQuizPresenceForUser = db.prepare('DELETE FROM quiz_presence WHERE user_id = ?');
const deleteQuizQueueForUser = db.prepare('DELETE FROM quiz_queue WHERE user_id = ?');
const deleteQuizRankingForUser = db.prepare('DELETE FROM quiz_rankings WHERE user_id = ?');
const deleteQuizMatchPresenceForUser = db.prepare('DELETE FROM quiz_match_presence WHERE user_id = ?');
const getCronicasSave = db.prepare('SELECT * FROM cronicas_saves WHERE user_id = ?');
const upsertCronicasSave = db.prepare(`
  INSERT INTO cronicas_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteCronicasSave = db.prepare('DELETE FROM cronicas_saves WHERE user_id = ?');
const getReformaSave = db.prepare('SELECT * FROM reforma_saves WHERE user_id = ?');
const upsertReformaSave = db.prepare(`
  INSERT INTO reforma_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteReformaSave = db.prepare('DELETE FROM reforma_saves WHERE user_id = ?');
const getHeroiSave = db.prepare('SELECT * FROM heroi_ortodoxo_saves WHERE user_id = ?');
const upsertHeroiSave = db.prepare(`
  INSERT INTO heroi_ortodoxo_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteHeroiSave = db.prepare('DELETE FROM heroi_ortodoxo_saves WHERE user_id = ?');
const getGuardioesSave = db.prepare('SELECT * FROM guardioes_saves WHERE user_id = ?');
const upsertGuardioesSave = db.prepare(`
  INSERT INTO guardioes_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteGuardioesSave = db.prepare('DELETE FROM guardioes_saves WHERE user_id = ?');
const getBabelSave = db.prepare('SELECT * FROM babel_saves WHERE user_id = ?');
const upsertBabelSave = db.prepare(`
  INSERT INTO babel_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteBabelSave = db.prepare('DELETE FROM babel_saves WHERE user_id = ?');
const getConcordiumProfile = db.prepare('SELECT * FROM concordium_profiles WHERE user_id = ?');
const upsertConcordiumProfile = db.prepare(`
  INSERT INTO concordium_profiles (user_id, profile_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at
`);
const getConcordiumGbaSave = db.prepare('SELECT * FROM concordium_gba_saves WHERE user_id = ?');
const upsertConcordiumGbaSave = db.prepare(`
  INSERT INTO concordium_gba_saves (user_id, save_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET save_json = excluded.save_json, updated_at = excluded.updated_at
`);
const upsertPlatformPresence = db.prepare(`
  INSERT INTO platform_presence (user_id, user_name, avatar_data, location, game_id, last_seen)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, avatar_data = excluded.avatar_data, location = excluded.location, game_id = excluded.game_id, last_seen = excluded.last_seen
`);
const getPlatformOnlineUsers = db.prepare('SELECT user_id, user_name, avatar_data, location, game_id, last_seen FROM platform_presence WHERE last_seen >= ? ORDER BY last_seen DESC, user_name COLLATE NOCASE ASC LIMIT 60');
const deleteOldPlatformPresence = db.prepare('DELETE FROM platform_presence WHERE last_seen < ?');
const insertHubChatMessage = db.prepare('INSERT INTO hub_chat_messages (id, user_id, user_name, message, created_at) VALUES (?, ?, ?, ?, ?)');
const getHubChatMessages = db.prepare('SELECT id, user_id, user_name, message, created_at FROM hub_chat_messages ORDER BY created_at DESC LIMIT ?');
const deleteOldHubChatMessages = db.prepare('DELETE FROM hub_chat_messages WHERE id NOT IN (SELECT id FROM hub_chat_messages ORDER BY created_at DESC LIMIT 200)');
const upsertQuizPresence = db.prepare('INSERT INTO quiz_presence (user_id, user_name, last_seen) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, last_seen = excluded.last_seen');
const getQuizOnlineUsers = db.prepare('SELECT user_id, user_name, last_seen FROM quiz_presence WHERE last_seen >= ? ORDER BY user_name COLLATE NOCASE ASC');
const deleteOldQuizPresence = db.prepare('DELETE FROM quiz_presence WHERE last_seen < ?');
const upsertQuizQueue = db.prepare('INSERT INTO quiz_queue (user_id, user_name, mode, joined_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, mode = excluded.mode, joined_at = excluded.joined_at');
const getQuizQueueUser = db.prepare('SELECT * FROM quiz_queue WHERE user_id = ?');
const getQuizDuelOpponent = db.prepare('SELECT * FROM quiz_queue WHERE mode = ? AND user_id <> ? ORDER BY joined_at ASC LIMIT 1');
const getQuizGeneralQueue = db.prepare('SELECT * FROM quiz_queue WHERE mode = ? ORDER BY joined_at ASC');
const deleteQuizQueueUser = db.prepare('DELETE FROM quiz_queue WHERE user_id = ?');
const deleteOldQuizQueue = db.prepare('DELETE FROM quiz_queue WHERE joined_at < ?');
const insertQuizMatch = db.prepare('INSERT INTO quiz_matches (id, mode, status, created_at, started_at, question_ids_json, round_seconds, finalized, round_index, round_started_at, reveal_until) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NULL)');
const getQuizMatch = db.prepare('SELECT * FROM quiz_matches WHERE id = ?');
const getActiveQuizMatchForUser = db.prepare("SELECT quiz_matches.* FROM quiz_matches JOIN quiz_match_players ON quiz_match_players.match_id = quiz_matches.id LEFT JOIN quiz_match_leaves ON quiz_match_leaves.match_id = quiz_matches.id AND quiz_match_leaves.user_id = quiz_match_players.user_id WHERE quiz_match_players.user_id = ? AND quiz_matches.status = 'active' AND quiz_match_leaves.user_id IS NULL ORDER BY quiz_matches.created_at DESC LIMIT 1");
const insertQuizMatchPlayer = db.prepare('INSERT OR IGNORE INTO quiz_match_players (match_id, user_id, user_name, score, joined_at) VALUES (?, ?, ?, 0, ?)');
const getQuizMatchPlayers = db.prepare('SELECT * FROM quiz_match_players WHERE match_id = ? ORDER BY joined_at ASC');
const upsertQuizMatchPresence = db.prepare('INSERT INTO quiz_match_presence (match_id, user_id, last_seen) VALUES (?, ?, ?) ON CONFLICT(match_id, user_id) DO UPDATE SET last_seen = excluded.last_seen');
const getQuizMatchPresenceRows = db.prepare('SELECT * FROM quiz_match_presence WHERE match_id = ?');
const getQuizMatchLeavers = db.prepare('SELECT * FROM quiz_match_leaves WHERE match_id = ?');
const getQuizMatchLeave = db.prepare('SELECT * FROM quiz_match_leaves WHERE match_id = ? AND user_id = ?');
const insertQuizMatchLeave = db.prepare('INSERT OR IGNORE INTO quiz_match_leaves (match_id, user_id, left_at) VALUES (?, ?, ?)');
const getQuizMatchEliminations = db.prepare('SELECT * FROM quiz_match_eliminations WHERE match_id = ?');
const getQuizMatchElimination = db.prepare('SELECT * FROM quiz_match_eliminations WHERE match_id = ? AND user_id = ?');
const insertQuizMatchElimination = db.prepare('INSERT OR IGNORE INTO quiz_match_eliminations (match_id, user_id, question_index, eliminated_at) VALUES (?, ?, ?, ?)');
const getQuizAnswers = db.prepare('SELECT * FROM quiz_answers WHERE match_id = ?');
const getQuizAnswer = db.prepare('SELECT * FROM quiz_answers WHERE match_id = ? AND user_id = ? AND question_index = ?');
const insertQuizAnswer = db.prepare('INSERT OR IGNORE INTO quiz_answers (match_id, user_id, question_index, answer_index, correct, answered_at) VALUES (?, ?, ?, ?, ?, ?)');
const updateQuizPlayerScore = db.prepare('UPDATE quiz_match_players SET score = ? WHERE match_id = ? AND user_id = ?');
const updateQuizMatchStatus = db.prepare('UPDATE quiz_matches SET status = ? WHERE id = ?');
const updateQuizMatchRound = db.prepare('UPDATE quiz_matches SET round_index = ?, round_started_at = ?, reveal_until = ? WHERE id = ?');
const updateQuizMatchReveal = db.prepare('UPDATE quiz_matches SET reveal_until = ? WHERE id = ?');
const finalizeQuizMatchRow = db.prepare('UPDATE quiz_matches SET finalized = 1 WHERE id = ?');
const insertQuizInvite = db.prepare('INSERT INTO quiz_invites (id, from_user_id, from_user_name, to_user_id, to_user_name, status, created_at, match_id) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)');
const getQuizInvite = db.prepare('SELECT * FROM quiz_invites WHERE id = ?');
const getQuizIncomingInvites = db.prepare("SELECT * FROM quiz_invites WHERE to_user_id = ? AND status = 'pending' AND created_at >= ? ORDER BY created_at DESC");
const getQuizOutgoingInvites = db.prepare("SELECT * FROM quiz_invites WHERE from_user_id = ? AND status = 'pending' AND created_at >= ? ORDER BY created_at DESC");
const getQuizPendingInviteBetween = db.prepare("SELECT * FROM quiz_invites WHERE status = 'pending' AND created_at >= ? AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)) ORDER BY created_at DESC LIMIT 1");
const updateQuizInvite = db.prepare('UPDATE quiz_invites SET status = ?, match_id = ? WHERE id = ?');
const supersedeOtherQuizInvites = db.prepare("UPDATE quiz_invites SET status = 'superseded' WHERE status = 'pending' AND id <> ? AND (from_user_id IN (?, ?) OR to_user_id IN (?, ?))");
const deleteOldQuizInvites = db.prepare('DELETE FROM quiz_invites WHERE created_at < ?');
const getQuizRanking = db.prepare('SELECT * FROM quiz_rankings WHERE user_id = ?');
const getQuizRankings = db.prepare('SELECT * FROM quiz_rankings ORDER BY wins DESC, general_wins DESC, duel_wins DESC, best_score DESC, matches_played ASC, updated_at ASC LIMIT 20');
const upsertQuizRanking = db.prepare('INSERT INTO quiz_rankings (user_id, user_name, best_score, wins, duel_wins, general_wins, invite_wins, matches_played, reward_points, reward_xp, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, best_score = max(quiz_rankings.best_score, excluded.best_score), wins = quiz_rankings.wins + excluded.wins, duel_wins = quiz_rankings.duel_wins + excluded.duel_wins, general_wins = quiz_rankings.general_wins + excluded.general_wins, invite_wins = quiz_rankings.invite_wins + excluded.invite_wins, matches_played = quiz_rankings.matches_played + excluded.matches_played, reward_points = quiz_rankings.reward_points + excluded.reward_points, reward_xp = quiz_rankings.reward_xp + excluded.reward_xp, updated_at = excluded.updated_at');
const upsertRanking = db.prepare(`
  INSERT INTO rankings (save_id, user_id, user_name, save_name, year, month, total_churches, total_members, doctrine_correct, reached_final, state_churches_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(save_id) DO UPDATE SET user_name = excluded.user_name, save_name = excluded.save_name, year = excluded.year, month = excluded.month, total_churches = excluded.total_churches, total_members = excluded.total_members, doctrine_correct = excluded.doctrine_correct, reached_final = excluded.reached_final, state_churches_json = excluded.state_churches_json, updated_at = excluded.updated_at
`);

let QUIZ_QUESTIONS = [];
try {
  QUIZ_QUESTIONS = JSON.parse(fs.readFileSync(QUIZ_QUESTIONS_PATH, 'utf8'));
} catch {
  QUIZ_QUESTIONS = [];
}

function isoNow() { return new Date().toISOString(); }
function isoSecondsAgo(seconds) { return new Date(Date.now() - seconds * 1000).toISOString(); }
function msUntil(iso) { return Math.max(0, new Date(iso).getTime() - Date.now()); }
function quizShortCode(id) { return String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase(); }
function quizQuestionsReady() { return QUIZ_QUESTIONS.length >= QUIZ_QUESTION_COUNT; }
function quizQuestion(id) { return QUIZ_QUESTIONS[Number(id) % QUIZ_QUESTIONS.length]; }
function publicQuizQuestion(id) {
  const q = quizQuestion(id);
  return { id: Number(id), q: q.q, a: q.a };
}
function quizQuestionIds(count = QUIZ_QUESTION_COUNT) {
  const ids = [...Array(QUIZ_QUESTIONS.length)].map((_, index) => index);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.min(count, ids.length));
}
function cleanQuizTables() {
  deleteOldQuizPresence.run(isoSecondsAgo(QUIZ_ONLINE_SECONDS));
  deleteOldQuizQueue.run(isoSecondsAgo(90));
  deleteOldQuizInvites.run(isoSecondsAgo(180));
}
function cleanPlatformTables() {
  deleteOldPlatformPresence.run(isoSecondsAgo(PLATFORM_ONLINE_SECONDS));
  deleteOldHubChatMessages.run();
}
function normalizeGamePresence(input) {
  const value = String(input || '').trim().toLowerCase();
  if (value === LUTHER_MATCH_GAME_ID) return { gameId: LUTHER_MATCH_GAME_ID, location: 'Luther Metch' };
  if (value === QUIZ_GAME_ID) return { gameId: QUIZ_GAME_ID, location: 'Quiz Ortodoxia' };
  if (value === CRONICAS_GAME_ID) return { gameId: CRONICAS_GAME_ID, location: 'Cronicas do Levante' };
  if (value === REFORMA_GAME_ID) return { gameId: REFORMA_GAME_ID, location: 'A Confissão' };
  if (value === HEROI_GAME_ID) return { gameId: HEROI_GAME_ID, location: 'Heroi Ortodoxo' };
  if (value === CONCORDIUM_EXPLORACAO_GAME_ID) return { gameId: CONCORDIUM_EXPLORACAO_GAME_ID, location: 'Concordium' };
  if (value === GUARDIOES_GAME_ID) return { gameId: GUARDIOES_GAME_ID, location: 'Sola Torre' };
  if (value === BABEL_GAME_ID) return { gameId: BABEL_GAME_ID, location: 'A Queda de Babel' };
  if (value === CROWNS_COUNCILS_GAME_ID) return { gameId: CROWNS_COUNCILS_GAME_ID, location: 'Crowns and Councils' };
  if (value === CORES_DA_ROSA_GAME_ID) return { gameId: CORES_DA_ROSA_GAME_ID, location: 'Uno Luterano' };
  if (value === GAME_ID) return { gameId: GAME_ID, location: 'Pela Graca 1904' };
  return { gameId: 'hub', location: 'Hub' };
}
function presenceForPath(pathname) {
  if (pathname === '/luther-metch' || pathname === '/match3-luterano' || pathname.startsWith('/api/luther-metch')) return normalizeGamePresence(LUTHER_MATCH_GAME_ID);
  if (pathname === '/quiz-ortodoxia' || pathname.startsWith('/api/quiz')) return normalizeGamePresence(QUIZ_GAME_ID);
  if (pathname === '/cronicas-do-levante' || pathname.startsWith('/api/cronicas')) return normalizeGamePresence(CRONICAS_GAME_ID);
  if (pathname === '/a-confissao' || pathname.startsWith('/api/a-confissao')) return normalizeGamePresence(REFORMA_GAME_ID);
  if (pathname === '/heroi-ortodoxo' || pathname.startsWith('/api/heroi-ortodoxo')) return normalizeGamePresence(HEROI_GAME_ID);
  if (pathname === '/concordium-exploracao' || pathname.startsWith('/api/concordium')) return normalizeGamePresence(CONCORDIUM_EXPLORACAO_GAME_ID);
  if (pathname === '/caminho-dos-guardioes' || pathname.startsWith('/api/guardioes')) return normalizeGamePresence(GUARDIOES_GAME_ID);
  if (pathname === '/a-queda-de-babel' || pathname.startsWith('/api/babel')) return normalizeGamePresence(BABEL_GAME_ID);
  if (pathname === '/crowns-and-councils' || pathname.startsWith('/api/crowns-and-councils')) return normalizeGamePresence(CROWNS_COUNCILS_GAME_ID);
  if (pathname === '/cores-da-rosa' || pathname.startsWith('/api/cores-da-rosa')) return normalizeGamePresence(CORES_DA_ROSA_GAME_ID);
  if (pathname === '/play' || pathname === '/game' || pathname.startsWith('/api/saves')) return normalizeGamePresence(GAME_ID);
  return normalizeGamePresence('hub');
}
function touchPlatformPresence(user, gameId = 'hub') {
  const info = normalizeGamePresence(gameId);
  upsertPlatformPresence.run(user.id, user.name, user.avatar_data || null, info.location, info.gameId, isoNow());
  cleanPlatformTables();
}
function touchQuizPresence(user) {
  upsertQuizPresence.run(user.id, user.name, isoNow());
  cleanQuizTables();
}
function createQuizMatch(mode, players) {
  const id = crypto.randomUUID();
  const now = isoNow();
  const questionCount = mode === 'general' ? QUIZ_QUESTIONS.length : QUIZ_QUESTION_COUNT;
  insertQuizMatch.run(id, mode, 'active', now, now, JSON.stringify(quizQuestionIds(questionCount)), QUIZ_ROUND_SECONDS, now);
  players.forEach(player => {
    const playerId = player.user_id || player.id;
    insertQuizMatchPlayer.run(id, playerId, player.user_name || player.name, now);
    upsertQuizMatchPresence.run(id, playerId, now);
  });
  return getQuizMatch.get(id);
}
function quizAnswerMap(matchId) {
  const map = new Map();
  getQuizAnswers.all(matchId).forEach(row => map.set(`${row.user_id}:${row.question_index}`, row));
  return map;
}
function quizActivePlayers(matchOrId) {
  const match = typeof matchOrId === 'string' ? getQuizMatch.get(matchOrId) : matchOrId;
  const matchId = match?.id || matchOrId;
  const leavers = new Set(getQuizMatchLeavers.all(matchId).map(row => row.user_id));
  const eliminated = match?.mode === 'general' ? new Set(getQuizMatchEliminations.all(matchId).map(row => row.user_id)) : new Set();
  return getQuizMatchPlayers.all(matchId).filter(player => !leavers.has(player.user_id) && !eliminated.has(player.user_id));
}
function touchQuizMatchHeartbeat(matchId, userId) {
  if (matchId && userId) upsertQuizMatchPresence.run(matchId, userId, isoNow());
}
function markAbandonedQuizPlayers(match) {
  if (!match || match.status !== 'active') return;
  const cutoff = Date.now() - QUIZ_MATCH_ABANDON_SECONDS * 1000;
  const heartbeats = new Map(getQuizMatchPresenceRows.all(match.id).map(row => [row.user_id, row.last_seen]));
  quizActivePlayers(match).forEach(player => {
    const seenAt = heartbeats.get(player.user_id) || player.joined_at || match.started_at;
    if (new Date(seenAt).getTime() < cutoff) {
      insertQuizMatchLeave.run(match.id, player.user_id, isoNow());
    }
  });
}
function quizRoundInfo(match) {
  const questionIds = safeJsonParse(match.question_ids_json, []);
  const index = Math.max(0, Math.min(Number(match.round_index || 0), Math.max(0, questionIds.length - 1)));
  const complete = Number(match.round_index || 0) >= questionIds.length;
  const startedAt = match.round_started_at || match.started_at;
  const roundEndsAt = new Date(new Date(startedAt).getTime() + (match.round_seconds * 1000)).toISOString();
  return { questionIds, index, complete, roundEndsAt, msLeft: complete ? 0 : msUntil(roundEndsAt), revealUntil: match.reveal_until || null };
}
function ensureQuizMatchProgress(match) {
  if (!match || match.status !== 'active') return match;
  let current = match;
  for (let guard = 0; guard < 3; guard += 1) {
    markAbandonedQuizPlayers(current);
    const round = quizRoundInfo(current);
    if (round.complete) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    let players = quizActivePlayers(current);
    const totalPlayers = getQuizMatchPlayers.all(current.id).length;
    if (!players.length) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    if (totalPlayers > 1 && players.length <= 1) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    const answers = quizAnswerMap(current.id);
    const allAnswered = players.length > 0 && players.every(player => answers.has(`${player.user_id}:${round.index}`));
    const timeExpired = round.msLeft <= 0;
    if (current.mode === 'general' && timeExpired) {
      players.filter(player => !answers.has(`${player.user_id}:${round.index}`)).forEach(player => {
        insertQuizMatchElimination.run(current.id, player.user_id, round.index, isoNow());
      });
      players = quizActivePlayers(current);
      if (players.length <= 1) {
        finalizeQuizMatch(current);
        return getQuizMatch.get(current.id);
      }
    }
    if (!allAnswered && !timeExpired) return current;
    if (!current.reveal_until) {
      updateQuizMatchReveal.run(new Date(Date.now() + QUIZ_REVEAL_SECONDS * 1000).toISOString(), current.id);
      return getQuizMatch.get(current.id);
    }
    if (msUntil(current.reveal_until) > 0) return current;
    const nextIndex = round.index + 1;
    if (nextIndex >= round.questionIds.length) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    updateQuizMatchRound.run(nextIndex, isoNow(), null, current.id);
    current = getQuizMatch.get(current.id);
  }
  return current;
}
function finalizeQuizMatch(match) {
  if (!match || match.finalized) return;
  const players = getQuizMatchPlayers.all(match.id);
  const activePlayers = quizActivePlayers(match);
  const activePlayerIds = new Set(activePlayers.map(player => player.user_id));
  const answers = getQuizAnswers.all(match.id);
  const scoreByUser = new Map(players.map(player => [player.user_id, 0]));
  answers.forEach(answer => scoreByUser.set(answer.user_id, (scoreByUser.get(answer.user_id) || 0) + (answer.correct ? 10 : 0)));
  let best = -1;
  activePlayers.forEach(player => {
    const score = scoreByUser.get(player.user_id) || 0;
    if (score > best) best = score;
  });
  const winners = activePlayers.length === 1 ? activePlayers : activePlayers.filter(player => (scoreByUser.get(player.user_id) || 0) === best);
  const hasSingleMultiplayerWinner = players.length > 1 && winners.length === 1;
  players.forEach(player => {
    const score = scoreByUser.get(player.user_id) || 0;
    const won = activePlayerIds.has(player.user_id) && hasSingleMultiplayerWinner && winners[0].user_id === player.user_id;
    const duelWins = won && match.mode === 'duel' ? 1 : 0;
    const generalWins = won && match.mode === 'general' ? 1 : 0;
    const inviteWins = won && match.mode === 'invite' ? 1 : 0;
    const rewardPoints = won ? QUIZ_WIN_POINTS : 0;
    const rewardXp = won ? QUIZ_WIN_XP : 0;
    updateQuizPlayerScore.run(score, match.id, player.user_id);
    upsertQuizRanking.run(player.user_id, player.user_name, score, won ? 1 : 0, duelWins, generalWins, inviteWins, 1, rewardPoints, rewardXp, isoNow());
  });
  updateQuizMatchStatus.run('complete', match.id);
  finalizeQuizMatchRow.run(match.id);
}
function publicQuizMatch(match, userId, options = {}) {
  if (!match) return null;
  match = ensureQuizMatchProgress(match);
  if (match?.status === 'active' && getQuizMatchLeave.get(match.id, userId)) return null;
  if (options.heartbeat && match?.status === 'active') touchQuizMatchHeartbeat(match.id, userId);
  const round = quizRoundInfo(match);
  if (round.complete && match.status !== 'complete') {
    finalizeQuizMatch(match);
    match = getQuizMatch.get(match.id);
  }
  const players = getQuizMatchPlayers.all(match.id);
  const activePlayers = quizActivePlayers(match);
  const eliminatedPlayers = new Set(getQuizMatchEliminations.all(match.id).map(row => row.user_id));
  const answers = quizAnswerMap(match.id);
  const presence = new Map(getQuizMatchPresenceRows.all(match.id).map(row => [row.user_id, row.last_seen]));
  const onlineCutoff = Date.now() - 5_000;
  const allAnswered = activePlayers.length > 0 && activePlayers.every(player => answers.has(`${player.user_id}:${round.index}`));
  const reveal = match.status === 'complete' || round.complete || Boolean(match.reveal_until) || round.msLeft <= 250 || allAnswered;
  const qid = round.questionIds[round.index];
  const question = qid === undefined ? null : publicQuizQuestion(qid);
  const userAnswer = answers.get(`${userId}:${round.index}`) || null;
  return {
    id: match.id,
    roomCode: quizShortCode(match.id),
    mode: match.mode,
    status: match.status,
    round: Math.min(round.index + 1, round.questionIds.length),
    totalRounds: round.questionIds.length,
    roundSeconds: match.round_seconds,
    roundEndsAt: round.roundEndsAt,
    revealUntil: match.reveal_until || null,
    msLeft: match.reveal_until ? msUntil(match.reveal_until) : round.msLeft,
    question,
    reveal,
    correctIndex: reveal && qid !== undefined ? quizQuestion(qid).c : null,
    answered: Boolean(userAnswer),
    userAnswer: userAnswer ? userAnswer.answer_index : null,
    eliminated: eliminatedPlayers.has(userId),
    players: players.map(player => {
      const answered = answers.has(`${player.user_id}:${round.index}`);
      const score = getQuizAnswers.all(match.id).filter(row => row.user_id === player.user_id && row.correct).length * 10;
      const lastSeen = presence.get(player.user_id);
      return { id: player.user_id, name: player.user_name, score, answered, online: Boolean(lastSeen && new Date(lastSeen).getTime() >= onlineCutoff), eliminated: eliminatedPlayers.has(player.user_id), left: !activePlayers.some(active => active.user_id === player.user_id) && !eliminatedPlayers.has(player.user_id) };
    })
  };
}

function hashPin(pin, salt) { return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex'); }
const SYSTEM_PLAYER_NAMES = new Set(['leave', 'deploy', 'online.reviews', 'check', 'health', 'review', 'reviews']);
function isDisplayablePlayerName(name) {
  const value = String(name || '').trim().toLowerCase();
  if (!value) return false;
  if (SYSTEM_PLAYER_NAMES.has(value)) return false;
  if (value.includes('online.reviews')) return false;
  if (/^(test|teste|deploy|check|leave)(\b|\d|_|-|$)/.test(value)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  return true;
}
function isNonPlayerAccountName(name) {
  const value = String(name || '').trim().toLowerCase();
  if (!isDisplayablePlayerName(value)) return true;
  return /^codex/.test(value) ||
    /^teste/.test(value) ||
    /^direto(\b|\d|_|-)/.test(value) ||
    /^logo(\b|\d|_|-)/.test(value) ||
    value.includes('host') ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function cleanupNonPlayerAccounts() {
  const users = getAllUsers.all().filter(user => isNonPlayerAccountName(user.name));
  if (!users.length) return;
  db.exec('BEGIN');
  try {
    users.forEach(user => {
      deleteSessionsForUser.run(user.id);
      deleteRankingsForUser.run(user.id);
      deleteGameRankingsForUser.run(user.id);
      deleteAchievementsForUser.run(user.id);
      deleteLutherRankingForUser.run(user.id);
      deleteCronicasForUser.run(user.id);
      deleteReformaForUser.run(user.id);
      deleteHeroiForUser.run(user.id);
      deleteGuardioesForUser.run(user.id);
      deleteBabelForUser.run(user.id);
      deleteConcordiumForUser.run(user.id);
      deleteConcordiumGbaSaveForUser.run(user.id);
      deletePlatformPresenceForUser.run(user.id);
      deleteHubChatForUser.run(user.id);
      deleteQuizPresenceForUser.run(user.id);
      deleteQuizQueueForUser.run(user.id);
      deleteQuizMatchPresenceForUser.run(user.id);
      deleteQuizRankingForUser.run(user.id);
      deleteSavesForUser.run(user.id);
      deleteUserById.run(user.id);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log(`[cleanup] removed ${users.length} non-player account(s): ${users.map(user => user.name).join(', ')}`);
}
cleanupNonPlayerAccounts();

if (CROWNS_LOCAL_PREVIEW && !getUserById.get(CROWNS_LOCAL_PREVIEW_USER_ID)) {
  const salt = crypto.randomBytes(16).toString('hex');
  insertUser.run(
    CROWNS_LOCAL_PREVIEW_USER_ID,
    CROWNS_LOCAL_PREVIEW_USER_NAME,
    hashPin(crypto.randomBytes(4).toString('hex'), salt),
    salt,
    new Date().toISOString()
  );
}
if (CORES_DA_ROSA_LOCAL_PREVIEW) {
  for (let index = 1; index <= 4; index += 1) {
    const id = `${CORES_DA_ROSA_LOCAL_PREVIEW_USER_PREFIX}${index}`;
    if (getUserById.get(id)) continue;
    const salt = crypto.randomBytes(16).toString('hex');
    insertUser.run(id, `Jogador Local ${index}`, hashPin(crypto.randomBytes(4).toString('hex'), salt), salt, new Date().toISOString());
  }
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const [key, ...rest] = part.trim().split('=');
    return [key, decodeURIComponent(rest.join('='))];
  }));
}
function isLoopbackRequest(req) {
  const address = String(req.socket?.remoteAddress || '');
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}
function currentUser(req) {
  const sessionId = parseCookies(req)[COOKIE_NAME];
  if (sessionId) {
    const session = getSession.get(sessionId);
    if (session) return getUserById.get(session.user_id);
  }
  if (CORES_DA_ROSA_LOCAL_PREVIEW && isLoopbackRequest(req)) {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const requested = Number(requestUrl.searchParams.get('localPlayer') || 1);
    const player = Math.max(1, Math.min(4, Number.isInteger(requested) ? requested : 1));
    return getUserById.get(`${CORES_DA_ROSA_LOCAL_PREVIEW_USER_PREFIX}${player}`);
  }
  if (CROWNS_LOCAL_PREVIEW && isLoopbackRequest(req)) return getUserById.get(CROWNS_LOCAL_PREVIEW_USER_ID);
  return null;
}
function setSessionCookie(res, sessionId) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/`); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`); }
function signLaunch(userId, expiresAt) {
  return crypto.createHmac('sha256', LAUNCH_SECRET).update(`${userId}:${expiresAt}`).digest('hex');
}
function setLaunchCookie(res, userId) {
  const expiresAt = Date.now() + LAUNCH_MAX_AGE_SECONDS * 1000;
  const token = `${userId}.${expiresAt}.${signLaunch(userId, expiresAt)}`;
  res.setHeader('Set-Cookie', `${LAUNCH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/game; Max-Age=${LAUNCH_MAX_AGE_SECONDS}`);
}
function hasValidLaunch(req, userId) {
  const token = parseCookies(req)[LAUNCH_COOKIE_NAME];
  if (!token) return false;
  const [tokenUserId, rawExpiresAt, signature] = token.split('.');
  const expiresAt = Number(rawExpiresAt);
  if (tokenUserId !== userId || !Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;
  const expected = signLaunch(tokenUserId, expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
function signCrownsLaunch(userId, expiresAt) {
  return crypto.createHmac('sha256', LAUNCH_SECRET).update(`${CROWNS_COUNCILS_GAME_ID}:${userId}:${expiresAt}`).digest('hex');
}
function setCrownsLaunchCookie(res, userId) {
  const expiresAt = Date.now() + CROWNS_LAUNCH_MAX_AGE_SECONDS * 1000;
  const token = `${userId}.${expiresAt}.${signCrownsLaunch(userId, expiresAt)}`;
  res.setHeader('Set-Cookie', `${CROWNS_LAUNCH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${CROWNS_LAUNCH_MAX_AGE_SECONDS}`);
}
function hasValidCrownsLaunch(req, userId) {
  if (CROWNS_LOCAL_PREVIEW && isLoopbackRequest(req)) return true;
  const token = parseCookies(req)[CROWNS_LAUNCH_COOKIE_NAME];
  if (!token) return false;
  const [tokenUserId, rawExpiresAt, signature] = token.split('.');
  const expiresAt = Number(rawExpiresAt);
  if (tokenUserId !== userId || !Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;
  const expected = signCrownsLaunch(tokenUserId, expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
function signCoresDaRosaLaunch(userId, expiresAt) {
  return crypto.createHmac('sha256', LAUNCH_SECRET).update(`${CORES_DA_ROSA_GAME_ID}:${userId}:${expiresAt}`).digest('hex');
}
function setCoresDaRosaLaunchCookie(res, userId) {
  const expiresAt = Date.now() + CORES_DA_ROSA_LAUNCH_MAX_AGE_SECONDS * 1000;
  const token = `${userId}.${expiresAt}.${signCoresDaRosaLaunch(userId, expiresAt)}`;
  res.setHeader('Set-Cookie', `${CORES_DA_ROSA_LAUNCH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${CORES_DA_ROSA_LAUNCH_MAX_AGE_SECONDS}`);
}
function hasValidCoresDaRosaLaunch(req, userId) {
  if (CORES_DA_ROSA_LOCAL_PREVIEW && isLoopbackRequest(req)) return true;
  const token = parseCookies(req)[CORES_DA_ROSA_LAUNCH_COOKIE_NAME];
  if (!token) return false;
  const [tokenUserId, rawExpiresAt, signature] = token.split('.');
  const expiresAt = Number(rawExpiresAt);
  if (tokenUserId !== userId || !Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;
  const expected = signCoresDaRosaLaunch(tokenUserId, expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
const coresDaRosa = createCoresDaRosaService({
  db,
  gameId: CORES_DA_ROSA_GAME_ID,
  allowBots: CORES_DA_ROSA_LOCAL_PREVIEW
});
function redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }
function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function signConcordiumAccess(userId) {
  return crypto.createHmac('sha256', LAUNCH_SECRET).update(`concordium:${userId}`).digest('hex');
}
function hasConcordiumAccess(req, userId) {
  const token = parseCookies(req)[CONCORDIUM_ACCESS_COOKIE];
  if (!token) return false;
  const expected = signConcordiumAccess(userId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
function setConcordiumAccessCookie(res, userId) {
  const token = signConcordiumAccess(userId);
  res.setHeader('Set-Cookie', `${CONCORDIUM_ACCESS_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12 * 60 * 60}`);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 12_000_000) { req.destroy(); reject(new Error('Payload grande demais')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
async function readForm(req) { return new URLSearchParams(await readBody(req)); }
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function scriptJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}
function safeJsonParse(raw, fallback = null) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function defaultConcordiumProfile() {
  return {
    created: false,
    classId: 'rogue',
    coins: 60,
    owned: ['training-dagger', 'simple-bow', 'sellsword-cloak'],
    skin: 'sellsword-cloak',
    loadout: { rogue: 'training-dagger', archer: 'simple-bow' },
    options: { sensitivity: 50, music: 70, effects: 80 },
    world: {
      map: 'b25_m40',
      x: 3,
      y: 2,
      dir: 'right',
      party: [],
      badges: [],
      flags: { startedInTruck: true },
      updatedAt: 0
    }
  };
}
function sanitizeConcordiumProfile(input) {
  const defaults = defaultConcordiumProfile();
  const value = input && typeof input === 'object' ? input : {};
  const allowedClasses = new Set(['rogue', 'archer']);
  const allowedItems = new Set(['training-dagger', 'long-sword', 'simple-bow', 'war-bow', 'sellsword-cloak', 'ash-cloak', 'forest-cloak']);
  const owned = Array.isArray(value.owned)
    ? [...new Set(value.owned.map(String).filter(id => allowedItems.has(id)))]
    : defaults.owned;
  for (const id of defaults.owned) if (!owned.includes(id)) owned.push(id);
  const classId = allowedClasses.has(String(value.classId)) ? String(value.classId) : defaults.classId;
  const loadout = value.loadout && typeof value.loadout === 'object' ? value.loadout : {};
  const rogueWeapon = owned.includes(String(loadout.rogue)) && ['training-dagger', 'long-sword'].includes(String(loadout.rogue)) ? String(loadout.rogue) : defaults.loadout.rogue;
  const archerWeapon = owned.includes(String(loadout.archer)) && ['simple-bow', 'war-bow'].includes(String(loadout.archer)) ? String(loadout.archer) : defaults.loadout.archer;
  const skin = owned.includes(String(value.skin)) && ['sellsword-cloak', 'ash-cloak', 'forest-cloak'].includes(String(value.skin)) ? String(value.skin) : defaults.skin;
  const options = value.options && typeof value.options === 'object' ? value.options : {};
  const world = value.world && typeof value.world === 'object' ? value.world : defaults.world;
  const worldMapValue = String(world.map || '');
  const worldMap = /^b\d{1,2}_m\d{1,3}$/.test(worldMapValue) ? worldMapValue : defaults.world.map;
  const cleanWorldList = items => Array.isArray(items)
    ? items.slice(0, 12).map(item => String(item || '').replace(/[<>]/g, '').trim().slice(0, 24)).filter(Boolean)
    : [];
  return {
    created: Boolean(value.created),
    classId,
    coins: clampInt(value.coins, 0, 999999),
    owned,
    skin,
    loadout: { rogue: rogueWeapon, archer: archerWeapon },
    options: {
      sensitivity: clampInt(options.sensitivity ?? defaults.options.sensitivity, 1, 100),
      music: clampInt(options.music ?? defaults.options.music, 0, 100),
      effects: clampInt(options.effects ?? defaults.options.effects, 0, 100)
    },
    world: {
      map: worldMap,
      x: clampInt(world.x, 0, 999),
      y: clampInt(world.y, 0, 999),
      dir: ['up', 'down', 'left', 'right'].includes(String(world.dir)) ? String(world.dir) : defaults.world.dir,
      party: cleanWorldList(world.party).slice(0, 6),
      badges: cleanWorldList(world.badges),
      flags: world.flags && typeof world.flags === 'object' ? Object.fromEntries(Object.entries(world.flags).slice(0, 50).map(([key, val]) => [String(key).replace(/[<>]/g, '').slice(0, 40), Boolean(val)])) : {},
      updatedAt: clampInt(world.updatedAt, 0, 9999999999999)
    }
  };
}
function sanitizeConcordiumGbaSave(input) {
  const source = input && typeof input === 'object' ? input : {};
  const metadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const rawMapName = String(metadata.mapName || '').replace(/[<>]/g, '').trim();
  const hasInvalidMapCoordinates = /(?:^|[,\s])(?:x|y)\s*-/.test(rawMapName.toLowerCase());
  let mapName = !rawMapName || rawMapName === 'Mapa atual ainda nao lido da ROM' || hasInvalidMapCoordinates ? 'Concordium GBA em execucao' : rawMapName;
  const rawPlayTime = String(metadata.playTime || '').replace(/[<>]/g, '').trim().slice(0, 32);
  const playParts = rawPlayTime.split(':').map(part => Number(part));
  const hasImpossiblePlayTime = playParts.length === 3
    && playParts.every(Number.isFinite)
    && (playParts[0] > 999 || playParts[1] > 59 || playParts[2] > 59);
  const playTime = hasImpossiblePlayTime ? '' : rawPlayTime;
  const rawSource = String(metadata.source || 'emulator').replace(/[<>]/g, '').trim().slice(0, 24);
  const rawMapId = String(metadata.mapId || '').replace(/[<>]/g, '').trim().slice(0, 32);
  const isTrustedRomRead = (rawSource === 'emerald-state' || rawSource === 'native-web' || rawSource === 'native-rom-map')
    && rawMapId
    && mapName !== 'Concordium GBA em execucao'
    && !hasImpossiblePlayTime;
  if (!isTrustedRomRead) mapName = 'Concordium GBA em execucao';
  const cleanList = (items, max) => Array.isArray(items)
    ? items.slice(0, max).map(item => String(item || '').replace(/[<>]/g, '').trim().slice(0, 24)).filter(Boolean)
    : [];
  return {
    metadata: {
      mapName: mapName.slice(0, 64),
      mapId: isTrustedRomRead ? rawMapId : '',
      x: isTrustedRomRead ? clampInt(metadata.x, 0, 9999) : 0,
      y: isTrustedRomRead ? clampInt(metadata.y, 0, 9999) : 0,
      team: isTrustedRomRead ? cleanList(metadata.team, 6) : [],
      badges: isTrustedRomRead ? cleanList(metadata.badges, 12) : [],
      playTime,
      source: isTrustedRomRead ? rawSource : 'emulatorjs',
      saveKind: String(metadata.saveKind || source.saveKind || '').replace(/[<>]/g, '').trim().slice(0, 24),
      saveUpdatedAt: String(metadata.saveUpdatedAt || '').replace(/[<>]/g, '').trim().slice(0, 40),
      frame: clampInt(metadata.frame, 0, 999999999)
    },
    save: typeof source.save === 'string' ? source.save.slice(0, 8_000_000) : '',
    saveKind: ['state', 'savefile', 'metadata'].includes(String(source.saveKind)) ? String(source.saveKind) : '',
    hash: String(source.hash || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80),
    format: String(source.format || '').replace(/[<>]/g, '').trim().slice(0, 24)
  };
}
function isSafeAvatarData(value) {
  return !value || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
function renderAvatar(user, className = 'avatar') {
  const initials = escapeHtml(user.name).slice(0, 2).toUpperCase();
  return user.avatar_data ? `<img class="${className}" src="${escapeHtml(user.avatar_data)}" alt="${escapeHtml(user.name)}">` : `<b class="${className}">${initials}</b>`;
}
function publicPresenceRow(row) {
  return {
    id: row.user_id,
    name: row.user_name,
    avatarData: row.avatar_data || null,
    location: row.location,
    gameId: row.game_id,
    lastSeen: row.last_seen
  };
}
function platformOnlinePlayers(gameId = '') {
  const rows = getPlatformOnlineUsers.all(isoSecondsAgo(PLATFORM_ONLINE_SECONDS))
    .filter(row => isDisplayablePlayerName(row.user_name));
  const normalized = String(gameId || '').trim();
  return normalized ? rows.filter(row => row.game_id === normalized).map(publicPresenceRow) : rows.map(publicPresenceRow);
}
function renderOnlinePlayers(players) {
  return players.length ? players.slice(0, 10).map(player => {
    const initials = escapeHtml(player.name).slice(0, 2).toUpperCase();
    const avatar = player.avatarData ? `<img class="online-avatar" src="${escapeHtml(player.avatarData)}" alt="${escapeHtml(player.name)}">` : `<b class="online-avatar">${initials}</b>`;
    return `<article>${avatar}<span>${escapeHtml(player.name)}<small>${escapeHtml(player.location || 'Hub')}</small></span></article>`;
  }).join('') : '<p class="online-empty">Ninguem online agora.</p>';
}
function publicChatRow(row) {
  return { id: row.id, userId: row.user_id, player: row.user_name, message: row.message, createdAt: row.created_at };
}
function renderAchievementIcon(medal, className = 'achievement-icon') {
  return `<img class="${className}" src="${medal.file}?v=${GAME_VERSION}" alt="${escapeHtml(medal.title)}">`;
}
function titleProgress(xp) {
  const currentXp = Math.max(0, Math.floor(Number(xp) || 0));
  const current = [...TITLE_TRACK].reverse().find(rank => currentXp >= rank.xp) || TITLE_TRACK[0];
  const next = TITLE_TRACK.find(rank => rank.xp > currentXp) || null;
  const baseXp = current.xp;
  const nextXp = next ? next.xp : current.xp;
  const progress = next ? Math.max(0, Math.min(100, ((currentXp - baseXp) / (nextXp - baseXp)) * 100)) : 100;
  return { currentXp, current, next, progress };
}

function savedAchievementMap(state) {
  const list = Array.isArray(state?.achievements) ? state.achievements : [];
  return new Map(list.map(item => [item.id, item]));
}
function permanentAchievementMap(userId, gameId = GAME_ID) {
  if (!userId) return new Map();
  return new Map(getUserAchievementRows.all(userId, gameId).map(item => [item.medal_id, item]));
}
function achievementsForState(state, stats, userId = '', gameId = GAME_ID, definitions = ACHIEVEMENTS) {
  const saved = savedAchievementMap(state);
  const permanent = permanentAchievementMap(userId, gameId);
  return definitions.map(def => {
    const stored = saved.get(def.id);
    const accountMedal = permanent.get(def.id);
    const unlocked = Boolean(accountMedal) || Boolean(stored) || Boolean(state && typeof def.condition === 'function' && def.condition(stats, state));
    return { ...def, unlocked, unlockedAt: accountMedal?.unlocked_at || stored?.unlockedAt || null };
  });
}
function achievementXp(medals) {
  return medals.filter(medal => medal.unlocked).reduce((sum, medal) => sum + medal.xp, 0);
}
function achievementPoints(medals) {
  return medals.filter(medal => medal.unlocked).reduce((sum, medal) => sum + medal.points, 0);
}
function rankPointBonus(rank) {
  return TITLE_TRACK.filter(title => title.level > 1 && title.level <= rank.current.level).reduce((sum, title) => sum + title.pointReward, 0);
}

function emptyRankingStats() {
  return { year: 1904, totalChurches: 0, totalMembers: 0, doctrineCorrect: 0, missionChurches: 0, formedPastors: 0, statesWithChurches: [], stateChurches: {}, cityChurches: {}, hasSave: false, started: false };
}

function playerStatsFromSave(save, userId = '') {
  const state = safeJsonParse(save?.state_json, null);
  const stats = state ? extractRankingStats(state) : emptyRankingStats();
  const medals = achievementsForState(state, stats, userId || save?.user_id || '');
  const xp = achievementXp(medals);
  const rank = titleProgress(xp);
  const points = achievementPoints(medals) + rankPointBonus(rank);
  const stickersOwned = 0;
  return { state, stats, xp, points, rank, medals, stickersOwned, stickersTotal: 0 };
}
function allAchievementDefinitions() {
  return [
    ...ACHIEVEMENTS.map(medal => ({ ...medal, gameId: GAME_ID })),
    ...CRONICAS_ACHIEVEMENTS.map(medal => ({ ...medal, gameId: CRONICAS_GAME_ID })),
    ...LUTHER_MATCH_ACHIEVEMENTS.map(medal => ({ ...medal, gameId: LUTHER_MATCH_GAME_ID }))
  ];
}
function accountAchievementSummary(userId) {
  const definitions = allAchievementDefinitions();
  const rows = [
    ...getUserAchievementRows.all(userId, GAME_ID),
    ...getUserAchievementRows.all(userId, CRONICAS_GAME_ID)
  ];
  const medals = rows.map(row => {
    const def = definitions.find(item => item.gameId === row.game_id && item.id === row.medal_id);
    if (!def) return null;
    return { ...def, unlocked: true, unlockedAt: row.unlocked_at };
  }).filter(Boolean);
  const xp = achievementXp(medals);
  const points = achievementPoints(medals);
  return { medals, xp, points };
}

function hubPointsForUser(user) {
  const mainSave = getSaveSlot.get(user.id, 1);
  const player = playerStatsFromSave(mainSave, user.id);
  const cronicasState = safeJsonParse(getCronicasSave.get(user.id)?.state_json, null);
  const reformaState = safeJsonParse(getReformaSave.get(user.id)?.state_json, null);
  const lutherMatchRow = getLutherMatchRanking.get(user.id);
  const medals = [
    ...player.medals,
    ...achievementsForState(cronicasState, {}, user.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS),
    ...achievementsForState(reformaState, {}, user.id, REFORMA_GAME_ID, REFORMA_ACHIEVEMENTS),
    ...achievementsForState({}, lutherMatchStats(lutherMatchRow || {}), user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS)
  ];
  const lutherChest = lutherMatchChestRewards(lutherMatchStats(lutherMatchRow || {}).completedLevels);
  const quizReward = quizRewards(getQuizRanking.get(user.id));
  const xp = achievementXp(medals) + lutherChest.xp + quizReward.xp;
  return achievementPoints(medals) + rankPointBonus(titleProgress(xp)) + lutherChest.points + quizReward.points;
}

function cardWalletForUser(user, earnedPoints = hubPointsForUser(user)) {
  const spent = Number(getCardPackSpend.get(user.id)?.points_spent || 0);
  return { earned: earnedPoints, spent, balance: Math.max(0, earnedPoints - spent) };
}

function weightedCard(pack, allowedRarities = null) {
  const weights = Object.entries(pack.weights).filter(([rarity, weight]) => weight > 0 && (!allowedRarities || allowedRarities.includes(rarity)));
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (!total) return CARD_CATALOG.cards[crypto.randomInt(CARD_CATALOG.cards.length)];
  let roll = crypto.randomInt(total);
  let rarity = weights[weights.length - 1][0];
  for (const [candidate, weight] of weights) {
    if (roll < weight) { rarity = candidate; break; }
    roll -= weight;
  }
  const pool = CARD_CATALOG.cards.filter(card => card.rarity === rarity);
  const safePool = pool.length ? pool : CARD_CATALOG.cards;
  return safePool[crypto.randomInt(safePool.length)];
}

function openCardPackForUser(user, packId) {
  const pack = CARD_PACKS[packId];
  if (!pack) return { error: 'pacote' };
  const cards = [];
  if (pack.guarantee) cards.push(weightedCard(pack, pack.guarantee));
  while (cards.length < pack.size) cards.push(weightedCard(pack));
  const now = new Date().toISOString();
  const openingId = crypto.randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try {
    const wallet = cardWalletForUser(user);
    if (wallet.balance < pack.cost) {
      db.exec('ROLLBACK');
      return { error: 'saldo' };
    }
    upsertCardPackSpend.run(user.id, pack.cost, now);
    cards.forEach(card => upsertUserCard.run(user.id, card.id, now));
    insertCardPackOpening.run(openingId, user.id, packId, JSON.stringify(cards.map(card => card.id)), now);
    db.exec('COMMIT');
    return { openingId };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  }
}

function rarityClass(rarity) {
  return String(rarity).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function cardCollectionForUser(user) {
  const owned = new Map(getUserCards.all(user.id).map(row => [row.card_id, row]));
  return CARD_CATALOG.cards.map(card => ({ ...card, quantity: Number(owned.get(card.id)?.quantity || 0) }));
}

function renderCardAlbum(user) {
  const cards = cardCollectionForUser(user);
  const ownedCount = cards.filter(card => card.quantity > 0).length;
  const categories = [...new Set(cards.map(card => card.category))];
  const filters = categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  const grid = cards.map(card => {
    const owned = card.quantity > 0;
    const art = owned
      ? `<img src="/assets/cards/${encodeURIComponent(card.image)}" alt="${escapeHtml(card.title)}" loading="lazy">`
      : '<span class="album-card-placeholder" aria-hidden="true">?</span>';
    return `<article class="album-card rarity-${rarityClass(card.rarity)} ${owned ? 'owned' : 'locked'}" data-card-title="${escapeHtml(card.title.toLowerCase())}" data-card-category="${escapeHtml(card.category)}">
      <div class="album-card-art">${art}<span class="album-card-lock" aria-hidden="true">✦</span>${card.quantity > 1 ? `<b class="album-card-quantity">×${card.quantity}</b>` : ''}</div>
      <div class="album-card-copy"><strong>${owned ? escapeHtml(card.title) : `Figurinha ${String(card.page).padStart(2, '0')}`}</strong><span>${escapeHtml(card.category)} · ${escapeHtml(card.rarity)}</span></div>
    </article>`;
  }).join('');
  return `<section class="ol-panel album-panel" id="album"><div class="panel-head"><div><p>Coleção Ortodoxia Luterana</p><h3>Álbum</h3></div><span>${ownedCount}/${cards.length} figurinhas</span></div><div class="album-toolbar"><label>Buscar<input id="album-search" type="search" placeholder="Nome da figurinha"></label><label>Categoria<select id="album-category"><option value="">Todas</option>${filters}</select></label></div><div class="album-grid" id="album-grid">${grid}</div></section>`;
}

function renderCardShop(user, earnedPoints, openingId = '') {
  const wallet = cardWalletForUser(user, earnedPoints);
  const opening = openingId ? getCardPackOpening.get(openingId, user.id) : null;
  const openedIds = safeJsonParse(opening?.cards_json, []);
  const openedCards = openedIds.map(id => CARD_CATALOG.cards.find(card => card.id === id)).filter(Boolean);
  const reveal = openedCards.length ? `<section class="pack-reveal pack-opening"><div class="pack-reveal-head"><div><p>Pacote aberto</p><h4>${escapeHtml(CARD_PACKS[opening.pack_id]?.name || 'Suas figurinhas')}</h4></div><a href="/?section=album">Ver álbum</a></div><div class="pack-reveal-grid">${openedCards.map((card, index) => `<article style="--reveal-delay:${index * 150}ms" class="rarity-${rarityClass(card.rarity)}"><span class="pack-card-glow" aria-hidden="true"></span><img src="/assets/cards/${encodeURIComponent(card.image)}" alt="${escapeHtml(card.title)}"><strong>${escapeHtml(card.title)}</strong><span>${escapeHtml(card.rarity)}</span></article>`).join('')}</div></section>` : '';
  const packs = Object.entries(CARD_PACKS).map(([id, pack]) => `<article class="shop-pack shop-pack-${id}"><span class="shop-pack-kicker">${escapeHtml(pack.summary)}</span><h4>${escapeHtml(pack.name)}</h4><p>${pack.cost} pontos</p><small>${escapeHtml(pack.description)}</small><b class="shop-pack-odds">${escapeHtml(pack.odds)}</b><form method="POST" action="/cards/open-pack"><input type="hidden" name="pack" value="${id}"><button ${wallet.balance < pack.cost ? 'disabled' : ''}>Abrir pacote</button></form></article>`).join('');
  return `<section class="ol-panel shop-panel" id="loja"><div class="panel-head"><div><p>Use os pontos conquistados nos jogos</p><h3>Loja de pacotes</h3></div><span class="card-wallet">${wallet.balance} pontos</span></div>${reveal}<div class="shop-grid">${packs}</div><p class="shop-footnote">Figurinhas repetidas ficam registradas no álbum. Seu saldo é salvo na conta.</p></section>`;
}

function pageShell(title, body, musicMode = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/site.css?v=${GAME_VERSION}">
${musicMode ? `<script>window.__MUSIC_MODE__ = ${JSON.stringify(musicMode)};</script>` : ''}
</head>
<body class="site-page">
${body}
<script src="/assets/audio.js?v=${GAME_VERSION}"></script>
</body>
</html>`;
}
function renderConcordiumAccess(error = '') {
  return pageShell('Concordium', `
<main class="auth-wrap"><section class="auth-card"><h1>Concordium</h1><p>Uma jornada estilo Pokemon percorrendo a historia da igreja apostolica.</p>${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}<form method="POST" action="/concordium-exploracao/unlock" class="auth-form"><label>Senha de acesso<input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="off" required autofocus></label><button type="submit">Entrar</button></form><a class="auth-link" href="/">Voltar ao hub</a></section></main>`);
}

function churchCountForState(stateData) { return stateData?.denomData?.IELB?.churches?.length || 0; }
function memberCountForState(stateData) {
  const slot = stateData?.denomData?.IELB;
  if (!slot) return 0;
  if (Number.isFinite(Number(slot.members))) return Number(slot.members);
  return (slot.churches || []).reduce((sum, church) => sum + Math.max(0, Number(church.members) || 0), 0);
}
function isFinalCampaign(stats) {
  return Number(stats?.year || 0) >= 2026;
}
function stateChurchCount(stats, stateCode) {
  return Number(stats?.stateChurches?.[stateCode] || 0);
}
function regionChurchCount(stats, regionKey) {
  return (REGION_STATES[regionKey] || []).reduce((sum, code) => sum + stateChurchCount(stats, code), 0);
}
function dominantRegion(stats, regionKey) {
  const target = regionChurchCount(stats, regionKey);
  if (target <= 0) return false;
  return Object.keys(REGION_STATES).every(key => key === regionKey || target > regionChurchCount(stats, key));
}
function cityKey(stateCode, city) {
  return `${stateCode}|${String(city || '').trim().toLowerCase()}`;
}
function cityChurchCount(stats, stateCode, city) {
  return Number(stats?.cityChurches?.[cityKey(stateCode, city)] || 0);
}
function dominantCity(stats, stateCode, city) {
  const target = cityChurchCount(stats, stateCode, city);
  if (target <= 0) return false;
  const counts = Object.entries(stats?.cityChurches || {});
  return counts.every(([key, value]) => key === cityKey(stateCode, city) || target > Number(value || 0));
}
function extractRankingStats(state) {
  const states = state?.states || {};
  const stateChurches = {};
  const cityChurches = {};
  const statesWithChurches = [];
  let totalChurches = 0;
  let totalMembers = 0;
  let missionChurches = 0;
  STATE_ORDER.forEach(code => {
    const slot = states[code]?.denomData?.IELB;
    const count = churchCountForState(states[code]);
    if (count > 0) {
      stateChurches[code] = count;
      statesWithChurches.push(code);
    }
    (slot?.churches || []).forEach(church => {
      if (church?.type === 'missao') missionChurches += 1;
      const city = String(church.city || '').trim();
      if (!city) return;
      const key = cityKey(code, city);
      cityChurches[key] = (cityChurches[key] || 0) + 1;
    });
    totalChurches += count;
    totalMembers += memberCountForState(states[code]);
  });
  const year = Math.max(1904, Math.floor(Number(state?.year) || 1904));
  const month = Math.max(0, Math.min(11, Math.floor(Number(state?.month) || 0)));
  const explicitDoctrineCorrect = Number(state?.doctrineCorrectCount ?? state?.doctrineStats?.correct);
  const usedQuestions = Array.isArray(state?.usedTheologyQuestions) ? state.usedTheologyQuestions.length : 0;
  const doctrineCorrect = Math.max(0, Math.floor(Number.isFinite(explicitDoctrineCorrect) ? explicitDoctrineCorrect : usedQuestions));
  const explicitFormedPastors = Number(state?.totalPastorsFormed);
  const rosterFormedPastors = Array.isArray(state?.pastors) ? state.pastors.filter(pastor => Number(pastor?.graduationYear || 0) > 1904).length : 0;
  const formedPastors = Math.max(0, Math.floor(Math.max(Number.isFinite(explicitFormedPastors) ? explicitFormedPastors : 0, rosterFormedPastors)));
  return { year, month, totalChurches, totalMembers, doctrineCorrect, missionChurches, formedPastors, reachedFinal: year >= 2026 ? 1 : 0, stateChurches, statesWithChurches, cityChurches, started: Boolean(state?.started), hasSave: true };
}
function rankingScoreParts(row) {
  return [
    Number(row.reached_final || row.reachedFinal || 0),
    Number(row.year || 1904),
    Number(row.month || 0),
    Number(row.total_churches ?? row.totalChurches ?? 0),
    Number(row.doctrine_correct ?? row.doctrineCorrect ?? 0),
    Number(row.total_members ?? row.totalMembers ?? 0)
  ];
}
function rankingBeats(current, previous) {
  if (!previous) return true;
  const a = rankingScoreParts(current);
  const b = rankingScoreParts(previous);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
function persistUserAchievements(userId, saveName, state, stats, now = new Date().toISOString()) {
  if (!userId || !state) return;
  achievementsForState(state, stats, userId).filter(medal => medal.unlocked).forEach(medal => {
    insertUserAchievement.run(userId, GAME_ID, medal.id, medal.unlockedAt || now, saveName || null);
  });
}
function persistCronicasAchievements(userId, achievements = [], now = new Date().toISOString()) {
  if (!userId || !CRONICAS_ACHIEVEMENTS.length) return;
  const known = new Map(CRONICAS_ACHIEVEMENTS.map(medal => [medal.id, medal]));
  achievements.forEach(item => {
    const id = typeof item === 'string' ? item : item?.id;
    if (!known.has(id)) return;
    insertUserAchievement.run(userId, CRONICAS_GAME_ID, id, item?.unlockedAt || now, CRONICAS_SAVE_NAME);
  });
}
function persistReformaAchievements(userId, achievements = [], now = new Date().toISOString()) {
  if (!userId || !REFORMA_ACHIEVEMENTS.length) return;
  const known = new Set(REFORMA_ACHIEVEMENTS.map(medal => medal.id));
  achievements.forEach(item => {
    const id = typeof item === 'string' ? item : item?.id;
    if (!known.has(id)) return;
    insertUserAchievement.run(userId, REFORMA_GAME_ID, id, item?.unlockedAt || now, REFORMA_SAVE_NAME);
  });
}
function updateRankingForSave(save, userName, state) {
  if (!state) { deleteRanking.run(save.id); return; }
  const stats = extractRankingStats(state);
  const now = new Date().toISOString();
  persistUserAchievements(save.user_id, save.name, state, stats, now);
  upsertRanking.run(save.id, save.user_id, userName, save.name, stats.year, stats.month, stats.totalChurches, stats.totalMembers, stats.doctrineCorrect, stats.reachedFinal, JSON.stringify(stats.stateChurches), now);
  const candidate = { ...stats, user_id: save.user_id, game_id: GAME_ID };
  const previous = getBestRankingForUser.get(save.user_id, GAME_ID);
  if (rankingBeats(candidate, previous)) {
    upsertBestRanking.run(save.user_id, GAME_ID, userName, save.name, stats.year, stats.month, stats.totalChurches, stats.totalMembers, stats.doctrineCorrect, stats.reachedFinal, JSON.stringify(stats.stateChurches), now);
  }
}
function backfillRankings() {
  getAllSavedStates.all().forEach(save => updateRankingForSave(save, save.user_name, safeJsonParse(save.state_json)));
}
function publicRankingRow(row) {
  return { player: row.user_name, year: row.year, month: row.month, totalChurches: row.total_churches, totalMembers: Math.floor(row.total_members), doctrineCorrect: row.doctrine_correct, reachedFinal: Boolean(row.reached_final), updatedAt: row.updated_at };
}
function lutherMatchChestRewards(completedLevels = 0) {
  const chests = Math.floor(Math.max(0, Math.min(LUTHER_MATCH_MAX_LEVEL, Number(completedLevels) || 0)) / 10);
  let xp = 0;
  let points = 0;
  for (let chest = 1; chest <= chests; chest += 1) {
    xp += 120 + Math.floor(chest / 5) * 45;
    points += 90 + Math.floor(chest / 5) * 25;
  }
  return { chests, xp, points };
}
function quizRewards(row = {}) {
  return {
    xp: Math.max(0, Number(row?.reward_xp || 0)),
    points: Math.max(0, Number(row?.reward_points || 0)),
    duelWins: Math.max(0, Number(row?.duel_wins || 0)),
    generalWins: Math.max(0, Number(row?.general_wins || 0)),
    inviteWins: Math.max(0, Number(row?.invite_wins || 0)),
    wins: Math.max(0, Number(row?.wins || 0))
  };
}
function lutherMatchStats(rowOrPayload = {}) {
  const hasProgress = Boolean(rowOrPayload && (
    rowOrPayload.entered ||
    rowOrPayload.updated_at ||
    rowOrPayload.best_level ||
    rowOrPayload.bestLevel ||
    rowOrPayload.completed_levels ||
    rowOrPayload.completedLevels ||
    rowOrPayload.score ||
    rowOrPayload.max_combo ||
    rowOrPayload.maxCombo ||
    rowOrPayload.luther_pair_used ||
    rowOrPayload.lutherPairUsed ||
    rowOrPayload.solas_pair_used ||
    rowOrPayload.solasPairUsed
  ));
  return {
    entered: hasProgress,
    level: Number(rowOrPayload.level || 1),
    bestLevel: Number(rowOrPayload.best_level ?? rowOrPayload.bestLevel ?? rowOrPayload.level ?? 1),
    completedLevels: Number(rowOrPayload.completed_levels ?? rowOrPayload.completedLevels ?? 0),
    score: Number(rowOrPayload.score || 0),
    maxCombo: Number(rowOrPayload.max_combo ?? rowOrPayload.maxCombo ?? 0),
    lutherPairUsed: Boolean(rowOrPayload.luther_pair_used ?? rowOrPayload.lutherPairUsed ?? false),
    solasPairUsed: Boolean(rowOrPayload.solas_pair_used ?? rowOrPayload.solasPairUsed ?? false)
  };
}
function persistLutherMatchAchievements(userId, stats, now = new Date().toISOString()) {
  if (!userId) return [];
  const newlyUnlocked = [];
  achievementsForState({}, stats, userId, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS).filter(medal => medal.unlocked).forEach(medal => {
    const result = insertUserAchievement.run(userId, LUTHER_MATCH_GAME_ID, medal.id, medal.unlockedAt || now, 'Luther Metch');
    if (result.changes > 0) newlyUnlocked.push({ ...medal, unlocked: true, unlockedAt: now });
  });
  return newlyUnlocked;
}
function publicLutherMatchRow(row) {
  return {
    player: row.user_name,
    level: Number(row.level || 1),
    bestLevel: Number(row.best_level || 1),
    completedLevels: Number(row.completed_levels || 0),
    score: Number(row.score || 0),
    maxCombo: Number(row.max_combo || 0),
    lutherPairUsed: Boolean(row.luther_pair_used),
    solasPairUsed: Boolean(row.solas_pair_used),
    updatedAt: row.updated_at
  };
}
function clampInt(value, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
function rankingPayload() {
  backfillRankings();
  const rows = getGameRankingRows.all().filter(row => isDisplayablePlayerName(row.user_name));
  const lutherMatch = getLutherMatchRankings.all().filter(row => isDisplayablePlayerName(row.user_name)).slice(0, 20).map(publicLutherMatchRow);
  const quizOrtodoxia = getQuizRankings.all().filter(row => isDisplayablePlayerName(row.user_name)).map((row, index) => ({
    position: index + 1,
    player: row.user_name,
    duelWins: Number(row.duel_wins || 0),
    generalWins: Number(row.general_wins || 0),
    inviteWins: Number(row.invite_wins || 0),
    wins: Number(row.wins || 0),
    matchesPlayed: Number(row.matches_played || 0)
  }));
  const byYear = [...rows].sort((a, b) => b.year - a.year || b.month - a.month || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byChurches = [...rows].sort((a, b) => b.total_churches - a.total_churches || b.reached_final - a.reached_final || b.year - a.year).slice(0, 10).map(publicRankingRow);
  const byDoctrine = [...rows].sort((a, b) => b.doctrine_correct - a.doctrine_correct || b.year - a.year || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byState = STATE_ORDER.map(code => {
    const best = rows.map(row => ({ row, count: Number(safeJsonParse(row.state_churches_json, {})[code] || 0) })).filter(item => item.count > 0).sort((a, b) => b.count - a.count || b.row.year - a.row.year || b.row.total_churches - a.row.total_churches)[0];
    return best ? { state: code, stateName: STATE_NAMES[code], churches: best.count, ...publicRankingRow(best.row) } : { state: code, stateName: STATE_NAMES[code], churches: 0, player: '-', year: 1904, totalChurches: 0, doctrineCorrect: 0 };
  });
  const definitions = allAchievementDefinitions();
  const prestigeRows = [GAME_ID, CRONICAS_GAME_ID, LUTHER_MATCH_GAME_ID].flatMap(gameId => getAllAchievementRows.all(gameId)).filter(row => isDisplayablePlayerName(row.user_name));
  const prestige = prestigeRows.map(item => {
    const medal = definitions.find(def => def.gameId === item.game_id && def.id === item.medal_id);
    if (!medal) return null;
    return {
      player: item.user_name,
      medal: medal.title,
      medalId: medal.id,
      icon: medal.file,
      xp: medal.xp,
      points: medal.points,
      unlockedAt: item.unlocked_at
    };
  }).filter(Boolean).sort((a, b) => String(b.unlockedAt || '').localeCompare(String(a.unlockedAt || ''))).slice(0, 12);
  return { generatedAt: new Date().toISOString(), byYear, byChurches, byState, byDoctrine, lutherMatch, quizOrtodoxia, prestige };
}
function hubSaveForUser(user) {
  const existing = getSaveSlot.get(user.id, 1);
  if (existing) return existing;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  insertSave.run(id, user.id, 1, 'Pela Graça', now, now);
  return getSave.get(id, user.id);
}

function renderNewSave(user, slot, error = '') {
  return pageShell('Nova história', `
<main class="auth-wrap"><section class="auth-card"><h1>Nova história</h1><p>Slot ${slot} · Jogador: ${escapeHtml(user.name)}</p>${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}<form method="POST" action="/saves" class="auth-form"><input type="hidden" name="slot" value="${slot}"><label>Nome da história<input name="name" maxlength="40" autocomplete="off" required></label><button type="submit">Criar e jogar</button></form><a class="auth-link" href="/">Voltar para slots</a></section></main>`);
}
function renderGame(save, user) {
  const body = fs.readFileSync(path.join(PUBLIC_DIR, 'game-body.html'), 'utf8').replace(/id="version-tag">v[0-9.]+<\/span>/, `id="version-tag">${GAME_VERSION}</span>`);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${escapeHtml(save.name)} — Pela Graça</title>
<link rel="stylesheet" href="/assets/game.css?v=${GAME_VERSION}">
<link rel="stylesheet" href="/assets/site.css?v=${GAME_VERSION}">
<script>window.__SAVE_ID__ = ${JSON.stringify(save.id)}; window.__SAVE_NAME__ = ${JSON.stringify(save.name)}; window.__MUSIC_MODE__ = 'game';</script>
</head>
<body>
${body}
<script src="/assets/audio.js?v=${GAME_VERSION}"></script>
<script src="/assets/persistence.js?v=${GAME_VERSION}"></script>
</body>
</html>`;
}
function serveAsset(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const relative = decodeURIComponent(url.pathname.replace(/^\/assets\//, ''));
  if (relative === 'concordium.gba') {
    const user = currentUser(req);
    if (!user || !hasConcordiumAccess(req, user.id)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Concordium bloqueado');
      return;
    }
  }
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    if (/^achievements\/luther-match-[a-z0-9-]+\.png$/i.test(relative)) {
      res.writeHead(302, { Location: `https://raw.githubusercontent.com/Ortodoxia-Luterana/Pela-Gra-a/main/public/${relative}` });
      res.end();
      return;
    }
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.json' || ext === '.map' ? 'application/json; charset=utf-8' : ext === '.html' ? 'text/html; charset=utf-8' : ext === '.svg' ? 'image/svg+xml; charset=utf-8' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.mp3' ? 'audio/mpeg' : ext === '.ogg' ? 'audio/ogg' : ext === '.wav' ? 'audio/wav' : 'application/octet-stream';
  const headers = { 'Content-Type': type };
  if (['.css', '.js', '.html'].includes(ext)) headers['Cache-Control'] = 'no-store, max-age=0';
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

let crownsRealtimeNamespace = null;
function emitCrownsEvent(event, payload) {
  crownsRealtimeNamespace?.to(`cc:${payload.seasonId || CROWNS_DEFAULT_SERVER_ID}`).emit(event, payload);
}

function crownsLocalDateParts(value = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CROWNS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day };
}

function crownsLocalDaySerial(value = Date.now()) {
  const parts = crownsLocalDateParts(value);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / (24 * 60 * 60 * 1000));
}

function crownsSaoPauloMidnightFromSerial(serial) {
  const utcDate = new Date(serial * 24 * 60 * 60 * 1000);
  return Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 3, 0, 0);
}

function crownsSeasonClock(season) {
  const config = safeJsonParse(season?.config_json, {});
  const startsAt = new Date(season?.starts_at || Date.now()).getTime();
  const gameDayMs = Number(config.gameDayMs || CROWNS_GAME_DAY_MS);
  const totalDays = Number(config.totalDays || CROWNS_SEASON_DAYS);
  const calendarMode = (config.mode || 'persistente') === 'persistente' && !CROWNS_LOCAL_PREVIEW;
  const elapsed = Math.max(0, Date.now() - startsAt);
  const elapsedDays = calendarMode ? Math.max(0, crownsLocalDaySerial() - crownsLocalDaySerial(startsAt)) : Math.floor(elapsed / gameDayMs);
  const day = season?.status === 'waiting' ? 1 : Math.max(1, Math.min(totalDays, elapsedDays + 1));
  const storedEndsAt = new Date(season?.ends_at || Date.now()).getTime();
  const calendarEndsAt = crownsSaoPauloMidnightFromSerial(crownsLocalDaySerial(startsAt) + totalDays);
  const endsAt = calendarMode
    ? (storedEndsAt <= Date.now() ? storedEndsAt : calendarEndsAt)
    : storedEndsAt;
  const nextDayAt = calendarMode
    ? crownsSaoPauloMidnightFromSerial(crownsLocalDaySerial() + 1)
    : Math.min(endsAt, startsAt + day * gameDayMs);
  const resetAt = endsAt + Number(config.resetDelayMs || CROWNS_RESET_DELAY_MS);
  return {
    day,
    totalDays,
    gameDayMs,
    phase: season?.status === 'waiting' ? 'waiting' : season?.status === 'ended' || Date.now() >= endsAt ? 'ended' : 'open',
    remainingMs: Math.max(0, endsAt - Date.now()),
    nextDayAt: season?.status === 'waiting' || day >= totalDays ? null : new Date(nextDayAt).toISOString(),
    nextDayRemainingMs: season?.status === 'waiting' || day >= totalDays ? 0 : Math.max(0, nextDayAt - Date.now()),
    endsAt: new Date(endsAt).toISOString(),
    resetAt: new Date(resetAt).toISOString(),
    mode: config.mode || 'persistente'
  };
}

function activateCrownsSeason(serverId) {
  const season = getCcSeason.get(serverId);
  if (!season || season.status !== 'waiting') return season;
  const now = new Date();
  const config = { ...safeJsonParse(season.config_json, {}), activatedAt: now.toISOString() };
  const endsAt = CROWNS_LOCAL_PREVIEW
    ? new Date(now.getTime() + CROWNS_SEASON_DAYS * CROWNS_GAME_DAY_MS)
    : new Date(crownsSaoPauloMidnightFromSerial(crownsLocalDaySerial(now) + CROWNS_SEASON_DAYS));
  updateCcSeasonTiming.run('open', now.toISOString(), endsAt.toISOString(), JSON.stringify(config), serverId);
  db.prepare('UPDATE cc_realms SET last_economy_at = ?, last_ai_action_at = ?, updated_at = ? WHERE season_id = ?').run(now.toISOString(), now.toISOString(), now.toISOString(), serverId);
  return getCcSeason.get(serverId);
}

function processCrownsSeasonLifecycle(requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  let season = getCcSeason.get(serverId);
  if (!season) return null;
  const clock = crownsSeasonClock(season);
  if (season.status === 'open' && clock.phase === 'ended') {
    const ranked = getCcRealms.all(serverId)
      .map(realm => ({ ...realm, score: Number(realm.prestige || 0) * 10 + Number(realm.region_count || 0) * 100 + Number(realm.treasury || 0) + Math.floor(Number(realm.provisions || 0) / 2) }))
      .sort((a, b) => b.score - a.score || b.prestige - a.prestige)
      .slice(0, 5);
    const now = new Date().toISOString();
    const config = { ...safeJsonParse(season.config_json, {}), winnersRecordedAt: now };
    db.exec('BEGIN IMMEDIATE');
    try {
      ranked.forEach((realm, index) => insertCcSeasonResult.run(serverId, index + 1, realm.name, realm.house_name, realm.score, Number(realm.region_count || 0), Number(realm.prestige || 0), now));
      updateCcSeasonStatus.run('ended', JSON.stringify(config), serverId);
      insertCcEvent.run(crypto.randomUUID(), serverId, 'season.ended', ranked[0]?.id || null, ranked[0]?.capital_region_id || null, JSON.stringify({ winner: ranked[0]?.name || 'Sem vencedor' }), now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    emitCrownsEvent('season.ended', { seasonId: serverId, winners: getCcSeasonResults.all(serverId), version: Date.now() });
    season = getCcSeason.get(serverId);
  }
  const endedClock = crownsSeasonClock(season);
  if (season.status === 'ended' && Date.now() >= new Date(endedClock.resetAt).getTime()) {
    const now = new Date();
    const seed = `${now.getTime()}-${serverId}-${crypto.randomUUID()}`;
    const config = {
      seed,
      serverNumber: CROWNS_SERVER_IDS.indexOf(serverId) + 1,
      totalDays: CROWNS_SEASON_DAYS,
      gameDayMs: CROWNS_GAME_DAY_MS,
      resetDelayMs: CROWNS_RESET_DELAY_MS,
      theatre: crownsRegionCatalog.theatre,
      mode: CROWNS_LOCAL_PREVIEW ? 'teste-acelerado' : 'persistente'
    };
    db.exec('BEGIN IMMEDIATE');
    try {
      deleteCcActionsForSeason.run(serverId);
      deleteCcArticlesForSeason.run(serverId);
      deleteCcEventsForSeason.run(serverId);
      deleteCcBuildingsForSeason.run(serverId);
      deleteCcArmiesForSeason.run(serverId);
      deleteCcFleetsForSeason.run(serverId);
      deleteCcMarketOrdersForSeason.run(serverId);
      deleteCcDiplomaticExchangesForSeason.run(serverId);
      deleteCcResultsForSeason.run(serverId);
      deleteCcTreatiesForSeason.run(serverId);
      deleteCcMarriagesForSeason.run(serverId);
      deleteCcWarsForSeason.run(serverId);
      deleteCcRegionReligionsForSeason.run(serverId);
      deleteCcCouncilVotesForSeason.run(serverId);
      deleteCcCouncilReceptionsForSeason.run(serverId);
      deleteCcCouncilsForSeason.run(serverId);
      deleteCcReligiousResponsesForSeason.run(serverId);
      deleteCcReligiousMovementsForSeason.run(serverId);
      deleteCcReligiousCrisesForSeason.run(serverId);
      deleteCcCustomFaithsForSeason.run(serverId);
      resetCcSeasonRegions.run(serverId);
      deleteCcRealmsForSeason.run(serverId);
      updateCcSeasonTiming.run('waiting', now.toISOString(), new Date(now.getTime() + CROWNS_SEASON_DAYS * CROWNS_GAME_DAY_MS).toISOString(), JSON.stringify(config), serverId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    seedCcAiRealms(serverId, now.toISOString(), seed);
    seedCcAiMarket(serverId, now.toISOString());
    emitCrownsEvent('season.reset', { seasonId: serverId, version: Date.now() });
    season = getCcSeason.get(serverId);
  }
  return season;
}

function crownsServers(user) {
  return CROWNS_SERVER_IDS.map((serverId, index) => {
    const season = processCrownsSeasonLifecycle(serverId) || getCcSeason.get(serverId);
    const clock = crownsSeasonClock(season);
    const realms = getCcRealms.all(serverId);
    const realm = getCcRealmByUser.get(serverId, user.id);
    return {
      id: serverId,
      number: index + 1,
      name: `Servidor ${index + 1}`,
      subtitle: index === 0 ? 'O Conselho Dourado' : index === 1 ? 'A Coroa do Levante' : 'As Fronteiras do Norte',
      day: clock.day,
      totalDays: clock.totalDays,
      phase: clock.phase,
      statusLabel: clock.phase === 'waiting' ? 'Aguardando o primeiro jogador' : clock.phase === 'ended' ? 'Apuração dos vencedores' : 'Temporada em andamento',
      playerCount: realms.filter(item => !item.is_ai).length,
      aiCount: realms.filter(item => item.is_ai).length,
      joined: Boolean(realm),
      realmName: realm?.name || null,
      startsAt: season.starts_at,
      endsAt: clock.endsAt,
      resetAt: clock.resetAt,
      nextDayAt: clock.nextDayAt,
      nextDayRemainingMs: clock.nextDayRemainingMs,
      mode: clock.mode
    };
  });
}

function processCrownsEconomy(requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const season = getCcSeason.get(serverId);
  const seasonClock = crownsSeasonClock(season);
  if (!season || seasonClock.phase !== 'open') return;
  const nowMs = Date.now();
  getCcRealms.all(serverId).forEach(realm => {
    const lastMs = new Date(realm.last_economy_at || realm.created_at).getTime();
    const ticks = Math.min(3, seasonClock.mode === 'persistente'
      ? Math.max(0, crownsLocalDaySerial(nowMs) - crownsLocalDaySerial(lastMs))
      : Math.floor(Math.max(0, nowMs - lastMs) / CROWNS_GAME_DAY_MS));
    if (!ticks) return;
    const buildings = getCcBuildingsForRealm.all(serverId, realm.id);
    const temples = buildings.filter(item => item.building_type === 'templo').reduce((sum, item) => sum + item.level, 0);
    const provinces = getCcOwnedRegionEconomy.all(serverId, realm.id);
    const customFaith = getCcCustomFaithForRealm.get(serverId, realm.id);
    const dogmas = new Set(safeJsonParse(customFaith?.dogmas_json, []));
    let treasuryDelta = 0;
    let provisionsDelta = 0;
    let woodDelta = 0;
    let stoneDelta = 0;
    let hungryProvinces = 0;
    let rebelliousProvinces = 0;
    for (const province of provinces) {
      const projection = crownsProvinceProjection(serverId, realm.id, province);
      const localBuildings = projection.buildings;
      const level = type => Number(localBuildings.find(item => item.building_type === type)?.level || 0);
      let population = projection.population;
      let foodStock = Math.max(0, Number(province.food_stock || 0));
      let loyalty = projection.loyalty;
      let unrest = projection.unrest;
      for (let tick = 0; tick < ticks; tick += 1) {
        foodStock = Math.max(0, Math.min(projection.foodCapacity, foodStock + projection.foodBalance));
        const hungry = projection.foodBalance < 0 && foodStock < projection.foodConsumption;
        const highTax = projection.taxRate >= 27;
        if (hungry) {
          population = Math.max(100, Math.floor(population * 0.985));
          loyalty = Math.max(0, loyalty - 7);
          unrest = Math.min(100, unrest + 10);
        } else {
          if (projection.foodBalance > 8 && foodStock > projection.foodConsumption * 2) population = Math.min(50000, population + Math.max(4, Math.floor(population * 0.004)));
          loyalty = Math.min(100, loyalty + (projection.taxRate <= 18 ? 2 : 1));
          unrest = Math.max(0, unrest - 2);
        }
        if (highTax) {
          loyalty = Math.max(0, loyalty - 2);
          unrest = Math.min(100, unrest + 3);
        }
        if (dogmas.has('disciplina') && projection.templeLevel) unrest = Math.max(0, unrest - 2);
      }
      updateCcProvinceEconomy.run(population, Math.round(foodStock), loyalty, unrest, serverId, province.region_id, realm.id);
      treasuryDelta += projection.taxIncome * ticks;
      provisionsDelta += Math.max(0, Math.floor(projection.foodBalance * 0.25)) * ticks;
      woodDelta += ticks * ((province.resource_type === 'wood' ? Number(province.resource_yield || 60) : 0) + 38 * level('serraria'));
      stoneDelta += ticks * ((province.resource_type === 'stone' ? Number(province.resource_yield || 60) : 0) + 34 * level('pedreira'));
      if (projection.foodBalance < 0 && foodStock < projection.foodConsumption) hungryProvinces += 1;
      if (unrest >= 65 || loyalty <= 35) rebelliousProvinces += 1;
    }
    const nextEconomy = seasonClock.mode === 'persistente'
      ? new Date(nowMs).toISOString()
      : new Date(lastMs + ticks * CROWNS_GAME_DAY_MS).toISOString();
    applyCcEconomy.run(treasuryDelta, provisionsDelta, woodDelta, stoneDelta, nextEconomy, new Date().toISOString(), realm.id, serverId);
    if (hungryProvinces || rebelliousProvinces) {
      db.prepare('UPDATE cc_realms SET stability = max(10, stability - ?), popular_support = max(5, popular_support - ?), updated_at = ? WHERE id = ? AND season_id = ?').run(
        ticks * (hungryProvinces + rebelliousProvinces),
        ticks * (hungryProvinces * 2 + rebelliousProvinces),
        new Date().toISOString(),
        realm.id,
        serverId
      );
    }
    if (temples && Number(realm.heresy_pressure || 0) > 0) {
      db.prepare('UPDATE cc_realms SET religious_unity = min(100, religious_unity + ?), heresy_pressure = max(0, heresy_pressure - ?), updated_at = ? WHERE id = ? AND season_id = ?').run(ticks * temples, ticks * temples, new Date().toISOString(), realm.id, serverId);
    }
    const day = crownsSeasonClock(season).day;
    const activeMovements = getCcReligiousMovements.all(serverId).filter(movement => {
      const template = CROWNS_RELIGIOUS_MOVEMENTS.find(item => item.key === movement.movement_key);
      return (template?.faith || 'Cristianismo') === baseCrownsFaith(realm.religion);
    });
    if (activeMovements.length && day % 6 === 0) {
      const latestMovement = activeMovements[activeMovements.length - 1];
      db.prepare('UPDATE cc_realms SET heresy_pressure = min(100, heresy_pressure + ?), religious_unity = max(0, religious_unity - ?), updated_at = ? WHERE id = ? AND season_id = ?').run(2 * ticks, ticks, new Date().toISOString(), realm.id, serverId);
      for (const owned of getCcOwnedRegions.all(serverId, realm.id)) {
        const faith = getCcRegionReligion.get(serverId, owned.region_id);
        if (faith) upsertCcRegionReligion.run(serverId, owned.region_id, faith.majority_religion, Math.max(20, faith.majority_share - ticks), faith.heresy_name === 'Sem heresia organizada' ? latestMovement.name : faith.heresy_name, Math.min(60, faith.heresy_share + 2 * ticks), new Date().toISOString());
      }
    }
  });
}

function crownsActionDuration(hours) {
  return CROWNS_LOCAL_PREVIEW || process.env.CROWNS_ACTION_MS ? CROWNS_ACTION_MS : hours * 60 * 60 * 1000;
}

function crownsExpeditionDuration(distanceKm, maritime) {
  if (CROWNS_LOCAL_PREVIEW || process.env.CROWNS_ACTION_MS) return CROWNS_ACTION_MS;
  const minutes = distanceKm <= 180 ? 5 : distanceKm <= 520 ? 20 : distanceKm <= 1100 ? 60 : 120;
  return Math.min(120, maritime ? Math.max(20, minutes) : minutes) * 60 * 1000;
}

function crownsBuildingLevel(serverId, regionId, buildingType) {
  return Number(getCcBuildingsForRegion.all(serverId, regionId).find(item => item.building_type === buildingType)?.level || 0);
}

function crownsRegionIsCoastal(regionId) {
  return Boolean((crownsRegionMetadataById.get(regionId)?.routeNeighborIds || []).length);
}

function crownsRegionDistanceKm(fromRegionId, toRegionId) {
  const from = crownsRegionMetadataById.get(fromRegionId);
  const to = crownsRegionMetadataById.get(toRegionId);
  if (!from?.centroid || !to?.centroid) return 0;
  return Math.round(Math.hypot(to.centroid[0] - from.centroid[0], to.centroid[1] - from.centroid[1]) / 1000);
}

function crownsDistanceQuadrants(fromRegionId, toRegionId) {
  return Math.max(1, Math.ceil(crownsRegionDistanceKm(fromRegionId, toRegionId) / 750));
}

function crownsFleetUnits(value = {}) {
  return {
    fishing: Math.max(0, Math.trunc(Number(value.fishing || 0))),
    light: Math.max(0, Math.trunc(Number(value.light || 0))),
    medium: Math.max(0, Math.trunc(Number(value.medium || 0))),
    heavy: Math.max(0, Math.trunc(Number(value.heavy || 0)))
  };
}

function crownsFleetTotal(value = {}, includeFishing = true) {
  const fleet = crownsFleetUnits(value);
  return (includeFishing ? fleet.fishing : 0) + fleet.light + fleet.medium + fleet.heavy;
}

function crownsFleetPower(value = {}, mode = 'attack') {
  const fleet = crownsFleetUnits(value);
  return ['light', 'medium', 'heavy'].reduce((sum, shipType) => sum + fleet[shipType] * Number(CROWNS_SHIPS[shipType][mode] || 0), 0);
}

function crownsFleetRange(value = {}) {
  const fleet = crownsFleetUnits(value);
  const activeRanges = ['light', 'medium', 'heavy'].filter(type => fleet[type] > 0).map(type => CROWNS_SHIPS[type].rangeQuadrants);
  return activeRanges.length ? Math.min(...activeRanges) : 0;
}

function crownsMergeFleet(serverId, realmId, regionId, ships, morale = 70, now = new Date().toISOString()) {
  const incoming = crownsFleetUnits(ships);
  if (!crownsFleetTotal(incoming)) return null;
  const current = getCcFleetAtRegion.get(serverId, realmId, regionId);
  if (!current) {
    const id = `fleet_${serverId}_${realmId}_${regionId}_${crypto.randomUUID().slice(0, 8)}`;
    insertCcFleet.run(id, serverId, realmId, regionId, incoming.fishing, incoming.light, incoming.medium, incoming.heavy, Math.max(25, Math.min(100, morale)), now, now);
    return getCcFleetAtRegion.get(serverId, realmId, regionId);
  }
  reinforceCcFleet.run(incoming.fishing, incoming.light, incoming.medium, incoming.heavy, now, current.id, serverId);
  return getCcFleetAtRegion.get(serverId, realmId, regionId);
}

function crownsProvinceProjection(serverId, realmId, province) {
  const buildings = getCcBuildingsForRegion.all(serverId, province.region_id);
  const level = type => Number(buildings.find(item => item.building_type === type)?.level || 0);
  const army = getCcArmyAtRegion.get(serverId, realmId, province.region_id);
  const fleet = getCcFleetAtRegion.get(serverId, realmId, province.region_id);
  const population = Math.max(100, Number(province.population || 1200));
  const subsistenceFood = province.resource_type === 'grain' ? Number(province.resource_yield || 60) : 24;
  const foodProduction = subsistenceFood + level('fazenda') * 45 + Number(fleet?.fishing || 0) * CROWNS_SHIPS.fishing.foodPerDay;
  const civilConsumption = Math.ceil(population / 28);
  const militaryConsumption = army ? Math.ceil(crownsTroopTotal(army) / 45) : 0;
  const foodConsumption = civilConsumption + militaryConsumption;
  const marketIncome = level('mercado') * 28;
  const resourceIncome = province.resource_type === 'treasury' ? Number(province.resource_yield || 60) : 0;
  const taxEfficiency = Math.max(0.15, Math.min(1, Number(province.loyalty || 70) / 100 * (1 - Number(province.unrest || 0) / 140)));
  const taxIncome = Math.max(0, Math.round((population / 52) * (Number(province.tax_rate || 18) / 18) * taxEfficiency + marketIncome + resourceIncome));
  const foodCapacity = 800 + level('armazem') * 600;
  return {
    buildings,
    population,
    foodProduction,
    foodConsumption,
    foodBalance: foodProduction - foodConsumption,
    foodCapacity,
    taxIncome,
    loyalty: Number(province.loyalty || 70),
    unrest: Number(province.unrest || 8),
    taxRate: Number(province.tax_rate || 18),
    portLevel: level('porto'),
    templeLevel: level('templo'),
    fishingBoats: Number(fleet?.fishing || 0)
  };
}

function crownsTroops(value = {}) {
  return {
    spearmen: Math.max(0, Math.trunc(Number(value.spearmen ?? value.infantry ?? 0))),
    archers: Math.max(0, Math.trunc(Number(value.archers || 0))),
    cavalry: Math.max(0, Math.trunc(Number(value.cavalry || 0))),
    siege: Math.max(0, Math.trunc(Number(value.siege || 0)))
  };
}

function crownsTroopTotal(value = {}) {
  const troops = crownsTroops(value);
  return troops.spearmen + troops.archers + troops.cavalry + troops.siege;
}

function crownsTroopPower(value = {}, mode = 'attack') {
  const troops = crownsTroops(value);
  return Object.entries(troops).reduce((sum, [unitType, total]) => {
    return sum + total * Number(CROWNS_UNITS[unitType]?.[mode] || 1);
  }, 0);
}

function crownsReserveGarrisonTroops(army, serverId, troops, now) {
  const force = crownsTroops(troops);
  const reserved = reserveCcArmyTroops.run(
    force.spearmen, force.archers, force.cavalry, force.siege, now,
    army.id, serverId,
    force.spearmen, force.archers, force.cavalry, force.siege
  );
  if (Number(reserved.changes) !== 1) throw new Error('A guarniÃ§Ã£o nÃ£o possui todas as tropas escolhidas.');
  return force;
}

function crownsMergeGarrison(serverId, realmId, regionId, troops, morale = 65, now = new Date().toISOString()) {
  const force = crownsTroops(troops);
  if (!crownsTroopTotal(force)) return null;
  const current = getCcArmyAtRegion.get(serverId, realmId, regionId);
  if (!current) {
    const id = `army_${serverId}_${realmId}_${regionId}_${crypto.randomUUID().slice(0, 8)}`;
    insertCcGarrison.run(id, serverId, realmId, regionId, force.spearmen, force.archers, force.cavalry, force.siege, Math.max(25, Math.min(100, Math.round(morale))), now, now);
    return getCcArmyById.get(id, serverId);
  }
  const currentTroops = crownsTroops(current);
  const currentTotal = crownsTroopTotal(currentTroops);
  const incomingTotal = crownsTroopTotal(force);
  const mergedMorale = Math.max(25, Math.min(100, Math.round((Number(current.morale || 65) * currentTotal + Number(morale || 65) * incomingTotal) / Math.max(1, currentTotal + incomingTotal))));
  updateCcArmyAfterBattle.run(
    currentTroops.spearmen + force.spearmen,
    currentTroops.archers + force.archers,
    currentTroops.cavalry + force.cavalry,
    currentTroops.siege + force.siege,
    mergedMorale,
    regionId,
    now,
    current.id,
    serverId
  );
  return getCcArmyById.get(current.id, serverId);
}

function crownsOwnedReturnRegion(serverId, realmId, preferredRegionId) {
  const owned = getCcOwnedRegions.all(serverId, realmId).map(row => row.region_id);
  if (owned.includes(preferredRegionId)) return preferredRegionId;
  const realm = getCcRealmById.get(realmId, serverId);
  return owned.includes(realm?.capital_region_id) ? realm.capital_region_id : owned[0] || null;
}

function crownsOwnedCoastalReturnRegion(serverId, realmId, preferredRegionId) {
  const owned = getCcOwnedRegions.all(serverId, realmId).map(row => row.region_id);
  if (owned.includes(preferredRegionId) && crownsRegionIsCoastal(preferredRegionId)) return preferredRegionId;
  const realm = getCcRealmById.get(realmId, serverId);
  const candidates = [realm?.capital_region_id, ...owned].filter(Boolean);
  return candidates.find(regionId => owned.includes(regionId) && crownsRegionIsCoastal(regionId)) || null;
}

function preserveCrownsRealmAfterConquest(serverId, defeatedRealmId, lostRegionId, now) {
  const defeated = getCcRealmById.get(defeatedRealmId, serverId);
  const replacement = getCcSeasonRegions.all(serverId)
    .filter(region => region.owner_realm_id === defeatedRealmId && region.id !== lostRegionId)
    .sort((a, b) => Number(b.development || 1) - Number(a.development || 1) || String(a.name).localeCompare(String(b.name), 'pt-BR'))[0];
  const displaced = getCcArmiesForRealm.all(serverId, defeatedRealmId).filter(army => army.region_id === lostRegionId);
  const displacedFleet = getCcFleetAtRegion.get(serverId, defeatedRealmId, lostRegionId);
  if (!replacement) {
    displaced.forEach(army => deleteCcArmy.run(army.id, serverId));
    if (displacedFleet) deleteCcFleet.run(displacedFleet.id, serverId);
    return null;
  }
  displaced.forEach(army => {
    const troops = crownsTroops(army);
    deleteCcArmy.run(army.id, serverId);
    crownsMergeGarrison(serverId, defeatedRealmId, replacement.id, troops, Math.max(25, Number(army.morale || 65) - 12), now);
  });
  if (displacedFleet) {
    const ships = crownsFleetUnits(displacedFleet);
    deleteCcFleet.run(displacedFleet.id, serverId);
    if (crownsRegionIsCoastal(replacement.id)) crownsMergeFleet(serverId, defeatedRealmId, replacement.id, ships, Math.max(25, Number(displacedFleet.morale || 65) - 12), now);
  }
  if (defeated?.capital_region_id === lostRegionId) {
    relocateCcRealmCapital.run(replacement.id, now, defeatedRealmId, serverId, lostRegionId);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'realm.capital_relocated', defeatedRealmId, replacement.id, JSON.stringify({
      lostRegionId,
      summary: `${defeated.name} transferiu sua corte para ${replacement.name} depois da queda da antiga capital.`
    }), now);
  }
  return replacement.id;
}

function crownsEconomySummary(serverId, realm) {
  if (!realm) return null;
  const buildings = getCcBuildingsForRealm.all(serverId, realm.id);
  const levels = type => buildings.filter(item => item.building_type === type).reduce((sum, item) => sum + item.level, 0);
  const provinces = getCcOwnedRegionEconomy.all(serverId, realm.id);
  const projections = provinces.map(province => crownsProvinceProjection(serverId, realm.id, province));
  const provinceYield = resource => provinces.filter(region => region.resource_type === resource).reduce((sum, region) => sum + Number(region.resource_yield || 60), 0);
  const upkeep = projections.reduce((sum, province) => sum + province.foodConsumption - Math.ceil(province.population / 28), 0);
  const daily = {
    treasury: projections.reduce((sum, province) => sum + province.taxIncome, 0),
    provisions: projections.reduce((sum, province) => sum + Math.max(0, Math.floor(province.foodBalance * 0.25)), 0),
    wood: provinceYield('wood') + 38 * levels('serraria'),
    stone: provinceYield('stone') + 34 * levels('pedreira')
  };
  const storage = 3500 + levels('armazem') * 1500;
  return {
    daily,
    upkeep,
    storage,
    provinceCount: provinces.length,
    population: projections.reduce((sum, province) => sum + province.population, 0),
    hungryProvinces: projections.filter(province => province.foodBalance < 0).length,
    rebelliousProvinces: projections.filter(province => province.unrest >= 65 || province.loyalty <= 35).length
  };
}

function publicCcRealm(realm) {
  if (!realm) return null;
  return {
    id: realm.id,
    name: realm.name,
    houseName: realm.house_name,
    color: realm.color,
    capitalRegionId: realm.capital_region_id,
    treasury: realm.treasury,
    provisions: realm.provisions,
    wood: Number(realm.wood || 0),
    stone: Number(realm.stone || 0),
    prestige: realm.prestige,
    isAi: Boolean(realm.is_ai),
    playerName: realm.is_ai ? null : realm.player_name || null,
    playerAvatar: realm.is_ai ? null : realm.player_avatar || null,
    realmKind: realm.realm_kind || 'player',
    originRealmId: realm.origin_realm_id || null,
    rulerName: realm.ruler_name || 'Governante não registrado',
    heirName: realm.heir_name || null,
    legitimacy: Number(realm.legitimacy ?? 70),
    stability: Number(realm.stability ?? 65),
    popularSupport: Number(realm.popular_support ?? 60),
    religion: realm.religion || 'Cristianismo',
    religiousUnity: Number(realm.religious_unity ?? 70),
    heresyPressure: Number(realm.heresy_pressure ?? 8),
    nextEconomyAt: new Date(new Date(realm.last_economy_at || realm.created_at).getTime() + CROWNS_GAME_DAY_MS).toISOString()
  };
}

function crownsAvailableFaiths(serverId) {
  const realms = getCcRealms.all(serverId);
  const provinces = getCcRegionReligions.all(serverId);
  const customFaiths = getCcCustomFaiths.all(serverId);
  const countFollowers = name => ({
    realmCount: realms.filter(realm => realm.religion === name).length,
    provinceCount: provinces.filter(region => region.majority_religion === name).length
  });
  return [
    ...CROWNS_RELIGIONS.map(name => ({ id: `base:${name}`, name, parentFaith: name, isCustom: false, dogmas: [], ...countFollowers(name) })),
    ...customFaiths.map(faith => ({
      id: faith.id,
      name: faith.name,
      parentFaith: faith.parent_faith,
      isCustom: true,
      founderRealmId: faith.founder_realm_id,
      founderRealmName: faith.founder_realm_name,
      founderRegionName: faith.founder_region_name,
      dogmas: safeJsonParse(faith.dogmas_json, []),
      ...countFollowers(faith.name)
    }))
  ];
}

function crownsGoodwill(serverId, sourceRealmId, targetRealmId) {
  const exchanges = getCcDiplomaticExchanges.all(serverId);
  const gifts = exchanges
    .filter(item => item.exchange_kind === 'gift' && item.status === 'delivered' && item.sender_realm_id === sourceRealmId && item.recipient_realm_id === targetRealmId)
    .reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.amount) / 25)), 0);
  const requests = exchanges
    .filter(item => item.exchange_kind === 'request' && item.sender_realm_id === targetRealmId && item.recipient_realm_id === sourceRealmId)
    .reduce((sum, item) => sum + (item.status === 'accepted' ? Math.max(2, Math.floor(Number(item.amount) / 20)) : item.status === 'declined' ? -4 : 0), 0);
  return Math.max(-20, Math.min(60, gifts + requests));
}

function crownsRealmCourt(realm, serverId) {
  if (!realm) return null;
  const realms = getCcRealms.all(serverId);
  const knownRealms = realms.filter(other => other.id !== realm.id).map(other => {
    const relationSeed = [...`${realm.id}:${other.id}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const goodwill = crownsGoodwill(serverId, realm.id, other.id);
    const relation = goodwill >= 28 ? 'aliado em potencial' : goodwill >= 12 ? 'cordial' : goodwill < 0 ? 'ofendido' : relationSeed % 7 === 0 ? 'cauteloso' : 'neutro';
    return {
      ...publicCcRealm(other),
      capitalName: other.capital_name,
      regionCount: Number(other.region_count || 0),
      relation,
      goodwill
    };
  });
  const stability = Number(realm.stability ?? 65);
  const regionCount = Number(realms.find(item => item.id === realm.id)?.region_count || 0);
  return {
    dynasty: {
      houseName: realm.house_name,
      rulerName: realm.ruler_name || 'Governante não registrado',
      heirName: realm.heir_name || 'Herdeiro ainda não designado',
      legitimacy: Number(realm.legitimacy ?? 70)
    },
    internal: {
      stability,
      popularSupport: Number(realm.popular_support ?? 60),
      separatistRisk: Math.max(2, Math.min(85, (100 - stability) + Math.max(0, regionCount - 2) * 4)),
      canRevolt: regionCount >= 3,
      explanation: regionCount >= 3 ? 'Reinos extensos e instáveis podem perder uma província para uma revolução comandada pela IA.' : 'Revoluções separatistas exigem ao menos três regiões no domínio.'
    },
    diplomacy: {
      aiRealmCount: knownRealms.filter(item => item.isAi).length,
      knownRealms
    },
    religion: {
      faith: realm.religion || 'Cristianismo',
      unity: Number(realm.religious_unity ?? 70),
      heresyPressure: Number(realm.heresy_pressure ?? 8),
      warning: Number(realm.heresy_pressure ?? 8) >= 35 ? 'Pregadores heréticos ameaçam a unidade da coroa.' : 'A confissão oficial permanece estável por enquanto.'
    }
  };
}
function publicCrownsJournalEvent(row) {
  const payload = safeJsonParse(row.payload_json, {});
  const realmName = row.actor_realm_name || payload.name || 'Uma casa sem nome';
  const regionName = row.region_name || 'terras desconhecidas';
  const templates = {
    'building.completed': { category: 'economy', headline: `${payload.buildingName || 'Uma obra'} é concluída em ${regionName}`, summary: `Os oficiais de ${realmName} confirmaram o término da construção.` },
    'province.tax_changed': { category: 'economy', headline: `${realmName} altera os impostos de ${regionName}`, summary: payload.summary || `A província passa a recolher ${payload.taxRate || 18}% da produção tributável.` },
    'army.recruited': { category: 'army', headline: `${realmName} treina ${payload.unitName || 'novos soldados'}`, summary: `${payload.units || 0} combatentes foram incorporados em ${regionName}.` },
    'navy.construction_started': { category: 'army', headline: `O estaleiro de ${regionName} recebe uma encomenda`, summary: `${realmName} iniciou a construção de ${payload.units || 0} embarcação(ões).` },
    'navy.construction_completed': { category: 'army', headline: `${payload.shipName || 'Novas embarcações'} deixam o estaleiro`, summary: `${payload.units || 0} navio(s) foram incorporados à frota de ${regionName}.` },
    'navy.raid_started': { category: 'war', headline: `${realmName} lança uma incursão naval`, summary: `Uma frota partiu para ${regionName}, a ${payload.quadrants || 1} quadrante(s) de distância.` },
    'navy.raid_victory': { category: 'war', headline: `${realmName} vence nas águas de ${regionName}`, summary: `A frota regressa com ${payload.loot || 0} moedas depois de romper a defesa costeira.` },
    'navy.raid_defeat': { category: 'war', headline: `${realmName} é repelido no mar`, summary: `Os defensores de ${regionName} dispersaram a incursão após afundar ${payload.attackerLosses || 0} navio(s).` },
    'navy.raid_aborted': { category: 'war', headline: `A frota de ${realmName} retorna sem combater`, summary: payload.summary || 'O objetivo naval mudou de domínio antes da chegada.' },
    'market.offer.created': { category: 'economy', headline: `${realmName} abre uma oferta no mercado`, summary: `Mercadores oferecem ${payload.sellAmount || 0} de ${CROWNS_RESOURCES[payload.sellResource]?.name || payload.sellResource} em troca de ${payload.buyAmount || 0} de ${CROWNS_RESOURCES[payload.buyResource]?.name || payload.buyResource}.` },
    'market.trade.completed': { category: 'economy', headline: `Uma troca é concluída no mercado`, summary: `${realmName} adquiriu ${payload.sellAmount || 0} de ${CROWNS_RESOURCES[payload.sellResource]?.name || payload.sellResource}.` },
    'diplomacy.gift.sent': { category: 'alliance', headline: `${realmName} envia presentes a ${payload.targetName || 'outra corte'}`, summary: `${payload.amount || 0} de ${CROWNS_RESOURCES[payload.resourceType]?.name || payload.resourceType} seguiram com a embaixada para melhorar as relações.` },
    'diplomacy.request.created': { category: 'alliance', headline: `${realmName} solicita auxílio material`, summary: `A embaixada pediu ${payload.amount || 0} de ${CROWNS_RESOURCES[payload.resourceType]?.name || payload.resourceType} a uma coroa vizinha.` },
    'diplomacy.request.accepted': { category: 'alliance', headline: `${realmName} atende a um pedido diplomático`, summary: `${payload.amount || 0} de ${CROWNS_RESOURCES[payload.resourceType]?.name || payload.resourceType} foram enviados a ${payload.senderName || 'outra corte'}.` },
    'diplomacy.request.declined': { category: 'alliance', headline: `${realmName} recusa um pedido de auxílio`, summary: `A corte decidiu preservar seus estoques e não enviou ${payload.amount || 0} de ${CROWNS_RESOURCES[payload.resourceType]?.name || payload.resourceType}.` },
    'season.ended': { category: 'world', headline: `${payload.winner || realmName} vence a temporada`, summary: 'O sexagésimo dia terminou e os arautos publicaram a classificação final.' },
    'realm.created': { category: 'realm', headline: `${realmName} ergue seu estandarte`, summary: `${payload.houseName || row.actor_house_name || 'Uma nova casa'} fundou um reino com capital em ${regionName}.` },
    'territory.claim.started': { category: 'campaign', headline: `${realmName} envia uma expedição`, summary: `Mensageiros confirmam uma reivindicação em marcha sobre ${regionName}.` },
    'territory.claim.completed': { category: 'campaign', headline: `${regionName} passa à coroa de ${realmName}`, summary: `A incorporação foi proclamada pelos arautos e registrada pelo conselho.` },
    'territory.claim.cancelled': { category: 'campaign', headline: `${realmName} recua de ${regionName}`, summary: `A ordem territorial foi cancelada e os recursos retornaram ao tesouro.` },
    'war.declared': { category: 'war', headline: `${realmName} declara guerra`, summary: payload.summary || 'Os sinos de alarme ecoam pelas fronteiras.' },
    'peace.signed': { category: 'peace', headline: `A paz é firmada por ${realmName}`, summary: payload.summary || 'Emissários selaram o tratado diante das testemunhas.' },
    'alliance.formed': { category: 'alliance', headline: `${realmName} anuncia uma aliança`, summary: payload.summary || 'Juramentos de auxílio mútuo foram tornados públicos.' },
    'marriage.celebrated': { category: 'marriage', headline: `Casamento dinástico em ${realmName}`, summary: payload.summary || 'Duas casas uniram seus destinos diante da corte.' },
    'war.victory': { category: 'war', headline: `${realmName} vence a batalha por ${regionName}`, summary: `A hoste atacante rompeu as defesas com força estimada em ${payload.attackPower || 0}.` },
    'war.defeat': { category: 'war', headline: `${realmName} é repelido em ${regionName}`, summary: `Os defensores mantiveram a província após uma batalha de força ${payload.defensePower || 0}.` },
    'war.march_aborted': { category: 'war', headline: `A marcha de ${realmName} é interrompida`, summary: payload.summary || 'A província mudou de mãos antes da chegada da hoste.' },
    'army.defended': { category: 'army', headline: `${realmName} fortifica ${regionName}`, summary: payload.summary || 'A hoste tomou posições defensivas.' },
    'army.transfer.started': { category: 'army', headline: `${realmName} redistribui suas tropas`, summary: `${payload.total || 0} soldados deixaram sua guarnição de origem.` },
    'army.transfer.completed': { category: 'army', headline: `Reforços chegam a ${regionName}`, summary: payload.summary || `${payload.total || 0} soldados reforçaram a província.` },
    'army.transfer.aborted': { category: 'army', headline: `O reforço para ${regionName} retorna`, summary: payload.summary || 'O destino deixou de ser seguro.' },
    'religion.mission_completed': { category: 'religion', headline: `Missionários de ${realmName} chegam a ${regionName}`, summary: `A presença de ${payload.faith || 'sua fé'} cresceu gradualmente entre a população.` },
    'religion.mission_failed': { category: 'religion', headline: `A missão de ${realmName} encontra resistência`, summary: `O templo de ${regionName} conteve os pregadores de ${payload.faith || 'uma fé estrangeira'}.` },
    'religion.mission_started': { category: 'religion', headline: `${realmName} envia missionários`, summary: `Pregadores partiram para ${regionName}, a ${payload.quadrants || 1} quadrante(s) da casa religiosa de origem.` },
    'religion.faith_founded': { category: 'religion', headline: `${payload.name || 'Uma nova religião'} é proclamada`, summary: payload.summary || `${realmName} reuniu seu clero e organizou uma nova comunhão religiosa.` },
    'religion.heresy_suppressed': { category: 'religion', headline: `${realmName} contém uma heresia em ${regionName}`, summary: 'A dissidência recuou, embora a ação tenha causado tensão interna.' },
    'religion.movement_emerged': { category: 'religion', headline: `${payload.movementName || 'Uma nova doutrina'} começa a se espalhar`, summary: payload.summary || 'Pregadores e bispos dividem-se diante de uma nova interpretação da fé cristã.' },
    'religion.realm_converted': { category: 'religion', headline: `${realmName} muda sua confissão`, summary: payload.summary || `A corte aderiu ao ${payload.movementName || 'novo movimento'}.` },
    'religion.movement_answered': { category: 'religion', headline: `${realmName} responde ao ${payload.movementName || 'movimento religioso'}`, summary: payload.summary || 'A decisão foi proclamada diante do clero e da corte.' },
    'council.vote': { category: 'council', headline: `${realmName} apresenta seu voto`, summary: `${payload.councilName || 'O concílio'} recebeu a posição oficial da delegação.` },
    'council.decided': { category: 'council', headline: `${payload.councilName || 'O concílio'} publica seu decreto`, summary: payload.summary || 'A votação foi encerrada e o resultado proclamado.' },
    'council.received': { category: 'council', headline: `${realmName} responde ao decreto`, summary: `${payload.councilName || 'O concílio'} foi ${payload.reception === 'receive' ? 'recebido' : 'resistido'} pela coroa.` },
    'revolution.separatist': { category: 'revolution', headline: `${realmName} proclama sua independência`, summary: payload.summary || `${regionName} rompeu com a antiga coroa e passou a ser governada por uma nova IA.` }
  };
  const template = templates[row.event_type] || { category: 'world', headline: `Novo acontecimento em ${realmName}`, summary: payload.summary || `A chancelaria registrou notícias vindas de ${regionName}.` };
  return { id: row.id, kind: 'world', eventType: row.event_type, ...template, realmName, regionName, createdAt: row.created_at };
}
function crownsJournal(serverId) {
  const publicEventTypes = new Set([
    'territory.claim.started',
    'territory.claim.completed',
    'territory.claim.cancelled',
    'war.declared',
    'war.victory',
    'war.defeat',
    'war.march_aborted',
    'peace.signed',
    'navy.raid_started',
    'navy.raid_victory',
    'navy.raid_defeat',
    'navy.raid_aborted'
  ]);
  const events = getCcJournalEvents.all(serverId, 2000)
    .filter(row => publicEventTypes.has(row.event_type))
    .map(publicCrownsJournalEvent);
  const articles = getCcArticles.all(serverId, 40).map(row => ({
    id: row.id,
    kind: 'article',
    category: 'article',
    headline: row.title,
    summary: row.body,
    authorName: row.author_name,
    realmName: row.realm_name,
    houseName: row.house_name,
    createdAt: row.published_at
  }));
  return [...events, ...articles].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
function publishCrownsArticle(user, payload, serverId) {
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de enviar artigos ao jornal.');
  const title = String(payload?.title || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, CROWNS_ARTICLE_TITLE_MAX);
  const body = String(payload?.body || '').replace(/[<>]/g, '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, CROWNS_ARTICLE_BODY_MAX);
  if (title.length < 5 || body.length < 20) throw new Error('O artigo precisa de título e pelo menos 20 caracteres de texto.');
  const latest = getCcLatestArticleByUser.get(serverId, user.id);
  if (latest && Date.now() - new Date(latest.published_at).getTime() < CROWNS_ARTICLE_COOLDOWN_MS) throw new Error('A tipografia ainda prepara seu último artigo. Aguarde dois minutos.');
  const id = `article_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  insertCcArticle.run(id, serverId, user.id, realm.id, title, body, now, now);
  const article = crownsJournal(serverId).find(item => item.id === id);
  emitCrownsEvent('journal.published', { seasonId: serverId, article, version: Date.now() });
  return article;
}
function crownsBootstrap(user, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  processCrownsActions();
  processCrownsEconomy(serverId);
  processCrownsSeasonLifecycle(serverId);
  processCrownsCouncils(serverId);
  processCrownsReligiousMovements(serverId);
  processCrownsDiplomaticRequests(serverId);
  const season = getCcSeason.get(serverId);
  const seasonClock = crownsSeasonClock(season);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const ownedIds = new Set(realm ? getCcOwnedRegions.all(serverId, realm.id).map(row => row.region_id) : []);
  const regions = getCcSeasonRegions.all(serverId).map(row => {
    const neighborIds = safeJsonParse(row.neighbor_ids_json, []);
    const metadata = crownsRegionMetadataById.get(row.id) || {};
    return {
      id: row.id,
      name: row.name,
      countryCode: row.country_code,
      iso3Code: row.iso3_code,
      centroid: [row.centroid_x, row.centroid_y],
      neighborIds,
      ownerRealmId: row.owner_realm_id,
      ownerName: row.owner_name || null,
      ownerColor: row.owner_color || null,
      ownerIsAi: Boolean(row.owner_is_ai),
      ownerRealmKind: row.owner_realm_kind || null,
      reservedByName: row.reserved_by_name || null,
      reservedUntil: row.reserved_until || null,
      status: row.status,
      development: row.development,
      population: Number(row.population || 1200),
      foodStock: Number(row.food_stock || 650),
      taxRate: Number(row.tax_rate || 18),
      loyalty: Number(row.loyalty || 70),
      unrest: Number(row.unrest || 8),
      resourceType: row.resource_type,
      resourceName: CROWNS_RESOURCES[row.resource_type]?.name || 'Trigo',
      resourceYield: Number(row.resource_yield || 60),
      version: row.version,
      countryName: metadata.countryName || row.country_code,
      suggestedReligion: crownsFaithForRegion({ countryCode: row.country_code }),
      levelLabel: metadata.levelLabel || 'Região',
      sourceKind: metadata.sourceKind || 'UNKNOWN',
      routeNeighborIds: metadata.routeNeighborIds || [],
      isCoastal: crownsRegionIsCoastal(row.id),
      isAdjacentToRealm: Boolean(realm && !row.owner_realm_id && neighborIds.some(id => ownedIds.has(id))),
      isBorderRegion: Boolean(realm && row.owner_realm_id !== realm.id && neighborIds.some(id => ownedIds.has(id)))
    };
  });
  const actions = realm ? getCcPendingActionsForRealm.all(serverId, realm.id).map(action => {
    const cost = safeJsonParse(action.cost_json, {});
    const buildingType = action.type.startsWith('building.') ? action.type.split('.')[1] : null;
    return {
      id: action.id,
      type: action.type,
      label: action.type === 'territory.claim' ? 'Expedição territorial' : action.type === 'army.recruit' ? `Treinamento: ${CROWNS_UNITS[cost.unitType]?.name || 'recrutas'}` : action.type === 'army.defend' ? 'Preparação defensiva' : action.type === 'army.transfer' ? 'Deslocamento de tropas' : action.type === 'army.attack' ? 'Marcha de invasão' : action.type === 'navy.attack' ? 'Incursão naval' : action.type.startsWith('navy.build.') ? `Estaleiro: ${CROWNS_SHIPS[cost.shipType]?.name || 'embarcações'}` : action.type === 'religion.mission' ? 'Missão religiosa' : action.type === 'religion.suppress' ? 'Combate à heresia' : CROWNS_BUILDINGS[buildingType]?.name || 'Ordem do conselho',
      regionId: action.region_id,
      status: action.status,
      completesAt: action.completes_at,
      createdAt: action.created_at,
      cost
    };
  }) : [];
  const buildings = realm ? getCcBuildingsForRealm.all(serverId, realm.id).map(item => ({ regionId: item.region_id, type: item.building_type, level: item.level, ...CROWNS_BUILDINGS[item.building_type] })) : [];
  const armies = realm ? getCcArmiesForRealm.all(serverId, realm.id).map(item => ({ id: item.id, regionId: item.region_id, regionName: item.region_name, infantry: item.infantry, spearmen: item.infantry, archers: item.archers, cavalry: item.cavalry, siege: Number(item.siege || 0), morale: item.morale, total: item.infantry + item.archers + item.cavalry + Number(item.siege || 0) })) : [];
  const provinceEconomies = realm ? getCcOwnedRegionEconomy.all(serverId, realm.id).map(province => {
    const projection = crownsProvinceProjection(serverId, realm.id, province);
    return {
      regionId: province.region_id,
      regionName: province.name,
      population: projection.population,
      foodStock: Number(province.food_stock || 0),
      foodCapacity: projection.foodCapacity,
      foodProduction: projection.foodProduction,
      foodConsumption: projection.foodConsumption,
      foodBalance: projection.foodBalance,
      taxRate: Number(province.tax_rate || 18),
      taxIncome: projection.taxIncome,
      loyalty: Number(province.loyalty || 70),
      unrest: Number(province.unrest || 8),
      portLevel: projection.portLevel,
      templeLevel: projection.templeLevel,
      resourceType: province.resource_type,
      resourceName: CROWNS_RESOURCES[province.resource_type]?.name || province.resource_type,
      resourceYield: Number(province.resource_yield || 60),
      isCoastal: crownsRegionIsCoastal(province.region_id)
    };
  }) : [];
  const fleets = realm ? getCcFleetsForRealm.all(serverId, realm.id).map(item => ({
    id: item.id,
    regionId: item.region_id,
    regionName: item.region_name,
    ...crownsFleetUnits(item),
    total: crownsFleetTotal(item),
    combatTotal: crownsFleetTotal(item, false),
    attack: crownsFleetPower(item, 'attack'),
    defense: crownsFleetPower(item, 'defense'),
    rangeQuadrants: crownsFleetRange(item),
    morale: Number(item.morale || 70)
  })) : [];
  const customFaith = realm ? getCcCustomFaithForRealm.get(serverId, realm.id) : null;
  const treaties = realm ? getCcTreaties.all(serverId).filter(item => item.proposer_realm_id === realm.id || item.target_realm_id === realm.id).map(item => ({ id: item.id, treatyType: item.treaty_type, status: item.status, proposerRealmId: item.proposer_realm_id, proposerName: item.proposer_name, targetRealmId: item.target_realm_id, targetName: item.target_name, expiresAt: item.expires_at })) : [];
  const marriages = realm ? getCcMarriages.all(serverId).filter(item => item.proposer_realm_id === realm.id || item.target_realm_id === realm.id).map(item => ({ id: item.id, status: item.status, proposerName: item.proposer_name, targetName: item.target_name, proposerSpouse: item.proposer_spouse, targetSpouse: item.target_spouse, childReligion: item.child_religion, inheritanceClause: item.inheritance_clause, dowry: item.dowry })) : [];
  const wars = realm ? getCcWars.all(serverId).filter(item => item.attacker_realm_id === realm.id || item.defender_realm_id === realm.id).map(item => ({ id: item.id, status: item.status, attackerRealmId: item.attacker_realm_id, attackerName: item.attacker_name, defenderRealmId: item.defender_realm_id, defenderName: item.defender_name, objectiveRegionId: item.objective_region_id, objectiveName: item.objective_name, score: item.score, result: safeJsonParse(item.result_json, {}), startedAt: item.started_at, endedAt: item.ended_at })) : [];
  const regionReligions = realm ? getCcRegionReligions.all(serverId).filter(item => ownedIds.has(item.region_id)).map(item => ({ regionId: item.region_id, regionName: item.region_name, majorityReligion: item.majority_religion, majorityShare: item.majority_share, heresyName: item.heresy_name, heresyShare: item.heresy_share })) : [];
  const councils = getCcCouncils.all(serverId).map(item => { const vote = realm && getCcCouncilVote.get(item.id, realm.id); const reception = realm && getCcCouncilReception.get(item.id, realm.id); return { id: item.id, name: item.name, theme: item.theme, kind: item.council_kind, status: item.status, startsAt: item.starts_at, endsAt: item.ends_at, result: item.result_key, vote: vote?.vote_key || null, reception: reception?.reception_key || null, totals: Object.fromEntries(getCcCouncilVotes.all(item.id).map(row => [row.vote_key, Number(row.total)])) }; });
  const religiousMovements = getCcReligiousMovements.all(serverId).map(item => {
    const response = realm && getCcReligiousResponse.get(item.id, realm.id);
    const acceptances = db.prepare("SELECT COUNT(*) AS total FROM cc_religious_responses WHERE movement_id = ? AND response_key = 'accept'").get(item.id);
    const template = CROWNS_RELIGIOUS_MOVEMENTS.find(entry => entry.key === item.movement_key);
    return { id: item.id, key: item.movement_key, name: item.name, description: item.description, startsDay: item.starts_day, parentFaith: template?.faith || 'Cristianismo', relevant: !realm || baseCrownsFaith(realm.religion) === (template?.faith || 'Cristianismo'), status: item.status, response: response?.response_key || null, convertedRealms: Number(acceptances?.total || 0) };
  });
  const diplomaticExchanges = realm ? getCcDiplomaticExchanges.all(serverId).filter(item => item.sender_realm_id === realm.id || item.recipient_realm_id === realm.id).map(item => ({
    id: item.id,
    senderRealmId: item.sender_realm_id,
    senderName: item.sender_name,
    senderHouse: item.sender_house,
    recipientRealmId: item.recipient_realm_id,
    recipientName: item.recipient_name,
    recipientHouse: item.recipient_house,
    kind: item.exchange_kind,
    resourceType: item.resource_type,
    amount: Number(item.amount),
    status: item.status,
    gameDay: Number(item.game_day),
    createdAt: item.created_at
  })) : [];
  return {
    user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
    season: {
      id: season.id,
      name: season.name,
      status: season.status,
      day: seasonClock.day,
      totalDays: seasonClock.totalDays,
      phase: seasonClock.phase,
      remainingMs: seasonClock.remainingMs,
      nextDayAt: seasonClock.nextDayAt,
      nextDayRemainingMs: seasonClock.nextDayRemainingMs,
      resetAt: seasonClock.resetAt,
      mode: seasonClock.mode,
      startsAt: season.starts_at,
      statusLabel: seasonClock.phase === 'waiting' ? 'Aguardando sua coroa' : seasonClock.phase === 'open' ? 'Temporada em andamento' : 'Apuração dos vencedores',
      endsAt: season.ends_at,
      geographicVersion: season.geographic_version
    },
    realm: realm ? { ...publicCcRealm(realm), regionCount: ownedIds.size, court: crownsRealmCourt(realm, serverId), economy: crownsEconomySummary(serverId, realm) } : null,
    world: {
      realmCount: getCcRealms.all(serverId).length,
      aiRealmCount: getCcRealms.all(serverId).filter(item => item.is_ai).length
    },
    customization: { availableColors: CROWNS_REALM_COLORS.filter(color => !getCcRealmByColor.get(serverId, color)), religions: CROWNS_RELIGIONS },
    regions,
    actions,
    buildings,
    buildingCatalog: CROWNS_BUILDINGS,
    resourceCatalog: CROWNS_RESOURCES,
    unitCatalog: CROWNS_UNITS,
    shipCatalog: CROWNS_SHIPS,
    dogmaCatalog: CROWNS_DOGMAS,
    armies,
    fleets,
    provinceEconomies,
    marketOrders: getCcMarketOrders.all(serverId).map(order => ({
      id: order.id,
      realmId: order.realm_id,
      sellerName: order.seller_name,
      sellResource: order.sell_resource,
      sellAmount: order.sell_amount,
      buyResource: order.buy_resource,
      buyAmount: order.buy_amount,
      status: order.status,
      isOwn: order.realm_id === realm?.id,
      createdAt: order.created_at,
      buyerName: order.buyer_name || null
    })),
    expedition: { active: actions.filter(action => action.type === 'territory.claim').length, capacity: 2 },
    treaties,
    marriages,
    diplomaticRequests: diplomaticExchanges.filter(item => item.kind === 'request' && item.recipientRealmId === realm?.id && item.status === 'pending'),
    diplomaticExchanges,
    wars,
    regionReligions,
    councils,
    religiousMovements,
    availableFaiths: crownsAvailableFaiths(serverId),
    religiousCrises: realm ? getCcReligiousCrisesForRealm.all(serverId, realm.id).map(crisis => ({
      id: crisis.id,
      regionId: crisis.region_id,
      regionName: crisis.region_name,
      missionaryRealmId: crisis.missionary_realm_id,
      missionaryRealmName: crisis.missionary_realm_name,
      incomingFaith: crisis.incoming_faith,
      previousFaith: crisis.previous_faith,
      severity: Number(crisis.severity),
      createdAt: crisis.created_at
    })) : [],
    customFaith: customFaith ? { id: customFaith.id, name: customFaith.name, parentFaith: customFaith.parent_faith, founderRegionId: customFaith.founder_region_id, dogmas: safeJsonParse(customFaith.dogmas_json, []) } : null,
    customFaiths: getCcCustomFaiths.all(serverId).map(faith => ({ id: faith.id, name: faith.name, parentFaith: faith.parent_faith, founderRealmId: faith.founder_realm_id, founderRegionId: faith.founder_region_id, dogmas: safeJsonParse(faith.dogmas_json, []) })),
    missionary: { active: actions.filter(action => action.type === 'religion.mission').length, capacity: 2 },
    missionTargets: regions.map(item => {
      const faith = getCcRegionReligion.get(serverId, item.id);
      return {
        regionId: item.id,
        regionName: item.name,
        ownerRealmId: item.ownerRealmId,
        ownerName: item.ownerName,
        templeLevel: crownsBuildingLevel(serverId, item.id, 'templo'),
        majorityReligion: faith?.majority_religion || item.suggestedReligion,
        majorityShare: Number(faith?.majority_share || 70),
        dissentReligion: faith?.heresy_name || null,
        dissentShare: Number(faith?.heresy_share || 0)
      };
    }),
    attackTargets: regions.filter(item => item.ownerRealmId && item.ownerRealmId !== realm?.id && item.isBorderRegion).map(item => {
      const fromRegionIds = item.neighborIds.filter(id => ownedIds.has(id));
      const defender = getCcArmyAtRegion.get(serverId, item.ownerRealmId, item.id);
      return {
        regionId: item.id,
        regionName: item.name,
        countryName: item.countryName,
        realmId: item.ownerRealmId,
        realmName: item.ownerName,
        fromRegionIds,
        defender: defender ? { spearmen: defender.infantry, archers: defender.archers, cavalry: defender.cavalry, siege: Number(defender.siege || 0), morale: defender.morale, total: crownsTroopTotal(defender) } : { spearmen: 0, archers: 0, cavalry: 0, siege: 0, morale: 0, total: 0 },
        fortificationLevels: getCcBuildingsForRegion.all(serverId, item.id).filter(building => ['fortaleza', 'muralha', 'torre_vigia'].includes(building.building_type)).reduce((sum, building) => sum + Number(building.level || 0), 0)
      };
    }),
    navalTargets: realm ? regions.filter(item => item.ownerRealmId && item.ownerRealmId !== realm.id && item.isCoastal).map(item => ({
      regionId: item.id,
      regionName: item.name,
      countryName: item.countryName,
      realmId: item.ownerRealmId,
      realmName: item.ownerName,
      portLevel: crownsBuildingLevel(serverId, item.id, 'porto'),
      fleet: (() => {
        const targetFleet = getCcFleetAtRegion.get(serverId, item.ownerRealmId, item.id);
        return targetFleet ? { ...crownsFleetUnits(targetFleet), combatTotal: crownsFleetTotal(targetFleet, false), defense: crownsFleetPower(targetFleet, 'defense'), morale: Number(targetFleet.morale || 70) } : null;
      })()
    })) : [],
    winners: getCcSeasonResults.all(serverId),
    journal: crownsJournal(serverId).slice(0, 20),
    serverNow: new Date().toISOString(),
    map: {
      topologyUrl: `/assets/crowns-and-councils/data/${crownsRegionCatalog.topologyFile || 'christian-theatre-2026-3035.topo.json'}`,
      contextTopologyUrl: `/assets/crowns-and-councils/data/${crownsRegionCatalog.contextTopologyFile || 'world-context-2026-3035.topo.json'}`,
      projection: crownsRegionCatalog.projection,
      regionCount: crownsRegionCatalog.regionCount,
      countryCount: crownsRegionCatalog.countryCount,
      theatre: crownsRegionCatalog.theatre,
      sourceUrl: crownsRegionCatalog.sourceUrl,
      sourceUrls: crownsRegionCatalog.sourceUrls || [crownsRegionCatalog.sourceUrl]
    }
  };
}
function createCrownsRealm(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const name = String(payload?.name || '').replace(/[<>]/g, '').trim().slice(0, 40);
  const houseName = String(payload?.houseName || '').replace(/[<>]/g, '').trim().slice(0, 40);
  const regionId = String(payload?.regionId || '').trim().slice(0, 32);
  const color = /^#[0-9a-f]{6}$/i.test(payload?.color || '') ? String(payload.color).toLowerCase() : CROWNS_REALM_COLORS[10];
  const religion = CROWNS_RELIGIONS.includes(payload?.religion) ? payload.religion : crownsFaithForRegion(crownsRegionCatalog.regions.find(region => region.id === regionId));
  const entryPhase = crownsSeasonClock(processCrownsSeasonLifecycle(serverId)).phase;
  if (!['open', 'waiting'].includes(entryPhase)) throw new Error('Este servidor encerrou a temporada e aguarda o reinício.');
  if (name.length < 3 || houseName.length < 3 || !regionId) throw new Error('Informe reino, casa e capital inicial.');
  const realmId = `realm_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (getCcRealmByUser.get(serverId, user.id)) throw new Error('Sua conta já governa um reino neste servidor.');
    if (!CROWNS_REALM_COLORS.includes(color) || getCcRealmByColor.get(serverId, color)) throw new Error('Essa cor de estandarte já pertence a outra coroa. Escolha uma cor livre.');
    const region = getCcSeasonRegion.get(serverId, regionId);
    if (!region || region.owner_realm_id || region.status !== 'neutral') throw new Error('A região inicial não está mais livre.');
    insertCcRealm.run(realmId, serverId, user.id, name, houseName, color, regionId, user.name, 'Herdeiro ainda não designado', religion, now, now, now);
    const assigned = assignCcCapital.run(realmId, serverId, regionId);
    if (Number(assigned.changes) !== 1) throw new Error('Outra casa ergueu seu estandarte nesta região.');
    seedCcStartingAssets(serverId, realmId, regionId, now, false);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'realm.created', realmId, regionId, JSON.stringify({ name, houseName, religion }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    if (/UNIQUE constraint failed: cc_realms\.season_id, cc_realms\.color/i.test(error.message || '')) {
      throw new Error('Essa cor de estandarte j\u00e1 pertence a outra coroa. Escolha uma cor livre.');
    }
    throw error;
  }
  if (entryPhase === 'waiting') activateCrownsSeason(serverId);
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'realm.created', regionIds: [regionId], version: Date.now() });
  return getCcRealmById.get(realmId, serverId);
}
function claimCrownsTerritory(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de ordenar uma colonização.');
  if (getCcPendingClaimsForRealm.all(serverId, realm.id).length >= 2) throw new Error('Seus dois grupos de exploradores já estão em marcha.');
  const regionId = String(payload?.regionId || '').trim().slice(0, 32);
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id || region.status !== 'neutral') throw new Error('A região não está disponível para colonização.');
  const ownedIds = new Set(getCcOwnedRegions.all(serverId, realm.id).map(row => row.region_id));
  const neighborIds = safeJsonParse(region.neighbor_ids_json, []);
  if (!neighborIds.some(id => ownedIds.has(id))) throw new Error('A região precisa compartilhar fronteira com seu reino.');
  const originId = neighborIds.find(id => ownedIds.has(id));
  const origin = crownsRegionMetadataById.get(originId);
  const destination = crownsRegionMetadataById.get(regionId);
  const distanceKm = origin?.centroid && destination?.centroid ? Math.round(Math.hypot(destination.centroid[0] - origin.centroid[0], destination.centroid[1] - origin.centroid[1]) / 1000) : 180;
  const maritime = Boolean(origin?.routeNeighborIds?.includes(regionId) || destination?.routeNeighborIds?.includes(originId));
  const travelMinutes = distanceKm <= 180 ? 5 : distanceKm <= 520 ? 20 : distanceKm <= 1100 ? 60 : 120;
  const cost = { treasury: 120, provisions: 80, travelMinutes: maritime ? Math.max(20, travelMinutes) : travelMinutes, distanceKm, maritime };
  if (realm.treasury < cost.treasury || realm.provisions < cost.provisions) throw new Error('O tesouro não cobre a expedição.');
  const actionId = `action_${crypto.randomUUID()}`;
  const now = new Date();
  const completesAt = new Date(now.getTime() + crownsExpeditionDuration(distanceKm, maritime)).toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const latest = getCcSeasonRegion.get(serverId, regionId);
    if (!latest || latest.owner_realm_id || latest.status !== 'neutral') throw new Error('A região recebeu outra reivindicação.');
    const spent = spendCcClaimResources.run(cost.treasury, cost.provisions, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions);
    if (Number(spent.changes) !== 1) throw new Error('Recursos insuficientes para confirmar a ordem.');
    insertCcAction.run(actionId, serverId, realm.id, user.id, 'territory.claim', regionId, completesAt, JSON.stringify(cost), now.toISOString());
    const marked = markCcRegionClaiming.run(actionId, serverId, regionId);
    if (Number(marked.changes) !== 1) throw new Error('A disputa territorial mudou antes da confirmação.');
    insertCcEvent.run(crypto.randomUUID(), serverId, 'territory.claim.started', realm.id, regionId, JSON.stringify({ actionId, completesAt, cost }), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'territory.claim.started', regionIds: [regionId], version: Date.now() });
  return getCcAction.get(actionId);
}
function queueCrownsBuilding(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de iniciar uma construção.');
  if (crownsSeasonClock(processCrownsSeasonLifecycle(serverId)).phase !== 'open') throw new Error('A temporada já terminou.');
  const regionId = String(payload?.regionId || '').trim().slice(0, 32);
  const buildingType = String(payload?.buildingType || '').trim();
  const definition = CROWNS_BUILDINGS[buildingType];
  if (!definition) throw new Error('Tipo de construção desconhecido.');
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('A obra precisa ficar em uma região do seu reino.');
  if (definition.coastalOnly && !crownsRegionIsCoastal(regionId)) throw new Error('Portos só podem ser construídos em províncias com costa navegável.');
  const pending = getCcPendingActionsForRealm.all(serverId, realm.id);
  if (pending.some(action => action.region_id === regionId && action.type === `building.${buildingType}`)) throw new Error('Esta melhoria já está em construção nessa região.');
  const regionBuildings = getCcBuildingsForRegion.all(serverId, regionId);
  const current = regionBuildings.find(item => item.building_type === buildingType);
  const currentLevel = Number(current?.level || 0);
  if (currentLevel >= Number(definition.maxLevel || 5)) throw new Error('Essa construção já alcançou o nível máximo.');
  for (const [requiredType, requiredLevel] of Object.entries(definition.requires || {})) {
    const actualLevel = Number(regionBuildings.find(item => item.building_type === requiredType)?.level || 0);
    if (actualLevel < requiredLevel) throw new Error(`Esta obra exige ${CROWNS_BUILDINGS[requiredType]?.name || requiredType} no nível ${requiredLevel}.`);
  }
  const multiplier = 1 + currentLevel * 0.65;
  const cost = {
    treasury: Math.round(definition.treasury * multiplier),
    provisions: Math.round(definition.provisions * multiplier),
    wood: Math.round((definition.wood || 0) * multiplier),
    stone: Math.round((definition.stone || 0) * multiplier),
    buildingType,
    buildingName: definition.name,
    nextLevel: currentLevel + 1
  };
  const now = new Date();
  const actionId = `action_${crypto.randomUUID()}`;
  const completesAt = new Date(now.getTime() + crownsActionDuration(definition.hours * (1 + currentLevel * 0.2))).toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcStrategicResources.run(cost.treasury, cost.provisions, cost.wood, cost.stone, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions, cost.wood, cost.stone);
    if (Number(spent.changes) !== 1) throw new Error('Faltam moedas, trigo, madeira ou pedra para essa obra.');
    insertCcAction.run(actionId, serverId, realm.id, user.id, `building.${buildingType}`, regionId, completesAt, JSON.stringify(cost), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return getCcAction.get(actionId);
}

function setCrownsProvinceTax(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de definir impostos.');
  const regionId = String(payload?.regionId || '').trim().slice(0, 32);
  const taxRate = Math.max(5, Math.min(35, Math.round(Number(payload?.taxRate || 18))));
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('Escolha uma província do seu reino.');
  const previous = Number(region.tax_rate || 18);
  const shock = taxRate > previous ? Math.ceil((taxRate - previous) / 3) : 0;
  const changed = updateCcProvinceTax.run(taxRate, shock, serverId, regionId, realm.id);
  if (Number(changed.changes) !== 1) throw new Error('A alíquota não pôde ser alterada.');
  insertCcEvent.run(crypto.randomUUID(), serverId, 'province.tax_changed', realm.id, regionId, JSON.stringify({ previous, taxRate, summary: `A arrecadação local passou de ${previous}% para ${taxRate}%.` }), new Date().toISOString());
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'province.tax_changed', regionIds: [regionId], version: Date.now() });
  return { regionId, taxRate };
}

function queueCrownsFleetConstruction(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de construir embarcacoes.');
  if (crownsSeasonClock(processCrownsSeasonLifecycle(serverId)).phase !== 'open') throw new Error('A temporada ja terminou.');
  const regionId = String(payload?.regionId || '').trim().slice(0, 32);
  const shipType = CROWNS_SHIPS[payload?.shipType] ? String(payload.shipType) : '';
  const definition = CROWNS_SHIPS[shipType];
  const groups = Math.max(1, Math.min(5, Math.trunc(Number(payload?.groups || 1))));
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('Escolha um porto do seu reino.');
  if (!crownsRegionIsCoastal(regionId)) throw new Error('Esta provincia nao possui costa navegavel.');
  const portLevel = crownsBuildingLevel(serverId, regionId, 'porto');
  if (!definition || portLevel < definition.portLevel) throw new Error(`O porto precisa estar no nivel ${definition?.portLevel || 1}.`);
  const pending = getCcPendingActionsForRealm.all(serverId, realm.id);
  if (pending.some(action => action.region_id === regionId && action.type === `navy.build.${shipType}`)) {
    throw new Error('Este tipo de embarcacao ja esta sendo construido nesse porto.');
  }
  const ships = crownsFleetUnits({ [shipType]: definition.quantity * groups });
  const cost = {
    treasury: definition.treasury * groups,
    provisions: definition.provisions * groups,
    wood: definition.wood * groups,
    stone: definition.stone * groups,
    shipType,
    shipName: definition.name,
    units: definition.quantity * groups,
    ships
  };
  const now = new Date();
  const actionId = `action_${crypto.randomUUID()}`;
  const completesAt = new Date(now.getTime() + crownsActionDuration(definition.hours * groups)).toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcStrategicResources.run(cost.treasury, cost.provisions, cost.wood, cost.stone, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions, cost.wood, cost.stone);
    if (Number(spent.changes) !== 1) throw new Error('Faltam moedas, trigo, madeira ou pedra para o estaleiro.');
    insertCcAction.run(actionId, serverId, realm.id, user.id, `navy.build.${shipType}`, regionId, completesAt, JSON.stringify(cost), now.toISOString());
    insertCcEvent.run(crypto.randomUUID(), serverId, 'navy.construction_started', realm.id, regionId, JSON.stringify({ actionId, shipType, units: cost.units }), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'navy.construction_started', regionIds: [regionId], version: Date.now() });
  return getCcAction.get(actionId);
}

function launchCrownsNavalRaid(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const season = processCrownsSeasonLifecycle(serverId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de ordenar uma campanha naval.');
  if (crownsSeasonClock(season).day < 5) throw new Error('A protecao inicial dura ate o dia 5.');
  const fromRegionId = String(payload?.fromRegionId || '').trim().slice(0, 32);
  const targetRegionId = String(payload?.targetRegionId || '').trim().slice(0, 32);
  const origin = getCcSeasonRegion.get(serverId, fromRegionId);
  const target = getCcSeasonRegion.get(serverId, targetRegionId);
  const defenderRealmId = target?.owner_realm_id;
  if (!origin || origin.owner_realm_id !== realm.id || !crownsRegionIsCoastal(fromRegionId)) throw new Error('Escolha um porto de origem do seu reino.');
  if (!target || !defenderRealmId || defenderRealmId === realm.id || !crownsRegionIsCoastal(targetRegionId)) throw new Error('Escolha uma provincia costeira inimiga.');
  if (getCcActiveTreatyBetween.get(serverId, realm.id, defenderRealmId, defenderRealmId, realm.id)) throw new Error('Um tratado ativo impede o ataque naval.');
  const ships = crownsFleetUnits(payload?.ships);
  ships.fishing = 0;
  if (!crownsFleetTotal(ships, false)) throw new Error('Escolha navios de combate para a expedicao.');
  const fleet = getCcFleetAtRegion.get(serverId, realm.id, fromRegionId);
  if (!fleet) throw new Error('Nao ha frota nesse porto.');
  const rangeQuadrants = crownsFleetRange(ships);
  const quadrants = crownsDistanceQuadrants(fromRegionId, targetRegionId);
  const distanceKm = crownsRegionDistanceKm(fromRegionId, targetRegionId);
  if (!rangeQuadrants || quadrants > rangeQuadrants) throw new Error(`A frota alcanca ${rangeQuadrants} quadrante(s), mas o alvo esta a ${quadrants}.`);
  const total = crownsFleetTotal(ships, false);
  const cost = {
    treasury: 70 + total * 30,
    provisions: 50 + quadrants * 20,
    wood: 0,
    stone: 0,
    originRegionId: fromRegionId,
    defenderRealmId,
    ships,
    morale: Number(fleet.morale || 70),
    quadrants,
    distanceKm,
    rangeQuadrants
  };
  const now = new Date();
  const actionId = `action_${crypto.randomUUID()}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcStrategicResources.run(cost.treasury, cost.provisions, 0, 0, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions, 0, 0);
    if (Number(spent.changes) !== 1) throw new Error('Faltam moedas ou trigo para abastecer a frota.');
    const reserved = reserveCcFleet.run(ships.light, ships.medium, ships.heavy, now.toISOString(), fleet.id, serverId, ships.light, ships.medium, ships.heavy);
    if (Number(reserved.changes) !== 1) throw new Error('A frota nao possui todos os navios escolhidos.');
    insertCcAction.run(actionId, serverId, realm.id, user.id, 'navy.attack', targetRegionId, new Date(now.getTime() + crownsActionDuration(Math.max(2, quadrants * 2))).toISOString(), JSON.stringify(cost), now.toISOString());
    insertCcEvent.run(crypto.randomUUID(), serverId, 'navy.raid_started', realm.id, targetRegionId, JSON.stringify({ actionId, fromRegionId, ships, quadrants, distanceKm }), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('journal.published', { seasonId: serverId, type: 'navy.raid_started', version: Date.now() });
  return getCcAction.get(actionId);
}

function queueCrownsRecruitment(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de recrutar tropas.');
  if (crownsSeasonClock(processCrownsSeasonLifecycle(serverId)).phase !== 'open') throw new Error('A temporada já terminou.');
  const regionId = String(payload?.regionId || realm.capital_region_id).trim().slice(0, 32);
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('O recrutamento precisa ocorrer em uma região do seu reino.');
  const unitType = CROWNS_UNITS[payload?.unitType] ? String(payload.unitType) : 'spearmen';
  const definition = CROWNS_UNITS[unitType];
  const groups = Math.max(1, Math.min(5, Number(payload?.groups || 1)));
  const regionBuildings = getCcBuildingsForRegion.all(serverId, regionId);
  for (const [requiredType, requiredLevel] of Object.entries(definition.requires || {})) {
    const actualLevel = Number(regionBuildings.find(item => item.building_type === requiredType)?.level || 0);
    if (actualLevel < requiredLevel) throw new Error(`${definition.name} exigem ${CROWNS_BUILDINGS[requiredType]?.name || requiredType} no nível ${requiredLevel}.`);
  }
  const army = getCcArmyAtRegion.get(serverId, realm.id, regionId);
  const armyId = army?.id || `army_${serverId}_${realm.id}_${regionId}_${crypto.randomUUID().slice(0, 8)}`;
  const pending = getCcPendingActionsForRealm.all(serverId, realm.id).filter(action => !['army.attack', 'army.transfer'].includes(action.type));
  if (pending.length >= 3) throw new Error('Seu conselho já conduz três ordens simultâneas.');
  const cost = {
    treasury: definition.treasury * groups,
    provisions: definition.provisions * groups,
    wood: definition.wood * groups,
    stone: definition.stone * groups,
    armyId,
    unitType,
    unitName: definition.name,
    units: definition.quantity * groups
  };
  const now = new Date();
  const actionId = `action_${crypto.randomUUID()}`;
  const barracksLevel = Number(regionBuildings.find(item => item.building_type === 'quartel')?.level || 1);
  const trainingHours = Math.max(1, definition.hours * groups * (1 - Math.min(0.4, (barracksLevel - 1) * 0.1)));
  const completesAt = new Date(now.getTime() + crownsActionDuration(trainingHours)).toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcStrategicResources.run(cost.treasury, cost.provisions, cost.wood, cost.stone, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions, cost.wood, cost.stone);
    if (Number(spent.changes) !== 1) throw new Error('Recursos insuficientes para levantar essa tropa.');
    if (!army) insertCcGarrison.run(armyId, serverId, realm.id, regionId, 0, 0, 0, 0, 68, now.toISOString(), now.toISOString());
    insertCcAction.run(actionId, serverId, realm.id, user.id, 'army.recruit', regionId, completesAt, JSON.stringify(cost), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return getCcAction.get(actionId);
}

function cancelCrownsAction(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const action = getCcAction.get(String(payload?.actionId || ''));
  if (!realm || !action || action.season_id !== serverId || action.realm_id !== realm.id || action.status !== 'pending') throw new Error('Esta ordem não pode ser cancelada.');
  const cost = safeJsonParse(action.cost_json, {});
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    cancelCcAction.run(now, action.id, realm.id);
    if (action.type === 'territory.claim') releaseCcClaim.run(serverId, action.id);
    if (['army.attack', 'army.transfer'].includes(action.type) && cost.troops) {
      const returnRegionId = crownsOwnedReturnRegion(serverId, realm.id, cost.originRegionId);
      if (returnRegionId) crownsMergeGarrison(serverId, realm.id, returnRegionId, cost.troops, cost.morale, now);
    }
    if (action.type === 'navy.attack' && cost.ships) {
      const returnRegionId = crownsOwnedCoastalReturnRegion(serverId, realm.id, cost.originRegionId);
      if (returnRegionId) crownsMergeFleet(serverId, realm.id, returnRegionId, cost.ships, cost.morale, now);
    }
    if (action.type === 'army.attack' && cost.warId) finishCcWar.run(0, JSON.stringify({ cancelled: true }), now, cost.warId, serverId);
    refundCcStrategicResources.run(Number(cost.treasury || 0), Number(cost.provisions || 0), Number(cost.wood || 0), Number(cost.stone || 0), now, realm.id, serverId);
    insertCcEvent.run(crypto.randomUUID(), serverId, action.type === 'territory.claim' ? 'territory.claim.cancelled' : 'action.cancelled', realm.id, action.region_id, JSON.stringify({ actionId: action.id, type: action.type }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'territory.claim.cancelled', regionIds: [action.region_id], version: Date.now() });
}

function crownsResourceColumn(resource) {
  const columns = { treasury: 'treasury', grain: 'provisions', wood: 'wood', stone: 'stone' };
  return columns[resource] || null;
}

function crownsAdjustResource(realmId, serverId, resource, amount, requireBalance = false) {
  const column = crownsResourceColumn(resource);
  if (!column || !Number.isFinite(amount)) throw new Error('Recurso de mercado desconhecido.');
  const requirement = requireBalance && amount < 0 ? ` AND ${column} >= ?` : '';
  const statement = db.prepare(`UPDATE cc_realms SET ${column} = ${column} + ?, updated_at = ? WHERE id = ? AND season_id = ?${requirement}`);
  const params = [Math.trunc(amount), new Date().toISOString(), realmId, serverId];
  if (requirement) params.push(Math.abs(Math.trunc(amount)));
  return statement.run(...params);
}

function createCrownsMarketOrder(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de negociar.');
  const sellResource = String(payload?.sellResource || '');
  const buyResource = String(payload?.buyResource || '');
  const sellAmount = Math.max(50, Math.min(2000, Math.trunc(Number(payload?.sellAmount || 0))));
  const buyAmount = Math.max(50, Math.min(2000, Math.trunc(Number(payload?.buyAmount || 0))));
  if (!crownsResourceColumn(sellResource) || !crownsResourceColumn(buyResource) || sellResource === buyResource) throw new Error('Escolha dois recursos diferentes para a oferta.');
  const capitalMarket = getCcBuildingsForRegion.all(serverId, realm.capital_region_id).find(item => item.building_type === 'mercado');
  if (!capitalMarket) throw new Error('Construa um mercado na capital para publicar ofertas.');
  const openOwn = getCcMarketOrders.all(serverId).filter(order => order.realm_id === realm.id && order.status === 'open');
  if (openOwn.length >= Math.max(2, Number(capitalMarket.level) + 1)) throw new Error('Seu mercado já atingiu o limite de ofertas abertas.');
  const id = `market_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const reserved = crownsAdjustResource(realm.id, serverId, sellResource, -sellAmount, true);
    if (!reserved.changes) throw new Error(`Você não possui ${sellAmount} de ${CROWNS_RESOURCES[sellResource]?.name || sellResource}.`);
    insertCcMarketOrder.run(id, serverId, realm.id, sellResource, sellAmount, buyResource, buyAmount, now);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'market.offer.created', realm.id, realm.capital_region_id, JSON.stringify({ sellResource, sellAmount, buyResource, buyAmount }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'market.offer.created', version: Date.now() });
  return getCcMarketOrder.get(id, serverId);
}

function acceptCrownsMarketOffer(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const order = getCcMarketOrder.get(String(payload?.orderId || ''), serverId);
  if (!realm || !order || order.status !== 'open' || order.realm_id === realm.id) throw new Error('Esta oferta não pode ser aceita.');
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const paid = crownsAdjustResource(realm.id, serverId, order.buy_resource, -Number(order.buy_amount), true);
    if (!paid.changes) throw new Error(`Faltam ${CROWNS_RESOURCES[order.buy_resource]?.name || order.buy_resource} para aceitar a oferta.`);
    if (!acceptCcMarketOrder.run(realm.id, now, order.id, serverId).changes) throw new Error('Outra coroa aceitou esta oferta primeiro.');
    crownsAdjustResource(order.realm_id, serverId, order.buy_resource, Number(order.buy_amount));
    crownsAdjustResource(realm.id, serverId, order.sell_resource, Number(order.sell_amount));
    insertCcEvent.run(crypto.randomUUID(), serverId, 'market.trade.completed', realm.id, realm.capital_region_id, JSON.stringify({ orderId: order.id, sellerRealmId: order.realm_id, sellResource: order.sell_resource, sellAmount: order.sell_amount, buyResource: order.buy_resource, buyAmount: order.buy_amount }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'market.trade.completed', version: Date.now() });
  return { orderId: order.id, status: 'accepted' };
}

function cancelCrownsMarketOffer(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const order = realm && getCcMarketOrder.get(String(payload?.orderId || ''), serverId);
  if (!realm || !order || order.realm_id !== realm.id || order.status !== 'open') throw new Error('Esta oferta não pode ser cancelada.');
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!cancelCcMarketOrder.run(now, order.id, serverId, realm.id).changes) throw new Error('A oferta já foi encerrada.');
    crownsAdjustResource(realm.id, serverId, order.sell_resource, Number(order.sell_amount));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'market.offer.cancelled', version: Date.now() });
  return { orderId: order.id, status: 'cancelled' };
}

function crownsTargetRealm(user, serverId, targetRealmId) {
  const realm = getCcRealmByUser.get(serverId, user.id);
  const target = getCcRealmById.get(String(targetRealmId || ''), serverId);
  if (!realm) throw new Error('Funde um reino antes de enviar esta ordem.');
  if (!target || target.id === realm.id) throw new Error('Escolha outra coroa para esta proposta.');
  return { realm, target };
}

function sendCrownsDiplomaticGift(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const { realm, target } = crownsTargetRealm(user, serverId, payload?.targetRealmId);
  const resourceType = String(payload?.resourceType || '');
  const amount = Math.max(50, Math.min(500, Math.trunc(Number(payload?.amount || 0))));
  if (!crownsResourceColumn(resourceType)) throw new Error('Escolha um recurso válido para o presente.');
  const id = `diplomacy_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const day = crownsSeasonClock(getCcSeason.get(serverId)).day;
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = crownsAdjustResource(realm.id, serverId, resourceType, -amount, true);
    if (!spent.changes) throw new Error(`Seu reino não possui ${amount} de ${CROWNS_RESOURCES[resourceType]?.name || resourceType}.`);
    crownsAdjustResource(target.id, serverId, resourceType, amount);
    insertCcDiplomaticExchange.run(id, serverId, realm.id, target.id, 'gift', resourceType, amount, 'delivered', day, now);
    db.prepare('UPDATE cc_realms SET prestige = prestige + 1, updated_at = ? WHERE id = ? AND season_id = ?').run(now, realm.id, serverId);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'diplomacy.gift.sent', realm.id, realm.capital_region_id, JSON.stringify({ targetRealmId: target.id, targetName: target.name, resourceType, amount }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'diplomacy.gift.sent', version: Date.now() });
  return { id, targetName: target.name, resourceType, amount, goodwill: crownsGoodwill(serverId, realm.id, target.id) };
}

function respondCrownsDiplomaticRequest(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const request = realm && getCcDiplomaticExchange.get(String(payload?.requestId || ''), serverId);
  const accept = payload?.accept === true;
  if (!realm || !request || request.recipient_realm_id !== realm.id || request.exchange_kind !== 'request' || request.status !== 'pending') throw new Error('Este pedido diplomático não está mais disponível.');
  const status = accept ? 'accepted' : 'declined';
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (accept) {
      const spent = crownsAdjustResource(realm.id, serverId, request.resource_type, -Number(request.amount), true);
      if (!spent.changes) throw new Error(`Faltam ${CROWNS_RESOURCES[request.resource_type]?.name || request.resource_type} para atender ao pedido.`);
      crownsAdjustResource(request.sender_realm_id, serverId, request.resource_type, Number(request.amount));
      db.prepare('UPDATE cc_realms SET prestige = prestige + 2, updated_at = ? WHERE id = ? AND season_id = ?').run(now, realm.id, serverId);
    }
    if (!resolveCcDiplomaticRequest.run(status, now, request.id, serverId, realm.id).changes) throw new Error('O pedido já foi respondido.');
    const sender = getCcRealmById.get(request.sender_realm_id, serverId);
    insertCcEvent.run(crypto.randomUUID(), serverId, accept ? 'diplomacy.request.accepted' : 'diplomacy.request.declined', realm.id, realm.capital_region_id, JSON.stringify({ senderRealmId: request.sender_realm_id, senderName: sender?.name, resourceType: request.resource_type, amount: request.amount }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: `diplomacy.request.${status}`, version: Date.now() });
  return { requestId: request.id, status };
}

function processCrownsDiplomaticRequests(serverId) {
  const season = getCcSeason.get(serverId);
  if (!season) return;
  const clock = crownsSeasonClock(season);
  if (clock.phase !== 'open' || clock.day < 2 || clock.day % 3 !== 2) return;
  const realms = getCcRealms.all(serverId);
  const ais = realms.filter(realm => realm.is_ai);
  const exchanges = getCcDiplomaticExchanges.all(serverId);
  for (const human of realms.filter(realm => !realm.is_ai)) {
    if (exchanges.some(item => item.recipient_realm_id === human.id && item.exchange_kind === 'request' && (item.status === 'pending' || Number(item.game_day) === clock.day))) continue;
    const random = seededCrownsRandom(`${serverId}:${human.id}:request:${clock.day}`);
    const sender = ais[Math.floor(random() * ais.length)];
    if (!sender) continue;
    const resources = ['grain', 'wood', 'stone', 'treasury'];
    const resourceType = resources[Math.floor(random() * resources.length)];
    const amount = 70 + Math.floor(random() * 5) * 20;
    const id = `diplomacy_request_${serverId}_${human.id}_${clock.day}`;
    const now = new Date().toISOString();
    if (insertCcDiplomaticExchange.run(id, serverId, sender.id, human.id, 'request', resourceType, amount, 'pending', clock.day, now).changes) {
      insertCcEvent.run(crypto.randomUUID(), serverId, 'diplomacy.request.created', sender.id, sender.capital_region_id, JSON.stringify({ recipientRealmId: human.id, resourceType, amount }), now);
      emitCrownsEvent('world.patch', { seasonId: serverId, type: 'diplomacy.request.created', version: Date.now() });
    }
  }
}

function proposeCrownsTreaty(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const { realm, target } = crownsTargetRealm(user, serverId, payload?.targetRealmId);
  const treatyType = ['alliance', 'non_aggression'].includes(payload?.treatyType) ? payload.treatyType : 'alliance';
  if (getCcActiveTreatyBetween.get(serverId, realm.id, target.id, target.id, realm.id)) throw new Error('Já existe um tratado ativo entre essas coroas.');
  const score = Number(realm.prestige) + Number(target.prestige) + (baseCrownsFaith(realm.religion) === baseCrownsFaith(target.religion) ? 22 : 0) + crownsGoodwill(serverId, realm.id, target.id);
  const accepted = target.is_ai ? score >= 48 || seededCrownsRandom(`${serverId}:${realm.id}:${target.id}:${treatyType}`)() > 0.34 : false;
  const now = new Date().toISOString();
  const id = `treaty_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 20 * CROWNS_GAME_DAY_MS).toISOString();
  insertCcTreaty.run(id, serverId, realm.id, target.id, treatyType, accepted ? 'accepted' : 'proposed', expiresAt, now, now);
  if (accepted) {
    db.prepare('UPDATE cc_realms SET prestige = prestige + 3, updated_at = ? WHERE id IN (?, ?) AND season_id = ?').run(now, realm.id, target.id, serverId);
    insertCcEvent.run(crypto.randomUUID(), serverId, treatyType === 'alliance' ? 'alliance.formed' : 'peace.signed', realm.id, realm.capital_region_id, JSON.stringify({ targetRealmId: target.id, summary: `${realm.name} e ${target.name} firmaram ${treatyType === 'alliance' ? 'uma aliança de auxílio mútuo' : 'um pacto de não agressão'} por vinte dias.` }), now);
  }
  emitCrownsEvent('journal.published', { seasonId: serverId, type: 'diplomacy', version: Date.now() });
  return { id, status: accepted ? 'accepted' : 'proposed', treatyType, targetName: target.name };
}

function proposeCrownsMarriage(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const { realm, target } = crownsTargetRealm(user, serverId, payload?.targetRealmId);
  const dowry = Math.max(80, Math.min(400, Number(payload?.dowry || 160)));
  if (Number(realm.treasury) < dowry) throw new Error('O tesouro não cobre o dote proposto.');
  const existing = getCcMarriages.all(serverId).find(item => item.status === 'accepted' && [item.proposer_realm_id, item.target_realm_id].includes(realm.id) && [item.proposer_realm_id, item.target_realm_id].includes(target.id));
  if (existing) throw new Error('Essas casas já estão ligadas por casamento.');
  const accepted = Boolean(target.is_ai) && (baseCrownsFaith(realm.religion) === baseCrownsFaith(target.religion) || Number(realm.prestige) + Math.floor(dowry / 20) + crownsGoodwill(serverId, realm.id, target.id) >= 28);
  const now = new Date().toISOString();
  const id = `marriage_${crypto.randomUUID()}`;
  const proposerSpouse = `${realm.heir_name || 'Herdeiro'} de ${realm.house_name}`;
  const targetSpouse = `${target.heir_name || 'Herdeiro'} de ${target.house_name}`;
  const childReligion = String(payload?.childReligion || realm.religion);
  const inheritanceClause = String(payload?.inheritanceClause || 'Pretensões dinásticas sem união automática dos reinos').slice(0, 160);
  insertCcMarriage.run(id, serverId, realm.id, target.id, proposerSpouse, targetSpouse, childReligion, inheritanceClause, dowry, accepted ? 'accepted' : 'proposed', now, now);
  if (accepted) {
    db.prepare('UPDATE cc_realms SET treasury = treasury - ?, prestige = prestige + 6, legitimacy = min(100, legitimacy + 8), heir_name = ?, updated_at = ? WHERE id = ? AND season_id = ?').run(dowry, `Infante da união com ${target.house_name}`, now, realm.id, serverId);
    if (!getCcActiveTreatyBetween.get(serverId, realm.id, target.id, target.id, realm.id)) insertCcTreaty.run(`treaty_${crypto.randomUUID()}`, serverId, realm.id, target.id, 'non_aggression', 'accepted', new Date(Date.now() + 20 * CROWNS_GAME_DAY_MS).toISOString(), now, now);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'marriage.celebrated', realm.id, realm.capital_region_id, JSON.stringify({ targetRealmId: target.id, summary: `${proposerSpouse} casou-se com ${targetSpouse}. O contrato fixa dote de ${dowry} moedas, fé dos filhos em ${childReligion} e não une automaticamente os reinos.` }), now);
  }
  emitCrownsEvent('journal.published', { seasonId: serverId, type: 'marriage', version: Date.now() });
  return { id, status: accepted ? 'accepted' : 'proposed', targetName: target.name };
}

function queueCrownsDefense(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const regionId = String(payload?.regionId || realm?.capital_region_id || '');
  const army = realm && getCcArmyAtRegion.get(serverId, realm.id, regionId);
  if (!realm || !army) throw new Error('Nenhuma hoste está disponível para defender o reino.');
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('Só é possível fortificar uma região do seu reino.');
  if (!crownsTroopTotal(army)) throw new Error('Transfira soldados para esta província antes de preparar sua defesa.');
  const cost = { treasury: 90, provisions: 120, armyId: army.id };
  const now = new Date();
  const spent = spendCcResources.run(cost.treasury, cost.provisions, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions);
  if (!spent.changes) throw new Error('Faltam recursos para preparar a defesa.');
  const id = `action_${crypto.randomUUID()}`;
  insertCcAction.run(id, serverId, realm.id, user.id, 'army.defend', regionId, new Date(now.getTime() + crownsActionDuration(6)).toISOString(), JSON.stringify(cost), now.toISOString());
  return getCcAction.get(id);
}

function queueCrownsArmyTransfer(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de organizar suas tropas.');
  if (crownsSeasonClock(processCrownsSeasonLifecycle(serverId)).phase !== 'open') throw new Error('A temporada já terminou.');
  const fromRegionId = String(payload?.fromRegionId || '').trim().slice(0, 32);
  const toRegionId = String(payload?.toRegionId || '').trim().slice(0, 32);
  if (!fromRegionId || !toRegionId || fromRegionId === toRegionId) throw new Error('Escolha duas províncias diferentes.');
  const fromRegion = getCcSeasonRegion.get(serverId, fromRegionId);
  const toRegion = getCcSeasonRegion.get(serverId, toRegionId);
  if (fromRegion?.owner_realm_id !== realm.id || toRegion?.owner_realm_id !== realm.id) throw new Error('A transferência só pode ocorrer entre províncias do seu reino.');
  const army = getCcArmyAtRegion.get(serverId, realm.id, fromRegionId);
  const troops = crownsTroops(payload?.troops);
  if (!army || !crownsTroopTotal(troops)) throw new Error('Escolha soldados disponíveis na província de origem.');
  const now = new Date();
  const cost = { treasury: 25, provisions: 30, originRegionId: fromRegionId, destinationRegionId: toRegionId, troops, morale: Number(army.morale || 65) };
  const actionId = `action_${crypto.randomUUID()}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcResources.run(cost.treasury, cost.provisions, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions);
    if (!spent.changes) throw new Error('Faltam moedas ou trigo para deslocar esse destacamento.');
    crownsReserveGarrisonTroops(army, serverId, troops, now.toISOString());
    insertCcAction.run(actionId, serverId, realm.id, user.id, 'army.transfer', toRegionId, new Date(now.getTime() + crownsActionDuration(6)).toISOString(), JSON.stringify(cost), now.toISOString());
    insertCcEvent.run(crypto.randomUUID(), serverId, 'army.transfer.started', realm.id, fromRegionId, JSON.stringify({ actionId, fromRegionId, toRegionId, troops, total: crownsTroopTotal(troops) }), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'army.transfer.started', regionIds: [fromRegionId, toRegionId], version: Date.now() });
  return getCcAction.get(actionId);
}

function declareCrownsWar(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const season = processCrownsSeasonLifecycle(serverId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de declarar guerra.');
  if (crownsSeasonClock(season).day < 5) throw new Error('A proteção inicial dura até o dia 5.');
  const regionId = String(payload?.regionId || '');
  const region = getCcSeasonRegion.get(serverId, regionId);
  const target = region?.owner_realm_id && getCcRealmById.get(region.owner_realm_id, serverId);
  const owned = new Set(getCcOwnedRegions.all(serverId, realm.id).map(row => row.region_id));
  const possibleOrigins = safeJsonParse(region?.neighbor_ids_json, []).filter(id => owned.has(id));
  const requestedOriginId = String(payload?.fromRegionId || '');
  const fromRegionId = requestedOriginId || possibleOrigins.find(id => {
    const candidate = getCcArmyAtRegion.get(serverId, realm.id, id);
    return candidate && crownsTroopPower(candidate) >= 50;
  });
  if (!region || !target || target.id === realm.id || !fromRegionId || !possibleOrigins.includes(fromRegionId)) throw new Error('Escolha uma província inimiga ligada à guarnição de origem.');
  if (getCcActiveTreatyBetween.get(serverId, realm.id, target.id, target.id, realm.id)) throw new Error('Um tratado ativo impede esta declaração de guerra.');
  const army = getCcArmyAtRegion.get(serverId, realm.id, fromRegionId);
  const available = crownsTroops(army || {});
  const troops = payload?.troops
    ? crownsTroops(payload.troops)
    : {
      spearmen: Math.floor(available.spearmen * 0.6),
      archers: Math.floor(available.archers * 0.6),
      cavalry: Math.floor(available.cavalry * 0.6),
      siege: Math.floor(available.siege * 0.6)
    };
  if (!army || crownsTroopPower(troops) < 50) throw new Error('Escolha ao menos um destacamento com força de ataque 50.');
  const now = new Date();
  const total = crownsTroopTotal(troops);
  const cost = {
    treasury: 80 + Math.ceil(total / 5),
    provisions: 100 + Math.ceil(total / 2),
    originRegionId: fromRegionId,
    defenderRealmId: target.id,
    warId: `war_${crypto.randomUUID()}`,
    troops,
    morale: Number(army.morale || 65)
  };
  const actionId = `action_${crypto.randomUUID()}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcResources.run(cost.treasury, cost.provisions, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions);
    if (!spent.changes) throw new Error('Faltam moedas ou trigo para abrir esta campanha.');
    crownsReserveGarrisonTroops(army, serverId, troops, now.toISOString());
    insertCcWar.run(cost.warId, serverId, realm.id, target.id, regionId, now.toISOString());
    insertCcAction.run(actionId, serverId, realm.id, user.id, 'army.attack', regionId, new Date(now.getTime() + crownsActionDuration(18)).toISOString(), JSON.stringify(cost), now.toISOString());
    insertCcEvent.run(crypto.randomUUID(), serverId, 'war.declared', realm.id, regionId, JSON.stringify({ targetRealmId: target.id, originRegionId: fromRegionId, troops, total, summary: `${realm.name} enviou ${total} soldados contra a província de ${region.name}, defendida por ${target.name}.` }), now.toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('journal.published', { seasonId: serverId, type: 'war.declared', version: Date.now() });
  return getCcAction.get(actionId);
}

function queueCrownsReligion(user, payload, requestedServerId, mode) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de conduzir sua política religiosa.');
  const sourceRegionId = String(payload?.sourceRegionId || payload?.regionId || realm.capital_region_id).trim().slice(0, 32);
  const targetRegionId = String(payload?.targetRegionId || payload?.regionId || sourceRegionId).trim().slice(0, 32);
  const source = getCcSeasonRegion.get(serverId, sourceRegionId);
  const target = getCcSeasonRegion.get(serverId, targetRegionId);
  if (!source || source.owner_realm_id !== realm.id) throw new Error('A ordem religiosa deve partir de uma província sob sua coroa.');
  if (!target) throw new Error('Escolha uma província de destino.');
  const templeLevel = crownsBuildingLevel(serverId, sourceRegionId, 'templo');
  if (templeLevel < 1) throw new Error('Construa um templo na província de origem.');
  const customFaith = getCcCustomFaithForRealm.get(serverId, realm.id);
  const dogmas = safeJsonParse(customFaith?.dogmas_json, []);
  const baseRange = [0, 1, 2, 4, 6, 99][Math.min(5, templeLevel)] || 1;
  const rangeQuadrants = baseRange >= 99 ? 99 : baseRange + (dogmas.includes('peregrinacao') ? 1 : 0);
  const quadrants = crownsDistanceQuadrants(sourceRegionId, targetRegionId);
  if (mode === 'mission' && quadrants > rangeQuadrants) throw new Error(`Este templo alcança ${rangeQuadrants} quadrante(s), mas o destino está a ${quadrants}.`);
  if (mode === 'suppress' && target.owner_realm_id !== realm.id) throw new Error('A repressão religiosa só pode ocorrer dentro do seu reino.');
  if (mode === 'mission') {
    const activeMissions = getCcPendingActionsForRealm.all(serverId, realm.id).filter(action => action.type === 'religion.mission');
    if (activeMissions.length >= 2) throw new Error('Seus dois grupos missionários já estão em viagem.');
  }
  const discount = dogmas.includes('pobreza') && mode === 'mission' ? 0.8 : 1;
  const cost = mode === 'mission'
    ? { treasury: Math.round((105 + quadrants * 18) * discount), provisions: 60 + quadrants * 12 }
    : { treasury: 160, provisions: 100 };
  Object.assign(cost, {
    sourceRegionId,
    targetRegionId,
    templeLevel,
    targetTempleLevel: crownsBuildingLevel(serverId, targetRegionId, 'templo'),
    rangeQuadrants,
    quadrants,
    faith: customFaith?.name || realm.religion,
    dogmas
  });
  const now = new Date();
  const spent = spendCcResources.run(cost.treasury, cost.provisions, now.toISOString(), realm.id, serverId, cost.treasury, cost.provisions);
  if (!spent.changes) throw new Error('Faltam recursos para essa ação religiosa.');
  const id = `action_${crypto.randomUUID()}`;
  insertCcAction.run(id, serverId, realm.id, user.id, `religion.${mode}`, targetRegionId, new Date(now.getTime() + crownsActionDuration(mode === 'mission' ? Math.max(4, quadrants * 3) : 9)).toISOString(), JSON.stringify(cost), now.toISOString());
  insertCcEvent.run(crypto.randomUUID(), serverId, mode === 'mission' ? 'religion.mission_started' : 'religion.suppression_started', realm.id, targetRegionId, JSON.stringify({ actionId: id, sourceRegionId, targetRegionId, faith: cost.faith, quadrants }), now.toISOString());
  return getCcAction.get(id);
}

function foundCrownsReligion(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de organizar uma nova fé.');
  if (getCcCustomFaithForRealm.get(serverId, realm.id)) throw new Error('Sua coroa já organizou uma religião própria nesta temporada.');
  const regionId = String(payload?.regionId || realm.capital_region_id).trim().slice(0, 32);
  const region = getCcSeasonRegion.get(serverId, regionId);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('Escolha uma província do seu reino.');
  if (crownsBuildingLevel(serverId, regionId, 'templo') < 3) throw new Error('Eleve o templo ao nível 3 para fundar uma religião.');
  const name = String(payload?.name || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 44);
  const dogmas = [...new Set(Array.isArray(payload?.dogmas) ? payload.dogmas.filter(key => CROWNS_DOGMAS[key]) : [])].slice(0, 2);
  if (name.length < 4) throw new Error('Escolha um nome com pelo menos quatro caracteres.');
  if (dogmas.length !== 2) throw new Error('Escolha exatamente dois dogmas.');
  const faithNames = new Set(getCcCustomFaiths.all(serverId).map(faith => String(faith.name).toLocaleLowerCase('pt-BR')));
  if (faithNames.has(name.toLocaleLowerCase('pt-BR'))) throw new Error('Este nome religioso já existe no servidor.');
  const cost = { treasury: 600, provisions: 220, wood: 0, stone: 240 };
  const now = new Date().toISOString();
  const id = `faith_${crypto.randomUUID()}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcStrategicResources.run(cost.treasury, cost.provisions, cost.wood, cost.stone, now, realm.id, serverId, cost.treasury, cost.provisions, cost.wood, cost.stone);
    if (Number(spent.changes) !== 1) throw new Error('Faltam moedas, trigo ou pedra para reunir o sínodo fundador.');
    insertCcCustomFaith.run(id, serverId, realm.id, regionId, name, realm.religion, JSON.stringify(dogmas), now);
    db.prepare('UPDATE cc_realms SET religion = ?, religious_unity = max(45, religious_unity - 8), prestige = prestige + 12, updated_at = ? WHERE id = ? AND season_id = ?').run(name, now, realm.id, serverId);
    const current = getCcRegionReligion.get(serverId, regionId) || { majority_share: 64, heresy_share: 0 };
    upsertCcRegionReligion.run(serverId, regionId, name, Math.max(58, Number(current.majority_share || 58)), 'Dissidências da antiga fé', Math.max(8, Number(current.heresy_share || 0)), now);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'religion.faith_founded', realm.id, regionId, JSON.stringify({
      faithId: id,
      name,
      parentFaith: realm.religion,
      dogmas,
      summary: `${realm.name} anunciou a fundação de ${name}.`
    }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('journal.published', { seasonId: serverId, type: 'religion.faith_founded', regionId, version: Date.now() });
  return getCcCustomFaithForRealm.get(serverId, realm.id);
}

function crownsFaithExists(serverId, faithName) {
  const normalized = String(faithName || '').trim().toLocaleLowerCase('pt-BR');
  return crownsAvailableFaiths(serverId).find(faith => faith.name.toLocaleLowerCase('pt-BR') === normalized) || null;
}

function convertCrownsRealm(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  if (!realm) throw new Error('Funde um reino antes de mudar sua fé oficial.');
  const faith = crownsFaithExists(serverId, payload?.faithName);
  if (!faith) throw new Error('Esta religião não está disponível neste servidor.');
  if (faith.name === realm.religion) throw new Error('Sua coroa já segue esta religião.');
  const now = new Date().toISOString();
  const previousFaith = realm.religion;
  db.exec('BEGIN IMMEDIATE');
  try {
    const spent = spendCcResources.run(300, 120, now, realm.id, serverId, 300, 120);
    if (!spent.changes) throw new Error('A conversão exige 300 moedas e 120 de trigo.');
    db.prepare('UPDATE cc_realms SET religion = ?, religious_unity = 52, heresy_pressure = min(100, heresy_pressure + 18), stability = max(10, stability - 6), updated_at = ? WHERE id = ? AND season_id = ?').run(faith.name, now, realm.id, serverId);
    const current = getCcRegionReligion.get(serverId, realm.capital_region_id) || { majority_religion: previousFaith, majority_share: 70 };
    upsertCcRegionReligion.run(serverId, realm.capital_region_id, faith.name, 58, current.majority_religion || previousFaith, 42, now);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'religion.realm_converted', realm.id, realm.capital_region_id, JSON.stringify({
      previousFaith,
      faith: faith.name,
      summary: `${realm.name} adotou ${faith.name} como religião oficial.`
    }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: 'religion.realm_converted', realmId: realm.id, version: Date.now() });
  return { faith: faith.name, previousFaith };
}

function registerCrownsReligiousCrisis(serverId, target, missionaryRealmId, incomingFaith, previousFaith, severity, now) {
  if (!target?.owner_realm_id || target.owner_realm_id === missionaryRealmId) return null;
  const owner = getCcRealmById.get(target.owner_realm_id, serverId);
  if (!owner || owner.religion === incomingFaith) return null;
  const existing = getCcPendingReligiousCrisisForRegion.get(serverId, target.region_id);
  if (existing) {
    updateCcReligiousCrisis.run(missionaryRealmId, incomingFaith, previousFaith, severity, existing.id, serverId);
  } else {
    insertCcReligiousCrisis.run(`faith_crisis_${crypto.randomUUID()}`, serverId, owner.id, target.region_id, missionaryRealmId, incomingFaith, previousFaith, severity, now);
  }
  db.prepare('UPDATE cc_season_regions SET loyalty = max(0, loyalty - ?), unrest = min(100, unrest + ?), version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id = ?')
    .run(Math.max(2, Math.ceil(severity / 12)), Math.max(3, Math.ceil(severity / 9)), serverId, target.region_id, owner.id);
  db.prepare('UPDATE cc_realms SET religious_unity = max(5, religious_unity - 3), heresy_pressure = min(100, heresy_pressure + 5), updated_at = ? WHERE id = ? AND season_id = ?')
    .run(now, owner.id, serverId);
  return getCcPendingReligiousCrisisForRegion.get(serverId, target.region_id);
}

function respondCrownsReligiousCrisis(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const crisis = realm && getCcReligiousCrisis.get(String(payload?.crisisId || ''), serverId);
  const response = String(payload?.response || '');
  if (!realm || !crisis || crisis.realm_id !== realm.id || crisis.status !== 'pending') throw new Error('Esta crise religiosa não está mais disponível.');
  if (!['accept', 'force', 'separate'].includes(response)) throw new Error('Escolha uma resposta válida.');
  const region = getCcSeasonRegion.get(serverId, crisis.region_id);
  if (!region || region.owner_realm_id !== realm.id) throw new Error('A província já não pertence à sua coroa.');
  if (response === 'separate') {
    if (region.region_id === realm.capital_region_id || getCcOwnedRegions.all(serverId, realm.id).length < 2) throw new Error('A capital não pode ser separada do último território da coroa.');
    const separatist = createCrownsSeparatistRealm(serverId, realm, region, new Date().toISOString(), crisis.incoming_faith, 'religious');
    resolveCcReligiousCrisis.run('separate', new Date().toISOString(), crisis.id, serverId, realm.id);
    return { response, separatistRealmId: separatist.realmId };
  }
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = getCcRegionReligion.get(serverId, crisis.region_id) || { majority_religion: crisis.previous_faith, majority_share: 55 };
    if (response === 'accept') {
      upsertCcRegionReligion.run(serverId, crisis.region_id, crisis.incoming_faith, Math.max(62, Number(crisis.severity)), current.majority_religion || crisis.previous_faith, Math.min(38, 100 - Math.max(62, Number(crisis.severity))), now);
      db.prepare('UPDATE cc_season_regions SET loyalty = min(100, loyalty + 9), unrest = max(0, unrest - 14), version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id = ?').run(serverId, crisis.region_id, realm.id);
      db.prepare('UPDATE cc_realms SET religious_unity = max(5, religious_unity - 5), updated_at = ? WHERE id = ? AND season_id = ?').run(now, realm.id, serverId);
    } else {
      const spent = spendCcResources.run(220, 120, now, realm.id, serverId, 220, 120);
      if (!spent.changes) throw new Error('A reconversão forçada exige 220 moedas e 120 de trigo.');
      upsertCcRegionReligion.run(serverId, crisis.region_id, realm.religion, 74, crisis.incoming_faith, 18, now);
      db.prepare('UPDATE cc_season_regions SET loyalty = max(0, loyalty - 12), unrest = min(100, unrest + 18), version = version + 1 WHERE season_id = ? AND region_id = ? AND owner_realm_id = ?').run(serverId, crisis.region_id, realm.id);
      db.prepare('UPDATE cc_realms SET stability = max(10, stability - 5), heresy_pressure = max(0, heresy_pressure - 8), updated_at = ? WHERE id = ? AND season_id = ?').run(now, realm.id, serverId);
    }
    resolveCcReligiousCrisis.run(response, now, crisis.id, serverId, realm.id);
    insertCcEvent.run(crypto.randomUUID(), serverId, `religion.crisis.${response}`, realm.id, crisis.region_id, JSON.stringify({ incomingFaith: crisis.incoming_faith, previousFaith: crisis.previous_faith }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  emitCrownsEvent('world.patch', { seasonId: serverId, type: `religion.crisis.${response}`, regionIds: [crisis.region_id], version: Date.now() });
  return { response, regionId: crisis.region_id };
}

function processCrownsCouncils(serverId) {
  const season = getCcSeason.get(serverId);
  if (!season || crownsSeasonClock(season).phase !== 'open') return;
  const clock = crownsSeasonClock(season);
  const now = new Date();
  for (const template of CROWNS_COUNCIL_TEMPLATES.filter(item => item.day <= clock.day)) {
    insertCcCouncil.run(`council_${serverId}_${template.key}`, serverId, template.key, template.name, template.theme, template.kind, 'voting', JSON.stringify(['accept', 'reject', 'abstain']), now.toISOString(), new Date(now.getTime() + 4 * clock.gameDayMs).toISOString());
  }
  for (const council of getCcCouncils.all(serverId)) {
    if (council.status === 'voting') {
      for (const ai of getCcRealms.all(serverId).filter(item => item.is_ai)) {
        if (getCcCouncilVote.get(council.id, ai.id)) continue;
        const roll = seededCrownsRandom(`${council.id}:${ai.id}`)();
        const vote = roll > 0.24 ? 'accept' : roll > 0.08 ? 'reject' : 'abstain';
        insertCcCouncilVote.run(council.id, ai.id, vote, `${ai.name} votou segundo sua fé, alianças e interesse dinástico.`, now.toISOString());
      }
      if (Date.now() >= new Date(council.ends_at).getTime()) {
        const totals = Object.fromEntries(getCcCouncilVotes.all(council.id).map(item => [item.vote_key, Number(item.total)]));
        const result = Number(totals.accept || 0) >= Number(totals.reject || 0) ? 'accept' : 'reject';
        if (decideCcCouncil.run(result, council.id).changes) insertCcEvent.run(crypto.randomUUID(), serverId, 'council.decided', null, null, JSON.stringify({ councilName: council.name, result, summary: `${council.name} encerrou a votação: o decreto foi ${result === 'accept' ? 'aprovado' : 'rejeitado'} por ${totals.accept || 0} a ${totals.reject || 0}.` }), now.toISOString());
      }
    }
  }
}

function processCrownsReligiousMovements(serverId) {
  const season = getCcSeason.get(serverId);
  if (!season || crownsSeasonClock(season).phase !== 'open') return;
  const clock = crownsSeasonClock(season);
  const now = new Date().toISOString();
  for (const template of CROWNS_RELIGIOUS_MOVEMENTS.filter(item => item.day <= clock.day)) {
    const id = `movement_${serverId}_${template.key}`;
    const inserted = insertCcReligiousMovement.run(id, serverId, template.key, template.name, template.description, template.day, 'active', now);
    if (inserted.changes) {
      insertCcEvent.run(crypto.randomUUID(), serverId, 'religion.movement_emerged', null, null, JSON.stringify({ movementName: template.name, summary: `${template.name} começou a circular entre bispos, mosteiros e cortes. Cada reino deverá decidir se adere ou resiste.` }), now);
      emitCrownsEvent('journal.published', { seasonId: serverId, type: 'religion.movement_emerged', version: Date.now() });
    }
  }
  for (const movement of getCcReligiousMovements.all(serverId)) {
    const template = CROWNS_RELIGIOUS_MOVEMENTS.find(item => item.key === movement.movement_key);
    for (const ai of getCcRealms.all(serverId).filter(realm => realm.is_ai)) {
      if (baseCrownsFaith(ai.religion) !== (template?.faith || 'Cristianismo')) continue;
      if (getCcReligiousResponse.get(movement.id, ai.id)) continue;
      const roll = seededCrownsRandom(`${movement.id}:${ai.id}`)();
      const response = roll > 0.72 ? 'accept' : 'resist';
      insertCcReligiousResponse.run(movement.id, ai.id, response, now);
      if (response === 'accept') {
        const convertedFaith = `${template?.faith || baseCrownsFaith(ai.religion)} — ${movement.name}`;
        db.prepare('UPDATE cc_realms SET religion = ?, religious_unity = max(35, religious_unity - 9), heresy_pressure = min(100, heresy_pressure + 8), updated_at = ? WHERE id = ? AND season_id = ?').run(convertedFaith, now, ai.id, serverId);
        const regions = getCcOwnedRegions.all(serverId, ai.id);
        for (const owned of regions.slice(0, Math.max(1, Math.ceil(regions.length / 2)))) {
          const current = getCcRegionReligion.get(serverId, owned.region_id) || { majority_share: 72 };
          upsertCcRegionReligion.run(serverId, owned.region_id, convertedFaith, Math.max(52, Number(current.majority_share) - 8), movement.name, 24, now);
        }
        insertCcEvent.run(crypto.randomUUID(), serverId, 'religion.realm_converted', ai.id, ai.capital_region_id, JSON.stringify({ movementName: movement.name, summary: `${ai.name} aderiu ao ${movement.name} e alterou a confissão de sua corte.` }), now);
      }
    }
  }
}

function respondCrownsReligiousMovement(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const movement = getCcReligiousMovement.get(String(payload?.movementId || ''), serverId);
  const response = ['accept', 'resist'].includes(payload?.response) ? payload.response : null;
  if (!realm || !movement || !response) throw new Error('Esta decisão religiosa não pode ser registrada.');
  const template = CROWNS_RELIGIOUS_MOVEMENTS.find(item => item.key === movement.movement_key);
  if (baseCrownsFaith(realm.religion) !== (template?.faith || 'Cristianismo')) throw new Error('Este movimento não pertence à fé oficial da sua coroa.');
  if (getCcReligiousResponse.get(movement.id, realm.id)) throw new Error('Sua coroa já respondeu a este movimento.');
  const now = new Date().toISOString();
  insertCcReligiousResponse.run(movement.id, realm.id, response, now);
  if (response === 'accept') {
    const convertedFaith = `${template?.faith || baseCrownsFaith(realm.religion)} — ${movement.name}`;
    db.prepare('UPDATE cc_realms SET religion = ?, religious_unity = max(25, religious_unity - 12), heresy_pressure = min(100, heresy_pressure + 10), prestige = prestige + 2, updated_at = ? WHERE id = ? AND season_id = ?').run(convertedFaith, now, realm.id, serverId);
    for (const owned of getCcOwnedRegions.all(serverId, realm.id)) {
      const current = getCcRegionReligion.get(serverId, owned.region_id) || { majority_share: 72 };
      upsertCcRegionReligion.run(serverId, owned.region_id, convertedFaith, Math.max(52, Number(current.majority_share) - 8), movement.name, 18, now);
    }
  } else {
    db.prepare('UPDATE cc_realms SET religious_unity = min(100, religious_unity + 5), heresy_pressure = max(0, heresy_pressure - 7), stability = max(10, stability - 2), prestige = prestige + 1, updated_at = ? WHERE id = ? AND season_id = ?').run(now, realm.id, serverId);
    for (const owned of getCcOwnedRegions.all(serverId, realm.id)) {
      const current = getCcRegionReligion.get(serverId, owned.region_id);
      if (current?.heresy_name === movement.name) upsertCcRegionReligion.run(serverId, owned.region_id, current.majority_religion, Math.min(96, Number(current.majority_share) + 6), movement.name, Math.max(0, Number(current.heresy_share) - 10), now);
    }
  }
  insertCcEvent.run(crypto.randomUUID(), serverId, 'religion.movement_answered', realm.id, realm.capital_region_id, JSON.stringify({ movementName: movement.name, response, summary: `${realm.name} decidiu ${response === 'accept' ? `aderir ao ${movement.name}` : `resistir ao ${movement.name}`}.` }), now);
  emitCrownsEvent('journal.published', { seasonId: serverId, type: 'religion.movement_answered', version: Date.now() });
  return { movementId: movement.id, response };
}

function voteCrownsCouncil(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const council = getCcCouncil.get(String(payload?.councilId || ''), serverId);
  const vote = ['accept', 'reject', 'abstain'].includes(payload?.vote) ? payload.vote : null;
  if (!realm || !council || council.status !== 'voting' || !vote) throw new Error('Este voto não pode ser registrado.');
  if (getCcCouncilVote.get(council.id, realm.id)) throw new Error('Sua delegação já votou neste concílio.');
  insertCcCouncilVote.run(council.id, realm.id, vote, 'Voto apresentado pela delegação do jogador.', new Date().toISOString());
  insertCcEvent.run(crypto.randomUUID(), serverId, 'council.vote', realm.id, realm.capital_region_id, JSON.stringify({ councilName: council.name, vote }), new Date().toISOString());
  return { councilId: council.id, vote };
}

function receiveCrownsCouncil(user, payload, requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const realm = getCcRealmByUser.get(serverId, user.id);
  const council = getCcCouncil.get(String(payload?.councilId || ''), serverId);
  const reception = ['receive', 'resist'].includes(payload?.reception) ? payload.reception : null;
  if (!realm || !council || council.status !== 'decided' || !reception) throw new Error('A recepção só ocorre após o decreto conciliar.');
  if (getCcCouncilReception.get(council.id, realm.id)) throw new Error('Seu reino já respondeu a este decreto.');
  const now = new Date().toISOString();
  insertCcCouncilReception.run(council.id, realm.id, reception, now);
  db.prepare(`UPDATE cc_realms SET religious_unity = max(0, min(100, religious_unity + ?)), heresy_pressure = max(0, min(100, heresy_pressure + ?)), prestige = max(0, prestige + ?), updated_at = ? WHERE id = ? AND season_id = ?`).run(reception === 'receive' ? 8 : -8, reception === 'receive' ? -6 : 9, reception === 'receive' ? 3 : -2, now, realm.id, serverId);
  insertCcEvent.run(crypto.randomUUID(), serverId, 'council.received', realm.id, realm.capital_region_id, JSON.stringify({ councilName: council.name, reception }), now);
  return { councilId: council.id, reception };
}
function processCrownsActions() {
  const due = getCcDueActions.all(new Date().toISOString());
  due.forEach(candidate => {
    const now = new Date().toISOString();
    let completed = false;
    let eventType = null;
    let eventPayload = {};
    db.exec('BEGIN IMMEDIATE');
    try {
      const action = getCcAction.get(candidate.id);
      if (!action || action.status !== 'pending') {
        db.exec('COMMIT');
        return;
      }
      const cost = safeJsonParse(action.cost_json, {});
      if (action.type === 'territory.claim') {
        const claimed = completeCcRegionClaim.run(action.realm_id, action.season_id, action.region_id, action.id);
        if (Number(claimed.changes) !== 1) {
          cancelCcAction.run(now, action.id, action.realm_id);
          db.exec('COMMIT');
          return;
        }
        rewardCcClaim.run(now, action.realm_id, action.season_id);
        const claimant = getCcRealmById.get(action.realm_id, action.season_id);
        const activeMovement = getCcReligiousMovements.all(action.season_id).filter(movement => {
          const template = CROWNS_RELIGIOUS_MOVEMENTS.find(item => item.key === movement.movement_key);
          return (template?.faith || 'Cristianismo') === baseCrownsFaith(claimant?.religion);
        }).slice(-1)[0];
        upsertCcRegionReligion.run(action.season_id, action.region_id, claimant?.religion || 'Cristianismo', activeMovement ? 64 : 78, activeMovement?.name || 'Sem heresia organizada', activeMovement ? 8 : 0, now);
        eventType = 'territory.claim.completed';
      } else if (action.type.startsWith('building.')) {
        const buildingType = action.type.split('.')[1];
        if (!CROWNS_BUILDINGS[buildingType]) throw new Error('Unknown building action');
        upsertCcBuilding.run(action.season_id, action.region_id, buildingType, now);
        eventType = 'building.completed';
        eventPayload = { buildingType, buildingName: CROWNS_BUILDINGS[buildingType].name, level: cost.nextLevel };
      } else if (action.type.startsWith('navy.build.')) {
        const shipType = action.type.split('.')[2];
        if (!CROWNS_SHIPS[shipType]) throw new Error('Unknown ship action');
        const region = getCcSeasonRegion.get(action.season_id, action.region_id);
        if (!region || region.owner_realm_id !== action.realm_id || !crownsRegionIsCoastal(action.region_id)) throw new Error('Shipyard unavailable');
        crownsMergeFleet(action.season_id, action.realm_id, action.region_id, cost.ships || { [shipType]: cost.units }, 72, now);
        eventType = 'navy.construction_completed';
        eventPayload = { shipType, shipName: CROWNS_SHIPS[shipType].name, units: Number(cost.units || 0) };
      } else if (action.type === 'army.recruit') {
        const reinforcementByType = {
          spearmen: reinforceCcSpearmen,
          archers: reinforceCcArchers,
          cavalry: reinforceCcCavalry,
          siege: reinforceCcSiege
        };
        const unitType = reinforcementByType[cost.unitType] ? cost.unitType : 'spearmen';
        const reinforced = reinforcementByType[unitType].run(Number(cost.units || 0), now, cost.armyId, action.season_id);
        if (Number(reinforced.changes) !== 1) throw new Error('Army unavailable');
        eventType = 'army.recruited';
        eventPayload = { units: Number(cost.units || 0), unitType, unitName: CROWNS_UNITS[unitType]?.name };
      } else if (action.type === 'army.defend') {
        const army = getCcArmyById.get(cost.armyId, action.season_id);
        if (!army) throw new Error('Army unavailable');
        updateCcArmyAfterBattle.run(army.infantry, army.archers, army.cavalry, Number(army.siege || 0), Math.min(100, army.morale + 12), action.region_id, now, army.id, action.season_id);
        eventType = 'army.defended';
        eventPayload = { summary: `A guarnição de ${crownsTroopTotal(army)} soldados tomou posições e elevou sua moral.` };
      } else if (action.type === 'army.transfer') {
        const destination = getCcSeasonRegion.get(action.season_id, action.region_id);
        const returnRegionId = crownsOwnedReturnRegion(action.season_id, action.realm_id, cost.originRegionId);
        if (destination?.owner_realm_id === action.realm_id) {
          crownsMergeGarrison(action.season_id, action.realm_id, action.region_id, cost.troops, cost.morale, now);
          eventType = 'army.transfer.completed';
          eventPayload = { originRegionId: cost.originRegionId, troops: cost.troops, total: crownsTroopTotal(cost.troops), summary: `${crownsTroopTotal(cost.troops)} soldados chegaram para reforçar a guarnição.` };
        } else {
          if (returnRegionId) crownsMergeGarrison(action.season_id, action.realm_id, returnRegionId, cost.troops, cost.morale, now);
          eventType = 'army.transfer.aborted';
          eventPayload = { originRegionId: cost.originRegionId, troops: cost.troops, summary: 'O destino deixou de pertencer ao reino e o destacamento retornou.' };
        }
      } else if (action.type === 'religion.mission' || action.type === 'religion.suppress') {
        const realm = getCcRealmById.get(action.realm_id, action.season_id);
        const current = getCcRegionReligion.get(action.season_id, action.region_id) || { majority_share: 50, heresy_share: 16 };
        const suppress = action.type === 'religion.suppress';
        if (suppress) {
          upsertCcRegionReligion.run(action.season_id, action.region_id, realm.religion, Math.min(95, Number(current.majority_share) + 4), current.heresy_name || 'Dissidências locais', Math.max(0, Number(current.heresy_share) - 16), now);
          db.prepare('UPDATE cc_realms SET religious_unity = min(100, religious_unity + 4), heresy_pressure = max(0, heresy_pressure - 12), stability = max(10, stability - 4), updated_at = ? WHERE id = ? AND season_id = ?').run(now, action.realm_id, action.season_id);
          eventType = 'religion.heresy_suppressed';
          eventPayload = { faith: realm.religion };
        } else {
          const target = getCcSeasonRegion.get(action.season_id, action.region_id);
          const dogmas = Array.isArray(cost.dogmas) ? cost.dogmas : [];
          const random = seededCrownsRandom(`${action.season_id}:${action.id}:mission`);
          const chance = Math.max(0.12, Math.min(0.92,
            0.34 + Number(cost.templeLevel || 1) * 0.11
            - Number(cost.targetTempleLevel || 0) * 0.09
            - Math.max(0, Number(cost.quadrants || 1) - 1) * 0.035
            + (dogmas.includes('caridade') ? 0.1 : 0)
            - (target?.owner_realm_id && getCcCustomFaithForRealm.get(action.season_id, target.owner_realm_id)?.dogmas_json?.includes('iconodulia') ? 0.08 : 0)
          ));
          const success = random() <= chance;
          if (success) {
            const faith = cost.faith || realm.religion;
            const gain = 8 + Number(cost.templeLevel || 1) * 3;
            const targetOwner = target?.owner_realm_id && getCcRealmById.get(target.owner_realm_id, action.season_id);
            const previousFaith = current.majority_religion || targetOwner?.religion || crownsFaithForRegion({ countryCode: target?.country_code });
            const previousShare = Math.max(50, Number(current.majority_share || 70));
            let majorityFaith = previousFaith;
            let majorityShare = previousShare;
            let dissentFaith = current.heresy_name || 'Dissidências locais';
            let dissentShare = Math.max(0, Number(current.heresy_share || 0));
            let converted = false;
            if (previousFaith === faith) {
              majorityShare = Math.min(96, previousShare + gain);
              dissentShare = Math.max(0, dissentShare - gain);
            } else {
              dissentShare = dissentFaith === faith ? Math.min(72, dissentShare + gain) : gain;
              dissentFaith = faith;
              if (dissentShare >= 50) {
                majorityFaith = faith;
                majorityShare = Math.min(78, 54 + Math.floor((dissentShare - 50) / 2));
                dissentFaith = previousFaith;
                dissentShare = 100 - majorityShare;
                converted = true;
              } else {
                majorityShare = Math.max(51, 100 - dissentShare);
              }
            }
            upsertCcRegionReligion.run(action.season_id, action.region_id, majorityFaith, majorityShare, dissentFaith, dissentShare, now);
            if (targetOwner && targetOwner.id !== action.realm_id && faith !== targetOwner.religion) {
              registerCrownsReligiousCrisis(action.season_id, target, action.realm_id, faith, previousFaith, converted ? majorityShare : dissentShare, now);
            } else if (targetOwner && faith === targetOwner.religion && majorityFaith === faith) {
              const crisis = getCcPendingReligiousCrisisForRegion.get(action.season_id, action.region_id);
              if (crisis) {
                resolveCcReligiousCrisis.run('recovered', now, crisis.id, action.season_id, targetOwner.id);
                db.prepare('UPDATE cc_season_regions SET loyalty = min(100, loyalty + 5), unrest = max(0, unrest - 7), version = version + 1 WHERE season_id = ? AND region_id = ?').run(action.season_id, action.region_id);
              }
            }
            if (target?.owner_realm_id === action.realm_id && dogmas.includes('caridade')) {
              db.prepare('UPDATE cc_season_regions SET loyalty = min(100, loyalty + 2), unrest = max(0, unrest - 2), version = version + 1 WHERE season_id = ? AND region_id = ?').run(action.season_id, action.region_id);
            }
            if (dogmas.includes('coroa_sagrada')) db.prepare('UPDATE cc_realms SET prestige = prestige + 1, updated_at = ? WHERE id = ? AND season_id = ?').run(now, action.realm_id, action.season_id);
            eventType = 'religion.mission_completed';
            eventPayload = { faith, success: true, converted, majorityFaith, majorityShare, dissentFaith, dissentShare, chance: Math.round(chance * 100), sourceRegionId: cost.sourceRegionId };
          } else {
            eventType = 'religion.mission_failed';
            eventPayload = { faith: cost.faith || realm.religion, success: false, chance: Math.round(chance * 100), sourceRegionId: cost.sourceRegionId };
          }
        }
      } else if (action.type === 'navy.attack') {
        const objective = getCcSeasonRegion.get(action.season_id, action.region_id);
        const attackingShips = crownsFleetUnits(cost.ships);
        const returnRegionId = crownsOwnedCoastalReturnRegion(action.season_id, action.realm_id, cost.originRegionId);
        if (!objective || objective.owner_realm_id !== cost.defenderRealmId) {
          if (returnRegionId) crownsMergeFleet(action.season_id, action.realm_id, returnRegionId, attackingShips, cost.morale, now);
          eventType = 'navy.raid_aborted';
          eventPayload = { ships: attackingShips, summary: 'O alvo mudou de domínio e a frota retornou ao porto.' };
        } else {
          const defender = getCcFleetAtRegion.get(action.season_id, cost.defenderRealmId, action.region_id);
          const defendingShips = crownsFleetUnits(defender || {});
          const random = seededCrownsRandom(`${action.season_id}:${action.id}:navy`);
          const attackPower = crownsFleetPower(attackingShips, 'attack') * (Number(cost.morale || 70) / 100) * (0.88 + random() * 0.24);
          const portLevel = crownsBuildingLevel(action.season_id, action.region_id, 'porto');
          const defensePower = Math.max(8 + portLevel * 8, crownsFleetPower(defendingShips, 'defense') * (Number(defender?.morale || 65) / 100)) * (0.9 + random() * 0.2);
          const victory = attackPower > defensePower;
          const attackerLoss = victory ? 0.18 : 0.42;
          const defenderLoss = victory ? 0.58 : 0.24;
          const survive = (fleet, loss) => ({
            fishing: fleet.fishing,
            light: Math.floor(fleet.light * (1 - loss)),
            medium: Math.floor(fleet.medium * (1 - loss)),
            heavy: Math.floor(fleet.heavy * (1 - loss))
          });
          const attackerSurvivors = survive(attackingShips, attackerLoss);
          const defenderSurvivors = survive(defendingShips, defenderLoss);
          if (defender) {
            updateCcFleetAfterBattle.run(defenderSurvivors.light, defenderSurvivors.medium, defenderSurvivors.heavy, Math.max(25, Number(defender.morale || 65) + (victory ? -18 : 7)), now, defender.id, action.season_id);
          }
          if (returnRegionId) crownsMergeFleet(action.season_id, action.realm_id, returnRegionId, attackerSurvivors, Math.max(25, Number(cost.morale || 70) + (victory ? 5 : -14)), now);
          let loot = 0;
          if (victory) {
            const targetRealm = getCcRealmById.get(cost.defenderRealmId, action.season_id);
            loot = Math.min(260, Math.max(40, Math.floor(Number(targetRealm?.treasury || 0) * 0.08)));
            db.prepare('UPDATE cc_realms SET treasury = max(0, treasury - ?), stability = max(10, stability - 2), updated_at = ? WHERE id = ? AND season_id = ?').run(loot, now, cost.defenderRealmId, action.season_id);
            db.prepare('UPDATE cc_realms SET treasury = treasury + ?, prestige = prestige + 5, updated_at = ? WHERE id = ? AND season_id = ?').run(loot, now, action.realm_id, action.season_id);
          }
          eventType = victory ? 'navy.raid_victory' : 'navy.raid_defeat';
          eventPayload = {
            victory,
            loot,
            quadrants: Number(cost.quadrants || 1),
            originRegionId: cost.originRegionId,
            attackPower: Math.round(attackPower),
            defensePower: Math.round(defensePower),
            attackers: attackingShips,
            defenders: defendingShips,
            attackerLosses: crownsFleetTotal(attackingShips, false) - crownsFleetTotal(attackerSurvivors, false),
            defenderLosses: crownsFleetTotal(defendingShips, false) - crownsFleetTotal(defenderSurvivors, false)
          };
        }
      } else if (action.type === 'army.attack') {
        const war = getCcWars.all(action.season_id).find(item => item.id === cost.warId && item.status === 'active');
        const objective = getCcSeasonRegion.get(action.season_id, action.region_id);
        const attackingTroops = crownsTroops(cost.troops);
        const returnRegionId = crownsOwnedReturnRegion(action.season_id, action.realm_id, cost.originRegionId);
        if (!war) throw new Error('Campaign unavailable');
        if (!objective || objective.owner_realm_id !== cost.defenderRealmId) {
          if (returnRegionId) crownsMergeGarrison(action.season_id, action.realm_id, returnRegionId, attackingTroops, cost.morale, now);
          finishCcWar.run(0, JSON.stringify({ aborted: true, reason: 'objective_changed', troops: attackingTroops }), now, war.id, action.season_id);
          eventType = 'war.march_aborted';
          eventPayload = { defenderRealmId: cost.defenderRealmId, troops: attackingTroops, summary: 'A província mudou de mãos antes da chegada e o destacamento retornou.' };
        } else {
        const defender = getCcArmyAtRegion.get(action.season_id, cost.defenderRealmId, action.region_id);
        const defenses = getCcBuildingsForRegion.all(action.season_id, action.region_id);
        const fort = defenses.filter(item => item.building_type === 'fortaleza').reduce((sum, item) => sum + item.level, 0);
        const walls = defenses.filter(item => item.building_type === 'muralha').reduce((sum, item) => sum + item.level, 0);
        const towers = defenses.filter(item => item.building_type === 'torre_vigia').reduce((sum, item) => sum + item.level, 0);
        const random = seededCrownsRandom(`${war.id}:${action.id}`);
        const siegeBreach = Math.min(0.65, attackingTroops.siege * 0.025);
        const fortification = Math.max(1, 1 + fort * 0.35 + walls * 0.16 + towers * 0.08 - siegeBreach);
        const attackPower = crownsTroopPower(attackingTroops, 'attack') * (Number(cost.morale || 65) / 100) * (0.88 + random() * 0.24);
        const defensePower = crownsTroopPower(defender || {}, 'defense') * ((defender?.morale || 55) / 100) * fortification * (0.9 + random() * 0.2);
        const victory = attackPower > defensePower;
        const attackerLoss = victory ? 0.22 : 0.43;
        const attackerSurvivors = {
          spearmen: Math.floor(attackingTroops.spearmen * (1 - attackerLoss)),
          archers: Math.floor(attackingTroops.archers * (1 - attackerLoss)),
          cavalry: Math.floor(attackingTroops.cavalry * (1 - attackerLoss)),
          siege: Math.floor(attackingTroops.siege * (1 - attackerLoss))
        };
        if (defender) {
          const defenderLoss = victory ? 0.48 : 0.25;
          const defenderSurvivors = {
            spearmen: Math.floor(defender.infantry * (1 - defenderLoss)),
            archers: Math.floor(defender.archers * (1 - defenderLoss)),
            cavalry: Math.floor(defender.cavalry * (1 - defenderLoss)),
            siege: Math.floor(Number(defender.siege || 0) * (1 - defenderLoss))
          };
          updateCcArmyAfterBattle.run(defenderSurvivors.spearmen, defenderSurvivors.archers, defenderSurvivors.cavalry, defenderSurvivors.siege, Math.max(25, defender.morale + (victory ? -20 : 7)), defender.region_id, now, defender.id, action.season_id);
        }
        if (victory) {
          transferCcRegion.run(action.realm_id, action.season_id, action.region_id, cost.defenderRealmId);
          preserveCrownsRealmAfterConquest(action.season_id, cost.defenderRealmId, action.region_id, now);
          crownsMergeGarrison(action.season_id, action.realm_id, action.region_id, attackerSurvivors, Math.min(100, Number(cost.morale || 65) + 8), now);
        } else if (returnRegionId) {
          crownsMergeGarrison(action.season_id, action.realm_id, returnRegionId, attackerSurvivors, Math.max(25, Number(cost.morale || 65) - 18), now);
        }
        const defenderTroops = crownsTroops(defender || {});
        const result = {
          victory,
          originRegionId: cost.originRegionId,
          attackPower: Math.round(attackPower),
          defensePower: Math.round(defensePower),
          attackers: attackingTroops,
          defenders: defenderTroops,
          attackerLosses: crownsTroopTotal(attackingTroops) - crownsTroopTotal(attackerSurvivors),
          defenderLosses: defender ? Math.round(crownsTroopTotal(defenderTroops) * (victory ? 0.48 : 0.25)) : 0
        };
        finishCcWar.run(victory ? 100 : -45, JSON.stringify(result), now, war.id, action.season_id);
        db.prepare('UPDATE cc_realms SET prestige = max(0, prestige + ?), stability = max(10, stability + ?), updated_at = ? WHERE id = ? AND season_id = ?').run(victory ? 10 : -4, victory ? 3 : -4, now, action.realm_id, action.season_id);
        eventType = victory ? 'war.victory' : 'war.defeat';
        eventPayload = { ...result, defenderRealmId: cost.defenderRealmId };
        }
      } else {
        throw new Error(`Unknown crowns action: ${action.type}`);
      }
      completeCcAction.run(now, action.id);
      insertCcEvent.run(crypto.randomUUID(), action.season_id, eventType, action.realm_id, action.region_id, JSON.stringify({ actionId: action.id, ...eventPayload }), now);
      db.exec('COMMIT');
      completed = true;
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('[crowns] action processing failed', candidate.id, error);
    }
    if (completed) {
      const payload = { seasonId: candidate.season_id, actionId: candidate.id, regionId: candidate.region_id, version: Date.now() };
      const actionRealm = getCcRealmById.get(candidate.realm_id, candidate.season_id);
      if (!actionRealm?.is_ai && !['army.attack', 'navy.attack'].includes(candidate.type)) emitCrownsEvent('action.completed', payload);
      emitCrownsEvent('world.patch', { ...payload, type: eventType, regionIds: [candidate.region_id] });
    }
  });
}

function processCrownsAiPlans(requestedServerId) {
  const serverId = crownsServerId(requestedServerId);
  const season = processCrownsSeasonLifecycle(serverId);
  if (!season || crownsSeasonClock(season).phase !== 'open') return;
  processCrownsEconomy(serverId);
  const now = Date.now();
  for (const realm of getCcRealms.all(serverId).filter(item => item.is_ai)) {
    const lastDecision = new Date(realm.last_ai_action_at || realm.created_at).getTime();
    if (now - lastDecision < CROWNS_GAME_DAY_MS) continue;
    if (getCcPendingActionsForRealm.all(serverId, realm.id).length) continue;
    const ownedIds = new Set(getCcOwnedRegions.all(serverId, realm.id).map(row => row.region_id));
    const frontier = getCcSeasonRegions.all(serverId).filter(region => {
      if (region.owner_realm_id || region.status !== 'neutral') return false;
      return safeJsonParse(region.neighbor_ids_json, []).some(id => ownedIds.has(id));
    });
    const target = frontier[Math.floor(seededCrownsRandom(`${serverId}:${realm.id}:${crownsSeasonClock(season).day}`)() * frontier.length)];
    const day = crownsSeasonClock(season).day;
    const random = seededCrownsRandom(`${serverId}:${realm.id}:${day}`);
    const hostile = getCcSeasonRegions.all(serverId).filter(region => region.owner_realm_id && region.owner_realm_id !== realm.id && safeJsonParse(region.neighbor_ids_json, []).some(id => ownedIds.has(id)));
    try {
      const operationalRegionId = ownedIds.has(realm.capital_region_id) ? realm.capital_region_id : [...ownedIds][0];
      const recruitRegionId = [...ownedIds].find(id => getCcBuildingsForRegion.all(serverId, id).some(item => item.building_type === 'quartel'));
      const armyStrength = getCcArmiesForRealm.all(serverId, realm.id).reduce((sum, army) => sum + army.infantry + army.archers + army.cavalry, 0);
      if (day > 14 && hostile.length && armyStrength >= 350 && !getCcActiveWarForRealm.get(serverId, realm.id, realm.id) && random() > 0.72) declareCrownsWar({ id: realm.user_id }, { regionId: hostile[Math.floor(random() * hostile.length)].id }, serverId);
      else if (day % 9 === 0 && operationalRegionId && realm.treasury >= 160 && realm.provisions >= 100) queueCrownsReligion({ id: realm.user_id }, { regionId: operationalRegionId }, serverId, Number(realm.heresy_pressure) > 18 ? 'suppress' : 'mission');
      else if (day % 7 === 0 && recruitRegionId && realm.treasury >= 320 && realm.provisions >= 120) queueCrownsRecruitment({ id: realm.user_id }, { regionId: recruitRegionId }, serverId);
      else if (target && realm.treasury >= 120 && realm.provisions >= 80) claimCrownsTerritory({ id: realm.user_id }, { regionId: target.id }, serverId);
    } catch (error) { console.warn('[crowns] AI order rejected', realm.name, error.message); }
    updateCcAiDecisionAt.run(new Date().toISOString(), new Date().toISOString(), realm.id, serverId);
  }
}

function createCrownsSeparatistRealm(serverId, origin, region, now, faith = null, cause = 'political') {
  const revoltKey = crypto.randomUUID();
  const realmId = `${serverId}_realm_revolt_${revoltKey}`;
  const userId = `crowns-ai-revolt-${serverId}-${revoltKey}`;
  const realmName = cause === 'religious' ? `Comunidade de ${region.name}` : `Liga de ${region.name}`;
  const houseName = cause === 'religious' ? `Conselho da Fé de ${region.name}` : `Casa Livre de ${region.name}`;
  db.exec('BEGIN IMMEDIATE');
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    insertUser.run(userId, `IA — ${realmName} — ${revoltKey.slice(0, 6)}`, hashPin(crypto.randomInt(1000, 9999).toString(), salt), salt, now);
    const separatistColor = crownsUnusedRealmColor(serverId, null, realmId);
    insertCcAiRealm.run(
      realmId, serverId, userId, realmName, houseName, separatistColor, region.region_id,
      720, 520, 12, 'separatist', origin.id, `Conselho de ${region.name}`, null,
      44, 56, 72, faith || origin.religion || 'Cristianismo', 58, 24, now, now, now, now
    );
    const transferred = transferCcRegion.run(realmId, serverId, region.region_id, origin.id);
    if (Number(transferred.changes) !== 1) throw new Error('A província separatista mudou de domínio.');
    preserveCrownsRealmAfterConquest(serverId, origin.id, region.region_id, now);
    seedCcStartingAssets(serverId, realmId, region.region_id, now, true);
    stabilizeCcRealmAfterRevolt.run(now, origin.id, serverId);
    insertCcEvent.run(crypto.randomUUID(), serverId, 'revolution.separatist', realmId, region.region_id, JSON.stringify({
      originRealmId: origin.id,
      originRealmName: origin.name,
      cause,
      faith: faith || origin.religion,
      summary: cause === 'religious'
        ? `${region.name} foi reconhecida como uma comunidade independente de ${faith}.`
        : `${region.name} rompeu com ${origin.name}; a nova coroa será conduzida por uma IA.`
    }), now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  const payload = { seasonId: serverId, type: 'revolution.separatist', regionIds: [region.region_id], realmId, version: Date.now() };
  emitCrownsEvent('world.patch', payload);
  return { realmId, regionId: region.region_id };
}

function processCrownsSeparatistRevolts(serverId) {
  if (getCcRealms.all(serverId).filter(item => item.realm_kind === 'separatist').length >= 8) return;
  const candidates = getCcRevoltCandidates.all(serverId);
  for (const origin of candidates) {
    const province = getCcRevoltRegion.get(serverId, origin.id, origin.capital_region_id);
    if (!province) continue;
    const revoltChance = Math.min(0.55, Math.max(0.08,
      (45 - Number(origin.stability || 0)) / 100
      + Math.max(0, Number(province.unrest || 0) - 60) / 120
      + Math.max(0, 40 - Number(province.loyalty || 70)) / 120
    ));
    if (!CROWNS_FORCE_REVOLTS && Math.random() > revoltChance) continue;
    const region = getCcSeasonRegion.get(serverId, province.region_id);
    if (!region || region.owner_realm_id !== origin.id) continue;
    const now = new Date().toISOString();
    const revoltKey = crypto.randomUUID();
    const realmId = `${serverId}_realm_revolt_${revoltKey}`;
    const userId = `crowns-ai-revolt-${serverId}-${revoltKey}`;
    const realmName = `Liga de ${region.name}`;
    const houseName = `Casa Livre de ${region.name}`;
    db.exec('BEGIN IMMEDIATE');
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      insertUser.run(userId, `IA — ${realmName} — ${revoltKey.slice(0, 6)}`, hashPin(crypto.randomInt(1000, 9999).toString(), salt), salt, now);
      const separatistColor = crownsUnusedRealmColor(serverId, null, realmId);
      insertCcAiRealm.run(
        realmId, serverId, userId, realmName, houseName, separatistColor, region.region_id,
        720, 520, 12, 'separatist', origin.id, `Conselho de ${region.name}`, null,
        44, 56, 72, origin.religion || 'Cristianismo', 48, 34, now, now, now, now
      );
      const transferred = transferCcRegion.run(realmId, serverId, region.region_id, origin.id);
      if (Number(transferred.changes) !== 1) throw new Error('A província separatista mudou de domínio.');
      preserveCrownsRealmAfterConquest(serverId, origin.id, region.region_id, now);
      seedCcStartingAssets(serverId, realmId, region.region_id, now, true);
      stabilizeCcRealmAfterRevolt.run(now, origin.id, serverId);
      insertCcEvent.run(crypto.randomUUID(), serverId, 'revolution.separatist', realmId, region.region_id, JSON.stringify({
        originRealmId: origin.id,
        originRealmName: origin.name,
        summary: `${region.name} rompeu com ${origin.name}; a nova coroa será conduzida por uma IA.`
      }), now);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('[crowns] separatist revolt failed', origin.id, error);
      return;
    }
    const payload = { seasonId: serverId, type: 'revolution.separatist', regionIds: [region.region_id], realmId, version: Date.now() };
    emitCrownsEvent('world.patch', payload);
    emitCrownsEvent('journal.published', payload);
    return;
  }
}

async function handleAuth(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/login') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('login')); return true; }
  if (req.method === 'GET' && url.pathname === '/register') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('register')); return true; }
  if (req.method === 'POST' && url.pathname === '/register') {
    const form = await readForm(req); const name = String(form.get('name') || '').trim(); const pin = String(form.get('pin') || ''); const confirm = String(form.get('confirm_pin') || '');
    if (!name || !/^\d{4}$/.test(pin) || pin !== confirm) { res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('register', 'Confira o nome e a senha de 4 dígitos.')); return true; }
    if (getUserByName.get(name)) { res.writeHead(409, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('register', 'Esse nome já está cadastrado.')); return true; }
    const id = crypto.randomUUID(); const salt = crypto.randomBytes(16).toString('hex'); const now = new Date().toISOString(); insertUser.run(id, name, hashPin(pin, salt), salt, now); const sessionId = crypto.randomUUID(); insertSession.run(sessionId, id, now); setSessionCookie(res, sessionId); redirect(res, '/'); return true;
  }
  if (req.method === 'POST' && url.pathname === '/login') {
    const form = await readForm(req); const name = String(form.get('name') || '').trim(); const pin = String(form.get('pin') || ''); const user = getUserByName.get(name);
    if (!user || !/^\d{4}$/.test(pin) || hashPin(pin, user.salt) !== user.pin_hash) { res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('login', 'Nome ou senha inválidos.')); return true; }
    const sessionId = crypto.randomUUID(); insertSession.run(sessionId, user.id, new Date().toISOString()); setSessionCookie(res, sessionId); redirect(res, '/'); return true;
  }
  if (req.method === 'POST' && url.pathname === '/logout') { const sessionId = parseCookies(req)[COOKIE_NAME]; if (sessionId) deleteSession.run(sessionId); clearSessionCookie(res); redirect(res, '/login'); return true; }
  return false;
}

async function handleApi(req, res, url, user) {
  if (user && url.pathname === '/api/presence') {
    if (req.method === 'GET') {
      const game = String(url.searchParams.get('game') || '').trim();
      json(res, 200, { online: platformOnlinePlayers(game) });
      return;
    }
    if (req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const gameId = String(payload.gameId || payload.game || 'hub');
      touchPlatformPresence(user, gameId);
      const filterGame = normalizeGamePresence(gameId).gameId;
      json(res, 200, { ok: true, online: platformOnlinePlayers(filterGame === 'hub' ? '' : filterGame) });
      return;
    }
  }
  if (user && url.pathname === '/api/chat') {
    if (req.method === 'GET') {
      const messages = getHubChatMessages.all(CHAT_MESSAGE_LIMIT).reverse().filter(row => isDisplayablePlayerName(row.user_name)).map(publicChatRow);
      json(res, 200, { messages });
      return;
    }
    if (req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const message = String(payload.message || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LENGTH);
      if (!message) { json(res, 400, { error: 'Mensagem vazia.' }); return; }
      insertHubChatMessage.run(crypto.randomUUID(), user.id, user.name, message, isoNow());
      cleanPlatformTables();
      const messages = getHubChatMessages.all(CHAT_MESSAGE_LIMIT).reverse().filter(row => isDisplayablePlayerName(row.user_name)).map(publicChatRow);
      json(res, 200, { ok: true, messages });
      return;
    }
  }
  if (!user) { json(res, 401, { error: 'Login necessário' }); return; }
  if (url.pathname.startsWith('/api/crowns-and-councils')) {
    if (!hasValidCrownsLaunch(req, user.id)) { json(res, 403, { error: 'Abra o jogo pelo Game Hub para renovar o token de lançamento.' }); return; }
    try {
      if (req.method === 'GET' && url.pathname === '/api/crowns-and-councils/servers') {
        json(res, 200, { servers: crownsServers(user), totalDays: CROWNS_SEASON_DAYS });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/crowns-and-councils/bootstrap') {
        json(res, 200, crownsBootstrap(user, url.searchParams.get('serverId')));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/realm/create') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const realm = createCrownsRealm(user, payload, payload.serverId);
        json(res, 201, { ok: true, realm: publicCcRealm(realm) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/territory/claim') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = claimCrownsTerritory(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, regionId: action.region_id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/buildings/queue') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsBuilding(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, regionId: action.region_id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/provinces/tax') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 200, { ok: true, province: setCrownsProvinceTax(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/fleets/build') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsFleetConstruction(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, regionId: action.region_id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/navy/attack') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = launchCrownsNavalRaid(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, regionId: action.region_id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/armies/recruit') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsRecruitment(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, regionId: action.region_id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/armies/transfer') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsArmyTransfer(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, regionId: action.region_id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/market/orders') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, order: createCrownsMarketOrder(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/market/accept') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 200, { ok: true, order: acceptCrownsMarketOffer(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/market/cancel') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 200, { ok: true, order: cancelCrownsMarketOffer(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/armies/defend') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsDefense(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/war/declare') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = declareCrownsWar(user, payload, payload.serverId);
        json(res, 202, { ok: true, action: { id: action.id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/diplomacy/propose') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, treaty: proposeCrownsTreaty(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/diplomacy/gift') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, gift: sendCrownsDiplomaticGift(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/diplomacy/request/respond') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 200, { ok: true, request: respondCrownsDiplomaticRequest(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/marriage/propose') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, marriage: proposeCrownsMarriage(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/mission') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsReligion(user, payload, payload.serverId, 'mission');
        json(res, 202, { ok: true, action: { id: action.id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/found') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, faith: foundCrownsReligion(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/convert') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 200, { ok: true, conversion: convertCrownsRealm(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/crisis/respond') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 200, { ok: true, decision: respondCrownsReligiousCrisis(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/suppress') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const action = queueCrownsReligion(user, payload, payload.serverId, 'suppress');
        json(res, 202, { ok: true, action: { id: action.id, completesAt: action.completes_at } });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/respond') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, decision: respondCrownsReligiousMovement(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/council/vote') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, vote: voteCrownsCouncil(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/religion/receive') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        json(res, 201, { ok: true, reception: receiveCrownsCouncil(user, payload, payload.serverId) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/actions/cancel') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        cancelCrownsAction(user, payload, payload.serverId);
        json(res, 200, { ok: true });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/crowns-and-councils/journal') {
        json(res, 200, { items: crownsJournal(crownsServerId(url.searchParams.get('serverId'))) });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/crowns-and-councils/journal/articles') {
        const payload = safeJsonParse(await readBody(req) || '{}', {});
        const article = publishCrownsArticle(user, payload, crownsServerId(payload.serverId));
        json(res, 201, { ok: true, article });
        return;
      }
      json(res, 404, { error: 'Ordem de Crowns and Councils desconhecida.' });
    } catch (error) {
      json(res, 409, { error: error.message || 'A ordem foi rejeitada pelo servidor.' });
    }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/ranking') { json(res, 200, rankingPayload()); return; }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const mainSave = getSaveSlot.get(user.id, 1);
    const summary = playerStatsFromSave(mainSave, user.id);
    const lutherMatch = getLutherMatchRanking.get(user.id);
    const lutherStats = lutherMatchStats(lutherMatch || {});
    const lutherMedals = achievementsForState({}, lutherStats, user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS);
    const cronicasState = safeJsonParse(getCronicasSave.get(user.id)?.state_json, null);
    const cronicasMedals = achievementsForState(cronicasState, {}, user.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS);
    const reformaState = safeJsonParse(getReformaSave.get(user.id)?.state_json, null);
    const reformaMedals = achievementsForState(reformaState, {}, user.id, REFORMA_GAME_ID, REFORMA_ACHIEVEMENTS);
    const lutherChest = lutherMatchChestRewards(lutherStats.completedLevels);
    const quizReward = quizRewards(getQuizRanking.get(user.id));
    const medals = [...summary.medals, ...cronicasMedals, ...reformaMedals, ...lutherMedals];
    const xp = achievementXp(medals) + lutherChest.xp + quizReward.xp;
    const rank = titleProgress(xp);
    const points = achievementPoints(medals) + rankPointBonus(rank) + lutherChest.points + quizReward.points;
    json(res, 200, {
      user: { id: user.id, name: user.name, hasAvatar: Boolean(user.avatar_data) },
      xp,
      points,
      rank: rank.current.title,
      nextRank: rank.next?.title || null,
      progress: Math.round(rank.progress),
      medals,
      lutherChest,
      quizReward,
      stickers: { owned: summary.stickersOwned, total: summary.stickersTotal }
    });
    return;
  }  if (req.method === 'GET' && url.pathname === '/api/games') {
    json(res, 200, {
      games: [
        {
          id: 'cores-da-rosa',
          title: 'Uno Luterano',
          status: 'playable',
          playUrl: '/cores-da-rosa',
          rankingUrl: null
        },
        {
          id: 'pela-graca-1904',
          title: 'Pela Graca 1904',
          status: 'playable',
          playUrl: '/play',
          rankingUrl: '/?section=ranking&game=pela-graca-1904'
        },
        {
          id: 'cronicas-do-levante',
          title: 'Cronicas do Levante',
          status: 'prototype',
          playUrl: '/cronicas-do-levante',
          rankingUrl: null
        },
        {
          id: 'a-confissao',
          title: 'A Confissão',
          status: 'playable',
          playUrl: '/a-confissao',
          rankingUrl: null
        },
        {
          id: 'luther-metch',
          title: 'Luther Metch',
          status: 'prototype',
          playUrl: '/luther-metch',
          rankingUrl: '/?section=ranking&game=luther-metch'
        },
        {
          id: 'quiz-ortodoxia',
          title: 'Quiz Ortodoxia',
          status: 'prototype',
          playUrl: '/quiz-ortodoxia',
          rankingUrl: '/?section=ranking&game=quiz-ortodoxia'
        },
        {
          id: 'heroi-ortodoxo',
          title: 'Herói Ortodoxo',
          status: 'prototype',
          playUrl: '/heroi-ortodoxo',
          rankingUrl: null
        },
        {
          id: 'caminho-dos-guardioes',
          title: 'Sola Torre',
          status: 'prototype',
          playUrl: '/caminho-dos-guardioes',
          rankingUrl: null
        },
        {
          id: 'a-queda-de-babel',
          title: 'A Queda de Babel',
          status: 'playable',
          playUrl: '/a-queda-de-babel',
          rankingUrl: null
        },
        {
          id: 'crowns-and-councils',
          title: 'Crowns and Councils',
          status: 'vertical-slice',
          playUrl: '/crowns-and-councils',
          rankingUrl: null
        }
      ]
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/concordium/rom-status') {
    if (!hasConcordiumAccess(req, user.id)) {
      json(res, 403, { available: false, error: 'locked' });
      return;
    }
    const available = fs.existsSync(CONCORDIUM_ROM_PATH) && fs.statSync(CONCORDIUM_ROM_PATH).isFile();
    json(res, 200, { available, size: available ? fs.statSync(CONCORDIUM_ROM_PATH).size : 0 });
    return;
  }
  if (url.pathname === '/api/concordium/profile') {
    if (!hasConcordiumAccess(req, user.id)) {
      json(res, 403, { ok: false, error: 'locked' });
      return;
    }
    const row = getConcordiumProfile.get(user.id);
    const profile = sanitizeConcordiumProfile(safeJsonParse(row?.profile_json, null));
    if (req.method === 'GET') {
      json(res, 200, {
        user: { id: user.id, name: user.name, hasAvatar: Boolean(user.avatar_data) },
        profile,
        updatedAt: row?.updated_at || null
      });
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const nextProfile = sanitizeConcordiumProfile(payload.profile || payload);
      const now = new Date().toISOString();
      upsertConcordiumProfile.run(user.id, JSON.stringify(nextProfile), row?.created_at || now, now);
      json(res, 200, { ok: true, profile: nextProfile, updatedAt: now });
      return;
    }
  }
  if (url.pathname === '/api/concordium/gba-save') {
    if (!hasConcordiumAccess(req, user.id)) {
      json(res, 403, { ok: false, error: 'locked' });
      return;
    }
    const row = getConcordiumGbaSave.get(user.id);
    const save = sanitizeConcordiumGbaSave(safeJsonParse(row?.save_json, null));
    if (req.method === 'GET') {
      json(res, 200, {
        user: { id: user.id, name: user.name },
        save,
        updatedAt: row?.updated_at || null
      });
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const nextSave = sanitizeConcordiumGbaSave(payload);
      const now = new Date().toISOString();
      upsertConcordiumGbaSave.run(user.id, JSON.stringify(nextSave), row?.created_at || now, now);
      json(res, 200, { ok: true, save: nextSave, updatedAt: now });
      return;
    }
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/api/concordium/gba-save/state') {
    if (!hasConcordiumAccess(req, user.id)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Concordium bloqueado');
      return;
    }
    const row = getConcordiumGbaSave.get(user.id);
    const save = sanitizeConcordiumGbaSave(safeJsonParse(row?.save_json, null));
    if (!save.save || save.saveKind !== 'state') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Sem save automatico.');
      return;
    }
    try {
      const bytes = Buffer.from(save.save, 'base64');
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bytes.length,
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': 'inline; filename="concordium.state"'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(bytes);
      return;
    } catch {
      res.writeHead(422, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Save automatico invalido.');
      return;
    }
  }
  if (url.pathname.startsWith('/api/quiz')) {
    touchQuizPresence(user);
    if (req.method === 'GET' && url.pathname === '/api/quiz/lobby') {
      const active = getActiveQuizMatchForUser.get(user.id);
      const queue = getQuizQueueUser.get(user.id);
      const online = getQuizOnlineUsers.all(isoSecondsAgo(QUIZ_ONLINE_SECONDS)).filter(item => item.user_id !== user.id);
      const generalQueued = getQuizGeneralQueue.all('general');
      const generalFirst = generalQueued[0] || null;
      const generalSecondsLeft = generalFirst ? Math.max(0, QUIZ_GENERAL_WAIT_SECONDS - Math.floor((Date.now() - new Date(generalFirst.joined_at).getTime()) / 1000)) : 0;
      json(res, 200, {
        user: { id: user.id, name: user.name },
        online: online.map(item => ({ id: item.user_id, name: item.user_name, lastSeen: item.last_seen })),
        queue: queue ? { mode: queue.mode, joinedAt: queue.joined_at } : null,
        generalQueue: generalFirst ? {
          starter: { id: generalFirst.user_id, name: generalFirst.user_name },
          joinedAt: generalFirst.joined_at,
          size: generalQueued.length,
          secondsLeft: generalSecondsLeft,
          waitSeconds: QUIZ_GENERAL_WAIT_SECONDS,
          joined: generalQueued.some(item => item.user_id === user.id)
        } : null,
        activeMatch: active ? publicQuizMatch(active, user.id, { heartbeat: true }) : null,
        invites: getQuizIncomingInvites.all(user.id, isoSecondsAgo(180)).map(item => ({ id: item.id, code: quizShortCode(item.id), from: { id: item.from_user_id, name: item.from_user_name }, createdAt: item.created_at })),
        outgoingInvites: getQuizOutgoingInvites.all(user.id, isoSecondsAgo(180)).map(item => ({ id: item.id, code: quizShortCode(item.id), to: { id: item.to_user_id, name: item.to_user_name }, createdAt: item.created_at }))
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/solo') {
      if (!quizQuestionsReady()) { json(res, 409, { error: 'Banco de perguntas em revisão. Aguarde as novas perguntas aprovadas.' }); return; }
      deleteQuizQueueUser.run(user.id);
      const match = createQuizMatch('solo', [user]);
      json(res, 200, { match: publicQuizMatch(match, user.id) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/queue') {
      if (!quizQuestionsReady()) { json(res, 409, { error: 'Banco de perguntas em revisão. Aguarde as novas perguntas aprovadas.' }); return; }
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const mode = payload.mode === 'general' ? 'general' : 'duel';
      deleteQuizQueueUser.run(user.id);
      if (mode === 'duel') {
        const opponent = getQuizDuelOpponent.get('duel', user.id);
        if (opponent) {
          const match = createQuizMatch('duel', [opponent, user]);
          deleteQuizQueueUser.run(opponent.user_id);
          deleteQuizQueueUser.run(user.id);
          json(res, 200, { status: 'matched', match: publicQuizMatch(match, user.id) });
          return;
        }
      }
      upsertQuizQueue.run(user.id, user.name, mode, isoNow());
      if (mode === 'general') {
        const queued = getQuizGeneralQueue.all('general');
        const first = queued[0];
        const waitedEnough = first && (Date.now() - new Date(first.joined_at).getTime()) >= QUIZ_GENERAL_WAIT_SECONDS * 1000;
        if (queued.length >= 2 && waitedEnough) {
          const match = createQuizMatch('general', queued);
          queued.forEach(item => deleteQuizQueueUser.run(item.user_id));
          json(res, 200, { status: 'matched', match: publicQuizMatch(match, user.id) });
          return;
        }
      }
      if (mode === 'general') {
        const queued = getQuizGeneralQueue.all('general');
        const first = queued[0];
        const secondsLeft = first ? Math.max(0, QUIZ_GENERAL_WAIT_SECONDS - Math.floor((Date.now() - new Date(first.joined_at).getTime()) / 1000)) : QUIZ_GENERAL_WAIT_SECONDS;
        json(res, 200, { status: 'waiting', queue: getQuizQueueUser.get(user.id), queueSize: queued.length, waitSeconds: QUIZ_GENERAL_WAIT_SECONDS, secondsLeft, starter: first ? { id: first.user_id, name: first.user_name } : null });
        return;
      }
      json(res, 200, { status: 'waiting', queue: getQuizQueueUser.get(user.id), queueSize: 1, waitSeconds: null });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/cancel-queue') {
      deleteQuizQueueUser.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/leave') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const match = getQuizMatch.get(String(payload.matchId || ''));
      const players = match ? getQuizMatchPlayers.all(match.id) : [];
      if (!match || !players.some(player => player.user_id === user.id)) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      insertQuizMatchLeave.run(match.id, user.id, isoNow());
      deleteQuizQueueUser.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/invite') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const target = getUserById.get(String(payload.toUserId || ''));
      if (!target || target.id === user.id) { json(res, 400, { error: 'Jogador inválido.' }); return; }
      if (getActiveQuizMatchForUser.get(user.id)) { json(res, 409, { error: 'Você já está em uma partida.' }); return; }
      if (getActiveQuizMatchForUser.get(target.id)) { json(res, 409, { error: `${target.name} já está em uma partida.` }); return; }
      const existing = getQuizPendingInviteBetween.get(isoSecondsAgo(180), user.id, target.id, target.id, user.id);
      if (existing) {
        const direction = existing.from_user_id === user.id ? 'outgoing' : 'incoming';
        json(res, 200, { ok: true, duplicate: true, direction, inviteId: existing.id, code: quizShortCode(existing.id) });
        return;
      }
      const id = crypto.randomUUID();
      insertQuizInvite.run(id, user.id, user.name, target.id, target.name, 'pending', isoNow());
      json(res, 200, { ok: true, duplicate: false, direction: 'outgoing', inviteId: id, code: quizShortCode(id) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/invite/respond') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const invite = getQuizInvite.get(String(payload.inviteId || ''));
      if (!invite || invite.to_user_id !== user.id) { json(res, 404, { error: 'Convite não encontrado.' }); return; }
      if (invite.status === 'accepted' && invite.match_id) {
        const acceptedMatch = getQuizMatch.get(invite.match_id);
        const acceptedPlayers = acceptedMatch ? getQuizMatchPlayers.all(acceptedMatch.id) : [];
        if (acceptedMatch && acceptedPlayers.some(player => player.user_id === user.id)) {
          json(res, 200, { ok: true, duplicate: true, match: publicQuizMatch(acceptedMatch, user.id) });
          return;
        }
      }
      if (invite.status !== 'pending') { json(res, 409, { error: 'Este convite não está mais ativo.' }); return; }
      if (!payload.accept) {
        updateQuizInvite.run('declined', null, invite.id);
        json(res, 200, { ok: true });
        return;
      }
      if (!quizQuestionsReady()) { json(res, 409, { error: 'Banco de perguntas em revisão. Aguarde as novas perguntas aprovadas.' }); return; }
      if (getActiveQuizMatchForUser.get(invite.to_user_id)) {
        updateQuizInvite.run('superseded', null, invite.id);
        json(res, 409, { error: 'Você já entrou em outra partida.' });
        return;
      }
      if (getActiveQuizMatchForUser.get(invite.from_user_id)) {
        updateQuizInvite.run('superseded', null, invite.id);
        json(res, 409, { error: `${invite.from_user_name} já entrou em outra partida.` });
        return;
      }
      let match;
      db.exec('BEGIN IMMEDIATE');
      try {
        const currentInvite = getQuizInvite.get(invite.id);
        if (!currentInvite || currentInvite.status !== 'pending') throw new Error('INVITE_ALREADY_HANDLED');
        match = createQuizMatch('invite', [
          { user_id: currentInvite.from_user_id, user_name: currentInvite.from_user_name },
          { user_id: currentInvite.to_user_id, user_name: currentInvite.to_user_name }
        ]);
        updateQuizInvite.run('accepted', match.id, currentInvite.id);
        supersedeOtherQuizInvites.run(currentInvite.id, currentInvite.from_user_id, currentInvite.to_user_id, currentInvite.from_user_id, currentInvite.to_user_id);
        deleteQuizQueueUser.run(currentInvite.from_user_id);
        deleteQuizQueueUser.run(currentInvite.to_user_id);
        db.exec('COMMIT');
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch {}
        if (error?.message === 'INVITE_ALREADY_HANDLED') {
          const handled = getQuizInvite.get(invite.id);
          const handledMatch = handled?.match_id ? getQuizMatch.get(handled.match_id) : null;
          if (handledMatch) { json(res, 200, { ok: true, duplicate: true, match: publicQuizMatch(handledMatch, user.id) }); return; }
          json(res, 409, { error: 'Este convite não está mais ativo.' });
          return;
        }
        throw error;
      }
      json(res, 200, { ok: true, match: publicQuizMatch(match, user.id) });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/quiz/match') {
      const match = getQuizMatch.get(url.searchParams.get('id') || '');
      const players = match ? getQuizMatchPlayers.all(match.id) : [];
      if (!match || !players.some(player => player.user_id === user.id) || getQuizMatchLeave.get(match.id, user.id)) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      const publicMatch = publicQuizMatch(match, user.id, { heartbeat: true });
      if (!publicMatch) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      json(res, 200, { match: publicMatch });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/answer') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      let match = getQuizMatch.get(String(payload.matchId || ''));
      const players = match ? getQuizMatchPlayers.all(match.id) : [];
      if (!match || match.status !== 'active' || !players.some(player => player.user_id === user.id) || getQuizMatchLeave.get(match.id, user.id)) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      match = ensureQuizMatchProgress(match);
      if (!match || match.status !== 'active' || getQuizMatchLeave.get(match.id, user.id)) { json(res, 409, { error: 'Você foi marcado como desistente.', match: match ? publicQuizMatch(match, user.id) : null }); return; }
      touchQuizMatchHeartbeat(match.id, user.id);
      if (match.mode === 'general' && getQuizMatchElimination.get(match.id, user.id)) { json(res, 409, { error: 'Você já foi desclassificado.', match: publicQuizMatch(match, user.id) }); return; }
      const round = quizRoundInfo(match);
      if (round.complete || round.msLeft <= 0) { json(res, 409, { error: 'Tempo esgotado.', match: publicQuizMatch(match, user.id) }); return; }
      if (getQuizAnswer.get(match.id, user.id, round.index)) { json(res, 200, { ok: true, match: publicQuizMatch(match, user.id) }); return; }
      const answerIndex = clampInt(payload.answerIndex, 0, 3);
      const qid = round.questionIds[round.index];
      const correct = answerIndex === quizQuestion(qid).c ? 1 : 0;
      insertQuizAnswer.run(match.id, user.id, round.index, answerIndex, correct, isoNow());
      if (match.mode === 'general' && !correct) {
        insertQuizMatchElimination.run(match.id, user.id, round.index, isoNow());
      }
      json(res, 200, { ok: true, correct: Boolean(correct), match: publicQuizMatch(match, user.id) });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/quiz/ranking') {
      json(res, 200, { rows: getQuizRankings.all().filter(row => isDisplayablePlayerName(row.user_name)).map((row, index) => ({ position: index + 1, player: row.user_name, duelWins: row.duel_wins, generalWins: row.general_wins, inviteWins: row.invite_wins, wins: row.wins, matchesPlayed: row.matches_played })) });
      return;
    }
    json(res, 404, { error: 'API do quiz não encontrada' });
    return;
  }
  if (url.pathname === '/api/luther-metch/progress') {
    const row = getLutherMatchRanking.get(user.id);
    if (req.method === 'GET') {
      const stats = lutherMatchStats(row || {});
      json(res, 200, {
        gameId: LUTHER_MATCH_GAME_ID,
        progress: row ? publicLutherMatchRow(row) : { player: user.name, level: 1, bestLevel: 1, completedLevels: 0, score: 0, maxCombo: 0, lutherPairUsed: false, solasPairUsed: false, updatedAt: null },
        medals: achievementsForState({}, stats, user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS)
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const level = clampInt(payload.level, 1, LUTHER_MATCH_MAX_LEVEL);
      const bestLevel = clampInt(payload.bestLevel ?? level, 1, LUTHER_MATCH_MAX_LEVEL);
      const completedLevels = clampInt(payload.completedLevels ?? Math.max(0, bestLevel - 1), 0, LUTHER_MATCH_MAX_LEVEL);
      const score = clampInt(payload.score, 0, 999999999);
      const maxCombo = clampInt(payload.maxCombo, 0, 999);
      const lutherPairUsed = payload.lutherPairUsed ? 1 : 0;
      const solasPairUsed = payload.solasPairUsed ? 1 : 0;
      const now = new Date().toISOString();
      upsertLutherMatchRanking.run(user.id, user.name, level, bestLevel, completedLevels, score, maxCombo, lutherPairUsed, solasPairUsed, now);
      const saved = getLutherMatchRanking.get(user.id);
      const newlyUnlocked = persistLutherMatchAchievements(user.id, lutherMatchStats(saved), now);
      json(res, 200, { ok: true, progress: publicLutherMatchRow(saved), newlyUnlocked });
      return;
    }
  }
  if (url.pathname === '/api/cronicas/save') {
    const save = getCronicasSave.get(user.id);
    const savedState = safeJsonParse(save?.state_json, null);
    if (req.method === 'GET') {
      json(res, 200, {
        gameId: CRONICAS_GAME_ID,
        name: CRONICAS_SAVE_NAME,
        state: savedState,
        updatedAt: save?.updated_at || null,
        medals: achievementsForState(savedState, {}, user.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS)
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const state = payload?.state || null;
      const now = new Date().toISOString();
      upsertCronicasSave.run(user.id, JSON.stringify(state), save?.created_at || now, now);
      persistCronicasAchievements(user.id, payload?.achievements || state?.achievements || [], now);
      json(res, 200, { ok: true, updatedAt: now });
      return;
    }
    if (req.method === 'DELETE') {
      deleteCronicasSave.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
  }
  if (url.pathname === '/api/a-confissao/save') {
    const save = getReformaSave.get(user.id);
    const savedState = safeJsonParse(save?.state_json, null);
    if (req.method === 'GET') {
      json(res, 200, {
        gameId: REFORMA_GAME_ID,
        name: REFORMA_SAVE_NAME,
        user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
        state: savedState,
        updatedAt: save?.updated_at || null,
        medals: achievementsForState(savedState, {}, user.id, REFORMA_GAME_ID, REFORMA_ACHIEVEMENTS)
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const state = payload?.state || null;
      const now = new Date().toISOString();
      upsertReformaSave.run(user.id, JSON.stringify(state), save?.created_at || now, now);
      persistReformaAchievements(user.id, payload?.achievements || state?.achievements || [], now);
      json(res, 200, { ok: true, updatedAt: now });
      return;
    }
    if (req.method === 'DELETE') {
      deleteReformaSave.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
  }
  if (url.pathname === '/api/heroi-ortodoxo/save') {
    const save = getHeroiSave.get(user.id);
    if (req.method === 'GET') {
      json(res, 200, {
        gameId: HEROI_GAME_ID,
        user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
        state: safeJsonParse(save?.state_json, null),
        updatedAt: save?.updated_at || null
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const state = payload?.state || null;
      const now = new Date().toISOString();
      upsertHeroiSave.run(user.id, JSON.stringify(state), save?.created_at || now, now);
      json(res, 200, { ok: true, updatedAt: now });
      return;
    }
    if (req.method === 'DELETE') {
      deleteHeroiSave.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 405, { error: 'Método não permitido' });
    return;
  }
  if (url.pathname === '/api/guardioes/save') {
    const save = getGuardioesSave.get(user.id);
    if (req.method === 'GET') {
      json(res, 200, {
        gameId: GUARDIOES_GAME_ID,
        state: safeJsonParse(save?.state_json, null),
        updatedAt: save?.updated_at || null
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const state = payload?.state || null;
      const now = new Date().toISOString();
      upsertGuardioesSave.run(user.id, JSON.stringify(state), save?.created_at || now, now);
      json(res, 200, { ok: true, updatedAt: now });
      return;
    }
    if (req.method === 'DELETE') {
      deleteGuardioesSave.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 405, { error: 'Método não permitido' });
    return;
  }
  if (url.pathname === '/api/babel/save') {
    const save = getBabelSave.get(user.id);
    if (req.method === 'GET') {
      const updatedAt = save?.updated_at || null;
      const offlineSeconds = updatedAt ? Math.max(0, Math.min(12 * 60 * 60, Math.floor((Date.now() - Date.parse(updatedAt)) / 1000))) : 0;
      json(res, 200, {
        gameId: BABEL_GAME_ID,
        user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
        state: safeJsonParse(save?.state_json, null),
        updatedAt,
        serverNow: new Date().toISOString(),
        offlineSeconds
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const state = payload?.state && typeof payload.state === 'object' ? payload.state : null;
      const serialized = JSON.stringify(state);
      if (!state || serialized.length > 200000) {
        json(res, 400, { error: 'Save inválido ou maior que o limite.' });
        return;
      }
      if (Number(state.version) < 5) {
        json(res, 409, { error: 'Cliente desatualizado. Recarregue o jogo.' });
        return;
      }
      const now = new Date().toISOString();
      state.lastSeenServer = now;
      upsertBabelSave.run(user.id, JSON.stringify(state), save?.created_at || now, now);
      json(res, 200, { ok: true, updatedAt: now, serverNow: now });
      return;
    }
    if (req.method === 'DELETE') {
      deleteBabelSave.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 405, { error: 'Método não permitido' });
    return;
  }
  const match = url.pathname.match(/^\/api\/saves\/([^/]+)$/);
  if (!match) { json(res, 404, { error: 'API não encontrada' }); return; }
  const id = match[1]; const save = getSave.get(id, user.id);
  if (!save) { json(res, 404, { error: 'Save não encontrado' }); return; }
  if (req.method === 'GET') { json(res, 200, { id: save.id, name: save.name, slot: save.slot, state: safeJsonParse(save.state_json) }); return; }
  if (req.method === 'PUT' || req.method === 'POST') {
    const payload = safeJsonParse(await readBody(req) || '{}', {}); const state = payload?.state || null; const now = new Date().toISOString();
    updateSaveState.run(JSON.stringify(state), now, id, user.id);
    updateRankingForSave({ ...save, state_json: JSON.stringify(state), updated_at: now }, user.name, state);
    json(res, 200, { ok: true }); return;
  }
  json(res, 405, { error: 'Método não permitido' });
}

function renderAuth(mode, error = '') {
  const isRegister = mode === 'register';
  return pageShell(isRegister ? 'Registrar' : 'Entrar', `
<main class="ol-auth-screen">
  <section class="ol-auth-brand">
    <div class="ol-brand-lockup">
      <img src="/assets/ortodoxia-luterana-selo-v2.png?v=${GAME_VERSION}" alt="Ortodoxia Luterana" class="ol-seal">
      <div class="ol-title"><span>Ortodoxia</span><span>Luterana</span><strong>Gaming</strong></div>
    </div>
    <blockquote>"Portanto, quer comais, quer bebais, ou facais outra coisa qualquer, fazei tudo para a gloria de Deus."<cite>1 Corintios 10:31</cite></blockquote>
  </section>
  <section class="ol-auth-card">
    <nav class="ol-auth-tabs"><a class="${isRegister ? '' : 'active'}" href="/login">Entrar</a><a class="${isRegister ? 'active' : ''}" href="/register">Registrar</a></nav>
    <h1>${isRegister ? 'Registrar' : 'Entrar'}</h1>
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="${isRegister ? '/register' : '/login'}" class="auth-form">
      <label>Nome de usuário
        <input name="name" maxlength="40" autocomplete="username" placeholder="Digite seu nome de usuário" required>
      </label>
      <label>Senha
        <input name="pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="Senha de 4 digitos" required>
      </label>
      ${isRegister ? `<label>Confirmar senha
        <input name="confirm_pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="new-password" placeholder="Repita a senha" required>
      </label>` : ''}
      <div class="auth-options"><label><input type="checkbox"> Lembrar de mim</label><span>Esqueci minha senha</span></div>
      <button type="submit">${isRegister ? 'Registrar' : 'Entrar'}</button>
    </form>
    <div class="ol-auth-footer"><span>+</span><p>${isRegister ? 'Ja tem uma conta?' : 'Ainda nao tem uma conta?'}</p><a class="auth-link" href="${isRegister ? '/login' : '/register'}">${isRegister ? 'Entrar' : 'Registrar'}</a></div>
  </section>
</main>`, 'login');
}

function renderDashboard(user, error = '', section = 'inicio', selectedGame = '', openingId = '') {
  const activeSection = ['inicio', 'jogos', 'ranking', 'medalhas', 'album', 'loja', 'configuracoes'].includes(section) ? section : 'inicio';
  const saves = new Map(getSavesByUser.all(user.id).map(save => [save.slot, save]));
  const mainSave = saves.get(1);
  const cronicasSave = getCronicasSave.get(user.id);
  const reformaSave = getReformaSave.get(user.id);
  const babelSave = getBabelSave.get(user.id);
  const player = playerStatsFromSave(mainSave, user.id);
  const stats = player.stats;
  const cronicasState = safeJsonParse(cronicasSave?.state_json, null);
  const cronicasMedals = achievementsForState(cronicasState, {}, user.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS);
  const reformaState = safeJsonParse(reformaSave?.state_json, null);
  const reformaMedals = achievementsForState(reformaState, {}, user.id, REFORMA_GAME_ID, REFORMA_ACHIEVEMENTS);
  const lutherMatchRow = getLutherMatchRanking.get(user.id);
  const lutherMatchMedals = achievementsForState({}, lutherMatchStats(lutherMatchRow || {}), user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS);
  const medals = [...player.medals, ...cronicasMedals, ...reformaMedals, ...lutherMatchMedals];
  const lutherChest = lutherMatchChestRewards(lutherMatchStats(lutherMatchRow || {}).completedLevels);
  const quizReward = quizRewards(getQuizRanking.get(user.id));
  const xp = achievementXp(medals) + lutherChest.xp + quizReward.xp;
  const rank = titleProgress(xp);
  const points = achievementPoints(medals) + rankPointBonus(rank) + lutherChest.points + quizReward.points;
  const cardWallet = cardWalletForUser(user, points);
  const unlockedMedals = medals.filter(medal => medal.unlocked).length;
  const ranking = rankingPayload();
  const rankingRows = (items, score, suffix = '') => items.length ? items.slice(0, 8).map((item, index) => `<div class="hub-rank-row"><b>${index + 1}</b><span>${escapeHtml(item.player)}</span><strong>${escapeHtml(score(item))}${suffix}</strong></div>`).join('') : '<p>Nenhum registro ainda.</p>';
  const onlinePlayers = platformOnlinePlayers();
  const generalRankingRows = getAllUsers.all().filter(rankUser => isDisplayablePlayerName(rankUser.name)).map(rankUser => {
    const userSave = getSaveSlot.get(rankUser.id, 1);
    const userSummary = playerStatsFromSave(userSave, rankUser.id);
    const lutherMatch = getLutherMatchRanking.get(rankUser.id);
    const lutherMedals = achievementsForState({}, lutherMatchStats(lutherMatch || {}), rankUser.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS).filter(medal => medal.unlocked).length;
    const cronicasUserState = safeJsonParse(getCronicasSave.get(rankUser.id)?.state_json, null);
    const cronicasUserMedals = achievementsForState(cronicasUserState, {}, rankUser.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS).filter(medal => medal.unlocked).length;
    const reformaUserState = safeJsonParse(getReformaSave.get(rankUser.id)?.state_json, null);
    const reformaUserMedals = achievementsForState(reformaUserState, {}, rankUser.id, REFORMA_GAME_ID, REFORMA_ACHIEVEMENTS).filter(medal => medal.unlocked).length;
    return {
      user: rankUser,
      summary: userSummary,
      medals: userSummary.medals.filter(medal => medal.unlocked).length + lutherMedals + cronicasUserMedals + reformaUserMedals
    };
  }).sort((a, b) => b.medals - a.medals || a.user.name.localeCompare(b.user.name)).map((item, index) => {
    const userRank = item.summary.rank.current;
    return `<div class="hub-rank-row hub-rank-player"><b>${index + 1}</b><span>${escapeHtml(item.user.name)}<img class="mini-rank-badge" src="${userRank.file}?v=${GAME_VERSION}" alt="${escapeHtml(userRank.title)}"></span><strong>${item.medals} medalhas</strong></div>`;
  }).join('');
  const prestigeItems = ranking.prestige.slice(0, 6);
  const liveRows = prestigeItems.length ? prestigeItems.map(item => `<article><img class="feed-avatar achievement-feed-icon" src="${escapeHtml(item.icon)}?v=${GAME_VERSION}" alt="${escapeHtml(item.medal)}"><span>${escapeHtml(item.player)} conquistou ${escapeHtml(item.medal)}</span><small>+${item.xp} XP · +${item.points} pontos</small></article>`).join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestigio conquistado ainda. As novas medalhas vao aparecer aqui.</span></article>';
  const eventPanel = `<section class="ol-panel ol-event"><p>Evento em destaque</p><h3>Desafio da Reforma</h3><span>Espaço reservado para temporadas especiais da comunidade.</span><button disabled>Em breve</button></section>`;
  const gameRankingList = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Rankings por jogo</h3></div><div class="game-rank-list"><a href="/?section=ranking&game=pela-graca-1904"><span>Pela Graça 1904</span><strong>Ver ranking</strong></a><a href="/?section=ranking&game=luther-metch"><span>Luther Metch</span><strong>Ver ranking</strong></a><a href="/?section=ranking&game=quiz-ortodoxia"><span>Quiz Ortodoxia</span><strong>Ver ranking</strong></a></div></section>`;
  const generalRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Ranking geral</h3></div>${generalRankingRows || '<p>Nenhum jogador cadastrado ainda.</p>'}</section>${gameRankingList}`;
  const ielbRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Pela Graça 1904</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Mais anos jogados</h4>${rankingRows(ranking.byYear, item => item.year)}<h4>Mais igrejas até 2026</h4>${rankingRows(ranking.byChurches, item => item.totalChurches, ' igrejas')}</section>`;
  const lutherRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Luther Metch</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Quem chegou mais longe</h4>${rankingRows(ranking.lutherMatch, item => `Nivel ${item.bestLevel}`)}</section>`;
  const quizRankingRows = ranking.quizOrtodoxia.length ? ranking.quizOrtodoxia.slice(0, 12).map((item, index) => `<div class="hub-rank-row"><b>${index + 1}</b><span>${escapeHtml(item.player)}</span><strong>${item.duelWins} duelo · ${item.generalWins} geral</strong></div>`).join('') : '<p>Nenhuma vitória ranqueada ainda.</p>';
  const quizRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Quiz Ortodoxia</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Vitórias online</h4>${quizRankingRows}</section>`;
  const rankingSection = selectedGame === 'pela-graca-1904' ? ielbRanking : selectedGame === 'luther-metch' ? lutherRanking : selectedGame === 'quiz-ortodoxia' ? quizRanking : generalRanking;
  const nav = [
    ['inicio', 'Início', '/', 'inicio'],
    ['jogos', 'Jogos', '/?section=jogos', 'jogos'],
    ['ranking', 'Ranking', '/?section=ranking', 'ranking'],
    ['medalhas', 'Medalhas', '/?section=medalhas', 'medalhas'],
    ['album', 'Álbum', '/?section=album', 'album'],
    ['loja', 'Loja', '/?section=loja', 'loja'],
    ['configuracoes', 'Configurações', '/?section=configuracoes', 'configuracoes']
  ].map(([key, label, href, icon]) => `<a class="${activeSection === key ? 'active' : ''}" href="${href}"><img class="nav-icon" src="/assets/nav-icons/nav-${icon}.png?v=${GAME_VERSION}" alt="">${label}</a>`).join('');
  const gameCard = `<section class="ol-panel ol-games">
    <article class="ol-game-card cores-da-rosa-cover"><div><h4>Uno Luterano</h4><p>Complete a mão em mesas para 2 ou 4 jogadores, convide quem está online e domine as cores litúrgicas.</p></div><a href="/cores-da-rosa">Jogar</a></article>
    <article class="ol-game-card crowns-cover"><div><h4>Crowns and Councils</h4><p>Funde um reino e uma dinastia sobre um mapa europeu real, com expansão assíncrona e autoridade do servidor.</p></div><a href="/crowns-and-councils">Jogar</a></article>
    <article class="ol-game-card pela-cover"><div><h4>Pela Graça 1904</h4><p>Gerencie igrejas, forme pastores, responda perguntas doutrinárias e acompanhe a história da IELB no Brasil.</p></div><a href="/play">Jogar</a></article>
    <article class="ol-game-card reforma-cover"><div><h4>A Confissão</h4><p>Conduza a Reforma de 1483 a 1648 por decisões históricas, da vida de Lutero ao Livro de Concórdia e ao exílio boêmio.</p></div><a href="/a-confissao">${reformaSave ? 'Continuar' : 'Jogar'}</a></article>
    <article class="ol-game-card cronicas-cover"><div><h4>Crônicas do Levante</h4><p>Uma narrativa bíblica interativa nos dias do rei Davi, com escolhas, descobertas, relações e consequências pelo caminho.</p></div><a href="/cronicas-do-levante">${cronicasSave ? 'Continuar' : 'Jogar'}</a></article>
    <article class="ol-game-card heroi-cover"><div><h4>Herói Ortodoxo</h4><p>Monte uma equipe de heróis bíblicos, explore capítulos curtos e escolha bênçãos para vencer arenas cheias de recompensas.</p></div><a href="/heroi-ortodoxo">Jogar</a></article>
    <article class="ol-game-card match3-cover"><div><h4>Luther Metch</h4><p>Junte 3 ou mais peças iguais para cumprir objetivos e avançar de fase.</p></div><a href="/luther-metch">Jogar</a></article>
    <article class="ol-game-card quiz-cover"><div><h4>Quiz Ortodoxia</h4><p>Dispute perguntas de Bíblia, Reforma e luteranismo em modo solo, duelo online, convite ou competição geral.</p></div><a href="/quiz-ortodoxia">Jogar</a></article>
    <article class="ol-game-card guardioes-cover"><div><h4>Sola Torre</h4><p>Defenda a fortaleza com torres, estratégia e fé. Escolha sua formação, enfrente as ondas e avance pela campanha.</p></div><a href="/caminho-dos-guardioes">Jogar</a></article>
    <article class="ol-game-card babel-cover"><div><h4>A Queda de Babel</h4><p>Explore a Grande Estrada ao lado de outros aventureiros, monte sua build e enfrente o Senhor das Estacas em um mundo contínuo.</p></div><a href="/a-queda-de-babel">Jogar</a></article>
  </section>`;
  const rankCard = `<aside class="ol-panel ol-rank"><p>Seu rank geral</p><img class="rank-badge" src="${rank.current.file}?v=${GAME_VERSION}" alt="${escapeHtml(rank.current.title)}"><div class="rank-xp"><strong>${xp} XP</strong><span>${rank.next ? `${Math.max(0, rank.next.xp - rank.currentXp)} XP para ${escapeHtml(rank.next.title)}` : 'Rank maximo alcancado'}</span><div class="rank-bar"><span style="width:${Math.round(rank.progress)}%"></span></div></div><a href="/?section=ranking">Ver ranking geral</a><div class="hub-online-panel"><div class="panel-head"><h3>Online agora</h3></div><div id="hub-online-list" class="hub-online-list">${renderOnlinePlayers(onlinePlayers)}</div></div></aside>`;
  const chatWidget = `<section class="hub-chat" id="hub-chat" aria-label="Chat geral"><div class="hub-chat-head"><strong>Chat geral</strong><button type="button" id="hub-chat-toggle" aria-label="Minimizar chat">-</button></div><div class="hub-chat-messages" id="hub-chat-messages"></div><form id="hub-chat-form" class="hub-chat-form"><input id="hub-chat-input" name="message" maxlength="${CHAT_MAX_LENGTH}" autocomplete="off" placeholder="Mensagem"><button type="submit">Enviar</button></form></section>`;
  const sections = {
    inicio: `<section class="ol-intro">Escolha um jogo, acompanhe seu rank geral e veja os prestígios conquistados.</section>${gameCard}${rankCard}<section class="ol-panel ol-live"><div class="panel-head"><h3>Prestígios</h3></div><div id="hub-live-feed">${liveRows}</div></section>${eventPanel}`,
    jogos: `${gameCard}`,
    ranking: rankingSection,
    medalhas: `<section class="ol-panel" id="medalhas"><div class="panel-head"><h3>Medalhas</h3><span>${unlockedMedals}/${medals.length}</span></div><div class="medal-grid">${medals.map(medal => `<article class="${medal.unlocked ? '' : 'locked'}">${renderAchievementIcon(medal)}<span>${escapeHtml(medal.title)}</span><p>${escapeHtml(medal.description)}</p><small>+${medal.xp} XP · +${medal.points} pontos</small></article>`).join('')}</div></section>`,
    album: renderCardAlbum(user),
    loja: renderCardShop(user, points, openingId),
    configuracoes: `<section class="ol-panel ol-settings" id="configuracoes"><div class="panel-head"><h3>Configurações</h3></div><form method="POST" action="/profile" class="profile-edit"><div class="profile-box">${renderAvatar(user, 'profile-avatar')}<div><label>Nome público<input name="name" maxlength="40" value="${escapeHtml(user.name)}" required></label><label>Foto do perfil<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label><input id="avatar-data" type="hidden" name="avatar_data" value="${escapeHtml(user.avatar_data || '')}"><button type="submit">Salvar perfil</button></div></div></form><hr><div class="saved-games-head"><h4>Campanhas por jogo</h4><p>Medalhas, campanhas e saves principais ficam salvos na conta.</p></div><div class="saved-game-list"><article class="saved-game-row"><div><span>Pela Graça 1904</span><strong>${mainSave ? escapeHtml(mainSave.name) : 'Nenhuma campanha atual'}</strong><small>${mainSave ? 'Apaga só esta campanha atual.' : 'Crie uma campanha para jogar novamente.'}</small></div>${mainSave ? `<form method="POST" action="/saves/${encodeURIComponent(mainSave.id)}/delete" onsubmit="return confirm('Apagar a campanha atual de Pela Graça 1904? Medalhas e melhor ranking serão mantidos.')"><button>Apagar campanha</button></form>` : '<a href="/play">Criar campanha</a>'}</article><article class="saved-game-row"><div><span>Crônicas do Levante</span><strong>${cronicasSave ? 'Campanha em andamento' : 'Nenhuma campanha atual'}</strong><small>${cronicasSave ? 'Apaga só o progresso narrativo. Medalhas futuras serão mantidas.' : 'Comece uma jornada para criar o save automático.'}</small></div>${cronicasSave ? `<form method="POST" action="/cronicas-do-levante/delete" onsubmit="return confirm('Apagar a campanha atual de Crônicas do Levante? Medalhas futuras serão mantidas.')"><button>Apagar campanha</button></form>` : '<a href="/cronicas-do-levante">Criar campanha</a>'}</article><article class="saved-game-row"><div><span>Herói Ortodoxo</span><strong>Save automático na conta</strong><small>Heróis, campanha, check-in e invocações acompanham seu perfil do hub.</small></div><a href="/heroi-ortodoxo">Abrir</a></article><article class="saved-game-row"><div><span>Luther Metch</span><strong>Save local automático</strong><small>Fase, objetivos, pontos e tabuleiro ficam salvos neste navegador.</small></div><a href="/luther-metch">Abrir</a></article><article class="saved-game-row"><div><span>Quiz Ortodoxia</span><strong>Multiplayer online</strong><small>Duelo, convite e competição geral rodam com pareamento pelo servidor.</small></div><a href="/quiz-ortodoxia">Abrir</a></article><article class="saved-game-row"><div><span>A Queda de Babel</span><strong>${babelSave ? 'Jornada em andamento' : 'Nenhuma jornada atual'}</strong><small>Herói, equipamento, pet e progresso da região acompanham seu perfil do hub.</small></div>${babelSave ? `<form method="POST" action="/a-queda-de-babel/delete" onsubmit="return confirm('Apagar a jornada atual de A Queda de Babel?')"><button>Apagar jornada</button></form>` : '<a href="/a-queda-de-babel">Criar jornada</a>'}</article></div></section>`
  };
  const reformaSettingsRow = `<article class="saved-game-row"><div><span>A Confissão</span><strong>${reformaSave ? 'Jornada em andamento' : 'Nenhuma jornada atual'}</strong><small>Decisões, finais, códice e medalhas acompanham seu perfil.</small></div>${reformaSave ? `<form method="POST" action="/a-confissao/delete" onsubmit="return confirm('Apagar a jornada atual de A Confissão? As medalhas serão mantidas.')"><button>Apagar jornada</button></form>` : '<a href="/a-confissao">Criar jornada</a>'}</article>`;
  const crownsSettingsRow = `<article class="saved-game-row"><div><span>Crowns and Councils</span><strong>Temporada online vinculada</strong><small>Reino, recursos e ordens acompanham sua conta do Hub.</small></div><a href="/crowns-and-councils">Abrir</a></article>`;
  const coresDaRosaSettingsRow = `<article class="saved-game-row"><div><span>Uno Luterano</span><strong>Multiplayer e ranking na conta</strong><small>Partidas, vitórias e pontuação acompanham seu perfil do Hub.</small></div><a href="/cores-da-rosa">Abrir</a></article>`;
  sections.configuracoes = sections.configuracoes.replace('<div class="saved-game-list">', `<div class="saved-game-list">${coresDaRosaSettingsRow}${crownsSettingsRow}${reformaSettingsRow}`);
  return pageShell('Ortodoxia Luterana Gaming', `
<main class="ol-hub">
  <aside class="ol-sidebar">
    <img src="/assets/ortodoxia-luterana-selo-v2.png?v=${GAME_VERSION}" alt="Ortodoxia Luterana">
    <h1>Ortodoxia Luterana <span>Gaming</span></h1>
    <nav>${nav}</nav>
  </aside>
  <section class="ol-hub-main">
    <header class="ol-topbar">
      <div><p>Painel de acesso</p><h2>Bem-vindo, ${escapeHtml(user.name)}</h2></div>
      <div class="ol-stats"><article><span>Pontos</span><b>${cardWallet.balance}</b></article><article><span>XP</span><b>${xp}</b></article><article><span>Medalhas</span><b>${unlockedMedals}</b></article></div>
      <a class="top-profile" href="/?section=configuracoes">${renderAvatar(user, 'top-avatar')}<span>${escapeHtml(user.name)}<small>Ver perfil</small></span></a>
      <form method="POST" action="/logout"><button>Sair</button></form>
    </header>
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <div class="ol-hub-grid">
      ${sections[activeSection]}
    </div>
  </section>
</main>
${chatWidget}
<script>
const hubEsc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function onlineAvatar(player) {
  return player.avatarData ? '<img class="online-avatar" src="' + hubEsc(player.avatarData) + '" alt="' + hubEsc(player.name) + '">' : '<b class="online-avatar">' + hubEsc(String(player.name || 'OL').slice(0, 2).toUpperCase()) + '</b>';
}
async function refreshPresence() {
  const list = document.getElementById('hub-online-list');
  try {
    const response = await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: 'hub' }), cache: 'no-store' });
    if (!response.ok || !list) return;
    const data = await response.json();
    const rows = (data.online || []).slice(0, 10);
    list.innerHTML = rows.length ? rows.map(player => '<article>' + onlineAvatar(player) + '<span>' + hubEsc(player.name) + '<small>' + hubEsc(player.location || 'Hub') + '</small></span></article>').join('') : '<p class="online-empty">Ninguem online agora.</p>';
  } catch {}
}
function renderChatMessages(messages) {
  const box = document.getElementById('hub-chat-messages');
  if (!box) return;
  box.innerHTML = (messages || []).map(item => '<article><strong>' + hubEsc(item.player) + '</strong><span>' + hubEsc(item.message) + '</span></article>').join('');
  box.scrollTop = box.scrollHeight;
}
async function refreshChat() {
  try {
    const response = await fetch('/api/chat', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    renderChatMessages(data.messages || []);
  } catch {}
}
const chatForm = document.getElementById('hub-chat-form');
if (chatForm) {
  chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.getElementById('hub-chat-input');
    const message = String(input?.value || '').trim();
    if (!message) return;
    input.value = '';
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      if (response.ok) renderChatMessages((await response.json()).messages || []);
    } catch {}
  });
}
const chatToggle = document.getElementById('hub-chat-toggle');
if (chatToggle) chatToggle.addEventListener('click', () => document.getElementById('hub-chat')?.classList.toggle('is-minimized'));
refreshPresence();
refreshChat();
setInterval(refreshPresence, 20000);
setInterval(refreshChat, 5000);
async function refreshHubFeed() {
  const feed = document.getElementById('hub-live-feed');
  if (!feed) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  try {
    const response = await fetch('/api/ranking', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const rows = (data.prestige || []).slice(0, 6);
    feed.innerHTML = rows.length ? rows.map(item => '<article><img class="feed-avatar achievement-feed-icon" src="' + esc(item.icon) + '?v=${GAME_VERSION}" alt="' + esc(item.medal) + '"><span>' + esc(item.player) + ' conquistou ' + esc(item.medal) + '</span><small>+' + esc(item.xp) + ' XP · +' + esc(item.points || 0) + ' pontos</small></article>').join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestigio conquistado ainda. As novas medalhas vao aparecer aqui.</span></article>';
  } catch {}
}
refreshHubFeed();
setInterval(refreshHubFeed, 30000);
const avatarFile = document.getElementById('avatar-file');
if (avatarFile) {
  avatarFile.addEventListener('change', () => {
    const file = avatarFile.files && avatarFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        document.getElementById('avatar-data').value = canvas.toDataURL('image/jpeg', .82);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
const albumSearch = document.getElementById('album-search');
const albumCategory = document.getElementById('album-category');
function filterAlbum() {
  const query = String(albumSearch?.value || '').trim().toLocaleLowerCase('pt-BR');
  const category = String(albumCategory?.value || '');
  document.querySelectorAll('#album-grid .album-card').forEach(card => {
    const matchesName = !query || String(card.dataset.cardTitle || '').includes(query);
    const matchesCategory = !category || card.dataset.cardCategory === category;
    card.hidden = !(matchesName && matchesCategory);
  });
}
albumSearch?.addEventListener('input', filterAlbum);
albumCategory?.addEventListener('change', filterAlbum);
</script>`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/assets/')) { serveAsset(req, res); return; }
    if (await handleAuth(req, res, url)) return;
    const user = currentUser(req);
    if (user) touchPlatformPresence(user, presenceForPath(url.pathname).gameId);
    if (url.pathname.startsWith('/api/')) { await handleApi(req, res, url, user); return; }
    if (!user) { redirect(res, '/login'); return; }
    if (req.method === 'GET' && url.pathname === '/') {
      const notice = url.searchParams.get('notice');
      const message = notice === 'saldo' ? 'Você ainda não tem pontos suficientes para esse pacote.' : notice === 'pacote' ? 'Esse pacote não existe.' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderDashboard(user, message, url.searchParams.get('section') || 'inicio', url.searchParams.get('game') || '', url.searchParams.get('opening') || ''));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/cards/open-pack') {
      const form = await readForm(req);
      const result = openCardPackForUser(user, String(form.get('pack') || ''));
      if (result.error) redirect(res, `/?section=loja&notice=${encodeURIComponent(result.error)}`);
      else redirect(res, `/?section=loja&opening=${encodeURIComponent(result.openingId)}`);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/profile') {
      const form = await readForm(req);
      const name = String(form.get('name') || '').trim();
      const avatarData = String(form.get('avatar_data') || '').trim();
      const existing = name ? getUserByName.get(name) : null;
      if (!name || (existing && existing.id !== user.id) || !isSafeAvatarData(avatarData)) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboard(user, 'Confira o nome e a foto do perfil.', 'configuracoes'));
        return;
      }
      updateUserProfile.run(name, avatarData || null, user.id);
      updateRankingUserName.run(name, user.id);
      updateBestRankingUserName.run(name, user.id);
      updateLutherMatchUserName.run(name, user.id);
      redirect(res, '/?section=configuracoes');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/play') {
      const requestedSaveId = url.searchParams.get('save');
      const save = requestedSaveId ? getSave.get(requestedSaveId, user.id) : hubSaveForUser(user);
      if (!save) { redirect(res, '/'); return; }
      setLaunchCookie(res, user.id);
      redirect(res, `/game?save=${encodeURIComponent(save.id)}`);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/cores-da-rosa') {
      setCoresDaRosaLaunchCookie(res, user.id);
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'cores-da-rosa', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/crowns-and-councils') {
      setCrownsLaunchCookie(res, user.id);
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'crowns-and-councils', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/cronicas-do-levante') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'cronicas-do-levante.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/a-confissao') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'a-confissao', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/heroi-ortodoxo') {
      const save = getHeroiSave.get(user.id);
      const boot = {
        user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
        state: safeJsonParse(save?.state_json, null),
        updatedAt: save?.updated_at || null
      };
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'heroi-ortodoxo', 'index.html'), 'utf8')
        .replace('</head>', `<script>window.__HEROI_BOOT__=${scriptJson(boot)};</script></head>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/luther-metch' || url.pathname === '/match3-luterano')) {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'match3-luterano.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/peregrino-confessional') {
      redirect(res, '/concordium');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/concordium') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'concordium.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/quiz-ortodoxia') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'quiz-ortodoxia.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/caminho-dos-guardioes') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'guardioes', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/a-queda-de-babel') {
      const save = getBabelSave.get(user.id);
      const updatedAt = save?.updated_at || null;
      const offlineSeconds = updatedAt ? Math.max(0, Math.min(12 * 60 * 60, Math.floor((Date.now() - Date.parse(updatedAt)) / 1000))) : 0;
      const boot = {
        user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
        state: safeJsonParse(save?.state_json, null),
        updatedAt,
        serverNow: new Date().toISOString(),
        offlineSeconds
      };
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'babel', 'index.html'), 'utf8')
        .replace('</head>', `<script>window.__BABEL_BOOT__=${scriptJson(boot)};</script></head>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' });
      res.end(body);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/caminho-dos-guardioes/delete') {
      deleteGuardioesSave.run(user.id);
      redirect(res, '/?section=configuracoes');
      return;
    }
    if (req.method === 'POST' && url.pathname === '/a-queda-de-babel/delete') {
      deleteBabelSave.run(user.id);
      redirect(res, '/?section=configuracoes');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/concordium-exploracao') {
      if (!hasConcordiumAccess(req, user.id)) {
        const body = renderConcordiumAccess();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(body);
        return;
      }
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'concordium-exploracao.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/concordium-exploracao/rom') {
      if (!hasConcordiumAccess(req, user.id)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Concordium bloqueado');
        return;
      }
      if (!fs.existsSync(CONCORDIUM_ROM_PATH) || !fs.statSync(CONCORDIUM_ROM_PATH).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ROM nativa nao encontrada no servidor.');
        return;
      }
      const stat = fs.statSync(CONCORDIUM_ROM_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': 'inline; filename="concordium.gba"'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(CONCORDIUM_ROM_PATH).pipe(res);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/concordium-exploracao/unlock') {
      const form = await readForm(req);
      const pin = String(form.get('pin') || '').trim();
      if (pin !== CONCORDIUM_ACCESS_PIN) {
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderConcordiumAccess('Senha incorreta.'));
        return;
      }
      setConcordiumAccessCookie(res, user.id);
      redirect(res, '/concordium-exploracao');
      return;
    }
    if (req.method === 'POST' && url.pathname === '/cronicas-do-levante/delete') {
      deleteCronicasSave.run(user.id);
      redirect(res, '/?section=configuracoes');
      return;
    }
    if (req.method === 'POST' && url.pathname === '/a-confissao/delete') {
      deleteReformaSave.run(user.id);
      redirect(res, '/?section=configuracoes');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/ranking') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderDashboard(user, '', 'ranking', url.searchParams.get('game') || '')); return; }
    if (req.method === 'GET' && url.pathname === '/saves/new') {
      const slot = Number(url.searchParams.get('slot'));
      if (![1, 2].includes(slot) || getSaveSlot.get(user.id, slot)) { redirect(res, '/'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderNewSave(user, slot)); return;
    }
    if (req.method === 'POST' && url.pathname === '/saves') {
      const form = await readForm(req); const slot = Number(form.get('slot')); const name = String(form.get('name') || '').trim();
      if (![1, 2].includes(slot) || !name) { res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }); res.end([1, 2].includes(slot) ? renderNewSave(user, slot, 'Digite um nome para a história.') : renderDashboard(user, 'Escolha um slot válido.')); return; }
      if (getSaveSlot.get(user.id, slot)) { res.writeHead(409, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderDashboard(user, 'Esse slot já tem uma história salva.')); return; }
      const now = new Date().toISOString(); const id = crypto.randomUUID(); insertSave.run(id, user.id, slot, name, now, now); redirect(res, `/game?save=${encodeURIComponent(id)}`); return;
    }
    const deleteMatch = url.pathname.match(/^\/saves\/([^/]+)\/delete$/);
    if (req.method === 'POST' && deleteMatch) { deleteSave.run(deleteMatch[1], user.id); redirect(res, '/'); return; }
    if (req.method === 'GET' && url.pathname === '/game') {
      const id = url.searchParams.get('save'); const save = id ? getSave.get(id, user.id) : null;
      if (!save) { redirect(res, '/'); return; }
      if (!hasValidLaunch(req, user.id)) { redirect(res, '/'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderGame(save, user)); return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página não encontrada');
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || 'Erro interno' });
  }
});

function initRealtimeMultiplayer(httpServer) {
  const io = new SocketIOServer(httpServer, { cors: { origin: false } });
  coresDaRosa.attachRealtime(io, { currentUser, hasValidLaunch: hasValidCoresDaRosaLaunch });
  const crowns = io.of('/crowns-and-councils');
  crownsRealtimeNamespace = crowns;
  crowns.use((socket, next) => {
    const user = currentUser(socket.request);
    if (!user || !hasValidCrownsLaunch(socket.request, user.id)) return next(new Error('launch_required'));
    socket.data.user = user;
    next();
  });
  crowns.on('connection', socket => {
    const serverId = crownsServerId(socket.handshake.auth?.serverId);
    socket.data.serverId = serverId;
    socket.join(`cc:${serverId}`);
    socket.emit('world.ready', { seasonId: serverId, serverNow: new Date().toISOString() });
  });
  const crownsActionTimer = setInterval(processCrownsActions, 1000);
  crownsActionTimer.unref?.();
  const crownsRevoltTimer = setInterval(() => CROWNS_SERVER_IDS.forEach(processCrownsSeparatistRevolts), CROWNS_REVOLT_CHECK_MS);
  crownsRevoltTimer.unref?.();
  const crownsAiTimer = setInterval(() => CROWNS_SERVER_IDS.forEach(processCrownsAiPlans), Math.min(30_000, Math.max(2_000, Math.floor(CROWNS_GAME_DAY_MS / 4))));
  crownsAiTimer.unref?.();
  const crownsCouncilTimer = setInterval(() => CROWNS_SERVER_IDS.forEach(processCrownsCouncils), Math.min(30_000, Math.max(1_000, Math.floor(CROWNS_GAME_DAY_MS / 3))));
  crownsCouncilTimer.unref?.();
  const crownsReligionTimer = setInterval(() => CROWNS_SERVER_IDS.forEach(processCrownsReligiousMovements), Math.min(30_000, Math.max(1_000, Math.floor(CROWNS_GAME_DAY_MS / 3))));
  crownsReligionTimer.unref?.();
  const crownsSeasonTimer = setInterval(() => CROWNS_SERVER_IDS.forEach(processCrownsSeasonLifecycle), Math.min(60_000, Math.max(2_000, Math.floor(CROWNS_GAME_DAY_MS / 4))));
  crownsSeasonTimer.unref?.();
  const players = new Map();
  const gbaPlayers = new Map();
  const gbaBattleInvites = new Map();
  const gbaBattles = new Map();
  const babelPlayers = new Map();
  const babelSocketByUser = new Map();
  const babelRegions = new Set(['campos-fronteiras']);
  const babelBounds = { minX: 35, minY: 55, maxX: 1765, maxY: 67160 };
  const mapBounds = { minX: 70, minY: 80, maxX: 1430, maxY: 920 };
  const dummy = { id: 'training-dummy', x: 760, y: 520, hp: 80, maxHp: 80 };
  const weaponPower = {
    sword: 8,
    staff: 5,
    spear: 7,
    bow: 6,
    book: 4,
    hammer: 11,
    'Espada curta': 8,
    Cajado: 5,
    Lanca: 7,
    'Arco simples': 6,
    Livro: 4,
    Martelo: 11,
    'Espada longa': 11,
    Machado: 12,
    'Arco e flecha': 9
  };
  const weaponRange = {
    sword: 72,
    staff: 78,
    spear: 96,
    bow: 170,
    book: 90,
    hammer: 68,
    'Espada curta': 72,
    Cajado: 78,
    Lanca: 96,
    'Arco simples': 170,
    Livro: 90,
    Martelo: 68,
    'Espada longa': 78,
    Machado: 70,
    'Arco e flecha': 180
  };

  function safeText(value, fallback = '') {
    return String(value || fallback).replace(/[<>]/g, '').trim().slice(0, 48);
  }
  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }
  function publicPlayer(player) {
    return {
      id: player.id,
      name: player.name,
      origin: player.origin,
      appearance: player.appearance,
      avatar: player.avatar,
      sprite: player.sprite,
      weapon: player.weapon,
      x: player.x,
      y: player.y,
      attrs: player.attrs,
      hp: player.hp,
      maxHp: player.maxHp,
      energy: player.energy,
      maxEnergy: player.maxEnergy,
      level: player.level,
      xp: player.xp,
      coins: player.coins,
      lastMessage: player.lastMessage || ''
    };
  }
  function publicGbaPlayer(player) {
    return {
      id: player.id,
      userId: player.userId,
      name: player.name,
      x: player.x,
      y: player.y,
      dir: player.dir,
      color: player.color,
      details: player.details,
      updatedAt: player.updatedAt
    };
  }
  function babelRoom(regionId) {
    return `babel:${regionId}`;
  }
  const babelEquipmentSets = new Set(['ranger', 'forest', 'crystal', 'tower', 'dawn', 'abyss', 'frost', 'desert']);
  const babelEquipmentSlots = ['helmet', 'armor', 'pants', 'boots'];
  function sanitizeBabelEquipment(payload, previous = {}) {
    const incoming = payload?.equipment && typeof payload.equipment === 'object' ? payload.equipment : {};
    const equipment = Object.fromEntries(babelEquipmentSlots.map(slot => {
      if (!(slot in incoming)) return [slot, previous[slot] || ''];
      return [slot, babelEquipmentSets.has(incoming[slot]) ? incoming[slot] : ''];
    }));
    const weapon = String(incoming.weapon || '');
    equipment.weapon = /^[a-z0-9-]{1,48}$/.test(weapon) ? weapon : (previous.weapon || '');
    return equipment;
  }
  function publicBabelPlayer(player) {
    return {
      id: player.id,
      userId: player.userId,
      name: player.name,
      regionId: player.regionId,
      body: player.body,
      weapon: player.weapon,
      armorSet: player.armorSet,
      equipment: player.equipment,
      x: player.x,
      y: player.y,
      facing: player.facing,
      moving: player.moving,
      frame: player.frame,
      level: player.level,
      power: player.power,
      sequence: player.sequence,
      updatedAt: player.updatedAt
    };
  }
  function broadcastBabelPopulation(regionId) {
    const room = babelRoom(regionId);
    const players = [...babelPlayers.values()].filter(player => player.room === room).map(publicBabelPlayer);
    const count = players.length;
    io.to(room).emit('babel:population', { regionId, count });
    io.to(room).emit('babel:presence', { regionId, count, players });
  }
  function babelPresencePayload(regionId) {
    const room = babelRoom(regionId);
    const players = [...babelPlayers.values()].filter(player => player.room === room).map(publicBabelPlayer);
    return { ok: true, regionId, count: players.length, players };
  }
  function removeBabelPlayer(socketId) {
    const player = babelPlayers.get(socketId);
    if (!player) return;
    babelPlayers.delete(socketId);
    if (babelSocketByUser.get(player.userId) === socketId) babelSocketByUser.delete(player.userId);
    io.to(player.room).emit('babel:player-left', { id: socketId, userId: player.userId, name: player.name });
    broadcastBabelPopulation(player.regionId);
  }
  function publicGbaBattle(battle, message = '') {
    return {
      battleId: battle.id,
      message,
      ended: Boolean(battle.ended),
      players: battle.players.map(player => ({
        id: player.id,
        name: player.name,
        hp: player.hp,
        maxHp: player.maxHp,
        team: player.team
      }))
    };
  }
  function emitGbaBattle(battle, event, message = '') {
    const payload = publicGbaBattle(battle, message);
    battle.players.forEach(player => io.to(player.id).emit(event, payload));
  }
  function gbaBattlePlayer(socketId, player) {
    const details = player?.details || {};
    const team = Array.isArray(details.team) ? details.team.slice(0, 6) : [];
    return {
      id: socketId,
      name: player.name,
      hp: 100,
      maxHp: 100,
      team,
      lastActionAt: 0
    };
  }
  function nextLevelXp(level) {
    return 60 + Math.max(0, Number(level || 1) - 1) * 35;
  }
  function addXp(player, amount) {
    player.xp += Math.max(0, Math.floor(Number(amount) || 0));
    let leveled = false;
    while (player.xp >= nextLevelXp(player.level)) {
      player.xp -= nextLevelXp(player.level);
      player.level += 1;
      player.attrPoints += 2;
      player.maxHp += 6;
      player.hp = player.maxHp;
      leveled = true;
    }
    return leveled;
  }

  io.on('connection', socket => {
    socket.on('babel:join', (payload, acknowledge = () => {}) => {
      const user = currentUser(socket.request);
      if (!user) {
        socket.emit('babel:error', { code: 'authentication_required', message: 'Entre novamente no Game Hub.' });
        acknowledge({ ok: false, error: 'authentication_required' });
        return;
      }

      const regionId = babelRegions.has(payload?.regionId) ? payload.regionId : 'campos-fronteiras';
      const room = babelRoom(regionId);
      const priorSocketId = babelSocketByUser.get(user.id);
      if (priorSocketId && priorSocketId !== socket.id) {
        const priorSocket = io.sockets.sockets.get(priorSocketId);
        const priorPlayer = babelPlayers.get(priorSocketId);
        priorSocket?.emit('babel:session-replaced', { message: 'A jornada foi aberta em outra aba.' });
        priorSocket?.leave(priorPlayer?.room || room);
        removeBabelPlayer(priorSocketId);
      }

      const previous = babelPlayers.get(socket.id);
      if (previous && previous.room !== room) {
        socket.leave(previous.room);
        removeBabelPlayer(socket.id);
      }

      const player = {
        id: socket.id,
        userId: user.id,
        name: safeText(user.name, 'Aventureiro') || 'Aventureiro',
        regionId,
        room,
        body: payload?.body === 'female' ? 'female' : 'male',
        weapon: ['fists', 'sword', 'bow', 'staff', 'spear'].includes(payload?.weapon) ? payload.weapon : 'fists',
        armorSet: ['ranger', 'forest', 'crystal', 'tower', 'dawn', 'abyss', 'frost', 'desert'].includes(payload?.armorSet) ? payload.armorSet : '',
        equipment: sanitizeBabelEquipment(payload, previous?.equipment),
        x: clamp(payload?.x, babelBounds.minX, babelBounds.maxX),
        y: clamp(payload?.y, babelBounds.minY, babelBounds.maxY),
        facing: ['up', 'down', 'left', 'right'].includes(payload?.facing) ? payload.facing : 'down',
        moving: Boolean(payload?.moving),
        frame: Math.round(clamp(payload?.frame, 0, 3)),
        level: Math.round(clamp(payload?.level, 1, 999)),
        power: Math.round(clamp(payload?.power, 0, 9999999)),
        sequence: 0,
        updatedAt: Date.now(),
        lastMoveAt: Date.now(),
        lastSeenAt: Date.now()
      };

      babelPlayers.set(socket.id, player);
      babelSocketByUser.set(user.id, socket.id);
      socket.join(room);
      const others = [...babelPlayers.values()]
        .filter(item => item.room === room && item.id !== socket.id)
        .map(publicBabelPlayer);
      socket.emit('babel:init', { id: socket.id, regionId, players: others, serverNow: Date.now() });
      socket.to(room).emit('babel:player-joined', publicBabelPlayer(player));
      broadcastBabelPopulation(regionId);
      acknowledge({ ok: true, id: socket.id, regionId, count: others.length + 1 });
    });

    socket.on('babel:move', payload => {
      const player = babelPlayers.get(socket.id);
      if (!player) return;
      const now = Date.now();
      const elapsed = Math.max(16, Math.min(500, now - player.lastMoveAt));
      if (now - player.lastMoveAt < 35) return;
      let x = clamp(payload?.x, babelBounds.minX, babelBounds.maxX);
      let y = clamp(payload?.y, babelBounds.minY, babelBounds.maxY);
      const dx = x - player.x;
      const dy = y - player.y;
      const distance = Math.hypot(dx, dy);
      const maxDistance = 72 + elapsed * .65;
      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        x = player.x + dx * ratio;
        y = player.y + dy * ratio;
      }
      player.x = x;
      player.y = y;
      player.facing = ['up', 'down', 'left', 'right'].includes(payload?.facing) ? payload.facing : player.facing;
      player.moving = Boolean(payload?.moving);
      player.frame = Math.round(clamp(payload?.frame, 0, 3));
      player.sequence = Math.max(player.sequence + 1, Math.round(clamp(payload?.sequence, 0, Number.MAX_SAFE_INTEGER)));
      player.updatedAt = now;
      player.lastMoveAt = now;
      player.lastSeenAt = now;
      socket.to(player.room).volatile.emit('babel:player-update', publicBabelPlayer(player));
    });

    socket.on('babel:profile', payload => {
      const player = babelPlayers.get(socket.id);
      if (!player) return;
      player.body = payload?.body === 'female' ? 'female' : 'male';
      player.weapon = ['fists', 'sword', 'bow', 'staff', 'spear'].includes(payload?.weapon) ? payload.weapon : player.weapon;
      player.armorSet = ['ranger', 'forest', 'crystal', 'tower', 'dawn', 'abyss', 'frost', 'desert'].includes(payload?.armorSet) ? payload.armorSet : '';
      player.equipment = sanitizeBabelEquipment(payload, player.equipment);
      player.level = Math.round(clamp(payload?.level, 1, 999));
      player.power = Math.round(clamp(payload?.power, 0, 9999999));
      player.updatedAt = Date.now();
      player.lastSeenAt = Date.now();
      socket.to(player.room).emit('babel:player-update', publicBabelPlayer(player));
    });

    socket.on('babel:heartbeat', (_payload, acknowledge = () => {}) => {
      const player = babelPlayers.get(socket.id);
      if (!player) {
        acknowledge({ ok: false, error: 'not_joined' });
        return;
      }
      player.lastSeenAt = Date.now();
      acknowledge(babelPresencePayload(player.regionId));
    });

    socket.on('concordium-gba:join', payload => {
      const user = currentUser(socket.request);
      const fallbackName = user?.name || `Jogador ${socket.id.slice(0, 4)}`;
      const saveRow = user ? getConcordiumGbaSave.get(user.id) : null;
      const saved = sanitizeConcordiumGbaSave(safeJsonParse(saveRow?.save_json, null));
      const hasTrustedSavedPosition = saved.metadata?.source === 'emerald-state' && saved.metadata?.mapId;
      const player = {
        id: socket.id,
        userId: user?.id || null,
        name: safeText(payload?.name, fallbackName) || fallbackName,
        x: clamp(hasTrustedSavedPosition ? saved.metadata?.x : payload?.x || 50, 4, 96),
        y: clamp(hasTrustedSavedPosition ? saved.metadata?.y : payload?.y || 72, 12, 96),
        dir: safeText(payload?.dir, 'down') || 'down',
        color: safeText(payload?.color, '#d94f3d') || '#d94f3d',
        details: saved.metadata,
        updatedAt: Date.now()
      };
      gbaPlayers.set(socket.id, player);
      socket.join('concordium-gba');
      socket.emit('concordium-gba:init', {
        id: socket.id,
        players: [...gbaPlayers.values()].map(publicGbaPlayer)
      });
      socket.to('concordium-gba').emit('concordium-gba:player-joined', publicGbaPlayer(player));
    });

    socket.on('concordium-gba:move', payload => {
      const player = gbaPlayers.get(socket.id);
      if (!player) return;
      player.x = clamp(payload?.x, 4, 96);
      player.y = clamp(payload?.y, 12, 96);
      player.dir = safeText(payload?.dir, player.dir || 'down') || 'down';
      player.updatedAt = Date.now();
      socket.to('concordium-gba').emit('concordium-gba:player-update', publicGbaPlayer(player));
    });

    socket.on('concordium-gba:details', payload => {
      const player = gbaPlayers.get(socket.id);
      if (!player) return;
      const details = sanitizeConcordiumGbaSave({ metadata: payload?.metadata || payload }).metadata;
      player.details = details;
      if (details.x || details.y) {
        player.x = clamp(details.x || player.x, 4, 96);
        player.y = clamp(details.y || player.y, 12, 96);
      }
      player.updatedAt = Date.now();
      io.to('concordium-gba').emit('concordium-gba:player-update', publicGbaPlayer(player));
    });

    socket.on('concordium-gba:battle-invite', payload => {
      const challenger = gbaPlayers.get(socket.id);
      const target = gbaPlayers.get(String(payload?.targetId || ''));
      if (!challenger || !target || target.id === socket.id) return;
      const challengerTeam = Array.isArray(challenger.details?.team) ? challenger.details.team : [];
      const targetTeam = Array.isArray(target.details?.team) ? target.details.team : [];
      if (!challengerTeam.length || !targetTeam.length) {
        socket.emit('concordium-gba:battle-error', 'Os dois jogadores precisam ter Pokemon lidos no save.');
        return;
      }
      if (challenger.details?.mapId && target.details?.mapId && challenger.details.mapId !== target.details.mapId) {
        socket.emit('concordium-gba:battle-error', 'O outro jogador precisa estar no mesmo mapa.');
        return;
      }
      const battleId = crypto.randomUUID();
      const invite = { battleId, fromId: socket.id, toId: target.id, createdAt: Date.now() };
      gbaBattleInvites.set(battleId, invite);
      io.to(target.id).emit('concordium-gba:battle-invite', { battleId, from: publicGbaPlayer(challenger) });
    });

    socket.on('concordium-gba:battle-response', payload => {
      const battleId = String(payload?.battleId || '');
      const invite = gbaBattleInvites.get(battleId);
      if (!invite || invite.toId !== socket.id) return;
      gbaBattleInvites.delete(battleId);
      const challenger = gbaPlayers.get(invite.fromId);
      const target = gbaPlayers.get(invite.toId);
      if (!payload?.accept) {
        io.to(invite.fromId).emit('concordium-gba:battle-error', 'Convite recusado.');
        return;
      }
      if (!challenger || !target) return;
      const battle = {
        id: battleId,
        players: [gbaBattlePlayer(invite.fromId, challenger), gbaBattlePlayer(invite.toId, target)],
        createdAt: Date.now(),
        ended: false
      };
      gbaBattles.set(battleId, battle);
      emitGbaBattle(battle, 'concordium-gba:battle-start', 'Batalha iniciada. Ambos podem agir.');
    });

    socket.on('concordium-gba:battle-action', payload => {
      const battle = gbaBattles.get(String(payload?.battleId || ''));
      if (!battle || battle.ended) return;
      const actor = battle.players.find(player => player.id === socket.id);
      const target = battle.players.find(player => player.id !== socket.id);
      if (!actor || !target) return;
      const now = Date.now();
      if (now - actor.lastActionAt < 900) return;
      actor.lastActionAt = now;
      if (payload?.action === 'flee') {
        battle.ended = true;
        emitGbaBattle(battle, 'concordium-gba:battle-end', `${actor.name} saiu da batalha.`);
        gbaBattles.delete(battle.id);
        return;
      }
      const damage = 8 + Math.floor(Math.random() * 9);
      target.hp = Math.max(0, target.hp - damage);
      const message = `${actor.name} atacou e causou ${damage} de dano.`;
      if (target.hp <= 0) {
        battle.ended = true;
        emitGbaBattle(battle, 'concordium-gba:battle-update', `${message} ${actor.name} venceu.`);
        gbaBattles.delete(battle.id);
        return;
      }
      emitGbaBattle(battle, 'concordium-gba:battle-update', message);
    });

    socket.on('concordium:join', payload => {
      const attrs = payload?.attrs && typeof payload.attrs === 'object' ? payload.attrs : {};
      const baseRes = clamp(attrs.resistencia || 3, 1, 20);
      const player = {
        id: socket.id,
        name: safeText(payload?.name, `Viajante ${socket.id.slice(0, 4)}`) || `Viajante ${socket.id.slice(0, 4)}`,
        origin: safeText(payload?.origin, 'Roma'),
        appearance: safeText(payload?.appearance, 'blue'),
        avatar: payload?.avatar && typeof payload.avatar === 'object' ? {
          gender: safeText(payload.avatar.gender, 'male'),
          skin: safeText(payload.avatar.skin, '#c58b63'),
          hair: safeText(payload.avatar.hair, '#2c1a12'),
          tunic: safeText(payload.avatar.tunic, '#9a4b33')
        } : null,
        sprite: safeText(payload?.sprite, 'player_red'),
        weapon: safeText(payload?.weapon, 'sword'),
        attrs: {
          forca: clamp(attrs.forca || 3, 1, 20),
          resistencia: baseRes,
          agilidade: clamp(attrs.agilidade || 3, 1, 20),
          inteligencia: clamp(attrs.inteligencia || 3, 1, 20),
          fe: clamp(attrs.fe || 3, 1, 20),
          carisma: clamp(attrs.carisma || 3, 1, 20),
          lideranca: clamp(attrs.lideranca || 3, 1, 20),
          comercio: clamp(attrs.comercio || 3, 1, 20),
          exploracao: clamp(attrs.exploracao || 3, 1, 20)
        },
        x: 610 + Math.random() * 80,
        y: 420 + Math.random() * 60,
        hp: 100 + baseRes * 8,
        maxHp: 100 + baseRes * 8,
        energy: 80,
        maxEnergy: 80,
        level: 1,
        xp: 0,
        attrPoints: 0,
        coins: 12,
        lastAttack: 0,
        lastMessage: ''
      };
      players.set(socket.id, player);
      socket.emit('concordium:init', { id: socket.id, players: [...players.values()].map(publicPlayer), dummy });
      socket.broadcast.emit('concordium:player-joined', publicPlayer(player));
    });

    socket.on('concordium:move', payload => {
      const player = players.get(socket.id);
      if (!player) return;
      player.x = clamp(payload?.x, mapBounds.minX, mapBounds.maxX);
      player.y = clamp(payload?.y, mapBounds.minY, mapBounds.maxY);
      player.dir = safeText(payload?.dir, player.dir || 'down');
      io.emit('concordium:player-update', publicPlayer(player));
    });

    socket.on('concordium:chat', text => {
      const player = players.get(socket.id);
      if (!player) return;
      const message = safeText(text, '').slice(0, 140);
      if (!message) return;
      player.lastMessage = message.slice(0, 56);
      const payload = { id: player.id, name: player.name, message, at: Date.now() };
      io.emit('concordium:chat', payload);
      io.emit('concordium:player-bubble', { id: player.id, message: player.lastMessage });
      setTimeout(() => {
        const current = players.get(player.id);
        if (current && current.lastMessage === player.lastMessage) {
          current.lastMessage = '';
          io.emit('concordium:player-bubble', { id: player.id, message: '' });
        }
      }, 4200);
    });

    socket.on('concordium:attack', () => {
      const player = players.get(socket.id);
      if (!player) return;
      const now = Date.now();
      if (now - player.lastAttack < 650) return;
      player.lastAttack = now;
      const dx = player.x - dummy.x;
      const dy = player.y - dummy.y;
      const range = weaponRange[player.weapon] || 72;
      if (Math.hypot(dx, dy) > range) {
        socket.emit('concordium:notice', 'Aproxime-se do alvo de treino.');
        return;
      }
      const damage = Math.max(3, Math.floor((weaponPower[player.weapon] || 6) + player.attrs.forca * 1.4 + (player.weapon === 'book' ? player.attrs.inteligencia : 0) + (player.weapon === 'staff' ? player.attrs.fe : 0)));
      dummy.hp = Math.max(0, dummy.hp - damage);
      let leveled = false;
      if (dummy.hp <= 0) {
        leveled = addXp(player, 24);
        player.coins += 2;
        setTimeout(() => {
          dummy.hp = dummy.maxHp;
          io.emit('concordium:dummy-update', dummy);
        }, 1200);
      }
      io.emit('concordium:dummy-update', dummy);
      io.emit('concordium:player-update', publicPlayer(player));
      socket.emit('concordium:combat', { damage, xp: player.xp, level: player.level, attrPoints: player.attrPoints, coins: player.coins, leveled });
    });

    socket.on('concordium:allocate-attr', attr => {
      const player = players.get(socket.id);
      const key = safeText(attr, '');
      if (!player || player.attrPoints <= 0 || !Object.hasOwn(player.attrs, key)) return;
      player.attrs[key] += 1;
      player.attrPoints -= 1;
      if (key === 'resistencia') {
        player.maxHp += 8;
        player.hp = player.maxHp;
      }
      socket.emit('concordium:progress', { attrs: player.attrs, attrPoints: player.attrPoints, hp: player.hp, maxHp: player.maxHp, level: player.level, xp: player.xp, coins: player.coins });
      io.emit('concordium:player-update', publicPlayer(player));
    });

    socket.on('disconnect', () => {
      removeBabelPlayer(socket.id);
      if (gbaPlayers.has(socket.id)) {
        gbaPlayers.delete(socket.id);
        [...gbaBattleInvites.entries()].forEach(([id, invite]) => {
          if (invite.fromId === socket.id || invite.toId === socket.id) gbaBattleInvites.delete(id);
        });
        [...gbaBattles.entries()].forEach(([id, battle]) => {
          if (!battle.players.some(player => player.id === socket.id)) return;
          battle.ended = true;
          emitGbaBattle(battle, 'concordium-gba:battle-end', 'Batalha encerrada: jogador desconectou.');
          gbaBattles.delete(id);
        });
        socket.to('concordium-gba').emit('concordium-gba:player-left', socket.id);
      }
      if (!players.has(socket.id)) return;
      players.delete(socket.id);
      io.emit('concordium:player-left', socket.id);
    });
  });
}

initRealtimeMultiplayer(server);
server.listen(PORT, () => {
  console.log(`Cultivando SSR rodando em http://localhost:${PORT}`);
  if (CROWNS_LOCAL_PREVIEW) console.log(`[crowns] prévia local sem login: http://localhost:${PORT}/crowns-and-councils`);
  if (CORES_DA_ROSA_LOCAL_PREVIEW) console.log(`[cores-da-rosa] prévia local sem login: http://localhost:${PORT}/cores-da-rosa`);
});

