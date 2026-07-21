import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { io } from 'socket.io-client';
import { crownsApi } from './api.js';
import { CrownsMapStage } from './map/MapStage.js';
import './styles.css';

const NAV_ITEMS = [
  { id: 'map', icon: '♜', label: 'Mapa' },
  { id: 'realm', icon: '♛', label: 'Reino' },
  { id: 'journal', icon: '🕮', label: 'Jornal' }
];
const REALM_TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'dynasty', label: 'Dinastia' },
  { id: 'diplomacy', label: 'Diplomacia' },
  { id: 'internal', label: 'Assuntos internos' }
];
const CATEGORY_LABELS = {
  gazette: 'Edição diária', realm: 'Novo reino', campaign: 'Campanha', war: 'Guerra', peace: 'Paz',
  alliance: 'Aliança', marriage: 'Casamento', revolution: 'Revolução', article: 'Artigo dos jogadores', world: 'Mundo'
};

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
    map.init(bootstrap.map.topologyUrl).then(() => {
      if (!active) return;
      map.update(bootstrap.regions, bootstrap.realm, selectedId);
      onReady(map);
    }).catch(error => onReady(null, error));
    return () => { active = false; map.destroy(); mapRef.current = null; };
  }, []);
  useEffect(() => { mapRef.current?.update(bootstrap.regions, bootstrap.realm, selectedId); }, [bootstrap.regions, bootstrap.realm, selectedId]);
  return <div ref={hostRef} class="cc-map-host" />;
}

function RealmModal({ selected, regions, colors, busy, error, onSelect, onSubmit }) {
  const [name, setName] = useState('');
  const [houseName, setHouseName] = useState('');
  const [color, setColor] = useState(colors[0] || '#df5f98');
  useEffect(() => { if (!colors.includes(color) && colors[0]) setColor(colors[0]); }, [colors, color]);
  return <div class="cc-modal-backdrop">
    <form class="cc-modal cc-parchment" onSubmit={event => { event.preventDefault(); onSubmit({ name, houseName, color, regionId: selected?.id }); }}>
      <p class="cc-kicker">FUNDAÇÃO DA CASA</p>
      <h1>Erga seu primeiro estandarte</h1>
      <p>Dez coroas controladas pela IA já disputam o mundo. Escolha uma região livre e estabeleça a sua casa.</p>
      <div class={`cc-capital-choice ${selected ? 'chosen' : ''}`}><span>Capital inicial</span><strong>{selected ? `${selected.name} · ${selected.countryName}` : 'Toque em uma região livre'}</strong></div>
      <label>Escolha acessível da capital
        <select value={selected?.id || ''} onChange={event => onSelect(event.currentTarget.value || null)} required>
          <option value="">Selecione uma região neutra</option>
          {regions.filter(region => !region.ownerRealmId && region.status === 'neutral').map(region => <option key={region.id} value={region.id}>{region.name} · {region.countryName}</option>)}
        </select>
      </label>
      <label>Nome do reino<input value={name} onInput={event => setName(event.currentTarget.value)} maxLength="40" placeholder="Reino de Albor" required /></label>
      <label>Casa governante<input value={houseName} onInput={event => setHouseName(event.currentTarget.value)} maxLength="40" placeholder="Casa de Valença" required /></label>
      <fieldset><legend>Cor exclusiva do estandarte</legend><div class="cc-color-row">{colors.map(item => <button key={item} type="button" aria-label={`Escolher cor ${item}`} class={color === item ? 'active' : ''} style={{ '--swatch': item }} onClick={() => setColor(item)} />)}</div></fieldset>
      {error ? <div class="cc-error">{error}</div> : null}
      <button class="cc-primary" disabled={!selected || busy || !colors.length}>{busy ? 'Selando juramento...' : 'Fundar reino'}</button>
    </form>
  </div>;
}

