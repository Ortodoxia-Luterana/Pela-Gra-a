(function () {
  const ROM_URL = "/concordium-exploracao/rom";
  const SAVE_STATE_URL = "/api/concordium/gba-save/state";
  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const LOADER_URL = `${EMULATOR_DATA_URL}loader.js`;
  const STATE_CAPTURE_MS = 1500;
  const PLAYER_COLORS = ["#d94f3d", "#3d7bd9", "#45a857", "#d8a629", "#8a5bd9", "#d95f9f"];
  const EWRAM_START = 0x02000000;
  const EWRAM_SIZE = 0x40000;
  const GBA_STATE_SIZE = 0x61000;
  const GBA_STATE_EWRAM_OFFSET = 0x21000;
  const SAVE_BLOCK_1_SIZE = 0x3d88;
  const SAVE_BLOCK_2_SIZE = 0xf2c;
  const SAVE_BLOCK_1_PARTY_COUNT = 0x234;
  const SAVE_BLOCK_1_PARTY = 0x238;
  const SAVE_BLOCK_1_FLAGS = 0x1270;
  const POKEMON_SIZE = 100;
  const BADGE_FLAG_START = 0x867;
  const BADGE_NAMES = ["Pedra", "Punho", "Dinamica", "Calor", "Equilibrio", "Pena", "Mente", "Chuva"];
  const REGION_MAP_SECTION_NAMES = ["Vila Raiz", "Vila Oldale", "Vila Dewford", "Vila Lavaridge", "Vila Fallarbor", "Vila Verdanturf", "Vila Pacifidlog", "Cidade de Petalburg", "Cidade de Slateport", "Cidade de Mauville", "Cidade de Rustboro", "Cidade de Fortree", "Cidade de Lilycove", "Cidade de Mossdeep", "Cidade de Sootopolis", "Cidade de Ever Grande", "Rota 101", "Rota 102", "Rota 103", "Rota 104", "Rota 105", "Rota 106", "Rota 107", "Rota 108", "Rota 109", "Rota 110", "Rota 111", "Rota 112", "Rota 113", "Rota 114", "Rota 115", "Rota 116", "Rota 117", "Rota 118", "Rota 119", "Rota 120", "Rota 121", "Rota 122", "Rota 123", "Rota 124", "Rota 125", "Rota 126", "Rota 127", "Rota 128", "Rota 129", "Rota 130", "Rota 131", "Rota 132", "Rota 133", "Rota 134", "Submerso", "Submerso", "Submerso", "Submerso", "Submerso", "Caverna Granite", "Monte Chimney", "Safari Zone", "Battle Frontier", "Bosque Petalburg", "Tunel Rusturf", "Navio Abandonado", "New Mauville", "Meteor Falls", "Meteor Falls", "Monte Pyre", "Esconderijo Aqua", "Caverna Shoal", "Caverna Submarina", "Submerso", "Victory Road", "Ilha Mirage", "Caverna da Origem", "Ilha do Sul", "Fiery Path", "Fiery Path", "Jagged Pass", "Jagged Pass", "Camara Selada", "Submerso", "Scorched Slab", "Island Cave", "Ruinas do Deserto", "Tumba Antiga", "Dentro do Caminhao", "Pilar do Ceu", "Base Secreta"];
  const EMERALD_MAP_NAMES = {
    "0.0": "Cidade de Petalburg", "0.1": "Cidade de Slateport", "0.2": "Cidade de Mauville", "0.3": "Cidade de Rustboro",
    "0.4": "Cidade de Fortree", "0.5": "Cidade de Lilycove", "0.6": "Cidade de Mossdeep", "0.7": "Cidade de Sootopolis",
    "0.8": "Cidade de Ever Grande", "0.9": "Vila Raiz", "0.10": "Vila Oldale", "0.11": "Vila Dewford",
    "0.12": "Vila Lavaridge", "0.13": "Vila Fallarbor", "0.14": "Vila Verdanturf", "0.15": "Vila Pacifidlog",
    "0.16": "Rota 101", "0.17": "Rota 102", "0.18": "Rota 103", "0.19": "Rota 104", "0.20": "Rota 105",
    "0.21": "Rota 106", "0.22": "Rota 107", "0.23": "Rota 108", "0.24": "Rota 109", "0.25": "Rota 110",
    "0.26": "Rota 111", "0.27": "Rota 112", "0.28": "Rota 113", "0.29": "Rota 114", "0.30": "Rota 115",
    "0.31": "Rota 116", "0.32": "Rota 117", "0.33": "Rota 118", "0.34": "Rota 119", "0.35": "Rota 120",
    "0.36": "Rota 121", "0.37": "Rota 122", "0.38": "Rota 123", "0.39": "Rota 124", "0.40": "Rota 125",
    "0.41": "Rota 126", "0.42": "Rota 127", "0.43": "Rota 128", "0.44": "Rota 129", "0.45": "Rota 130",
    "0.46": "Rota 131", "0.47": "Rota 132", "0.48": "Rota 133", "0.49": "Rota 134", "0.50": "Submerso - Rota 124",
    "0.51": "Submerso - Rota 126", "0.52": "Submerso - Rota 127", "0.53": "Submerso - Rota 128",
    "0.54": "Submerso - Rota 129", "0.55": "Submerso - Rota 105", "0.56": "Submerso - Rota 125",
    "1.0": "Vila Raiz - Casa do Brendan 1F", "1.1": "Vila Raiz - Casa do Brendan 2F",
    "1.2": "Vila Raiz - Casa da May 1F", "1.3": "Vila Raiz - Casa da May 2F", "1.4": "Vila Raiz - Laboratorio do Prof. Birch",
    "2.0": "Vila Oldale - Casa 1", "2.1": "Vila Oldale - Casa 2", "2.2": "Vila Oldale - Centro Pokemon 1F",
    "2.3": "Vila Oldale - Centro Pokemon 2F", "2.4": "Vila Oldale - Mercado",
    "8.0": "Cidade de Petalburg - Casa do Wally", "8.1": "Cidade de Petalburg - Ginasio", "8.2": "Cidade de Petalburg - Casa 1",
    "8.3": "Cidade de Petalburg - Casa 2", "8.4": "Cidade de Petalburg - Centro Pokemon 1F",
    "8.5": "Cidade de Petalburg - Centro Pokemon 2F", "8.6": "Cidade de Petalburg - Mercado"
  };
  const EMERALD_GROUP_AREAS = {
    1: "Vila Raiz", 2: "Vila Oldale", 3: "Vila Dewford", 4: "Vila Lavaridge", 5: "Vila Fallarbor", 6: "Vila Verdanturf",
    7: "Vila Pacifidlog", 8: "Cidade de Petalburg", 9: "Cidade de Slateport", 10: "Cidade de Mauville", 11: "Cidade de Rustboro",
    12: "Cidade de Fortree", 13: "Cidade de Lilycove", 14: "Cidade de Mossdeep", 15: "Cidade de Sootopolis",
    16: "Cidade de Ever Grande", 17: "Rota 104", 18: "Rota 111", 19: "Rota 112", 20: "Rota 114", 21: "Rota 116",
    22: "Rota 117", 23: "Rota 121", 24: "Cavernas e areas especiais"
  };
  const SPECIES_NAMES = [
    "", "Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard", "Squirtle", "Wartortle", "Blastoise",
    "Caterpie", "Metapod", "Butterfree", "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto", "Pidgeot", "Rattata",
    "Raticate", "Spearow", "Fearow", "Ekans", "Arbok", "Pikachu", "Raichu", "Sandshrew", "Sandslash", "Nidoran F",
    "Nidorina", "Nidoqueen", "Nidoran M", "Nidorino", "Nidoking", "Clefairy", "Clefable", "Vulpix", "Ninetales", "Jigglypuff",
    "Wigglytuff", "Zubat", "Golbat", "Oddish", "Gloom", "Vileplume", "Paras", "Parasect", "Venonat", "Venomoth",
    "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck", "Golduck", "Mankey", "Primeape", "Growlithe", "Arcanine",
    "Poliwag", "Poliwhirl", "Poliwrath", "Abra", "Kadabra", "Alakazam", "Machop", "Machoke", "Machamp", "Bellsprout",
    "Weepinbell", "Victreebel", "Tentacool", "Tentacruel", "Geodude", "Graveler", "Golem", "Ponyta", "Rapidash", "Slowpoke",
    "Slowbro", "Magnemite", "Magneton", "Farfetch'd", "Doduo", "Dodrio", "Seel", "Dewgong", "Grimer", "Muk",
    "Shellder", "Cloyster", "Gastly", "Haunter", "Gengar", "Onix", "Drowzee", "Hypno", "Krabby", "Kingler",
    "Voltorb", "Electrode", "Exeggcute", "Exeggutor", "Cubone", "Marowak", "Hitmonlee", "Hitmonchan", "Lickitung", "Koffing",
    "Weezing", "Rhyhorn", "Rhydon", "Chansey", "Tangela", "Kangaskhan", "Horsea", "Seadra", "Goldeen", "Seaking",
    "Staryu", "Starmie", "Mr. Mime", "Scyther", "Jynx", "Electabuzz", "Magmar", "Pinsir", "Tauros", "Magikarp",
    "Gyarados", "Lapras", "Ditto", "Eevee", "Vaporeon", "Jolteon", "Flareon", "Porygon", "Omanyte", "Omastar",
    "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno", "Zapdos", "Moltres", "Dratini", "Dragonair", "Dragonite",
    "Mewtwo", "Mew", "Chikorita", "Bayleef", "Meganium", "Cyndaquil", "Quilava", "Typhlosion", "Totodile", "Croconaw",
    "Feraligatr", "Sentret", "Furret", "Hoothoot", "Noctowl", "Ledyba", "Ledian", "Spinarak", "Ariados", "Crobat",
    "Chinchou", "Lanturn", "Pichu", "Cleffa", "Igglybuff", "Togepi", "Togetic", "Natu", "Xatu", "Mareep",
    "Flaaffy", "Ampharos", "Bellossom", "Marill", "Azumarill", "Sudowoodo", "Politoed", "Hoppip", "Skiploom", "Jumpluff",
    "Aipom", "Sunkern", "Sunflora", "Yanma", "Wooper", "Quagsire", "Espeon", "Umbreon", "Murkrow", "Slowking",
    "Misdreavus", "Unown", "Wobbuffet", "Girafarig", "Pineco", "Forretress", "Dunsparce", "Gligar", "Steelix", "Snubbull",
    "Granbull", "Qwilfish", "Scizor", "Shuckle", "Heracross", "Sneasel", "Teddiursa", "Ursaring", "Slugma", "Magcargo",
    "Swinub", "Piloswine", "Corsola", "Remoraid", "Octillery", "Delibird", "Mantine", "Skarmory", "Houndour", "Houndoom",
    "Kingdra", "Phanpy", "Donphan", "Porygon2", "Stantler", "Smeargle", "Tyrogue", "Hitmontop", "Smoochum", "Elekid",
    "Magby", "Miltank", "Blissey", "Raikou", "Entei", "Suicune", "Larvitar", "Pupitar", "Tyranitar", "Lugia",
    "Ho-Oh", "Celebi", "Treecko", "Grovyle", "Sceptile", "Torchic", "Combusken", "Blaziken", "Mudkip", "Marshtomp",
    "Swampert", "Poochyena", "Mightyena", "Zigzagoon", "Linoone", "Wurmple", "Silcoon", "Beautifly", "Cascoon", "Dustox",
    "Lotad", "Lombre", "Ludicolo", "Seedot", "Nuzleaf", "Shiftry", "Taillow", "Swellow", "Wingull", "Pelipper",
    "Ralts", "Kirlia", "Gardevoir", "Surskit", "Masquerain", "Shroomish", "Breloom", "Slakoth", "Vigoroth", "Slaking",
    "Nincada", "Ninjask", "Shedinja", "Whismur", "Loudred", "Exploud", "Makuhita", "Hariyama", "Azurill", "Nosepass",
    "Skitty", "Delcatty", "Sableye", "Mawile", "Aron", "Lairon", "Aggron", "Meditite", "Medicham", "Electrike",
    "Manectric", "Plusle", "Minun", "Volbeat", "Illumise", "Roselia", "Gulpin", "Swalot", "Carvanha", "Sharpedo",
    "Wailmer", "Wailord", "Numel", "Camerupt", "Torkoal", "Spoink", "Grumpig", "Spinda", "Trapinch", "Vibrava",
    "Flygon", "Cacnea", "Cacturne", "Swablu", "Altaria", "Zangoose", "Seviper", "Lunatone", "Solrock", "Barboach",
    "Whiscash", "Corphish", "Crawdaunt", "Baltoy", "Claydol", "Lileep", "Cradily", "Anorith", "Armaldo", "Feebas",
    "Milotic", "Castform", "Kecleon", "Shuppet", "Banette", "Duskull", "Dusclops", "Tropius", "Chimecho", "Absol",
    "Wynaut", "Snorunt", "Glalie", "Spheal", "Sealeo", "Walrein", "Clamperl", "Huntail", "Gorebyss", "Relicanth",
    "Luvdisc", "Bagon", "Shelgon", "Salamence", "Beldum", "Metang", "Metagross", "Regirock", "Regice", "Registeel",
    "Latias", "Latios", "Kyogre", "Groudon", "Rayquaza", "Jirachi", "Deoxys"
  ];
  const POKEMON_SUBSTRUCT_ORDERS = [
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2], [0, 2, 3, 1], [0, 3, 2, 1],
    [1, 0, 2, 3], [1, 0, 3, 2], [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
    [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2], [2, 3, 0, 1], [3, 2, 0, 1],
    [1, 2, 3, 0], [1, 3, 2, 0], [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0]
  ];

  const loading = document.getElementById("gba-loading");
  const saveStatus = document.getElementById("gba-save-status");
  const playerList = document.getElementById("gba-player-list");
  const playerDialog = document.getElementById("gba-player-dialog");
  const playerNameEl = document.getElementById("gba-player-name");
  const playerMapEl = document.getElementById("gba-player-map");
  const playerTeamEl = document.getElementById("gba-player-team");
  const playerBadgesEl = document.getElementById("gba-player-badges");
  const playerSyncEl = document.getElementById("gba-player-sync");
  const battleInviteBtn = document.getElementById("gba-battle-invite");
  const battleHint = document.getElementById("gba-battle-hint");
  const battlePanel = document.getElementById("gba-battle-panel");
  const battleTitle = document.getElementById("gba-battle-title");
  const battleMe = document.getElementById("gba-battle-me");
  const battleMeHp = document.getElementById("gba-battle-me-hp");
  const battleRival = document.getElementById("gba-battle-rival");
  const battleRivalHp = document.getElementById("gba-battle-rival-hp");
  const battleLog = document.getElementById("gba-battle-log");
  const battleAttack = document.getElementById("gba-battle-attack");
  const battleFlee = document.getElementById("gba-battle-flee");
  const battleClose = document.getElementById("gba-battle-close");
  const onlineLayer = document.getElementById("gba-online-layer");

  let socket = null;
  let myId = "";
  let playerName = "Jogador";
  let myDetails = defaultDetails();
  let hasServerState = false;
  let lastSaveBody = null;
  let saveTimer = 0;
  let lastSaveAt = 0;
  let selectedPlayer = null;
  let activeBattleId = "";
  const players = new Map();

  function defaultDetails() {
    return {
      mapName: "Jogo em execucao",
      mapId: "",
      x: 0,
      y: 0,
      team: [],
      badges: [],
      playTime: "",
      source: "emulator",
      saveKind: "",
      saveUpdatedAt: "",
      frame: 0
    };
  }

  function setSaveStatus(text) {
    saveStatus.textContent = text;
  }

  function safeName(value) {
    return String(value || "Jogador").replace(/[<>]/g, "").trim().slice(0, 24) || "Jogador";
  }

  function cleanDetails(details) {
    const value = details && typeof details === "object" ? details : {};
    return {
      mapName: String(value.mapName || "Jogo em execucao").replace(/[<>]/g, "").slice(0, 64),
      mapId: String(value.mapId || "").replace(/[<>]/g, "").slice(0, 32),
      x: Math.max(0, Math.min(9999, Number(value.x) || 0)),
      y: Math.max(0, Math.min(9999, Number(value.y) || 0)),
      team: Array.isArray(value.team) ? value.team.slice(0, 6).map(item => String(item || "").replace(/[<>]/g, "").slice(0, 24)).filter(Boolean) : [],
      badges: Array.isArray(value.badges) ? value.badges.slice(0, 12).map(item => String(item || "").replace(/[<>]/g, "").slice(0, 24)).filter(Boolean) : [],
      playTime: String(value.playTime || "").replace(/[<>]/g, "").slice(0, 32),
      source: String(value.source || "emulator").replace(/[<>]/g, "").slice(0, 24),
      saveKind: String(value.saveKind || "").replace(/[<>]/g, "").slice(0, 24),
      saveUpdatedAt: String(value.saveUpdatedAt || "").replace(/[<>]/g, "").slice(0, 40),
      frame: Math.max(0, Math.min(999999999, Number(value.frame) || 0))
    };
  }

  function usableMapName(value) {
    const text = String(value || "").trim();
    if (!text || text === "Mapa atual ainda nao lido da ROM") return "Concordium GBA em execucao";
    return text;
  }

  function formatFrameTime(frame) {
    const seconds = Math.floor((Number(frame) || 0) / 60);
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  }

  function emulatorFacts(saveKind = lastSaveBody?.saveKind || "") {
    const manager = window.EJS_emulator?.gameManager;
    let frame = 0;
    try {
      frame = typeof manager?.getFrameNum === "function" ? Number(manager.getFrameNum()) || 0 : 0;
    } catch {}
    return {
      mapName: myDetails.source === "emerald-state" ? usableMapName(myDetails.mapName) : "Concordium GBA em execucao",
      source: "emulatorjs",
      saveKind,
      saveUpdatedAt: new Date().toISOString(),
      frame,
      playTime: myDetails.playTime || formatFrameTime(frame)
    };
  }

  function bytesView(value) {
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return null;
  }

  function rawSaveFromEvent(eventData) {
    const payload = Array.isArray(eventData) ? eventData[0] || eventData[1] : eventData;
    return payload && typeof payload === "object" ? payload.save || payload.state || payload.data || payload : payload;
  }

  function readU16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function readS16(bytes, offset) {
    const value = readU16(bytes, offset);
    return value & 0x8000 ? value - 0x10000 : value;
  }

  function readU32(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function getStateMemory(bytes) {
    const state = bytesView(bytes);
    if (!state || state.length < 32) return null;
    const signature = String.fromCharCode(...state.subarray(0, 8));
    if (signature !== "RASTATE\u0001") return state;
    const chunk = String.fromCharCode(...state.subarray(8, 12));
    if (chunk !== "MEM ") return state;
    const size = readU32(state, 12);
    const start = 24;
    const end = Math.min(state.length, start + size);
    return end > start ? state.subarray(start, end) : null;
  }

  function gbaOffset(address) {
    if (address < EWRAM_START || address >= EWRAM_START + EWRAM_SIZE) return -1;
    return GBA_STATE_EWRAM_OFFSET + (address - EWRAM_START);
  }

  function isGbaPointer(value) {
    return (value >= 0x02000000 && value < 0x02040000)
      || (value >= 0x03000000 && value < 0x03008000)
      || (value >= 0x08000000 && value < 0x0a000000);
  }

  function isNullableGbaPointer(value) {
    return value === 0 || isGbaPointer(value);
  }

  function countNonZero(bytes, offset, length) {
    let count = 0;
    const end = Math.min(bytes.length, offset + length);
    for (let i = offset; i < end; i += 1) {
      if (bytes[i]) count += 1;
    }
    return count;
  }

  function findEmeraldSaveBlocks(memory) {
    const candidates = [];
    for (let offset = 0; offset + 12 <= memory.length; offset += 4) {
      const save1 = readU32(memory, offset);
      const save2 = readU32(memory, offset + 4);
      const storage = readU32(memory, offset + 8);
      const save1Offset = gbaOffset(save1);
      const save2Offset = gbaOffset(save2);
      const storageOffset = gbaOffset(storage);
      if (save1Offset < 0 || save2Offset < 0 || storageOffset < 0) continue;
      if (save1Offset + SAVE_BLOCK_1_SIZE > memory.length || save2Offset + SAVE_BLOCK_2_SIZE > memory.length) continue;
      const partyCount = memory[save1Offset + SAVE_BLOCK_1_PARTY_COUNT];
      const x = readS16(memory, save1Offset);
      const y = readS16(memory, save1Offset + 2);
      const group = memory[save1Offset + 4];
      const map = memory[save1Offset + 5];
      if (partyCount > 6) continue;
      if (Math.abs(x) > 999 || Math.abs(y) > 999 || group > 120 || map > 120) continue;
      let score = 0;
      score += countNonZero(memory, save1Offset, 0x500) > 10 ? 4 : 0;
      score += countNonZero(memory, save2Offset, 0x120) > 10 ? 3 : 0;
      score += partyCount > 0 ? 5 : 0;
      score += x > 0 && y > 0 ? 3 : 0;
      score += group || map ? 2 : 0;
      score += offset >= 0x10000 ? 1 : 0;
      candidates.push({ save1, save2, storage, save1Offset, save2Offset, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  function flagIsSet(memory, flagsOffset, flagId) {
    const byte = memory[flagsOffset + (flagId >> 3)] || 0;
    return Boolean(byte & (1 << (flagId & 7)));
  }

  function extractBadges(memory, save1Offset) {
    const flagsOffset = save1Offset + SAVE_BLOCK_1_FLAGS;
    return BADGE_NAMES.filter((_, index) => flagIsSet(memory, flagsOffset, BADGE_FLAG_START + index));
  }

  function decryptedSubstruct0(monBytes) {
    const personality = readU32(monBytes, 0);
    const otId = readU32(monBytes, 4);
    if (!personality && !otId) return null;
    const key = personality ^ otId;
    const raw = new Uint8Array(48);
    for (let i = 0; i < 48; i += 4) {
      const value = readU32(monBytes, 0x20 + i) ^ key;
      raw[i] = value & 0xff;
      raw[i + 1] = (value >> 8) & 0xff;
      raw[i + 2] = (value >> 16) & 0xff;
      raw[i + 3] = (value >> 24) & 0xff;
    }
    const order = POKEMON_SUBSTRUCT_ORDERS[personality % 24];
    const type0Slot = order.indexOf(0);
    return type0Slot >= 0 ? raw.subarray(type0Slot * 12, type0Slot * 12 + 12) : null;
  }

  function extractTeam(memory, save1Offset) {
    const count = Math.max(0, Math.min(6, memory[save1Offset + SAVE_BLOCK_1_PARTY_COUNT] || 0));
    const team = [];
    for (let i = 0; i < count; i += 1) {
      const monOffset = save1Offset + SAVE_BLOCK_1_PARTY + (i * POKEMON_SIZE);
      const monBytes = memory.subarray(monOffset, monOffset + POKEMON_SIZE);
      if (countNonZero(monBytes, 0, monBytes.length) < 8) continue;
      const sub0 = decryptedSubstruct0(monBytes);
      if (!sub0) continue;
      const species = readU16(sub0, 0);
      if (!species || species > 412) continue;
      const name = SPECIES_NAMES[species] || `Species ${species}`;
      const level = monBytes[0x54] || 0;
      team.push(level ? `${name} Nv.${level}` : name);
    }
    return team;
  }

  function extractPlayTime(memory, save2Offset) {
    const hours = readU16(memory, save2Offset + 0x0e);
    const minutes = memory[save2Offset + 0x10] || 0;
    const seconds = memory[save2Offset + 0x11] || 0;
    if (hours > 9999 || minutes > 59 || seconds > 59) return "";
    if (!hours && !minutes && !seconds) return "";
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function findCurrentMapHeader(memory, save1Offset) {
    const saveLayoutId = readU16(memory, save1Offset + 0x32);
    const candidates = [];
    const start = GBA_STATE_EWRAM_OFFSET;
    const end = Math.min(memory.length - 0x1c, GBA_STATE_EWRAM_OFFSET + EWRAM_SIZE);
    for (let offset = start; offset <= end; offset += 4) {
      const mapLayout = readU32(memory, offset);
      const events = readU32(memory, offset + 4);
      const scripts = readU32(memory, offset + 8);
      const connections = readU32(memory, offset + 12);
      if (!isGbaPointer(mapLayout) || !isNullableGbaPointer(events) || !isNullableGbaPointer(scripts) || !isNullableGbaPointer(connections)) continue;
      const music = readU16(memory, offset + 0x10);
      const layoutId = readU16(memory, offset + 0x12);
      const sectionId = memory[offset + 0x14];
      const weather = memory[offset + 0x16];
      const mapType = memory[offset + 0x17];
      const flags = memory[offset + 0x1a];
      const battleType = memory[offset + 0x1b];
      const sectionName = REGION_MAP_SECTION_NAMES[sectionId] || "";
      if (!sectionName || music > 0x3ff || layoutId > 0x3ff || weather > 40 || mapType > 12 || battleType > 12) continue;
      let score = 0;
      score += layoutId === saveLayoutId ? 12 : 0;
      score += mapLayout >= 0x08000000 ? 4 : 0;
      score += events >= 0x08000000 ? 2 : 0;
      score += scripts >= 0x08000000 ? 2 : 0;
      score += connections >= 0x08000000 ? 2 : 0;
      score += flags ? 1 : 0;
      candidates.push({ offset, layoutId, sectionId, sectionName, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  function describeMap(mapId, x, y, sectionName = "") {
    if (sectionName) return `${sectionName} - X ${x}, Y ${y}`;
    const directName = EMERALD_MAP_NAMES[mapId];
    if (directName) return `${directName} - X ${x}, Y ${y}`;
    const [group] = mapId.split(".").map(Number);
    const area = EMERALD_GROUP_AREAS[group] || "Hoenn";
    return `${area} - Mapa ${mapId} - X ${x}, Y ${y}`;
  }

  function extractEmeraldDetails(stateLike) {
    const memory = getStateMemory(stateLike);
    if (!memory || memory.length < GBA_STATE_SIZE) return {};
    const blocks = findEmeraldSaveBlocks(memory);
    if (!blocks || blocks.score < 4) return {};
    if (countNonZero(memory, blocks.save1Offset, 0x500) <= 10 || countNonZero(memory, blocks.save2Offset, 0x120) <= 10) return {};
    const x = readS16(memory, blocks.save1Offset);
    const y = readS16(memory, blocks.save1Offset + 2);
    const mapGroup = memory[blocks.save1Offset + 4] || 0;
    const mapNum = memory[blocks.save1Offset + 5] || 0;
    const warpId = memory[blocks.save1Offset + 6] || 0;
    const mapHeader = findCurrentMapHeader(memory, blocks.save1Offset);
    const mapId = mapHeader ? `mapsec:${mapHeader.sectionId}` : `${mapGroup}.${mapNum}`;
    const details = {
      mapName: describeMap(`${mapGroup}.${mapNum}`, x, y, mapHeader?.sectionName || ""),
      mapId,
      x: Math.max(6, Math.min(94, 10 + ((Math.abs(x) % 36) * 2.2))),
      y: Math.max(18, Math.min(92, 20 + ((Math.abs(y) % 28) * 2.4))),
      source: "emerald-state",
      team: extractTeam(memory, blocks.save1Offset),
      badges: extractBadges(memory, blocks.save1Offset),
      warpId
    };
    const playTime = extractPlayTime(memory, blocks.save2Offset);
    if (playTime) details.playTime = playTime;
    return details;
  }

  function hashCode(value) {
    return String(value).split("").reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
  }

  async function loadAccount() {
    try {
      const response = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json();
      playerName = safeName(payload?.user?.name || "Jogador");
    } catch {}
  }

  async function loadServerSave() {
    try {
      const response = await fetch("/api/concordium/gba-save", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json();
      myDetails = cleanDetails(payload?.save?.metadata);
      hasServerState = Boolean(payload?.save?.save && payload?.save?.saveKind === "state");
      lastSaveBody = {
        metadata: myDetails,
        save: payload?.save?.save || "",
        saveKind: payload?.save?.saveKind || "",
        hash: payload?.save?.hash || "",
        format: payload?.save?.format || "server"
      };
      setSaveStatus(payload.updatedAt ? "Save automatico ativo" : "Save automatico pronto");
    } catch {
      setSaveStatus("Save automatico indisponivel");
    }
  }

  async function romStatus() {
    const response = await fetch("/api/concordium/rom-status", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Nao foi possivel verificar a ROM.");
    return response.json();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Nao foi possivel carregar o emulador."));
      document.body.appendChild(script);
    });
  }

  function toBase64(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 8_000_000);
    const source = value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : ArrayBuffer.isView(value)
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        : null;
    if (!source) return "";
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < source.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, source.subarray(i, i + chunkSize));
    }
    return btoa(binary).slice(0, 8_000_000);
  }

  function saveBodyFromEvent(eventData, saveKind = "state") {
    const payload = Array.isArray(eventData) ? eventData[0] || eventData[1] : eventData;
    const save = rawSaveFromEvent(eventData);
    const encoded = toBase64(save);
    if (saveKind !== "state" && lastSaveBody?.saveKind === "state") {
      return {
        ...lastSaveBody,
        metadata: myDetails,
        hash: payload?.hash || lastSaveBody.hash || "",
        format: payload?.format || lastSaveBody.format || "emulatorjs-state"
      };
    }
    return {
      metadata: myDetails,
      save: encoded,
      saveKind,
      hash: payload?.hash || "",
      format: payload?.format || "emulatorjs"
    };
  }

  function scheduleSave(body, immediate = false) {
    lastSaveBody = {
      metadata: cleanDetails(body?.metadata || myDetails),
      save: typeof body?.save === "string" ? body.save : "",
      saveKind: String(body?.saveKind || ""),
      hash: String(body?.hash || ""),
      format: String(body?.format || "emulatorjs")
    };
    if (saveTimer) clearTimeout(saveTimer);
    const delay = immediate ? 0 : 250;
    saveTimer = setTimeout(() => persistSaveNow(), delay);
  }

  async function persistSaveNow() {
    if (!lastSaveBody) return;
    const body = lastSaveBody;
    saveTimer = 0;
    try {
      const response = await fetch("/api/concordium/gba-save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      lastSaveAt = Date.now();
      setSaveStatus(response.ok ? "Save automatico salvo agora" : "Falha no save automatico");
    } catch {
      setSaveStatus("Falha no save automatico");
    }
  }

  function persistSave(eventData, saveKind = "state") {
    const extracted = saveKind === "state" ? extractEmeraldDetails(rawSaveFromEvent(eventData)) : {};
    myDetails = cleanDetails({ ...myDetails, ...emulatorFacts(saveKind), ...extracted });
    publishDetails();
    scheduleSave(saveBodyFromEvent(eventData, saveKind), true);
  }

  function persistMetadata(immediate = false) {
    scheduleSave({
      metadata: myDetails,
      save: lastSaveBody?.save || "",
      saveKind: lastSaveBody?.saveKind || "metadata",
      hash: lastSaveBody?.hash || "",
      format: lastSaveBody?.format || "metadata"
    }, immediate);
  }

  function publishDetails() {
    if (socket?.connected) socket.emit("concordium-gba:details", { metadata: myDetails });
    const self = players.get(myId);
    if (self) {
      self.details = myDetails;
      self.updatedAt = Date.now();
      players.set(myId, self);
      renderRoster();
    }
  }

  function configureEmulator() {
    window.EJS_player = "#game";
    window.EJS_core = "mgba";
    window.EJS_gameUrl = ROM_URL;
    window.EJS_gameName = "Concordium";
    window.EJS_color = "#f1c75d";
    window.EJS_backgroundColor = "#000";
    window.EJS_startOnLoaded = true;
    window.EJS_fullscreenOnLoaded = false;
    window.EJS_pathtodata = EMULATOR_DATA_URL;
    window.EJS_biosUrl = "";
    window.EJS_fixedSaveInterval = 1000;
    if (hasServerState) {
      window.EJS_loadStateURL = `${SAVE_STATE_URL}?t=${Date.now()}`;
    }
    window.EJS_Buttons = {
      playPause: false,
      play: false,
      pause: false,
      restart: false,
      mute: false,
      unmute: false,
      settings: false,
      fullscreen: true,
      enterFullscreen: true,
      exitFullscreen: true,
      saveState: false,
      loadState: false,
      screenRecord: false,
      gamepad: false,
      cheat: false,
      volume: false,
      saveSavFiles: false,
      loadSavFiles: false,
      quickSave: false,
      quickLoad: false,
      screenshot: false,
      cacheManager: false,
      exitEmulation: false
    };
    window.EJS_onGameStart = () => {
      loading.classList.add("hidden");
      setSaveStatus(hasServerState ? "Save restaurado da conta" : "Save automatico ativo");
      setTimeout(captureAnySaveNow, 800);
    };
    window.EJS_ready = () => {
      loading.classList.add("hidden");
      hideEmulatorChrome();
    };
    window.EJS_onSaveUpdate = data => persistSave(data, "savefile");
    window.EJS_onSaveState = data => persistSave(data, "state");
    window.EJS_onSaveSaveFiles = data => persistSave(data, "savefile");
  }

  async function captureStateNow() {
    const manager = window.EJS_emulator?.gameManager;
    if (!manager || typeof manager.getState !== "function") return false;
    try {
      const state = await manager.getState();
      const encoded = toBase64(state);
      if (!encoded) return false;
      myDetails = cleanDetails({ ...myDetails, ...emulatorFacts("state"), ...extractEmeraldDetails(state) });
      publishDetails();
      scheduleSave({
        metadata: myDetails,
        save: encoded,
        saveKind: "state",
        hash: `state-${Date.now()}`,
        format: "emulatorjs-state"
      }, true);
      return true;
    } catch {
      return false;
    }
  }

  function captureSaveFileNow() {
    if (lastSaveBody?.saveKind === "state" && lastSaveBody.save) return false;
    const manager = window.EJS_emulator?.gameManager;
    if (!manager) return false;
    try {
      if (typeof manager.saveSaveFiles === "function") manager.saveSaveFiles();
      const saveFile = typeof manager.getSaveFile === "function" ? manager.getSaveFile(false) : null;
      const encoded = toBase64(saveFile);
      if (!encoded) return false;
      myDetails = cleanDetails({ ...myDetails, ...emulatorFacts("savefile") });
      publishDetails();
      scheduleSave({
        metadata: myDetails,
        save: encoded,
        saveKind: "savefile",
        hash: `savefile-${Date.now()}`,
        format: "emulatorjs-savefile"
      }, true);
      return true;
    } catch {
      return false;
    }
  }

  async function captureAnySaveNow() {
    const savedState = await captureStateNow();
    if (savedState) return true;
    return captureSaveFileNow();
  }

  function startInstantStateCapture() {
    setInterval(() => captureAnySaveNow(), STATE_CAPTURE_MS);
  }

  function hideEmulatorChrome() {
    const root = document.getElementById("game");
    if (!root) return;
    const forbidden = [
      "cheat", "pause", "play", "restart", "settings", "gamepad", "cache",
      "screenshot", "record", "mute", "volume", "upload", "file",
      "save state", "load state", "quick save", "quick load", "save files", "load files"
    ];
    root.querySelectorAll("button, [role='button'], input, label, a").forEach(node => {
      const text = `${node.textContent || ""} ${node.title || ""} ${node.getAttribute("aria-label") || ""}`.toLowerCase();
      if (text.includes("fullscreen")) return;
      if (!forbidden.some(key => text.includes(key))) return;
      node.style.display = "none";
      node.style.pointerEvents = "none";
    });
  }

  function upsertPlayer(player, isSelf = false) {
    if (!player?.id) return;
    players.set(player.id, {
      id: player.id,
      name: safeName(player.name),
      color: player.color || PLAYER_COLORS[1],
      details: cleanDetails(player.details),
      self: isSelf
    });
    renderRoster();
  }

  function removePlayer(id) {
    players.delete(id);
    renderRoster();
  }

  function renderRoster() {
    if (!players.size) {
      playerList.innerHTML = '<span class="gba-roster-empty">Conectando jogadores...</span>';
      return;
    }
    playerList.innerHTML = "";
    [...players.values()].sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name)).forEach(player => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `gba-player-pill${player.self ? " self" : ""}`;
      button.style.setProperty("--player-color", player.color);
      button.innerHTML = `<i></i><span>${player.self ? "voce" : player.name}</span>`;
      button.addEventListener("click", () => openPlayer(player));
      playerList.appendChild(button);
    });
    renderOnlineLayer();
  }

  function renderOnlineLayer() {
    if (!onlineLayer) return;
    const others = [...players.values()].filter(player => !player.self);
    onlineLayer.innerHTML = "";
    others.forEach((player, index) => {
      const details = cleanDetails(player.details);
      const hasCoords = details.x > 0 || details.y > 0;
      const x = hasCoords ? Math.max(6, Math.min(94, details.x)) : 12 + (index % 5) * 12;
      const y = hasCoords ? Math.max(18, Math.min(92, details.y)) : 88 - Math.floor(index / 5) * 12;
      const avatar = document.createElement("div");
      avatar.className = "gba-online-avatar";
      avatar.style.left = `${x}%`;
      avatar.style.top = `${y}%`;
      avatar.style.setProperty("--player-color", player.color || "#f1c75d");
      const label = document.createElement("span");
      label.className = "gba-online-name";
      label.textContent = player.name;
      avatar.appendChild(label);
      onlineLayer.appendChild(avatar);
    });
  }

  function openPlayer(player) {
    selectedPlayer = player;
    const details = cleanDetails(player.details);
    playerNameEl.textContent = player.self ? `${player.name} (voce)` : player.name;
    playerMapEl.textContent = usableMapName(details.mapName);
    playerTeamEl.textContent = details.team.length ? details.team.join(", ") : "Sem equipe lida ainda";
    playerBadgesEl.textContent = details.badges.length ? details.badges.join(", ") : "Nenhuma insignia lida ainda";
    playerSyncEl.textContent = [
      details.saveKind ? `save ${details.saveKind}` : "save aguardando",
      details.playTime ? `tempo ${details.playTime}` : "",
      details.saveUpdatedAt ? `atualizado ${new Date(details.saveUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""
    ].filter(Boolean).join(" | ");
    updateBattleInviteUi(player, details);
    if (typeof playerDialog.showModal === "function") playerDialog.showModal();
    else playerDialog.setAttribute("open", "open");
  }

  function canInviteToBattle(player, details = cleanDetails(player?.details)) {
    if (!socket?.connected || !player || player.self || !player.id) return false;
    return myDetails.team.length > 0 && details.team.length > 0;
  }

  function updateBattleInviteUi(player, details = cleanDetails(player?.details)) {
    if (!battleInviteBtn || !battleHint) return;
    const enabled = canInviteToBattle(player, details);
    battleInviteBtn.hidden = Boolean(player?.self);
    battleInviteBtn.disabled = !enabled;
    if (player?.self) {
      battleHint.textContent = "Esse painel mostra seus dados salvos.";
    } else if (!myDetails.team.length) {
      battleHint.textContent = "Sua equipe ainda nao foi lida do save.";
    } else if (!details.team.length) {
      battleHint.textContent = "O outro jogador ainda nao tem equipe lida.";
    } else {
      battleHint.textContent = "Convide para uma batalha online.";
    }
  }

  function sendBattleInvite() {
    if (!selectedPlayer || !canInviteToBattle(selectedPlayer)) return;
    socket.emit("concordium-gba:battle-invite", { targetId: selectedPlayer.id });
    if (battleHint) battleHint.textContent = "Convite enviado. Aguardando aceite.";
  }

  function askBattleInvite(invite) {
    const fromName = safeName(invite?.from?.name || "Jogador");
    const ok = window.confirm(`${fromName} quer batalhar com voce. Aceitar?`);
    socket.emit("concordium-gba:battle-response", { battleId: invite?.battleId, accept: ok });
  }

  function renderBattle(state) {
    if (!state?.battleId) return;
    activeBattleId = state.battleId;
    const mine = state.players?.find(player => player.id === myId);
    const rival = state.players?.find(player => player.id !== myId);
    if (!mine || !rival) return;
    battlePanel.hidden = false;
    battleTitle.textContent = `Batalha contra ${rival.name}`;
    battleMe.textContent = mine.name === playerName ? "Voce" : mine.name;
    battleRival.textContent = rival.name;
    battleMeHp.value = Math.max(0, Math.min(100, mine.hp));
    battleRivalHp.value = Math.max(0, Math.min(100, rival.hp));
    battleLog.textContent = state.message || "Batalha em andamento.";
    const ended = Boolean(state.ended);
    battleAttack.disabled = ended;
    battleFlee.disabled = ended;
  }

  function endBattle(message = "Batalha encerrada.") {
    activeBattleId = "";
    if (battleLog) battleLog.textContent = message;
    if (battleAttack) battleAttack.disabled = true;
    if (battleFlee) battleFlee.disabled = true;
  }

  async function startMultiplayer() {
    await loadScript("/socket.io/socket.io.js");
    socket = window.io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      const color = PLAYER_COLORS[Math.abs(hashCode(playerName)) % PLAYER_COLORS.length];
      const x = myDetails.x || 50;
      const y = myDetails.y || 72;
      socket.emit("concordium-gba:join", { name: playerName, x, y, dir: "down", color });
      socket.emit("concordium-gba:details", { metadata: myDetails });
    });
    socket.on("disconnect", () => {
      players.clear();
      renderRoster();
    });
    socket.on("concordium-gba:init", payload => {
      myId = payload.id;
      (payload.players || []).forEach(player => upsertPlayer(player, player.id === myId));
    });
    socket.on("concordium-gba:player-joined", player => upsertPlayer(player));
    socket.on("concordium-gba:player-update", player => upsertPlayer(player, player.id === myId));
    socket.on("concordium-gba:player-left", removePlayer);
    socket.on("concordium-gba:battle-invite", askBattleInvite);
    socket.on("concordium-gba:battle-error", message => {
      if (battleHint) battleHint.textContent = String(message || "Nao foi possivel iniciar a batalha.");
    });
    socket.on("concordium-gba:battle-start", renderBattle);
    socket.on("concordium-gba:battle-update", renderBattle);
    socket.on("concordium-gba:battle-end", payload => endBattle(payload?.message));
  }

  function updateBridgeDetails(nextDetails) {
    myDetails = cleanDetails({ ...myDetails, ...(nextDetails || {}) });
    publishDetails();
    persistMetadata(true);
  }

  window.ConcordiumBridge = {
    update: updateBridgeDetails,
    getDetails: () => ({ ...myDetails }),
    saveNow: () => persistMetadata(true),
    markMap: (mapName, x = 0, y = 0) => updateBridgeDetails({ mapName, x, y }),
    setTeam: team => updateBridgeDetails({ team }),
    setBadges: badges => updateBridgeDetails({ badges }),
    debugExtract: async () => {
      const manager = window.EJS_emulator?.gameManager;
      if (!manager || typeof manager.getState !== "function") return {};
      return extractEmeraldDetails(await manager.getState());
    }
  };

  battleInviteBtn?.addEventListener("click", sendBattleInvite);
  battleAttack?.addEventListener("click", () => {
    if (activeBattleId && socket?.connected) socket.emit("concordium-gba:battle-action", { battleId: activeBattleId, action: "attack" });
  });
  battleFlee?.addEventListener("click", () => {
    if (activeBattleId && socket?.connected) socket.emit("concordium-gba:battle-action", { battleId: activeBattleId, action: "flee" });
  });
  battleClose?.addEventListener("click", () => {
    battlePanel.hidden = true;
  });

  document.addEventListener("fullscreenchange", () => {
    setTimeout(hideEmulatorChrome, 250);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") captureAnySaveNow().then(saved => {
      if (!saved) persistMetadata(true);
    });
  });

  window.addEventListener("pagehide", () => {
    captureAnySaveNow();
    persistMetadata(true);
    if (lastSaveBody) {
      const blob = new Blob([JSON.stringify(lastSaveBody)], { type: "application/json" });
      navigator.sendBeacon?.("/api/concordium/gba-save", blob);
    }
  });

  async function boot() {
    try {
      renderRoster();
      const status = await romStatus();
      if (!status.available) {
        loading.textContent = "ROM nativa nao encontrada.";
        return;
      }
      await loadAccount();
      await loadServerSave();
      await startMultiplayer();
      configureEmulator();
      await loadScript(LOADER_URL);
      setTimeout(hideEmulatorChrome, 1200);
      setInterval(hideEmulatorChrome, 3000);
      startInstantStateCapture();
    } catch (error) {
      loading.textContent = error.message || "Falha ao iniciar Concordium.";
    }
  }

  boot();
})();
