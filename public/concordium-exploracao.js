(function () {
  const ROM_URL = "/concordium-exploracao/rom";
  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const LOADER_URL = `${EMULATOR_DATA_URL}loader.js`;
  const overlay = document.getElementById("gba-overlay");
  const startButton = document.getElementById("gba-start");
  const statusEl = document.getElementById("gba-status");
  const panel = document.getElementById("gba-panel");
  const panelToggle = document.getElementById("gba-panel-toggle");
  const panelClose = document.getElementById("gba-panel-close");

  let emulatorLoaded = false;

  panelToggle.addEventListener("click", () => panel.classList.add("open"));
  panelClose.addEventListener("click", () => panel.classList.remove("open"));

  async function romStatus() {
    const response = await fetch("/api/concordium/rom-status", { cache: "no-store" });
    if (!response.ok) throw new Error("Acesso a ROM nao liberado.");
    return response.json();
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function configureEmulator() {
    window.EJS_player = "#game";
    window.EJS_core = "mgba";
    window.EJS_gameUrl = ROM_URL;
    window.EJS_gameName = "Concordium";
    window.EJS_color = "#f1c75d";
    window.EJS_backgroundColor = "#05080b";
    window.EJS_startOnLoaded = false;
    window.EJS_fullscreenOnLoaded = false;
    window.EJS_pathtodata = EMULATOR_DATA_URL;
    window.EJS_biosUrl = "";
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

  async function startEmulator() {
    if (emulatorLoaded) {
      overlay.classList.add("hidden");
      return;
    }
    startButton.disabled = true;
    setStatus("Verificando ROM privada...");
    try {
      const status = await romStatus();
      if (!status.available) {
        setStatus("ROM privada nao instalada neste servidor.");
        startButton.disabled = false;
        return;
      }
      setStatus(`ROM encontrada (${Math.round(status.size / 1024 / 1024)} MB). Carregando core GBA...`);
      configureEmulator();
      await loadScript(LOADER_URL);
      emulatorLoaded = true;
      overlay.classList.add("hidden");
    } catch (error) {
      setStatus(error.message || "Falha ao iniciar o emulador.");
      startButton.disabled = false;
    }
  }

  startButton.addEventListener("click", startEmulator);

  romStatus()
    .then((status) => {
      setStatus(status.available ? "ROM privada pronta. Toque para carregar." : "ROM privada nao instalada neste servidor.");
    })
    .catch(() => setStatus("Digite a senha novamente se a sessao expirou."));
})();