function RegionPanel({ region, realm, action, nextClaim, onClaim, onShowNext, busy }) {
  if (!region) return <aside class="cc-region-panel cc-parchment empty"><p class="cc-kicker">MAPA POLÍTICO</p><h2>Escolha uma região</h2><p>Toque no mapa para ver soberania, fronteiras e rotas marítimas.</p></aside>;
  const owned = region.ownerRealmId === realm?.id;
  const canClaim = Boolean(realm && !region.ownerRealmId && region.isAdjacentToRealm && region.status === 'neutral');
  const domainLabel = owned ? 'DOMÍNIO DA COROA' : region.ownerRealmId ? (region.ownerIsAi ? 'REINO CONTROLADO PELA IA' : 'REINO ESTRANGEIRO') : 'TERRITÓRIO NEUTRO';
  return <aside class="cc-region-panel cc-parchment">
    <div class="cc-region-heading"><div><p class="cc-kicker">{domainLabel}</p><h2>{region.name}</h2><span>{region.countryName} · {region.levelLabel}</span>{region.ownerName && !owned ? <strong class="cc-owner-name">{region.ownerName}</strong> : null}</div><b class={`cc-seal ${owned ? 'own' : ''}`}>⌘</b></div>
    <dl><div><dt>Desenvolvimento</dt><dd>{region.development}</dd></div><div><dt>Conexões</dt><dd>{region.neighborIds.length}</dd></div></dl>
    {region.routeNeighborIds?.length ? <p class="cc-route-note">⛵ {region.routeNeighborIds.length} {region.routeNeighborIds.length === 1 ? 'rota marítima' : 'rotas marítimas'} disponível(is)</p> : null}
    {action ? <div class="cc-order"><span>Ordem em andamento</span><strong>Integração termina {formatTime(action.completesAt)}</strong></div> : null}
    {canClaim ? <button class="cc-primary" onClick={onClaim} disabled={busy}>{busy ? 'Enviando ordem...' : 'Reivindicar território'}</button> : null}
    {owned && nextClaim ? <button class="cc-secondary" onClick={onShowNext}>Ver próxima região disponível</button> : null}
    {!canClaim && !owned && !region.ownerRealmId && region.status === 'neutral' && !region.isAdjacentToRealm ? <p class="cc-muted">Seu reino ainda não possui fronteira terrestre ou rota marítima até esta região.</p> : null}
  </aside>;
}

function Meter({ label, value, danger = false }) {
  return <div class={`cc-meter ${danger ? 'danger' : ''}`}><div><span>{label}</span><strong>{value}%</strong></div><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div>;
}

