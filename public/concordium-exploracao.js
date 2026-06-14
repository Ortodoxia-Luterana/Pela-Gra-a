(function () {
  const TILE = 32;
  const SAVE_KEY = "concordium-local-alpha-v3";
  const MOVE_MS = 116;
  const STEP_PAUSE_MS = 10;

  const placeEl = document.getElementById("cx-place");
  const titleEl = document.getElementById("cx-title");
  const startButton = document.getElementById("cx-start");
  const toastEl = document.getElementById("cx-toast");
  const panel = document.getElementById("cx-panel");
  const menuButton = document.getElementById("cx-menu");
  const panelClose = document.getElementById("cx-panel-close");
  const dialog = document.getElementById("dialog");
  const dialogName = document.getElementById("dialog-name");
  const dialogText = document.getElementById("dialog-text");
  const dialogNext = document.getElementById("dialog-next");

  const dirDef = {
    down: { dx: 0, dy: 1, frame: 0 },
    left: { dx: -1, dy: 0, frame: 1 },
    right: { dx: 1, dy: 0, frame: 2 },
    up: { dx: 0, dy: -1, frame: 3 }
  };

  const tileFrames = {
    G: 0,
    g: 1,
    P: 2,
    W: 3,
    T: 4,
    L: 5,
    R: 6,
    H: 7,
    D: 8,
    F: 9,
    I: 10,
    B: 11,
    S: 12,
    A: 13,
    M: 14,
    X: 15
  };

  const blockedTiles = new Set(["W", "T", "L", "R", "H", "I", "B", "S", "X"]);

  const maps = {
    vila: {
      title: "Vila Prisma",
      kind: "outside",
      backgroundKey: "vila-map",
      width: 30,
      height: 30,
      spawn: { x: 14, y: 16, dir: "up" },
      rows: [
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTTTTTGGGGGGGGGGGGGGGTTTT",
        "TTGGGBBBBBBGGGGGGGGGWWWWWWGGTT",
        "TTGGGBBBBBBGBBBBBBGGWWWWWWGGTT",
        "TTGGGBBBBBBGBBBBBBGGWWWWWWGGTT",
        "TTGGGBBBBBBGBBBBBBGGWWWWWWGGTT",
        "TTGGGBBDBBBSBBBBBBGGWWWWWWGGTT",
        "TTGGGGPGGGGGBBDBBBGGWWWWWWGGTT",
        "TGGGGGGGGGGGGGGGGDGGGGGGGGGGGT",
        "TGGGGGGGGGGGGGGGGPGGGGGGGBBBGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGGBBBGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGDBBBGT",
        "TGGGGGGGGGGGGGGGGGPGGGGGPBBGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGDGGGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBPGGGGGT",
        "TGWWWWWWGBBBBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGBBBBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGBBBBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGBBDBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGGPGBGGGGGGGGGGGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGGGGGGGGGGGT",
        "TGWWWWWWGGGGGGGGBBBBBGGGGGGGGT",
        "TGWWWWWWGGGGGGGGBBBBBGGGGGGGGT",
        "TTWWWWWWGGGGGGGGBBBBBGGGGGGGTT",
        "TTGGGGGGGGGGGGGGBDBBBGGGGGGGTT",
        "TTGGGGGGGGGGGGGGPGGGGGGGGGGGTT",
        "TTGGGGGGGGGGGGGGGGGGGGGGGGGGTT",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
      ],
      doors: {
        "5,6": { scene: "casaNorte", x: 7, y: 9, dir: "up", return: { scene: "vila", x: 5, y: 7, dir: "down" } },
        "15,8": { scene: "laboratorio", x: 7, y: 9, dir: "up", return: { scene: "vila", x: 15, y: 9, dir: "down" } },
        "25,11": { scene: "casaLeste", x: 7, y: 9, dir: "up", return: { scene: "vila", x: 25, y: 12, dir: "down" } },
        "20,15": { scene: "capela", x: 7, y: 9, dir: "up", return: { scene: "vila", x: 20, y: 16, dir: "down" } },
        "10,20": { scene: "casaSul", x: 7, y: 9, dir: "up", return: { scene: "vila", x: 10, y: 21, dir: "down" } },
        "20,24": { scene: "casaOeste", x: 7, y: 9, dir: "up", return: { scene: "vila", x: 20, y: 25, dir: "down" } }
      },
      signs: {
        "11,6": ["Placa", "Vila Prisma. Um primeiro mapa jogavel para testar tiles, casas e dialogos."],
        "17,8": ["Placa", "Laboratorio Concordium. A porta central leva aos testes de assets."],
        "18,12": ["Placa", "Segure o direcional ou WASD: o personagem continua andando."],
        "24,15": ["Placa", "As casas abrem somente no tile exato da porta."],
        "7,22": ["Placa", "Prototipo local bloqueado no hub publico."]
      },
      npcs: [
        {
          id: "prof",
          name: "Prof. Aureo",
          x: 14,
          y: 15,
          dir: "down",
          row: 1,
          lines: [
            "Este e o primeiro passo de Concordium como pokemon luterano.",
            "Por enquanto voce testa mapa, colisao, fala e entrada nas casas. Depois colocamos novos companheiros."
          ]
        },
        {
          id: "lia",
          name: "Lia",
          x: 20,
          y: 18,
          dir: "left",
          row: 2,
          lines: [
            "A rua, a grama e as portas ja respondem diferente.",
            "Se tentar entrar pelo lado da porta, nada acontece. Tem que pisar na entrada certa."
          ]
        },
        {
          id: "nilo",
          name: "Nilo",
          x: 24,
          y: 22,
          dir: "up",
          row: 3,
          lines: [
            "A versao do celular vem primeiro: tela limpa, controle grande e dialogo facil de tocar.",
            "No PC, teclado tambem funciona."
          ]
        }
      ]
    },
    laboratorio: makeIndoor({
      title: "Laboratorio Concordium",
      exit: { scene: "vila", x: 15, y: 9, dir: "down" },
      signs: {
        "7,8": ["Mesa", "Aqui vao ficar os dados de especies, sprites e paletas extraidos da ROM."],
        "3,4": ["Caderno", "Ataques podem continuar os mesmos no inicio. O foco agora e mundo, fala e companheiros."]
      },
      npcs: [
        {
          id: "tecnico",
          name: "Tecnico Nilo",
          x: 11,
          y: 6,
          dir: "left",
          row: 3,
          lines: [
            "Quando voce criar Pokemon novos, eu encaixo nome, stats, tipos, sprite e learnset no fluxo certo.",
            "Depois exportamos a ROM editada para dados web."
          ]
        }
      ]
    }),
    casaNorte: makeIndoor({
      title: "Casa da Praca Norte",
      exit: { scene: "vila", x: 5, y: 7, dir: "down" },
      signs: { "7,9": ["Tapete", "A saida leva de volta exatamente para a porta da casa norte."] },
      npcs: [{ id: "marta", name: "Marta", x: 5, y: 7, dir: "right", row: 1, lines: ["Bem-vindo. A vila ainda e simples, mas agora ja da para andar como jogo mesmo."] }]
    }),
    casaLeste: makeIndoor({
      title: "Casa Leste",
      exit: { scene: "vila", x: 25, y: 12, dir: "down" },
      signs: { "5,5": ["Estante", "Livros sobre catecismo, mapas antigos e cadernos de criaturas."] },
      npcs: [{ id: "joel", name: "Joel", x: 10, y: 6, dir: "left", row: 2, lines: ["Disseram que vao surgir companheiros novos por aqui. Espero que venham bem treinados."] }]
    }),
    casaSul: makeIndoor({
      title: "Casa Sul",
      exit: { scene: "vila", x: 10, y: 21, dir: "down" },
      signs: { "8,4": ["Bau", "Vazio por enquanto. Depois pode virar item ou gatilho de historia."] },
      npcs: [{ id: "ana", name: "Ana", x: 4, y: 6, dir: "right", row: 1, lines: ["A vila precisa de nomes melhores, mas ja tem estrutura para crescer."] }]
    }),
    casaOeste: makeIndoor({
      title: "Casa Oeste",
      exit: { scene: "vila", x: 20, y: 25, dir: "down" },
      signs: { "9,7": ["Mesa", "Rascunhos da abertura: CONCORDIUM em letras grandes."] },
      npcs: [{ id: "lucas", name: "Lucas", x: 11, y: 7, dir: "left", row: 2, lines: ["A abertura nova pode entrar antes do mapa quando voce definir o texto e a imagem."] }]
    }),
    capela: makeIndoor({
      title: "Capela da Vila",
      exit: { scene: "vila", x: 20, y: 16, dir: "down" },
      signs: {
        "7,4": ["Altar", "Sola gratia. Sola fide. Sola Scriptura."],
        "3,7": ["Banco", "Um bom lugar para salvar antes da jornada."]
      },
      npcs: [{ id: "pastor", name: "Pastor Elias", x: 7, y: 6, dir: "down", row: 3, lines: ["Concordium ainda esta fechado ao publico.", "Quando estiver pronto, abrimos o caminho pelo hub."] }]
    })
  };

  function makeIndoor(config) {
    return {
      title: config.title,
      kind: "indoor",
      width: 16,
      height: 12,
      spawn: { x: 7, y: 9, dir: "up" },
      rows: [
        "XXXXXXXXXXXXXXXX",
        "XIIIIIIIIIIIIIIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFBBBBBFFFFIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFFBFFFFBFFFX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFFFMMMFFFFIX",
        "XIFFFFFMFFFFFFIX",
        "XIIIIIIDDDIIIIIX",
        "XXXXXXXXXXXXXXXX"
      ],
      exits: {
        "6,10": config.exit,
        "7,10": config.exit,
        "8,10": config.exit
      },
      signs: config.signs || {},
      npcs: config.npcs || []
    };
  }

  let scene;
  let activeDialog = null;
  let activeLine = 0;

  function key(x, y) {
    return `${x},${y}`;
  }

  function frameFor(row, dir) {
    return row * 4 + dirDef[dir].frame;
  }

  function tileAt(map, x, y) {
    if (x < 0 || y < 0 || y >= map.rows.length || x >= map.rows[y].length) return "X";
    return map.rows[y][x];
  }

  function loadSave() {
    try {
      const value = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (value && maps[value.scene]) return value;
    } catch (_) {}
    return { scene: "vila", ...maps.vila.spawn };
  }

  function save(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove("hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toastEl.classList.add("hidden"), 1800);
  }

  function showDialog(name, lines) {
    activeDialog = { name, lines };
    activeLine = 0;
    dialogName.textContent = name;
    dialogText.textContent = lines[0];
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog() {
    activeDialog = null;
    if (dialog.open) dialog.close();
    if (scene) scene.canAct = true;
  }

  dialogNext.addEventListener("click", () => {
    if (!activeDialog) return;
    activeLine += 1;
    if (activeLine >= activeDialog.lines.length) {
      closeDialog();
      return;
    }
    dialogText.textContent = activeDialog.lines[activeLine];
  });

  menuButton.addEventListener("click", () => panel.classList.add("open"));
  panelClose.addEventListener("click", () => panel.classList.remove("open"));
  startButton.addEventListener("click", () => {
    titleEl.classList.add("hidden");
    showToast("Segure o direcional para andar. Toque A para falar.");
  });

  class ConcordiumScene extends Phaser.Scene {
    constructor() {
      super("concordium");
      this.state = loadSave();
      this.map = null;
      this.canAct = true;
      this.isMoving = false;
      this.mobileDir = null;
      this.nextStepAt = 0;
      this.npcs = [];
    }

    preload() {
      this.load.image("vila-map", "/assets/concordium-vila-prisma-map-v2.png?v=20260614f");
      this.load.spritesheet("tiles", "/assets/concordium-indoor-tiles-v2.png?v=20260614f", { frameWidth: 16, frameHeight: 16 });
      this.load.spritesheet("chars", "/assets/concordium-characters-v2.png?v=20260614f", { frameWidth: 24, frameHeight: 32 });
    }

    create() {
      scene = this;
      this.worldGroup = this.add.group();
      this.actorGroup = this.add.group();
      this.player = this.add.sprite(0, 0, "chars", frameFor(0, this.state.dir || "down")).setOrigin(.5, 1).setScale(1.35);
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,A,S,D,E,SPACE,ENTER");
      this.input.keyboard.on("keydown-SPACE", () => this.interact());
      this.input.keyboard.on("keydown-E", () => this.interact());
      this.input.keyboard.on("keydown-ENTER", () => this.interact());
      this.bindTouchControls();
      this.loadMap(this.state.scene, this.state.x, this.state.y, this.state.dir);
    }

    bindTouchControls() {
      const clearDir = (dir) => {
        if (!dir || this.mobileDir === dir) this.mobileDir = null;
      };
      document.querySelectorAll("[data-move]").forEach((button) => {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.mobileDir = button.dataset.move;
          this.tryMove(this.mobileDir);
        });
        button.addEventListener("pointerup", () => clearDir(button.dataset.move));
        button.addEventListener("pointercancel", () => clearDir(button.dataset.move));
        button.addEventListener("pointerleave", () => clearDir(button.dataset.move));
      });
      window.addEventListener("pointerup", () => clearDir());
      window.addEventListener("blur", () => clearDir());
      document.querySelector("[data-action]").addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.interact();
      });
    }

    loadMap(id, x, y, dir) {
      this.map = maps[id] || maps.vila;
      this.state.scene = id;
      this.worldGroup.clear(true, true);
      this.actorGroup.clear(true, true);
      this.npcs = [];
      placeEl.textContent = this.map.title;

      if (this.map.backgroundKey) this.drawOutsideMap();
      else this.drawTileMap();

      this.map.npcs.forEach((npc) => {
        const sprite = this.add.sprite(npc.x * TILE + TILE / 2, npc.y * TILE + TILE, "chars", frameFor(npc.row, npc.dir)).setOrigin(.5, 1).setScale(1.35);
        sprite.setDepth(npc.y * TILE + 18);
        sprite.npc = npc;
        this.actorGroup.add(sprite);
        this.npcs.push(sprite);
      });

      this.placePlayer(x ?? this.map.spawn.x, y ?? this.map.spawn.y, dir ?? this.map.spawn.dir);
      this.cameras.main.setBounds(0, 0, this.map.width * TILE, this.map.height * TILE);
      this.cameras.main.startFollow(this.player, true, .16, .16);
      this.adjustZoom();
      this.scale.on("resize", () => this.adjustZoom());
      save(this.state);
    }

    drawOutsideMap() {
      const bg = this.add.image(0, 0, this.map.backgroundKey).setOrigin(0, 0);
      bg.setDisplaySize(this.map.width * TILE, this.map.height * TILE);
      this.worldGroup.add(bg);
    }

    drawTileMap() {
      this.map.rows.forEach((row, y) => {
        [...row].forEach((code, x) => {
          const tile = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tiles", tileFrames[code] ?? 0);
          tile.setDisplaySize(TILE, TILE);
          this.worldGroup.add(tile);
        });
      });
    }

    adjustZoom() {
      const width = this.scale.width;
      const height = this.scale.height;
      const shortSide = Math.min(width, height);
      const zoom = shortSide < 420 ? 1.55 : width < 860 ? 1.75 : 2;
      this.cameras.main.setZoom(zoom);
    }

    placePlayer(x, y, dir) {
      this.state.x = x;
      this.state.y = y;
      this.state.dir = dir || "down";
      this.player.setPosition(x * TILE + TILE / 2, y * TILE + TILE);
      this.player.setFrame(frameFor(0, this.state.dir));
      this.player.setDepth(y * TILE + 28);
    }

    update(time) {
      if (!this.canAct || this.isMoving || activeDialog || titleEl && !titleEl.classList.contains("hidden")) return;
      if (time < this.nextStepAt) return;
      const dir = this.readDirection();
      if (dir) this.tryMove(dir);
    }

    readDirection() {
      if (this.mobileDir) return this.mobileDir;
      if (this.cursors.left.isDown || this.keys.A.isDown) return "left";
      if (this.cursors.right.isDown || this.keys.D.isDown) return "right";
      if (this.cursors.up.isDown || this.keys.W.isDown) return "up";
      if (this.cursors.down.isDown || this.keys.S.isDown) return "down";
      return null;
    }

    tryMove(dir) {
      if (!this.canAct || this.isMoving || activeDialog) return;
      const vec = dirDef[dir];
      this.state.dir = dir;
      this.player.setFrame(frameFor(0, dir));
      const nx = this.state.x + vec.dx;
      const ny = this.state.y + vec.dy;
      const targetKey = key(nx, ny);
      const portal = this.map.doors?.[targetKey] || this.map.exits?.[targetKey];

      if ((blockedTiles.has(tileAt(this.map, nx, ny)) && !portal) || this.npcAt(nx, ny)) {
        this.bump();
        save(this.state);
        return;
      }

      this.isMoving = true;
      this.state.x = nx;
      this.state.y = ny;
      this.tweens.add({
        targets: this.player,
        x: nx * TILE + TILE / 2,
        y: ny * TILE + TILE,
        duration: MOVE_MS,
        ease: "Quad.easeOut",
        onUpdate: () => this.player.setDepth(this.player.y + 28),
        onComplete: () => {
          this.isMoving = false;
          this.nextStepAt = this.time.now + STEP_PAUSE_MS;
          save(this.state);
          if (portal) this.enterPortal(portal);
        }
      });
    }

    bump() {
      this.isMoving = true;
      const vec = dirDef[this.state.dir];
      this.tweens.add({
        targets: this.player,
        x: this.player.x + vec.dx * 4,
        y: this.player.y + vec.dy * 4,
        yoyo: true,
        duration: 48,
        onComplete: () => {
          this.isMoving = false;
          this.nextStepAt = this.time.now + 70;
        }
      });
    }

    enterPortal(portal) {
      this.canAct = false;
      this.mobileDir = null;
      this.cameras.main.fadeOut(130, 8, 14, 12);
      this.time.delayedCall(145, () => {
        this.state = { scene: portal.scene, x: portal.x, y: portal.y, dir: portal.dir || "down" };
        this.loadMap(portal.scene, portal.x, portal.y, portal.dir);
        this.cameras.main.fadeIn(130, 8, 14, 12);
        this.canAct = true;
      });
    }

    interact() {
      if (activeDialog) {
        dialogNext.click();
        return;
      }
      if (!this.canAct || this.isMoving || titleEl && !titleEl.classList.contains("hidden")) return;
      const vec = dirDef[this.state.dir];
      const tx = this.state.x + vec.dx;
      const ty = this.state.y + vec.dy;
      const targetNpc = this.npcAt(tx, ty);
      if (targetNpc) {
        this.canAct = false;
        targetNpc.sprite.setFrame(frameFor(targetNpc.row, opposite(this.state.dir)));
        showDialog(targetNpc.name, targetNpc.lines);
        return;
      }
      const portal = this.map.doors?.[key(tx, ty)] || this.map.exits?.[key(tx, ty)];
      if (portal) {
        this.enterPortal(portal);
        return;
      }
      const sign = this.map.signs?.[key(tx, ty)] || this.map.signs?.[key(this.state.x, this.state.y)];
      if (sign) {
        this.canAct = false;
        showDialog(sign[0], [sign[1]]);
        return;
      }
      this.canAct = false;
      showDialog("Nada", ["Ainda nao ha nada aqui. Este espaco fica reservado para itens, encontros e eventos."]);
    }

    npcAt(x, y) {
      const sprite = this.npcs.find((item) => item.npc.x === x && item.npc.y === y);
      return sprite ? { ...sprite.npc, sprite } : null;
    }
  }

  function opposite(dir) {
    return { up: "down", down: "up", left: "right", right: "left" }[dir] || "down";
  }

  function boot() {
    if (!window.Phaser) {
      document.getElementById("game-canvas").innerHTML = "<div style='padding:20px;color:#fff'>Nao foi possivel carregar Phaser.</div>";
      return;
    }
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game-canvas",
      pixelArt: true,
      backgroundColor: "#14211c",
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: 390,
        height: 620
      },
      scene: ConcordiumScene
    });
  }

  boot();
})();
