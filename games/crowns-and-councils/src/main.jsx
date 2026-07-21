import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { io } from 'socket.io-client';
import { crownsApi } from './api.js';
import { CrownsMapStage } from './map/MapStage.js';
import './styles.css';

const MAP_URL = '/assets/crowns-and-councils/data/nuts2-2024-20m-3035.topo.json';
const COLORS = ['#2d6982', '#76505d', '#6d7440', '#805e32', '#4e5d87', '#6a4f74'];

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function MapView({ bootstrap, selectedId, onSelect, onReady }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    let active = true;
    const map = new CrownsMapStage(hostRef.current, { onSelect });
    mapRef.current = map;
    map.init(MAP_URL).then(() => {
      if (!active) return;
      map.update(bootstrap.regions, bootstrap.realm, selectedId);
      onReady(map);
    }).catch(error => onReady(null, error));
    return () => {
      active = false;
      map.destroy();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    mapRef.current?.update(bootstrap.regions, bootstrap.realm, selectedId);
  }, [bootstrap.regions, bootstrap.realm, selectedId]);
  return <div ref={hostRef} class="cc-map-host" />;
}

function RealmModal({ selected, regions, busy, error, onSelect, onSubmit }) {
  const [name, setName] = useState('');
  const [houseName, setHouseName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  return <div class="cc-modal-backdrop">
    <form class="cc-modal cc-parchment" onSubmit={event => {
      event.preventDefault();
      onSubmit({ name, houseName, color, regionId: selected?.id });
    }}>
      <p class="cc-kicker">FUNDAÇÃO DA CASA</p>
      <h1>Erga seu primeiro estandarte</h1>
      <p>Escolha uma região neutra no mapa. Cada governante começa com exatamente um território.</p>
      <div class={`cc-capital-choice ${selected ? 'chosen' : ''}`}>
        <span>Capital inicial</span>
        <strong>{selected ? `${selected.name} · ${selected.countryCode}` : 'Toque em uma região livre'}</strong>
      </div>
      <label>Escolha acessível da capital
        <select value={selected?.id || ''} onChange={event => onSelect(event.currentTarget.value || null)} required>
          <option value="">Selecione uma região neutra</option>
          {regions.filter(region => !region.ownerRealmId && region.status === 'neutral').map(region => <option key={region.id} value={region.id}>{region.name} · {region.countryCode}</option>)}
        </select>
      </label>
      <label>Nome do reino<input value={name} onInput={event => setName(event.currentTarget.value)} maxLength="40" placeholder="Reino de Albor" required /></label>
      <label>Casa governante<input value={houseName} onInput={event => setHouseName(event.currentTarget.value)} maxLength="40" placeholder="Casa de Valença" required /></label>
      <fieldset><legend>Cor do estandarte</legend><div class="cc-color-row">{COLORS.map(item => <button key={item} type="button" aria-label={`Escolher ${item}`} class={color === item ? 'active' : ''} style={{ '--swatch': item }} onClick={() => setColor(item)} />)}</div></fieldset>
      {error ? <div class="cc-error">{error}</div> : null}
      <button class="cc-primary" disabled={!selected || busy}>{busy ? 'Selando juramento...' : 'Fundar reino'}</button>
    </form>
  </div>;
}

function RegionPanel({ region, realm, action, onClaim, busy }) {
  if (!region) return <aside class="cc-region-panel cc-parchment empty"><p class="cc-kicker">MAPA POLÍTICO</p><h2>Escolha uma região</h2><p>Toque no mapa para ver soberania, vizinhos e ordens disponíveis.</p></aside>;
  const owned = region.ownerRealmId === realm?.id;
  const canClaim = Boolean(realm && !region.ownerRealmId && region.isAdjacentToRealm && region.status === 'neutral');
  return <aside class="cc-region-panel cc-parchment">
    <div class="cc-region-heading"><div><p class="cc-kicker">{owned ? 'DOMÍNIO DA COROA' : region.ownerRealmId ? 'REINO ESTRANGEIRO' : 'TERRITÓRIO NEUTRO'}</p><h2>{region.name}</h2><span>{region.countryCode} · NUTS 2 · {region.neighborIds.length} fronteiras</span></div><b class={`cc-seal ${owned ? 'own' : ''}`}>⌘</b></div>
    <dl><div><dt>Desenvolvimento</dt><dd>{region.development}</dd></div><div><dt>Estado</dt><dd>{region.status === 'claiming' ? 'Reivindicação' : owned ? 'Integrada' : 'Neutra'}</dd></div></dl>
    {action ? <div class="cc-order"><span>Ordem em andamento</span><strong>Integração termina {formatTime(action.completesAt)}</strong></div> : null}
    {canClaim ? <button class="cc-primary" onClick={onClaim} disabled={busy}>{busy ? 'Enviando ordem...' : 'Reivindicar território'}</button> : null}
    {!canClaim && !owned && !region.ownerRealmId && region.status === 'neutral' && !region.isAdjacentToRealm ? <p class="cc-muted">A região precisa compartilhar fronteira com seu reino.</p> : null}
  </aside>;
}

function App() {
  const [bootstrap, setBootstrap] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mapController, setMapController] = useState(null);
  const [online, setOnline] = useState(false);

  const refresh = useCallback(async () => {
    const data = await crownsApi.bootstrap();
    setBootstrap(data);
    setSelectedId(current => current || data.realm?.capitalRegionId || null);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch(err => setError(err.message));
  }, [refresh]);

  useEffect(() => {
    const socket = io('/crowns-and-councils', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setOnline(true));
    socket.on('disconnect', () => setOnline(false));
    socket.on('world.patch', () => refresh().catch(() => {}));
    socket.on('action.completed', () => refresh().catch(() => {}));
    return () => socket.disconnect();
  }, [refresh]);

  const selected = useMemo(() => bootstrap?.regions.find(item => item.id === selectedId) || null, [bootstrap, selectedId]);
  const selectedAction = useMemo(() => bootstrap?.actions.find(item => item.regionId === selectedId && item.status === 'pending') || null, [bootstrap, selectedId]);

  async function execute(action) {
    setBusy(true);
    setError('');
    try { await action(); await refresh(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (!bootstrap) return <main class="cc-loading"><div class="cc-crown">♔</div><p>{error || 'Convocando o conselho...'}</p><a href="/">Voltar ao Game Hub</a></main>;

  return <main class="cc-shell">
    <header class="cc-topbar">
      <a class="cc-brand" href="/"><span class="cc-crown">♔</span><span><small>CROWNS AND</small><strong>COUNCILS</strong></span></a>
      <div class="cc-season"><small>{bootstrap.season.name}</small><strong>{bootstrap.season.statusLabel}</strong></div>
      <div class="cc-resources"><span><small>OURO</small><b>{bootstrap.realm?.treasury ?? 0}</b></span><span><small>PROVISÕES</small><b>{bootstrap.realm?.provisions ?? 0}</b></span><span><small>PRESTÍGIO</small><b>{bootstrap.realm?.prestige ?? 0}</b></span></div>
      <div class={`cc-online ${online ? 'connected' : ''}`}><i />{online ? 'Online' : 'Reconectando'}</div>
    </header>
    <section class="cc-stage">
      <MapView bootstrap={bootstrap} selectedId={selectedId} onSelect={setSelectedId} onReady={(controller, err) => { setMapController(controller); if (err) setError(err.message); }} />
      <div class="cc-map-title"><small>MAPA POLÍTICO</small><strong>{bootstrap.realm?.name || 'Europa sem coroas'}</strong></div>
      <div class="cc-zoom"><button onClick={() => mapController?.zoomIn()} aria-label="Aproximar">+</button><button onClick={() => mapController?.zoomOut()} aria-label="Afastar">−</button><button onClick={() => mapController?.fit()} aria-label="Centralizar">⌂</button></div>
      <RegionPanel region={selected} realm={bootstrap.realm} action={selectedAction} busy={busy} onClaim={() => execute(() => crownsApi.claimTerritory(selected.id))} />
      {error && bootstrap.realm ? <button class="cc-toast" onClick={() => setError('')}>{error}<span>×</span></button> : null}
    </section>
    <nav class="cc-bottom-nav" aria-label="Seções do reino">
      <button class="active"><span>♜</span>Mapa</button><button><span>♛</span>Reino</button><button><span>♙</span>Dinastia<small>próximo marco</small></button><button><span>⚖</span>Diplomacia<small>próximo marco</small></button><button><span>✠</span>Concílios<small>próximo marco</small></button>
    </nav>
    {!bootstrap.realm ? <RealmModal selected={selected?.ownerRealmId ? null : selected} regions={bootstrap.regions} busy={busy} error={error} onSelect={setSelectedId} onSubmit={payload => execute(() => crownsApi.createRealm(payload))} /> : null}
  </main>;
}

const appRoot = document.getElementById('app');
appRoot.replaceChildren();
render(<App />, appRoot);