function RealmSection({ bootstrap, onGoMap }) {
  const [tab, setTab] = useState('overview');
  const realm = bootstrap.realm;
  if (!realm) return <section class="cc-realm-board cc-parchment"><p class="cc-kicker">SALA DO TRONO</p><h1>Nenhuma coroa foi erguida</h1><p>Volte ao mapa e escolha uma capital para fundar seu reino.</p><button class="cc-primary" onClick={() => onGoMap()}>Escolher capital</button></section>;
  const capital = bootstrap.regions.find(region => region.id === realm.capitalRegionId);
  const frontier = bootstrap.regions.find(region => region.isAdjacentToRealm && !region.ownerRealmId && region.status === 'neutral');
  const court = realm.court;
  return <section class="cc-realm-board cc-parchment">
    <header class="cc-realm-header"><div><p class="cc-kicker">GOVERNO DA COROA</p><h1>{realm.name}</h1><p>{realm.houseName} · capital em {capital?.name || 'local não registrado'}</p></div><div class="cc-realm-world"><strong>{bootstrap.world.aiRealmCount}</strong><span>reinos de IA</span></div></header>
    <nav class="cc-realm-tabs" aria-label="Áreas do governo">{REALM_TABS.map(item => <button key={item.id} class={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    <div class="cc-realm-content">
      {tab === 'overview' ? <div class="cc-government-overview">
        <div class="cc-stat-grid"><div><span>Domínio</span><strong>{realm.regionCount} {realm.regionCount === 1 ? 'região' : 'regiões'}</strong></div><div><span>Prestígio</span><strong>{realm.prestige}</strong></div><div><span>Tesouro</span><strong>{realm.treasury}</strong></div><div><span>Provisões</span><strong>{realm.provisions}</strong></div></div>
        <div class="cc-government-summary"><article><span>Dinastia</span><strong>{court.dynasty.rulerName}</strong><small>Herdeiro: {court.dynasty.heirName}</small></article><article><span>Diplomacia</span><strong>{court.diplomacy.knownRealms.length} coroas conhecidas</strong><small>{court.diplomacy.aiRealmCount} controladas pela IA</small></article><article><span>Assuntos internos</span><strong>{court.internal.stability}% de estabilidade</strong><small>Risco separatista: {court.internal.separatistRisk}%</small></article></div>
        <div class="cc-section-actions"><button class="cc-primary" onClick={() => onGoMap(capital?.id)}>Mostrar capital</button>{frontier ? <button class="cc-secondary" onClick={() => onGoMap(frontier.id)}>Abrir fronteira disponível</button> : null}</div>
      </div> : null}
      {tab === 'dynasty' ? <div class="cc-government-panel"><p class="cc-kicker">LIVRO DA CASA</p><h2>{court.dynasty.houseName}</h2><div class="cc-court-list"><article><span>Governante</span><strong>{court.dynasty.rulerName}</strong></article><article><span>Herdeiro</span><strong>{court.dynasty.heirName}</strong></article></div><Meter label="Legitimidade dinástica" value={court.dynasty.legitimacy} /><p class="cc-panel-note">Casamentos e sucessões futuras serão registrados aqui e publicados no Jornal.</p></div> : null}
      {tab === 'diplomacy' ? <div class="cc-government-panel"><p class="cc-kicker">CHANCELARIA</p><h2>Relações entre as coroas</h2><div class="cc-diplomacy-list">{court.diplomacy.knownRealms.map(other => <article key={other.id}><i style={{ background: other.color }} /><div><strong>{other.name}</strong><span>{other.capitalName} · {other.regionCount} {other.regionCount === 1 ? 'região' : 'regiões'}</span></div><em>{other.realmKind === 'separatist' ? 'Separatista · IA' : other.isAi ? `IA · ${other.relation}` : other.relation}</em></article>)}</div></div> : null}
      {tab === 'internal' ? <div class="cc-government-panel"><p class="cc-kicker">CONSELHO INTERNO</p><h2>Coesão do reino</h2><div class="cc-meter-grid"><Meter label="Estabilidade" value={court.internal.stability} /><Meter label="Apoio popular" value={court.internal.popularSupport} /><Meter label="Risco separatista" value={court.internal.separatistRisk} danger /></div><div class={`cc-revolt-warning ${court.internal.canRevolt ? 'armed' : ''}`}><strong>{court.internal.canRevolt ? 'Revoluções estão habilitadas neste domínio' : 'O domínio ainda é pequeno para uma revolução'}</strong><p>{court.internal.explanation}</p></div></div> : null}
    </div>
  </section>;
}

function JournalSection({ items, realm, busy, onPublish }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  async function submit(event) { event.preventDefault(); const published = await onPublish({ title, body }); if (published) { setTitle(''); setBody(''); } }
  return <section class="cc-journal cc-parchment">
    <header><div><p class="cc-kicker">GAZETA DOS REINOS</p><h1>Notícias do mundo</h1><p>Guerras, alianças, fundações, revoluções e textos assinados pelos jogadores.</p></div><time>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</time></header>
    <div class="cc-journal-layout"><div class="cc-news-feed">{items.length ? items.map(item => <article key={item.id} class={`cc-news-item ${item.kind} ${item.category}`}><div><span>{CATEGORY_LABELS[item.category] || item.category}</span><time>{formatTime(item.createdAt)}</time></div><h2>{item.headline}</h2><p>{item.summary}</p>{item.authorName ? <footer>Por {item.authorName}{item.realmName ? ` · ${item.realmName}` : ''}</footer> : null}</article>) : <p>Nenhuma notícia foi impressa.</p>}</div>
      <form class="cc-article-form" onSubmit={submit}><p class="cc-kicker">ENVIAR À TIPOGRAFIA</p><h2>Publicar um artigo</h2><p>{realm ? `Assinado em nome de ${realm.name}.` : 'Funde um reino para publicar.'}</p><label>Título<input value={title} onInput={event => setTitle(event.currentTarget.value)} maxLength="90" required disabled={!realm} /></label><label>Artigo<textarea value={body} onInput={event => setBody(event.currentTarget.value)} maxLength="1600" rows="8" required disabled={!realm} placeholder="Relate decisões, convide aliados ou responda às notícias do mundo..." /></label><button class="cc-primary" disabled={!realm || busy}>{busy ? 'Imprimindo...' : 'Publicar no Jornal'}</button></form>
    </div>
  </section>;
}

function App() {
  const [bootstrap, setBootstrap] = useState(null);
  const [journal, setJournal] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeSection, setActiveSection] = useState('map');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mapController, setMapController] = useState(null);
  const [online, setOnline] = useState(false);
  const refresh = useCallback(async () => { const data = await crownsApi.bootstrap(); setBootstrap(data); setJournal(data.journal || []); setSelectedId(current => current || data.realm?.capitalRegionId || null); return data; }, []);
  const refreshJournal = useCallback(async () => { const data = await crownsApi.journal(); setJournal(data.items || []); }, []);
  useEffect(() => { refresh().catch(err => setError(err.message)); }, [refresh]);
  useEffect(() => {
    const socket = io('/crowns-and-councils', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setOnline(true)); socket.on('disconnect', () => setOnline(false));
    socket.on('world.patch', () => refresh().catch(() => {})); socket.on('action.completed', () => refresh().catch(() => {})); socket.on('journal.published', () => refreshJournal().catch(() => {}));
    return () => socket.disconnect();
  }, [refresh, refreshJournal]);
  const selected = useMemo(() => bootstrap?.regions.find(item => item.id === selectedId) || null, [bootstrap, selectedId]);
  const selectedAction = useMemo(() => bootstrap?.actions.find(item => item.regionId === selectedId && item.status === 'pending') || null, [bootstrap, selectedId]);
  const nextClaim = useMemo(() => bootstrap?.regions.find(item => item.isAdjacentToRealm && !item.ownerRealmId && item.status === 'neutral') || null, [bootstrap]);
  async function execute(action) { setBusy(true); setError(''); try { const result = await action(); await refresh(); return result; } catch (err) { setError(err.message); return null; } finally { setBusy(false); } }
  function goMap(regionId) { if (regionId) setSelectedId(regionId); setActiveSection('map'); }
  if (!bootstrap) return <main class="cc-loading"><div class="cc-crown">♔</div><p>{error || 'Convocando o conselho...'}</p><a href="/">Voltar ao Game Hub</a></main>;
  return <main class="cc-shell">
    <header class="cc-topbar"><a class="cc-brand" href="/"><span class="cc-crown">♔</span><span><small>CROWNS AND</small><strong>COUNCILS</strong></span></a><div class="cc-season"><small>{bootstrap.season.name}</small><strong>{bootstrap.map.theatre}</strong></div><div class="cc-resources"><span><small>OURO</small><b>{bootstrap.realm?.treasury ?? 0}</b></span><span><small>PROVISÕES</small><b>{bootstrap.realm?.provisions ?? 0}</b></span><span><small>PRESTÍGIO</small><b>{bootstrap.realm?.prestige ?? 0}</b></span></div><div class={`cc-online ${online ? 'connected' : ''}`}><i />{online ? 'Online' : 'Reconectando'}</div></header>
    <section class="cc-stage"><MapView bootstrap={bootstrap} selectedId={selectedId} onSelect={setSelectedId} onReady={(controller, err) => { setMapController(controller); if (err) setError(err.message); }} /><div class="cc-map-title"><small>TEATRO POLÍTICO</small><strong>{bootstrap.realm?.name || `${bootstrap.world.aiRealmCount} coroas de IA em atividade`}</strong></div><div class="cc-zoom"><button onClick={() => mapController?.zoomIn()} aria-label="Aproximar">+</button><button onClick={() => mapController?.zoomOut()} aria-label="Afastar">−</button><button onClick={() => mapController?.fit()} aria-label="Centralizar">⌂</button></div>
      {activeSection === 'map' ? <RegionPanel region={selected} realm={bootstrap.realm} action={selectedAction} nextClaim={nextClaim} busy={busy} onShowNext={() => setSelectedId(nextClaim.id)} onClaim={() => execute(() => crownsApi.claimTerritory(selected.id))} /> : null}
      {activeSection !== 'map' ? <div class="cc-section-overlay"><button class="cc-close-section" onClick={() => goMap()} aria-label="Fechar seção">×</button>{activeSection === 'realm' ? <RealmSection bootstrap={bootstrap} onGoMap={goMap} /> : <JournalSection items={journal} realm={bootstrap.realm} busy={busy} onPublish={payload => execute(() => crownsApi.publishArticle(payload))} />}</div> : null}
      {error && bootstrap.realm ? <button class="cc-toast" onClick={() => setError('')}>{error}<span>×</span></button> : null}</section>
    <nav class="cc-bottom-nav" aria-label="Seções principais">{NAV_ITEMS.map(item => <button key={item.id} class={activeSection === item.id ? 'active' : ''} onClick={() => setActiveSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
    {!bootstrap.realm ? <RealmModal selected={selected?.ownerRealmId ? null : selected} regions={bootstrap.regions} colors={bootstrap.customization.availableColors} busy={busy} error={error} onSelect={setSelectedId} onSubmit={payload => execute(() => crownsApi.createRealm(payload))} /> : null}
  </main>;
}

const appRoot = document.getElementById('app');
appRoot.replaceChildren();
render(<App />, appRoot);
