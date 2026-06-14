(function () {
  const TILE = 32;
  const SAVE_KEY = "concordium-exploracao-prototype-v1";
  const placeEl = document.getElementById("pk-place");
  const dialogEl = document.getElementById("dialog");
  const dialogNameEl = document.getElementById("dialog-name");
  const dialogTextEl = document.getElementById("dialog-text");
  const dialogNext = document.getElementById("dialog-next");

  const tileFrames = {
    G: 0, g: 1, P: 2, W: 3, T: 4, L: 5, R: 6, H: 7,
    D: 8, F: 9, I: 10, B: 11, S: 12, A: 13, M: 14, X: 15
  };

  const blocked = new Set(["W", "T", "L", "R", "H", "I", "B", "S", "X"]);
  const sceneData = {
    vila: {
      title: "Vila Prisma",
      spawn: { x: 13, y: 13, dir: "up" },
      rows: [
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TGGGGGGGGGGGGGGGGGGGGGGGGGGT",
        "TGGGAAAAAAGGGGGGGGGAAAAAAGGT",
        "TGGAGGGGGAGGGGGGGGGAGGGGGAGT",
        "TGGAGRRRRRAGGGGGGRRRRRAGGAGT",
        "TGGAGRRRRRAGGGGGGRRRRRAGGAGT",
        "TGGAGHHHHHAPPPPPPAHHHHHAGGGT",
        "TGGAGHHDHHAPGGGGPAHHDHHAGGGT",
        "TGGAGGGGGGAPGGGGPAAGGGGAGGGT",
        "TGGAAAAAAAAPGGGGPPPPPPPAAAGT",
        "TGGGGGGGGGPPPPPPPPGGGGGGGGGT",
        "TGGGGGSgggPPGGGGPPgggSGGGGGT",
        "TGGGGGGgggPPGGGGPPgggGGGGGGT",
        "TGGGGGGGGGPPGGGGPPGGGGGGGGGT",
        "TWWWWGGGGGPPGGGGPPGGGGGWWWGT",
        "TWWWWGGGGGPPGGGGPPGGGGGWWWGT",
        "TGGGGGGGGGPPGGGGPPGGGGGGGGGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGGGGT",
        "TGGGGGGGGGGGGGGGGGGGGGGGGGGT",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTT"
      ],
      doors: {
        "6,7": { scene: "laboratorio", x: 7, y: 9, dir: "up" },
        "7,7": { scene: "laboratorio", x: 7, y: 9, dir: "up" },
        "8,7": { scene: "laboratorio", x: 7, y: 9, dir: "up" },
        "6,8": { scene: "laboratorio", x: 7, y: 9, dir: "up" },
        "7,8": { scene: "laboratorio", x: 7, y: 9, dir: "up" },
        "8,8": { scene: "laboratorio", x: 7, y: 9, dir: "up" },
        "19,7": { scene: "casa", x: 7, y: 9, dir: "up" },
        "20,7": { scene: "casa", x: 7, y: 9, dir: "up" },
        "21,7": { scene: "casa", x: 7, y: 9, dir: "up" },
        "19,8": { scene: "casa", x: 7, y: 9, dir: "up" },
        "20,8": { scene: "casa", x: 7, y: 9, dir: "up" },
        "21,8": { scene: "casa", x: 7, y: 9, dir: "up" }
      },
      signs: {
        "6,11": ["Placa", "Laboratorio de testes. Aqui os assets recuperados estao sendo montados de novo."],
        "20,11": ["Placa", "Casa de Pedra Clara. Entre para testar colisao interna e saida."]
      },
      npcs: [
        {
          id: "mentor", name: "Prof. Aureo", x: 14, y: 10, dir: "left", frameRow: 1,
          lines: [
            "Esses tiles vieram da sua ROM recuperada. Ainda estamos lapidando as paletas, mas o mapa ja respira.",
            "Teste andar nas bordas, falar com placas e entrar nas casas. Se algo travar, eu ajusto a fisica."
          ]
        },
        {
          id: "guarda", name: "Guarda Lia", x: 22, y: 13, dir: "down", frameRow: 2,
          lines: [
            "A agua e as arvores bloqueiam o caminho. A trilha e livre.",
            "Quando tivermos batalha e captura, esta rota pode virar a primeira estrada."
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
        "6,9": { scene: "vila", x: 7, y: 8, dir: "down" },
        "7,9": { scene: "vila", x: 7, y: 8, dir: "down" },
        "8,9": { scene: "vila", x: 7, y: 8, dir: "down" },
        "6,10": { scene: "vila", x: 7, y: 8, dir: "down" },
        "7,10": { scene: "vila", x: 7, y: 8, dir: "down" },
        "8,10": { scene: "vila", x: 7, y: 8, dir: "down" }
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
        "6,9": { scene: "vila", x: 20, y: 8, dir: "down" },
        "7,9": { scene: "vila", x: 20, y: 8, dir: "down" },
        "8,9": { scene: "vila", x: 20, y: 8, dir: "down" },
        "6,10": { scene: "vila", x: 20, y: 8, dir: "down" },
        "7,10": { scene: "vila", x: 20, y: 8, dir: "down" },
        "8,10": { scene: "vila", x: 20, y: 8, dir: "down" }
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
      this.npcSprites = [];
    }

    preload() {
      this.load.spritesheet("tiles", "/assets/concordium-exploracao-tiles.png", { frameWidth: 16, frameHeight: 16 });
      this.load.spritesheet("chars", "/assets/concordium-exploracao-characters.png", { frameWidth: 24, frameHeight: 32 });
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
      document.querySelectorAll("[data-move]").forEach((button) => {
        button.addEventListener("pointerdown", () => this.tryMove(button.dataset.move));
      });
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

      this.data.rows.forEach((row, y) => {
        [...row].forEach((code, x) => {
          const frame = tileFrames[code] ?? 0;
          const tile = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, "tiles", frame);
          tile.setDisplaySize(TILE, TILE);
          this.tileLayer.add(tile);
        });
      });

      this.data.npcs.forEach((npc) => {
        const sprite = this.add.sprite(npc.x * TILE + TILE / 2, npc.y * TILE + TILE, "chars", faceFrame(npc.frameRow, npc.dir));
        sprite.setScale(1.35).setOrigin(.5, 1).setDepth(npc.y * TILE + 20);
        sprite.npc = npc;
        this.objectLayer.add(sprite);
        this.npcSprites.push(sprite);
      });

      this.placePlayer(this.state.x, this.state.y, this.state.dir);
      this.cameras.main.setBounds(0, 0, this.data.rows[0].length * TILE, this.data.rows.length * TILE);
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

    update() {
      if (!this.canAct || this.isMoving || currentDialog) return;
      if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)) this.tryMove("left");
      else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)) this.tryMove("right");
      else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W)) this.tryMove("up");
      else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keys.S)) this.tryMove("down");
    }

    tryMove(dir) {
      if (!this.canAct || this.isMoving || currentDialog) return;
      const vec = directions[dir];
      this.state.dir = dir;
      this.player.setFrame(faceFrame(0, dir));
      const nx = this.state.x + vec.dx;
      const ny = this.state.y + vec.dy;
      const target = tileAt(this.data, nx, ny);
      if (blocked.has(target) || this.npcAt(nx, ny)) {
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
        duration: 125,
        ease: "Quad.easeOut",
        onUpdate: () => this.player.setDepth(this.player.y + 30),
        onComplete: () => {
          this.isMoving = false;
          this.handleTileTrigger(nx, ny);
          saveState(this.state);
        }
      });
    }

    bump() {
      this.tweens.add({
        targets: this.player,
        x: this.player.x + directions[this.state.dir].dx * 4,
        y: this.player.y + directions[this.state.dir].dy * 4,
        yoyo: true,
        duration: 45,
        repeat: 0
      });
    }

    handleTileTrigger(x, y) {
      const target = this.data.doors?.[keyFor(x, y)] || this.data.exits?.[keyFor(x, y)];
      if (!target) return;
      this.canAct = false;
      this.cameras.main.fadeOut(180, 12, 18, 22);
      this.time.delayedCall(190, () => {
        this.state = { scene: target.scene, x: target.x, y: target.y, dir: target.dir };
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
