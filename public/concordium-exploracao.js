(function () {
  const TILE = 32;
  const SAVE_KEY = "concordium-exploracao-prototype-v2";
  const placeEl = document.getElementById("pk-place");
  const dialogEl = document.getElementById("dialog");
  const dialogNameEl = document.getElementById("dialog-name");
  const dialogTextEl = document.getElementById("dialog-text");
  const dialogNext = document.getElementById("dialog-next");
  const MOVE_DURATION = 122;

  const tileFrames = {
    G: 0, g: 1, P: 2, W: 3, T: 4, L: 5, R: 6, H: 7,
    D: 8, F: 9, I: 10, B: 11, S: 12, A: 13, M: 14, X: 15
  };

  const blocked = new Set(["W", "T", "L", "R", "H", "I", "B", "S", "X"]);
  const sceneData = {
    vila: {
      title: "Vila Prisma",
      backgroundKey: "vila-map",
      width: 30,
      height: 30,
      spawn: { x: 14, y: 14, dir: "down" },
      rows: [
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTTTTTGGGGGGGGGGGGGGGTTTT",
        "TTGGGBBBBBBGGGGGGGGGWWWWWWGGTT",
        "TTGGGBBBBBBGBBBBBBGGWWWWWWGGTT",
        "TTGGGBBBBBBGBBBBBBGGWWWWWWGGTT",
        "TTGGGBBBBBBGBBBBBBGGWWWWWWGGTT",
        "TTGGGBBGBBBSBBBBBBGGWWWWWWGGTT",
        "TTGGGGGGGGGGBBGBBBGGWWWWWWGGTT",
        "TGGGGGGGGGGGGGGGGSGGGGGGGGGGGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGBBBBGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGBBBBGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGBBBBGT",
        "TGGGGGGGGGGGGGGGGGSGGGGGBBBBGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGSGGGGT",
        "TGWWWWWWGGGGGGGGGGGBBBBGGGGGGT",
        "TGWWWWWWGBBBBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGBBBBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGBBBBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGBBGBBGGGGGGGGGGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGGGGGGGGGGGT",
        "TGWWWWWWGGGGGGGGGGGGGGGGGGGGGT",
        "TGWWWWWWGGGGGGGGBBBBBGGGGGGGGT",
        "TGWWWWWWGGGGGGGGBBBBBGGGGGGGGT",
        "TTWWWWWWGGGGGGGGBBBBBGGGGGGGTT",
        "TTGGGGGGGGGGGGGGBGBBBGGGGGGGTT",
        "TTGGGGGGGGGGGGGGGGGGGGGGGGGGTT",
        "TTGGGGGGGGGGGGGGGGGGGGGGGGGGTT",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
      ],
      doors: {
        "5,6": { scene: "casa", x: 7, y: 9, dir: "up", returnTarget: { scene: "vila", x: 5, y: 7, dir: "down" } },
        "15,8": { scene: "laboratorio", x: 7, y: 9, dir: "up", returnTarget: { scene: "vila", x: 15, y: 9, dir: "down" } },
        "25,11": { scene: "casa", x: 7, y: 9, dir: "up", returnTarget: { scene: "vila", x: 25, y: 12, dir: "down" } },
        "20,16": { scene: "casa", x: 7, y: 9, dir: "up", returnTarget: { scene: "vila", x: 20, y: 17, dir: "down" } },
        "10,20": { scene: "casa", x: 7, y: 9, dir: "up", returnTarget: { scene: "vila", x: 10, y: 21, dir: "down" } },
        "20,24": { scene: "casa", x: 7, y: 9, dir: "up", returnTarget: { scene: "vila", x: 20, y: 25, dir: "down" } }
      },
      signs: {
        "11,6": ["Placa", "Vila Prisma. As texturas agora foram recortadas do mapa GBA recuperado."],
        "17,8": ["Placa", "Laboratorio Concordium. Entre pela porta central."],
        "18,12": ["Placa", "Centro da vila. Segure a tecla para caminhar continuamente."],
        "24,15": ["Placa", "As casas so abrem pelo tile exato da porta."]
      },
      npcs: [
        {
          id: "mentor", name: "Prof. Aureo", x: 14, y: 14, dir: "down", frameRow: 1,
          lines: [
            "Agora sim: a vila usa o mapa recortado da ROM como base visual, sem telhado montado no improviso.",
            "As portas estao em tiles exatos. O bloco ao lado nao entra mais."
          ]
        },
        {
          id: "guarda", name: "Guarda Lia", x: 20, y: 18, dir: "left", frameRow: 2,
          lines: [
            "A agua e as arvores bloqueiam o caminho. A trilha e livre.",
            "Segure WASD ou as setas para caminhar sem ficar apertando varias vezes."
          ]
        }
      ]
    },
    laboratorio: {
      title: "Laboratorio de Assets",
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
        "XIIIIIIIDIIIIIIX",
        "XXXXXXXXXXXXXXXX"
      ],
      exits: {
        "7,10": { scene: "vila", x: 15, y: 9, dir: "down" }
      },
      signs: {
        "7,8": ["Mesa de trabalho", "Amostras LZ77, paletas candidatas e sprites estao catalogados para virar o atlas final."]
      },
      npcs: [
        {
          id: "tecnico", name: "Tecnico Nilo", x: 11, y: 6, dir: "left", frameRow: 3,
          lines: [
            "Eu montei um atlas pequeno para nao pesar o hub. Depois podemos substituir cada tile por frames exatos da ROM.",
            "As casas ja usam troca de mapa. O proximo passo natural e inventario, encontros e batalha."
          ]
        }
      ]
    },
    casa: {
      title: "Casa de Pedra Clara",
      spawn: { x: 7, y: 9, dir: "up" },
      rows: [
        "XXXXXXXXXXXXXXXX",
        "XIIIIIIIIIIIIIIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFFBBBBFFFFIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFFFMFFFFFFIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFBFFFFFFBFFIX",
        "XIFFFFFFFFFFFFIX",
        "XIFFFFFMMMFFFFIX",
        "XIIIIIIIDIIIIIIX",
        "XXXXXXXXXXXXXXXX"
      ],
      exits: {
        "7,10": { scene: "vila", x: 5, y: 7, dir: "down" }
      },
      signs: {
        "7,9": ["Tapete", "Voce sente o cheiro de madeira velha e tinta fresca. A transicao casa/rua esta funcionando."]
      },
      npcs: [
        {
          id: "moradora", name: "Marta", x: 5, y: 7, dir: "right", frameRow: 1,
          lines: [
            "Bem-vindo. Ainda e so uma vila pequena, mas ja da para testar conversa, porta e colisao.",
            "Capricha depois nos bichinhos, viu? Uma jornada dessas pede companheiros memoraveis."
          ]
        }
      ]
    }
  };

  const directions = {
    down: { dx: 0, dy: 1, frame: 0 },
    left: { dx: -1, dy: 0, frame: 1 },
    right: { dx: 1, dy: 0, frame: 2 },
    up: { dx: 0, dy: -1, frame: 3 }
  };

  let gameScene;
  let currentDialog = null;
  let dialogIndex = 0;

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (saved && sceneData[saved.scene]) return saved;
    } catch (_) {}
    return { scene: "vila", ...sceneData.vila.spawn };
  }

  function saveState(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function openDialog(name, lines) {
    currentDialog = { name, lines };
    dialogIndex = 0;
    dialogNameEl.textContent = name;
    dialogTextEl.textContent = lines[0];
    dialogEl.classList.remove("hidden");
  }

  function closeDialog() {
    currentDialog = null;
    dialogEl.classList.add("hidden");
    if (gameScene) gameScene.canAct = true;
  }

  dialogNext.addEventListener("click", () => {
    if (!currentDialog) return;
    dialogIndex += 1;
    if (dialogIndex >= currentDialog.lines.length) {
      closeDialog();
      return;
    }
    dialogTextEl.textContent = currentDialog.lines[dialogIndex];
  });

  function tileAt(data, x, y) {
    if (!data.rows[y] || x < 0 || x >= data.rows[y].length) return "X";
    return data.rows[y][x];
  }

  function keyFor(x, y) {
    return `${x},${y}`;
  }

  function faceFrame(row, dir) {
    return row * 4 + directions[dir].frame;
  }

  class JornadaScene extends Phaser.Scene {
    constructor() {
      super("jornada");
      this.state = loadSave();
      this.canAct = true;
      this.isMoving = false;
      this.returnTarget = this.state.scene === "vila" ? null : this.state.returnTarget || null;
      this.heldMobileDir = null;
      this.nextMoveAt = 0;
      this.npcSprites = [];
    }

    preload() {
      this.load.image("vila-map", "/assets/concordium-vila-prisma-map-v2.png?v=20260614e");
      this.load.spritesheet("tiles", "/assets/concordium-indoor-tiles-v2.png?v=20260614e", { frameWidth: 16, frameHeight: 16 });
      this.load.spritesheet("chars", "/assets/concordium-characters-v2.png?v=20260614e", { frameWidth: 24, frameHeight: 32 });
    }

    create() {
      gameScene = this;
      this.tileLayer = this.add.group();
      this.objectLayer = this.add.group();
      this.player = this.add.sprite(0, 0, "chars", faceFrame(0, this.state.dir)).setOrigin(.5, 1);
      this.player.setScale(1.35);
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,A,S,D,E,SPACE");
      this.renderScene(this.state.scene);
      this.setupMobile();
      this.input.keyboard.on("keydown-SPACE", () => this.interact());
      this.input.keyboard.on("keydown-E", () => this.interact());
    }

    setupMobile() {
      const release = (dir) => {
        if (!dir || this.heldMobileDir === dir) this.heldMobileDir = null;
      };
      document.querySelectorAll("[data-move]").forEach((button) => {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.heldMobileDir = button.dataset.move;
          this.tryMove(this.heldMobileDir);
        });
        button.addEventListener("pointerup", () => release(button.dataset.move));
        button.addEventListener("pointerleave", () => release(button.dataset.move));
        button.addEventListener("pointercancel", () => release(button.dataset.move));
      });
      window.addEventListener("pointerup", () => release());
      window.addEventListener("blur", () => release());
      document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("pointerdown", () => this.interact());
      });
    }

    renderScene(sceneId) {
      this.state.scene = sceneId;
      this.data = sceneData[sceneId];
      placeEl.textContent = this.data.title;
      this.tileLayer.clear(true, true);
      this.objectLayer.clear(true, true);
      this.npcSprites = [];

      if (this.data.backgroundKey) {
        const bg = this.add.image(0, 0, this.data.backgroundKey).setOrigin(0, 0);
        bg.setDisplaySize(this.data.width * TILE, this.data.height * TILE);
        this.tileLayer.add(bg);
      } else {
        this.data.rows.forEach((row, y) => {
          [...row].forEach((code, x) => {
            const frame = tileFrames[code] ?? 0;
            const tile = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tiles", frame);
            tile.setDisplaySize(TILE, TILE);
            this.tileLayer.add(tile);
          });
        });
      }

      this.data.npcs.forEach((npc) => {
        const sprite = this.add.sprite(npc.x * TILE + TILE / 2, npc.y * TILE + TILE, "chars", faceFrame(npc.frameRow, npc.dir));
        sprite.setScale(1.35).setOrigin(.5, 1).setDepth(npc.y * TILE + 20);
        sprite.npc = npc;
        this.objectLayer.add(sprite);
        this.npcSprites.push(sprite);
      });

      this.placePlayer(this.state.x, this.state.y, this.state.dir);
      const worldWidth = (this.data.width || this.data.rows[0].length) * TILE;
      const worldHeight = (this.data.height || this.data.rows.length) * TILE;
      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
      this.cameras.main.startFollow(this.player, true, .16, .16);
      this.cameras.main.setZoom(1.75);
      saveState(this.state);
    }

    placePlayer(x, y, dir) {
      this.state.x = x;
      this.state.y = y;
      this.state.dir = dir || this.state.dir || "down";
      this.player.setFrame(faceFrame(0, this.state.dir));
      this.player.setPosition(x * TILE + TILE / 2, y * TILE + TILE);
      this.player.setDepth(y * TILE + 30);
    }

    update(time) {
      if (!this.canAct || this.isMoving || currentDialog) return;
      if (time < this.nextMoveAt) return;
      const dir = this.currentMoveDir();
      if (dir) this.tryMove(dir);
    }

    currentMoveDir() {
      if (this.heldMobileDir) return this.heldMobileDir;
      if (this.cursors.left.isDown || this.keys.A.isDown) return "left";
      if (this.cursors.right.isDown || this.keys.D.isDown) return "right";
      if (this.cursors.up.isDown || this.keys.W.isDown) return "up";
      if (this.cursors.down.isDown || this.keys.S.isDown) return "down";
      return null;
    }

    tryMove(dir) {
      if (!this.canAct || this.isMoving || currentDialog) return;
      const vec = directions[dir];
      this.state.dir = dir;
      this.player.setFrame(faceFrame(0, dir));
      const nx = this.state.x + vec.dx;
      const ny = this.state.y + vec.dy;
      const target = tileAt(this.data, nx, ny);
      const targetKey = keyFor(nx, ny);
      const portal = this.data.doors?.[targetKey] || this.data.exits?.[targetKey];
      if ((blocked.has(target) && !portal) || this.npcAt(nx, ny)) {
        this.bump();
        saveState(this.state);
        return;
      }
      this.isMoving = true;
      this.state.x = nx;
      this.state.y = ny;
      this.tweens.add({
        targets: this.player,
        x: nx * TILE + TILE / 2,
        y: ny * TILE + TILE,
        duration: MOVE_DURATION,
        ease: "Quad.easeOut",
        onUpdate: () => this.player.setDepth(this.player.y + 30),
        onComplete: () => {
          this.isMoving = false;
          this.nextMoveAt = this.time.now + 12;
          this.handleTileTrigger(nx, ny);
          saveState(this.state);
        }
      });
    }

    bump() {
      this.isMoving = true;
      this.tweens.add({
        targets: this.player,
        x: this.player.x + directions[this.state.dir].dx * 4,
        y: this.player.y + directions[this.state.dir].dy * 4,
        yoyo: true,
        duration: 45,
        repeat: 0,
        onComplete: () => {
          this.isMoving = false;
          this.nextMoveAt = this.time.now + 85;
        }
      });
    }

    handleTileTrigger(x, y) {
      const key = keyFor(x, y);
      const exit = this.data.exits?.[key];
      let target = this.data.doors?.[key] || exit;
      if (!target) return;
      if (exit && this.returnTarget) target = this.returnTarget;
      const nextReturnTarget = target.returnTarget || null;
      const shouldClearReturn = Boolean(exit) && target.scene === "vila";
      this.canAct = false;
      this.cameras.main.fadeOut(180, 12, 18, 22);
      this.time.delayedCall(190, () => {
        this.state = { scene: target.scene, x: target.x, y: target.y, dir: target.dir };
        this.returnTarget = shouldClearReturn ? null : nextReturnTarget;
        if (this.returnTarget) this.state.returnTarget = this.returnTarget;
        this.renderScene(target.scene);
        this.cameras.main.fadeIn(180, 12, 18, 22);
        this.canAct = true;
      });
    }

    interact() {
      if (!this.canAct || this.isMoving) return;
      if (currentDialog) {
        dialogNext.click();
        return;
      }
      const vec = directions[this.state.dir];
      const tx = this.state.x + vec.dx;
      const ty = this.state.y + vec.dy;
      const npc = this.npcAt(tx, ty);
      if (npc) {
        this.canAct = false;
        npc.sprite.setFrame(faceFrame(npc.frameRow, this.oppositeDir(this.state.dir)));
        openDialog(npc.name, npc.lines);
        return;
      }
      const sign = this.data.signs?.[keyFor(tx, ty)] || this.data.signs?.[keyFor(this.state.x, this.state.y)];
      const door = this.data.doors?.[keyFor(tx, ty)] || this.data.exits?.[keyFor(tx, ty)];
      if (door) {
        this.handleTileTrigger(tx, ty);
        return;
      }
      if (sign) {
        this.canAct = false;
        openDialog(sign[0], [sign[1]]);
        return;
      }
      this.canAct = false;
      openDialog("Silencio", ["Nada especial aqui ainda. Esse espaco fica reservado para encontros, itens e segredos."]);
    }

    npcAt(x, y) {
      const sprite = this.npcSprites.find((item) => item.npc.x === x && item.npc.y === y);
      if (!sprite) return null;
      return { ...sprite.npc, sprite };
    }

    oppositeDir(dir) {
      return { up: "down", down: "up", left: "right", right: "left" }[dir] || "down";
    }
  }

  function boot() {
    if (!window.Phaser) {
      document.getElementById("game-canvas").innerHTML = "<div style='padding:20px;color:#fff'>Nao foi possivel carregar o Phaser pela CDN.</div>";
      return;
    }
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game-canvas",
      pixelArt: true,
      backgroundColor: "#16221c",
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: 960,
        height: 640
      },
      scene: JornadaScene
    });
  }

  boot();
})();
