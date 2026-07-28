import { render } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { io } from 'socket.io-client';
import { crownsApi } from './api.js';
import { CrownsMapStage } from './map/MapStage.js';
import './styles.css';

const NAV_ITEMS = [
  { id: 'map', icon: 'map', label: 'Mapa' },
  { id: 'realm', icon: 'crown', label: 'Reino' },
  { id: 'market', icon: 'market', label: 'Mercado' },
  { id: 'journal', icon: 'journal', label: 'Jornal' }
];
const REALM_TABS = [
  { id: 'overview', label: 'Comando' },
  { id: 'provinces', label: 'Províncias' },
  { id: 'construction', label: 'Construções' },
  { id: 'army', label: 'Exército' },
  { id: 'dynasty', label: 'Dinastia' },
  { id: 'diplomacy', label: 'Diplomacia' },
  { id: 'religion', label: 'Religião' },
  { id: 'councils', label: 'Concílios' },
  { id: 'internal', label: 'Governo' }
];
const CATEGORY_LABELS = {
  gazette: 'Edição diária', realm: 'Novo reino', campaign: 'Campanha', war: 'Guerra', peace: 'Paz',
  alliance: 'Aliança', marriage: 'Casamento', revolution: 'Revolução', article: 'Artigo dos jogadores',
  economy: 'Economia', army: 'Exército', religion: 'Religião', council: 'Concílio', world: 'Mundo'
};
const RESOURCE_ORDER = ['treasury', 'provisions', 'wood', 'stone'];
const RESOURCE_META = {
  treasury: { label: 'Moedas', icon: 'coin', image: '/assets/crowns-and-councils/assets/generated/resource-coins.png' },
  provisions: { label: 'Trigo', icon: 'wheat', image: '/assets/crowns-and-councils/assets/generated/resource-wheat.png' },
  grain: { label: 'Trigo', icon: 'wheat', image: '/assets/crowns-and-councils/assets/generated/resource-wheat.png' },
  wood: { label: 'Madeira', icon: 'wood', image: '/assets/crowns-and-councils/assets/generated/resource-wood.png' },
  stone: { label: 'Pedra', icon: 'stone', image: '/assets/crowns-and-councils/assets/generated/resource-stone.png' }
};
const UNIT_IMAGES = {
  spearmen: '/assets/crowns-and-councils/assets/generated/unit-spearmen.png',
  archers: '/assets/crowns-and-councils/assets/generated/unit-archers.png',
  cavalry: '/assets/crowns-and-councils/assets/generated/unit-cavalry.png',
  siege: '/assets/crowns-and-councils/assets/generated/unit-siege.png'
};
const TROOP_FIELDS = [
  { key: 'spearmen', label: 'Lanceiros' },
  { key: 'archers', label: 'Arqueiros' },
  { key: 'cavalry', label: 'Cavaleiros' },
  { key: 'siege', label: 'Manganelas' }
];
const emptyTroops = () => ({ spearmen: 0, archers: 0, cavalry: 0, siege: 0 });
const troopTotal = troops => TROOP_FIELDS.reduce((sum, item) => sum + Number(troops?.[item.key] || 0), 0);
const strategicQueueCount = actions => actions.filter(action => !['army.attack', 'army.transfer'].includes(action.type)).length;

function Icon({ name }) {
  const paths = {
    crown: <><path d="M4 8l4 3 4-7 4 7 4-3-2 11H6L4 8z" /><path d="M6 22h12" /></>,
    map: <><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" /><path d="M9 3v15M15 6v15" /></>,
    market: <><path d="M4 10h16M6 10V6h12v4M5 10v10h14V10" /><path d="M9 14h6M9 17h6" /></>,
    journal: <><path d="M5 3h11a3 3 0 013 3v15H8a3 3 0 01-3-3V3z" /><path d="M8 7h7M8 11h7M8 15h5" /></>,
    coin: <><circle cx="12" cy="12" r="8" /><path d="M9 12h6M12 8v8" /></>,
    wheat: <><path d="M12 22V7M12 10c-4 0-5-3-5-5 3 0 5 2 5 5zM12 14c4 0 5-3 5-5-3 0-5 2-5 5zM12 18c-4 0-5-3-5-5 3 0 5 2 5 5z" /></>,
    wood: <><path d="M5 19L19 5M8 21l13-13M3 16l5 5M16 3l5 5" /><path d="M7 12l5 5" /></>,
    stone: <path d="M5 20l-2-7 5-8 8-2 5 8-3 9H5z" />,
    shield: <path d="M12 3l8 3v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3z" />,
    swords: <><path d="M5 3l6 6-2 2-6-6V3h2zM19 3l-6 6 2 2 6-6V3h-2z" /><path d="M8 12l-5 5 4 4 5-5M16 12l5 5-4 4-5-5" /></>,
    cross: <path d="M10 3h4v6h5v4h-5v8h-4v-8H5V9h5V3z" />,
    hourglass: <><path d="M7 3h10M7 21h10M8 3c0 5 1 6 4 9-3 3-4 4-4 9M16 3c0 5-1 6-4 9 3 3 4 4 4 9" /></>
  };
  return <svg class="cc-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{paths[name] || paths.crown}</svg>;
}

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function remaining(value, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((new Date(value).getTime() - now) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

function ResourceIcon({ resource }) {
  const meta = RESOURCE_META[resource];
  return meta?.image ? <img class="cc-resource-image" src={meta.image} alt="" aria-hidden="true" /> : <Icon name={meta?.icon || resource} />;
}

function Cost({ item, compact = false }) {
  return <span class={`cc-cost ${compact ? 'compact' : ''}`}>
    {RESOURCE_ORDER.filter(key => Number(item?.[key] || 0) > 0).map(key => <b key={key} title={RESOURCE_META[key].label}><ResourceIcon resource={key} />{item[key]}</b>)}
  </span>;
}

function Lobby({ servers, loading, error, onRefresh, onEnter }) {
  return <main class="cc-lobby">
    <header class="cc-lobby-top">
      <a href="/" class="cc-wordmark"><span class="cc-brand-sigil"><Icon name="crown" /></span><span><small>Crowns and</small><strong>Councils</strong></span></a>
      <div><span>Campanhas persistentes · 60 dias</span><a href="/">Voltar ao Game Hub</a></div>
    </header>
    <section class="cc-lobby-intro">
      <div class="cc-lobby-copy">
        <p class="cc-overline">ESTRATÉGIA · DINASTIA · FÉ</p>
        <h1>O mapa não perdoa<br />um reino mal governado.</h1>
        <p>Escolha uma província, levante sua casa e dispute recursos, fronteiras e doutrina. Cada decisão ocupa tempo, consome estoques e muda a força da sua coroa.</p>
        <div class="cc-lobby-signals"><span><Icon name="shield" />10 reinos de IA por mundo</span><span><Icon name="hourglass" />2 expedições simultâneas</span><span><Icon name="cross" />Concílios e heresias vivas</span></div>
      </div>
      <aside class="cc-campaign-brief">
        <span>Relatório da campanha</span>
        <strong>Conquistar é só o começo.</strong>
        <ol>
          <li><b>1</b><span><strong>Garanta recursos</strong>Províncias produzem trigo, madeira, pedra ou moedas.</span></li>
          <li><b>2</b><span><strong>Especialize cidades</strong>Obras liberam tropas, defesa, comércio e novos níveis.</span></li>
          <li><b>3</b><span><strong>Mova o mundo</strong>Guerras, casamentos, revoltas e votos deixam marcas.</span></li>
        </ol>
      </aside>
    </section>
    <section class="cc-server-section">
      <header><div><span>SELEÇÃO DE MUNDO</span><h2>Três campanhas. Uma coroa por servidor.</h2></div><button class="cc-quiet-button" onClick={onRefresh} disabled={loading}>Atualizar estado</button></header>
      {error ? <div class="cc-error">{error}</div> : null}
      <div class="cc-server-grid">{servers.map(server => <article class={`cc-server-card ${server.phase}`} key={server.id}>
        <div class="cc-server-card-head"><span>MUNDO {String(server.number).padStart(2, '0')}</span><i class={server.phase} /> </div>
        <h3>{server.name.replace(/^Servidor \d+ — /, '')}</h3>
        <div class="cc-server-progress"><div><strong>{server.phase === 'waiting' ? 'Não iniciado' : `Dia ${server.day} de ${server.totalDays}`}</strong><span>{server.statusLabel}</span></div><i><b style={{ width: `${server.phase === 'waiting' ? 0 : Math.min(100, server.day / server.totalDays * 100)}%` }} /></i></div>
        <dl><div><dt>Jogadores</dt><dd>{server.playerCount}</dd></div><div><dt>Reinos de IA</dt><dd>{server.aiCount}</dd></div><div><dt>Sua coroa</dt><dd>{server.realmName || 'Não fundada'}</dd></div></dl>
        <p>{server.phase === 'waiting' ? 'O calendário começa quando o primeiro jogador humano fundar um reino.' : server.mode === 'persistente' ? `Campanha até ${formatTime(server.endsAt)}.` : 'Teste acelerado: a temporada inteira dura cinco minutos.'}</p>
        <button class="cc-primary" disabled={server.phase === 'ended'} onClick={() => onEnter(server.id)}>{server.phase === 'ended' ? 'Apuração em curso' : server.joined ? 'Retomar campanha' : 'Entrar neste mundo'}</button>
      </article>)}</div>
    </section>
  </main>;
}

function MapView({ bootstrap, selectedId, onSelect, onReady }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    let active = true;
    const map = new CrownsMapStage(hostRef.current, { onSelect });
    mapRef.current = map;
    map.init(bootstrap.map.topologyUrl, bootstrap.map.contextTopologyUrl).then(() => {
      if (!active) return;
      map.update(bootstrap.regions, bootstrap.realm, selectedId);
      onReady(map);
    }).catch(error => onReady(null, error));
    return () => { active = false; map.destroy(); mapRef.current = null; };
  }, []);
  useEffect(() => { mapRef.current?.update(bootstrap.regions, bootstrap.realm, selectedId); }, [bootstrap.regions, bootstrap.realm, selectedId]);
  return <div ref={hostRef} class="cc-map-host" />;
}

function RealmModal({ selected, regions, colors, religions, busy, error, onSelect, onSubmit }) {
  const [name, setName] = useState('');
  const [houseName, setHouseName] = useState('');
  const [color, setColor] = useState(colors[0] || '#c9485b');
  const [religion, setReligion] = useState(religions[0] || 'Cristianismo');
  const [capitalQuery, setCapitalQuery] = useState('');
  const availableRegions = useMemo(() => {
    const neutral = regions.filter(region => !region.ownerRealmId && region.status === 'neutral');
    const query = capitalQuery.trim().toLocaleLowerCase('pt-BR');
    const matches = query
      ? neutral.filter(region => `${region.name} ${region.countryName} ${region.resourceName}`.toLocaleLowerCase('pt-BR').includes(query))
      : neutral;
    const limited = matches.slice(0, 100);
    if (selected && !limited.some(region => region.id === selected.id)) limited.unshift(selected);
    return limited;
  }, [capitalQuery, regions, selected]);
  useEffect(() => { if (!colors.includes(color) && colors[0]) setColor(colors[0]); }, [colors, color]);
  useEffect(() => { if (selected?.suggestedReligion && religions.includes(selected.suggestedReligion)) setReligion(selected.suggestedReligion); }, [selected?.id]);
  return <div class="cc-modal-backdrop"><form class="cc-modal" onSubmit={event => { event.preventDefault(); onSubmit({ name, houseName, color, religion, regionId: selected?.id }); }}>
    <div class="cc-modal-intro"><span class="cc-brand-sigil"><Icon name="crown" /></span><div><p class="cc-overline">FUNDAÇÃO DA CASA</p><h1>Erga seu estandarte</h1></div></div>
    <p>Escolha uma capital rica no recurso que orientará seus primeiros dias. As dez coroas de IA já ocupam posições diferentes neste mundo.</p>
    <div class="cc-capital-fields">
      <label>Buscar província ou país<input value={capitalQuery} onInput={event => setCapitalQuery(event.currentTarget.value)} placeholder="Ex.: Jerusalém, Inglaterra, madeira" /></label>
      <label>Capital inicial<select value={selected?.id || ''} onChange={event => onSelect(event.currentTarget.value || null)} required><option value="">{capitalQuery ? `${availableRegions.length} resultado(s)` : 'Selecione uma província neutra'}</option>{availableRegions.map(region => <option key={region.id} value={region.id}>{region.name} — {region.countryName} · {region.resourceName}</option>)}</select></label>
    </div>
    {selected ? <div class="cc-capital-preview"><ResourceIcon resource={selected.resourceType} /><div><span>Vocação da província</span><strong>{selected.resourceName} · +{selected.resourceYield}/dia</strong></div></div> : null}
    <div class="cc-field-row"><label>Nome do reino<input value={name} onInput={event => setName(event.currentTarget.value)} maxLength="40" placeholder="Reino de Albor" required /></label><label>Casa governante<input value={houseName} onInput={event => setHouseName(event.currentTarget.value)} maxLength="40" placeholder="Casa de Valença" required /></label></div>
    <fieldset class="cc-faith-choice"><legend>Fé oficial da coroa</legend><div class="cc-faith-grid">{religions.map(item => <button type="button" class={religion === item ? 'active' : ''} onClick={() => setReligion(item)} key={item}><Icon name="cross" /><span><strong>{item}</strong><small>{item === selected?.suggestedReligion ? 'Tradição regional sugerida' : 'Escolha livre da casa'}</small></span></button>)}</div><p>Seitas, reformas e heresias próprias de cada tradição surgirão durante a temporada.</p></fieldset>
    <fieldset><legend>Cor exclusiva do estandarte</legend><div class="cc-color-row">{colors.map(item => <button key={item} type="button" aria-label={`Escolher cor ${item}`} class={color === item ? 'active' : ''} style={{ '--swatch': item }} onClick={() => setColor(item)} />)}</div></fieldset>
    {error ? <div class="cc-error">{error}</div> : null}<button class="cc-primary" disabled={!selected || busy || !colors.length}>{busy ? 'Selando juramento...' : 'Fundar reino e iniciar campanha'}</button>
  </form></div>;
}

function RegionPanel({ region, realm, action, nextClaim, expedition, onClaim, onShowNext, busy, now, buildings }) {
  if (!region) return <aside class="cc-region-panel empty"><p class="cc-overline">MAPA POLÍTICO</p><h2>Escolha uma província</h2><p>Toque no mapa para inspecionar produção, domínio e rotas.</p></aside>;
  const owned = region.ownerRealmId === realm?.id;
  const canClaim = Boolean(realm && !region.ownerRealmId && region.isAdjacentToRealm && region.status === 'neutral' && expedition.active < expedition.capacity);
  const regionBuildings = buildings.filter(item => item.regionId === region.id);
  const defense = regionBuildings.reduce((sum, item) => sum + (item.type === 'fortaleza' ? item.level * 35 : item.type === 'muralha' ? item.level * 16 : item.type === 'torre_vigia' ? item.level * 8 : 0), 0);
  const domainLabel = owned ? 'DOMÍNIO DA COROA' : region.ownerRealmId ? (region.ownerIsAi ? 'REINO CONTROLADO PELA IA' : 'REINO ESTRANGEIRO') : region.status === 'claiming' ? 'EXPEDIÇÃO A CAMINHO' : 'PROVÍNCIA NEUTRA';
  return <aside class="cc-region-panel">
    <header><div><p class="cc-overline">{domainLabel}</p><h2>{region.name}</h2><span>{region.countryName} · {region.levelLabel}</span>{region.ownerName && !owned ? <strong>{region.ownerName}</strong> : null}</div><i style={{ '--realm-color': owned ? realm.color : region.ownerColor || '#7c776b' }} /></header>
    <div class="cc-province-yield"><ResourceIcon resource={region.resourceType} /><div><span>Produção dominante</span><strong>{region.resourceName}</strong><small>+{region.resourceYield}/dia antes de melhorias</small></div></div>
    <dl><div><dt>Desenvolvimento</dt><dd>Nível {region.development}</dd></div><div><dt>Defesa construída</dt><dd>{defense ? `+${defense}%` : 'Sem bônus'}</dd></div><div><dt>Conexões</dt><dd>{region.neighborIds.length}</dd></div><div><dt>Rotas marítimas</dt><dd>{region.routeNeighborIds?.length || 0}</dd></div></dl>
    {region.reservedByName ? <div class="cc-order-strip"><Icon name="hourglass" /><span><b>Reservada por {region.reservedByName}</b>Chegada em {remaining(region.reservedUntil, now)}</span></div> : null}
    {action ? <div class="cc-order-strip"><Icon name="hourglass" /><span><b>{action.label}</b>Conclui em {remaining(action.completesAt, now)}</span></div> : null}
    {canClaim ? <button class="cc-primary" onClick={onClaim} disabled={busy}>{busy ? 'Despachando...' : `Enviar exploradores · ${expedition.active + 1}/${expedition.capacity}`}</button> : null}
    {realm && !region.ownerRealmId && region.status === 'neutral' && expedition.active >= expedition.capacity ? <p class="cc-panel-warning">Os dois grupos de exploradores já estão em marcha.</p> : null}
    {owned && nextClaim ? <button class="cc-secondary" onClick={onShowNext}>Encontrar fronteira disponível</button> : null}
    {!canClaim && !owned && !region.ownerRealmId && region.status === 'neutral' && !region.isAdjacentToRealm ? <p class="cc-muted">Esta província ainda não possui fronteira ou rota direta com seu reino.</p> : null}
  </aside>;
}

function Meter({ label, value, danger = false }) {
  return <div class={`cc-meter ${danger ? 'danger' : ''}`}><div><span>{label}</span><strong>{value}%</strong></div><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div>;
}

function Orders({ actions, regions, now, busy, onCancel }) {
  const strategic = strategicQueueCount(actions);
  const marches = actions.length - strategic;
  return <section class="cc-orders"><header><div><span>ORDENS ATIVAS</span><strong>{strategic}/3 filas · {marches} marcha(s)</strong></div><i>{actions.length ? 'O reino trabalha mesmo quando você sai.' : 'Seu conselho aguarda uma decisão.'}</i></header>
    <div>{actions.length ? actions.map(action => <article key={action.id}><Icon name="hourglass" /><span><b>{action.label}</b><small>{regions.find(item => item.id === action.regionId)?.name || 'Província'} · {remaining(action.completesAt, now)}</small></span><button disabled={busy} onClick={() => onCancel(action.id)}>Cancelar</button></article>) : <p class="cc-muted">Nenhuma ordem está consumindo tempo agora.</p>}</div>
  </section>;
}

function requirementsMet(requirements, regionBuildings) {
  return Object.entries(requirements || {}).every(([type, level]) => Number(regionBuildings.find(item => item.type === type)?.level || 0) >= level);
}

function EconomyPanel({ bootstrap }) {
  const economy = bootstrap.realm.economy;
  return <div class="cc-economy-ledger">
    {RESOURCE_ORDER.map(resource => <div key={resource}><ResourceIcon resource={resource} /><span><small>{RESOURCE_META[resource].label} por dia</small><strong class={(economy.daily[resource] || 0) < 0 ? 'negative' : ''}>{(economy.daily[resource] || 0) >= 0 ? '+' : ''}{economy.daily[resource] || 0}</strong></span></div>)}
    <p>Manutenção militar: <b>{economy.upkeep} trigo/dia</b> · Capacidade dos armazéns: <b>{economy.storage}</b></p>
  </div>;
}

function ProvinceList({ bootstrap, onGoMap }) {
  const owned = bootstrap.regions.filter(region => region.ownerRealmId === bootstrap.realm.id);
  return <div class="cc-province-list">{owned.map(region => {
    const regionBuildings = bootstrap.buildings.filter(item => item.regionId === region.id);
    return <article key={region.id}><div class="cc-province-resource"><ResourceIcon resource={region.resourceType} /></div><div><h3>{region.name}</h3><p>{region.countryName} · {region.resourceName} +{region.resourceYield}/dia</p><span>{regionBuildings.length ? regionBuildings.map(item => `${item.name} ${item.level}`).join(' · ') : 'Nenhuma obra concluída'}</span></div><button onClick={() => onGoMap(region.id)}>Ver no mapa</button></article>;
  })}</div>;
}

function ConstructionPanel({ bootstrap, busy, onBuild }) {
  const owned = bootstrap.regions.filter(region => region.ownerRealmId === bootstrap.realm.id);
  const [regionId, setRegionId] = useState(bootstrap.realm.capitalRegionId);
  const regionBuildings = bootstrap.buildings.filter(item => item.regionId === regionId);
  const selectedRegion = owned.find(item => item.id === regionId) || owned[0];
  useEffect(() => { if (!owned.some(item => item.id === regionId) && owned[0]) setRegionId(owned[0].id); }, [owned.length, regionId]);
  return <div>
    <div class="cc-command-heading"><div><span>PLANO DE OBRAS</span><h2>Especialize cada província</h2><p>Produção, defesa e novos tipos de tropa dependem das construções locais.</p></div><label>Construir em<select value={selectedRegion?.id || ''} onChange={event => setRegionId(event.currentTarget.value)}>{owned.map(region => <option key={region.id} value={region.id}>{region.name} · {region.resourceName}</option>)}</select></label></div>
    <div class="cc-building-catalog">{Object.entries(bootstrap.buildingCatalog).map(([type, item]) => {
      const currentLevel = Number(regionBuildings.find(building => building.type === type)?.level || 0);
      const unlocked = requirementsMet(item.requires, regionBuildings);
      const multiplier = 1 + currentLevel * 0.65;
      const cost = Object.fromEntries(RESOURCE_ORDER.map(key => [key, Math.round(Number(item[key] || 0) * multiplier)]));
      const requirements = Object.entries(item.requires || {}).map(([required, level]) => `${bootstrap.buildingCatalog[required]?.name || required} ${level}`).join(' · ');
      return <article class={!unlocked ? 'locked' : ''} key={type}><header><span>{item.category}</span><b>Nível {currentLevel}/{item.maxLevel || 5}</b></header><h3>{item.name}</h3><p>{item.description}</p><strong class="cc-effect">{item.effect}</strong>{requirements ? <small>Exige: {requirements}</small> : <small>Disponível desde o início</small>}<footer><Cost item={cost} /><button disabled={busy || !unlocked || currentLevel >= (item.maxLevel || 5) || strategicQueueCount(bootstrap.actions) >= 3} onClick={() => onBuild(selectedRegion.id, type)}>{currentLevel ? 'Melhorar' : 'Construir'}</button></footer></article>;
    })}</div>
  </div>;
}

function TroopInputs({ value, available, onChange }) {
  return <div class="cc-troop-inputs">{TROOP_FIELDS.map(item => <label key={item.key}><span>{item.label}<small>disponível {Number(available?.[item.key] || 0)}</small></span><input type="number" min="0" max={Number(available?.[item.key] || 0)} value={Number(value?.[item.key] || 0)} onInput={event => onChange({ ...value, [item.key]: Math.max(0, Number(event.currentTarget.value || 0)) })} /></label>)}</div>;
}

function ArmyPanel({ bootstrap, now, busy, onRecruit, onTransfer, onDefend, onWar }) {
  const owned = bootstrap.regions.filter(region => region.ownerRealmId === bootstrap.realm.id);
  const totalSoldiers = bootstrap.armies.reduce((sum, army) => sum + army.total, 0);
  const [groups, setGroups] = useState(1);
  const [trainingRegionId, setTrainingRegionId] = useState(bootstrap.realm.capitalRegionId);
  const [transferFromId, setTransferFromId] = useState(bootstrap.armies[0]?.regionId || '');
  const [transferToId, setTransferToId] = useState(owned.find(region => region.id !== bootstrap.armies[0]?.regionId)?.id || '');
  const [transferTroops, setTransferTroops] = useState(emptyTroops());
  const [attackFromId, setAttackFromId] = useState(bootstrap.armies.find(army => army.total)?.regionId || '');
  const [attackTargetId, setAttackTargetId] = useState('');
  const [attackTroops, setAttackTroops] = useState(emptyTroops());
  const trainingArmy = bootstrap.armies.find(army => army.regionId === trainingRegionId);
  const transferArmy = bootstrap.armies.find(army => army.regionId === transferFromId);
  const attackArmy = bootstrap.armies.find(army => army.regionId === attackFromId);
  const regionBuildings = bootstrap.buildings.filter(item => item.regionId === trainingRegionId);
  const attackTargets = bootstrap.attackTargets.filter(target => target.fromRegionIds.includes(attackFromId));
  const selectedTarget = attackTargets.find(target => target.regionId === attackTargetId);
  const attackStrength = TROOP_FIELDS.reduce((sum, item) => sum + Number(attackTroops[item.key] || 0) * Number(bootstrap.unitCatalog[item.key]?.attack || 1), 0);
  const marches = bootstrap.actions.filter(action => ['army.attack', 'army.transfer'].includes(action.type));
  useEffect(() => { if (!owned.some(region => region.id === trainingRegionId)) setTrainingRegionId(owned[0]?.id || ''); }, [owned.length, trainingRegionId]);
  useEffect(() => { if (!bootstrap.armies.some(army => army.regionId === transferFromId && army.total)) setTransferFromId(bootstrap.armies.find(army => army.total)?.regionId || ''); }, [bootstrap.armies.length, transferFromId]);
  useEffect(() => { if (!owned.some(region => region.id === transferToId && region.id !== transferFromId)) setTransferToId(owned.find(region => region.id !== transferFromId)?.id || ''); }, [owned.length, transferFromId, transferToId]);
  useEffect(() => { if (!bootstrap.armies.some(army => army.regionId === attackFromId && army.total)) setAttackFromId(bootstrap.armies.find(army => army.total)?.regionId || ''); }, [bootstrap.armies.length, attackFromId]);
  useEffect(() => { if (!attackTargets.some(target => target.regionId === attackTargetId)) setAttackTargetId(attackTargets[0]?.regionId || ''); }, [attackFromId, bootstrap.attackTargets.length, attackTargetId]);
  return <div class="cc-military-command">
    <div class="cc-command-heading"><div><span>COMANDO MILITAR</span><h2>Guarnições e campanhas provinciais</h2><p>Cada soldado pertence a uma província. Tropas em marcha deixam de defender a origem até retornarem.</p></div><div class="cc-army-summary"><strong>{totalSoldiers}</strong><span>soldados · {bootstrap.armies.length} guarnição(ões)</span></div></div>

    <section class="cc-garrison-section"><header><div><span>DISPOSIÇÃO TERRITORIAL</span><h3>Guarnições por província</h3></div><small>Somente a força estacionada no alvo participa da defesa.</small></header><div class="cc-garrison-grid">{owned.map(region => {
      const army = bootstrap.armies.find(item => item.regionId === region.id);
      return <article class={!army?.total ? 'empty' : ''} key={region.id}><header><div><strong>{region.name}</strong><span>{region.countryName}</span></div><b>{army?.total || 0}</b></header><dl>{TROOP_FIELDS.map(item => <div key={item.key}><dt>{item.label}</dt><dd>{Number(army?.[item.key] || 0)}</dd></div>)}</dl><footer><span>Moral {army?.morale || 0}%</span><button disabled={busy || !army?.total || strategicQueueCount(bootstrap.actions) >= 3} onClick={() => onDefend(region.id)}>Preparar defesa</button></footer></article>;
    })}</div></section>

    <div class="cc-military-planners">
      <form class="cc-troop-planner" onSubmit={event => { event.preventDefault(); if (troopTotal(transferTroops)) onTransfer(transferFromId, transferToId, transferTroops).then(result => { if (result) setTransferTroops(emptyTroops()); }); }}>
        <header><Icon name="shield" /><div><span>ORGANIZAR TROPAS</span><h3>Transferir destacamento</h3></div></header>
        <div class="cc-route-selectors"><label>Origem<select value={transferFromId} onChange={event => { setTransferFromId(event.currentTarget.value); setTransferTroops(emptyTroops()); }}>{bootstrap.armies.filter(army => army.total).map(army => <option value={army.regionId} key={army.regionId}>{army.regionName} · {army.total}</option>)}</select></label><i>→</i><label>Destino<select value={transferToId} onChange={event => setTransferToId(event.currentTarget.value)}>{owned.filter(region => region.id !== transferFromId).map(region => <option value={region.id} key={region.id}>{region.name}</option>)}</select></label></div>
        <TroopInputs value={transferTroops} available={transferArmy || {}} onChange={setTransferTroops} />
        <footer><span><b>{troopTotal(transferTroops)}</b> soldados serão reservados durante o deslocamento.</span><button disabled={busy || !transferToId || !troopTotal(transferTroops)}>Mover tropas</button></footer>
      </form>

      <form class="cc-troop-planner war" onSubmit={event => { event.preventDefault(); if (selectedTarget && troopTotal(attackTroops)) onWar(attackFromId, selectedTarget.regionId, attackTroops).then(result => { if (result) setAttackTroops(emptyTroops()); }); }}>
        <header><Icon name="swords" /><div><span>PLANO DE INVASÃO</span><h3>Atacar uma província</h3></div></header>
        <div class="cc-route-selectors"><label>Guarnição de origem<select value={attackFromId} onChange={event => { setAttackFromId(event.currentTarget.value); setAttackTroops(emptyTroops()); }}>{bootstrap.armies.filter(army => army.total).map(army => <option value={army.regionId} key={army.regionId}>{army.regionName} · {army.total}</option>)}</select></label><i>→</i><label>Província inimiga<select value={attackTargetId} onChange={event => setAttackTargetId(event.currentTarget.value)}><option value="">{attackTargets.length ? 'Escolha o objetivo' : 'Sem alvo ligado a esta guarnição'}</option>{attackTargets.map(target => <option value={target.regionId} key={target.regionId}>{target.regionName} · {target.realmName}</option>)}</select></label></div>
        {selectedTarget ? <div class="cc-target-intel"><span>DEFESA CONHECIDA</span><strong>{selectedTarget.defender.total} soldados em {selectedTarget.regionName}</strong><small>{TROOP_FIELDS.map(item => `${item.label} ${selectedTarget.defender[item.key] || 0}`).join(' · ')}</small><small>Moral {selectedTarget.defender.morale}% · fortificações {selectedTarget.fortificationLevels}</small></div> : null}
        <TroopInputs value={attackTroops} available={attackArmy || {}} onChange={setAttackTroops} />
        <footer><span><b>{troopTotal(attackTroops)}</b> atacantes · força {attackStrength}. Outras marchas usam apenas as tropas restantes.</span><button class="cc-danger" disabled={busy || !selectedTarget || attackStrength < 50}>Ordenar ataque</button></footer>
      </form>
    </div>

    {marches.length ? <section class="cc-active-marches"><h3>Marchas simultâneas</h3>{marches.map(action => {
      const origin = bootstrap.regions.find(region => region.id === action.cost.originRegionId)?.name || 'origem perdida';
      const target = bootstrap.regions.find(region => region.id === action.regionId)?.name || 'destino';
      return <article key={action.id}><Icon name={action.type === 'army.attack' ? 'swords' : 'shield'} /><div><strong>{action.type === 'army.attack' ? `Ataque a ${target}` : `Reforço para ${target}`}</strong><span>{origin} → {target} · {troopTotal(action.cost.troops)} soldados</span></div><b>{remaining(action.completesAt, now)}</b></article>;
    })}</section> : null}

    <section class="cc-training-section"><div class="cc-command-heading"><div><span>RECRUTAMENTO LOCAL</span><h2>Treinar novos contingentes</h2><p>Os recrutas entram diretamente na guarnição da província escolhida.</p></div><label>Treinar em<select value={trainingRegionId} onChange={event => setTrainingRegionId(event.currentTarget.value)}>{owned.map(region => <option value={region.id} key={region.id}>{region.name}</option>)}</select></label></div>
      <div class="cc-unit-catalog">{Object.entries(bootstrap.unitCatalog).map(([type, unit]) => {
        const unlocked = requirementsMet(unit.requires, regionBuildings);
        const requirement = Object.entries(unit.requires || {}).map(([required, level]) => `${bootstrap.buildingCatalog[required]?.name || required} ${level}`).join(' · ');
        const count = type === 'spearmen' ? trainingArmy?.spearmen : trainingArmy?.[type];
        const cost = Object.fromEntries(RESOURCE_ORDER.map(key => [key, Number(unit[key] || 0) * groups]));
        return <article class={!unlocked ? 'locked' : ''} key={type}><div class="cc-unit-image"><img src={UNIT_IMAGES[type]} alt={unit.name} /></div><div class="cc-unit-body"><header><span>{unit.role}</span><b>{count || 0} nesta província</b></header><h3>{unit.name}</h3><p>{unit.description}</p><dl><div><dt>Ataque</dt><dd>{unit.attack}</dd></div><div><dt>Defesa</dt><dd>{unit.defense}</dd></div><div><dt>Velocidade</dt><dd>{unit.speed}</dd></div></dl><small>{unlocked ? `Treina ${unit.quantity * groups} · ${unit.hours * groups}h base` : `Bloqueado · exige ${requirement}`}</small><footer><Cost item={cost} /><button disabled={busy || !unlocked || strategicQueueCount(bootstrap.actions) >= 3} onClick={() => onRecruit(trainingRegionId, type, groups)}>Treinar</button></footer></div></article>;
      })}</div>
      <div class="cc-train-groups"><span>Tamanho do grupo</span>{[1, 3, 5].map(value => <button class={groups === value ? 'active' : ''} onClick={() => setGroups(value)} key={value}>{value} lote{value > 1 ? 's' : ''}</button>)}</div>
    </section>
  </div>;
}

function DynastyPanel({ bootstrap, busy, onMarriage }) {
  const court = bootstrap.realm.court;
  return <div class="cc-government-panel">
    <div class="cc-command-heading"><div><span>LIVRO DAS CASAS</span><h2>{court.dynasty.houseName}</h2><p>As linhagens abaixo pertencem às coroas que realmente governam esta partida.</p></div></div>
    <div class="cc-court-list"><article><span>Governante</span><strong>{court.dynasty.rulerName}</strong></article><article><span>Herdeiro</span><strong>{court.dynasty.heirName}</strong></article></div>
    <Meter label="Legitimidade dinástica" value={court.dynasty.legitimacy} />
    <div class="cc-house-register"><h3>Casas reinantes</h3>{court.diplomacy.knownRealms.map(other => <article key={other.id}>
      <i style={{ background: other.color }} />
      <div><strong>{other.houseName}</strong><span>{other.rulerName} · {other.name}</span><small>{other.capitalName} · {other.religion}</small></div>
      <button disabled={busy} onClick={() => onMarriage(other.id)}>Propor casamento</button>
    </article>)}</div>
    {bootstrap.marriages.length ? <div class="cc-marriage-chronicle"><h3>Crônica matrimonial</h3>{bootstrap.marriages.map(item => <p class="cc-panel-note" key={item.id}>{item.proposerSpouse} + {item.targetSpouse} · dote {item.dowry} moedas · {item.status === 'accepted' ? 'aceito' : 'pendente'}</p>)}</div> : null}
  </div>;
}

function DiplomacyPanel({ bootstrap, busy, onTreaty, onGift, onRespondRequest }) {
  const court = bootstrap.realm.court;
  const [resourceType, setResourceType] = useState('grain');
  const [amount, setAmount] = useState(100);
  const resources = ['grain', 'wood', 'stone', 'treasury'];
  return <div class="cc-government-panel">
    <div class="cc-command-heading"><div><span>CHANCELARIA</span><h2>Relações entre as coroas</h2><p>Presentes criam boa vontade e aumentam a chance de a IA aceitar tratados e casamentos.</p></div></div>
    {bootstrap.diplomaticRequests?.length ? <div class="cc-diplomatic-requests"><h3>Mensagens recebidas</h3>{bootstrap.diplomaticRequests.map(request => <article key={request.id}>
      <div><span>PEDIDO DA {request.senderHouse}</span><strong>{request.senderName} solicita ajuda</strong><small><ResourceIcon resource={request.resourceType} /> {request.amount} {RESOURCE_META[request.resourceType]?.label}</small></div>
      <div><button disabled={busy} onClick={() => onRespondRequest(request.id, true)}>Atender pedido</button><button class="cc-danger" disabled={busy} onClick={() => onRespondRequest(request.id, false)}>Recusar</button></div>
    </article>)}</div> : null}
    <div class="cc-gift-toolbar"><span>PRESENTE DIPLOMÁTICO</span><label>Recurso<select value={resourceType} onChange={event => setResourceType(event.currentTarget.value)}>{resources.map(resource => <option value={resource} key={resource}>{RESOURCE_META[resource].label}</option>)}</select></label><label>Quantidade<select value={amount} onChange={event => setAmount(Number(event.currentTarget.value))}>{[50, 100, 150, 250, 400].map(value => <option value={value} key={value}>{value}</option>)}</select></label><small>Escolha o presente e envie pela ficha da coroa.</small></div>
    <div class="cc-diplomacy-list">{court.diplomacy.knownRealms.map(other => <article key={other.id}>
      <i style={{ background: other.color }} />
      <div><strong>{other.name}</strong><b>{other.houseName} · {other.rulerName}</b><span>{other.capitalName} · {other.regionCount} província(s) · {other.religion}</span></div>
      <div><em>{other.isAi ? `IA · ${other.relation}` : other.relation}{other.goodwill ? ` · boa vontade ${other.goodwill > 0 ? '+' : ''}${other.goodwill}` : ''}</em><button disabled={busy} onClick={() => onGift(other.id, resourceType, amount)}>Enviar presente</button><button disabled={busy} onClick={() => onTreaty(other.id, 'alliance')}>Aliança</button><button disabled={busy} onClick={() => onTreaty(other.id, 'non_aggression')}>Não agressão</button></div>
    </article>)}</div>
  </div>;
}

function RealmSection({ bootstrap, now, busy, onGoMap, onBuild, onRecruit, onTransfer, onDefend, onWar, onTreaty, onGift, onRespondRequest, onMarriage, onMission, onSuppress, onRespondReligion, onVote, onReceive, onCancel }) {
  const [tab, setTab] = useState('overview');
  const realm = bootstrap.realm;
  if (!realm) return <section class="cc-realm-board"><h1>Nenhuma coroa foi erguida</h1><button class="cc-primary" onClick={() => onGoMap()}>Escolher capital</button></section>;
  const capital = bootstrap.regions.find(region => region.id === realm.capitalRegionId);
  const frontier = bootstrap.regions.find(region => region.isAdjacentToRealm && !region.ownerRealmId && region.status === 'neutral');
  const court = realm.court;
  const relevantMovements = bootstrap.religiousMovements.filter(movement => movement.relevant);
  return <section class="cc-realm-board">
    <header class="cc-realm-header"><div class="cc-realm-identity"><i style={{ '--realm-color': realm.color }} /><div><span>CONSELHO DA COROA</span><h1>{realm.name}</h1><p>{realm.houseName} · capital em {capital?.name}</p></div></div><div class="cc-realm-rank"><strong>{realm.regionCount}</strong><span>províncias</span></div></header>
    <nav class="cc-realm-tabs">{REALM_TABS.map(item => <button key={item.id} class={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    <div class="cc-realm-content">
      {tab === 'overview' ? <div class="cc-overview-layout"><div><div class="cc-command-heading"><div><span>SITUAÇÃO DO REINO</span><h2>Decisões que mudam o próximo dia</h2><p>Seu território produz, seus exércitos consomem e cada fila adia outra escolha.</p></div></div><EconomyPanel bootstrap={bootstrap} /><Orders actions={bootstrap.actions} regions={bootstrap.regions} now={now} busy={busy} onCancel={onCancel} /></div><aside><h3>Prioridades sugeridas</h3><button onClick={() => setTab('construction')}><Icon name="wood" /><span><strong>Ampliar produção</strong>Construa onde a província já é forte.</span></button><button onClick={() => setTab('army')}><Icon name="shield" /><span><strong>Especializar a hoste</strong>Desbloqueie arqueiros, cavalaria e cerco.</span></button><button onClick={() => onGoMap(frontier?.id || capital?.id)}><Icon name="map" /><span><strong>Agir no mapa</strong>{frontier ? 'Há fronteira neutra disponível.' : 'Inspecione sua capital.'}</span></button></aside></div> : null}
      {tab === 'provinces' ? <ProvinceList bootstrap={bootstrap} onGoMap={onGoMap} /> : null}
      {tab === 'construction' ? <ConstructionPanel bootstrap={bootstrap} busy={busy} onBuild={onBuild} /> : null}
      {tab === 'army' ? <ArmyPanel bootstrap={bootstrap} now={now} busy={busy} onRecruit={onRecruit} onTransfer={onTransfer} onDefend={onDefend} onWar={onWar} /> : null}
      {tab === 'dynasty' ? <DynastyPanel bootstrap={bootstrap} busy={busy} onMarriage={onMarriage} /> : null}
      {tab === 'diplomacy' ? <DiplomacyPanel bootstrap={bootstrap} busy={busy} onTreaty={onTreaty} onGift={onGift} onRespondRequest={onRespondRequest} /> : null}
      {tab === 'religion' ? <div class="cc-government-panel"><div class="cc-command-heading"><div><span>CAPELA E DOUTRINA</span><h2>{court.religion.faith}</h2></div></div><div class="cc-meter-grid"><Meter label="Unidade religiosa" value={court.religion.unity} /><Meter label="Pressão herética" value={court.religion.heresyPressure} danger /></div><div class="cc-decision-list"><h3>Movimentos ligados à sua fé</h3>{relevantMovements.length ? relevantMovements.map(movement => <article key={movement.id}><div><strong>{movement.name}</strong><span>{movement.description}</span><small>{movement.parentFaith} · dia {movement.startsDay} · {movement.convertedRealms} coroa(s) aderiram</small></div><div>{movement.response ? <b>{movement.response === 'accept' ? 'Sua coroa aderiu' : 'Sua coroa resistiu'}</b> : <><button disabled={busy} onClick={() => onRespondReligion(movement.id, 'accept')}>Aceitar</button><button class="cc-danger" disabled={busy} onClick={() => onRespondReligion(movement.id, 'resist')}>Resistir</button></>}</div></article>) : <p class="cc-muted">Nenhuma heresia ou reforma ligada à sua tradição surgiu até agora.</p>}</div><div class="cc-decision-list"><h3>Províncias</h3>{bootstrap.regionReligions.map(faith => <article key={faith.regionId}><div><strong>{faith.regionName}</strong><span>{faith.majorityReligion}: {faith.majorityShare}% · {faith.heresyName}: {faith.heresyShare}%</span></div><div><button disabled={busy} onClick={() => onMission(faith.regionId)}>Missão</button><button class="cc-danger" disabled={busy || faith.heresyShare <= 0} onClick={() => onSuppress(faith.regionId)}>Conter heresia</button></div></article>)}</div></div> : null}
      {tab === 'councils' ? <div class="cc-government-panel"><div class="cc-command-heading"><div><span>ASSEMBLEIAS DA FÉ</span><h2>Concílios históricos e regionais</h2></div></div><div class="cc-decision-list">{bootstrap.councils.length ? bootstrap.councils.map(council => <article key={council.id}><div><strong>{council.name}</strong><span>{council.theme}</span><small>Aprovar {council.totals.accept || 0} · Rejeitar {council.totals.reject || 0}</small></div>{council.status === 'voting' ? <div><button disabled={busy || council.vote} onClick={() => onVote(council.id, 'accept')}>Aprovar</button><button disabled={busy || council.vote} onClick={() => onVote(council.id, 'reject')}>Rejeitar</button></div> : <div><button disabled={busy || council.reception} onClick={() => onReceive(council.id, 'receive')}>Receber</button><button class="cc-danger" disabled={busy || council.reception} onClick={() => onReceive(council.id, 'resist')}>Resistir</button></div>}</article>) : <p class="cc-muted">O primeiro concílio será convocado no dia 3.</p>}</div></div> : null}
      {tab === 'internal' ? <div class="cc-government-panel"><div class="cc-command-heading"><div><span>CONSELHO INTERNO</span><h2>Coesão do reino</h2></div></div><div class="cc-meter-grid"><Meter label="Estabilidade" value={court.internal.stability} /><Meter label="Apoio popular" value={court.internal.popularSupport} /><Meter label="Risco separatista" value={court.internal.separatistRisk} danger /></div><div class={`cc-revolt-warning ${court.internal.canRevolt ? 'armed' : ''}`}><strong>{court.internal.canRevolt ? 'Revoluções estão habilitadas neste domínio' : 'O domínio ainda é pequeno para uma revolução'}</strong><p>{court.internal.explanation}</p></div></div> : null}
    </div>
  </section>;
}

function MarketSection({ bootstrap, busy, onCreate, onAccept, onCancel }) {
  const [sellResource, setSellResource] = useState('wood');
  const [buyResource, setBuyResource] = useState('stone');
  const [sellAmount, setSellAmount] = useState(200);
  const [buyAmount, setBuyAmount] = useState(180);
  const open = bootstrap.marketOrders.filter(order => order.status === 'open');
  const hasMarket = bootstrap.buildings.some(item => item.regionId === bootstrap.realm?.capitalRegionId && item.type === 'mercado');
  const resourceOptions = ['grain', 'wood', 'stone', 'treasury'];
  return <section class="cc-market-board">
    <header><div><span>ROTAS E OFERTAS</span><h1>Mercado dos Reinos</h1><p>Recursos oferecidos ficam reservados até a troca ou o cancelamento.</p></div><div class="cc-market-count"><strong>{open.length}</strong><span>ofertas abertas</span></div></header>
    <div class="cc-market-layout"><div class="cc-offer-list">{open.map(order => <article key={order.id}><div class="cc-offer-realms"><i style={{ '--realm-color': bootstrap.realm?.id === order.realmId ? bootstrap.realm.color : '#82745e' }} /><span><strong>{order.sellerName}</strong><small>{order.isOwn ? 'Sua oferta' : 'Entrega imediata'}</small></span></div><div class="cc-offer-exchange"><span><ResourceIcon resource={order.sellResource} /><b>{order.sellAmount}</b><small>{RESOURCE_META[order.sellResource]?.label}</small></span><i>por</i><span><ResourceIcon resource={order.buyResource} /><b>{order.buyAmount}</b><small>{RESOURCE_META[order.buyResource]?.label}</small></span></div><button class={order.isOwn ? 'cc-secondary' : 'cc-primary'} disabled={busy} onClick={() => order.isOwn ? onCancel(order.id) : onAccept(order.id)}>{order.isOwn ? 'Cancelar' : 'Aceitar troca'}</button></article>)}</div>
      <form class="cc-market-form" onSubmit={event => { event.preventDefault(); onCreate({ sellResource, sellAmount: Number(sellAmount), buyResource, buyAmount: Number(buyAmount) }); }}>
        <span>PUBLICAR OFERTA</span><h2>Negociar estoques</h2>{!hasMarket ? <p class="cc-panel-warning">Construa um Mercado na capital para publicar suas próprias ofertas. Você ainda pode aceitar ofertas existentes.</p> : null}
        <label>Você oferece<div><select value={sellResource} onChange={event => setSellResource(event.currentTarget.value)}>{resourceOptions.map(resource => <option value={resource}>{RESOURCE_META[resource].label}</option>)}</select><input type="number" min="50" max="2000" value={sellAmount} onInput={event => setSellAmount(event.currentTarget.value)} /></div></label>
        <label>Você pede<div><select value={buyResource} onChange={event => setBuyResource(event.currentTarget.value)}>{resourceOptions.map(resource => <option value={resource}>{RESOURCE_META[resource].label}</option>)}</select><input type="number" min="50" max="2000" value={buyAmount} onInput={event => setBuyAmount(event.currentTarget.value)} /></div></label>
        <button class="cc-primary" disabled={busy || !hasMarket || sellResource === buyResource}>Reservar e publicar</button>
      </form>
    </div>
  </section>;
}

function JournalSection({ items, realm, busy, onPublish }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  async function submit(event) { event.preventDefault(); const published = await onPublish({ title, body }); if (published) { setTitle(''); setBody(''); } }
  return <section class="cc-journal"><header><div><span>GAZETA DOS REINOS</span><h1>Notícias que registram a campanha</h1><p>Guerras, obras, comércio, alianças, revoluções e textos dos jogadores.</p></div><time>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</time></header><div class="cc-journal-layout"><div class="cc-news-feed">{items.map(item => <article key={item.id} class={`cc-news-item ${item.kind} ${item.category}`}><div><span>{CATEGORY_LABELS[item.category] || item.category}</span><time>{formatTime(item.createdAt)}</time></div><h2>{item.headline}</h2><p>{item.summary}</p>{item.authorName ? <footer>Por {item.authorName}{item.realmName ? ` · ${item.realmName}` : ''}</footer> : null}</article>)}</div><form class="cc-article-form" onSubmit={submit}><span>ENVIAR À TIPOGRAFIA</span><h2>Publicar artigo</h2><label>Título<input value={title} onInput={event => setTitle(event.currentTarget.value)} maxLength="90" required disabled={!realm} /></label><label>Artigo<textarea value={body} onInput={event => setBody(event.currentTarget.value)} maxLength="1600" rows="8" required disabled={!realm} /></label><button class="cc-primary" disabled={!realm || busy}>{busy ? 'Imprimindo...' : 'Publicar no Jornal'}</button></form></div></section>;
}

function Winners({ season, winners, onServers }) {
  return <div class="cc-winners"><section><span>TEMPORADA ENCERRADA</span><h1>As coroas vencedoras</h1><ol>{winners.map(item => <li key={item.rank}><b>{item.rank}º</b><div><strong>{item.realm_name}</strong><span>{item.house_name} · {item.regions} províncias · {item.prestige} prestígio</span></div><em>{item.score} pts</em></li>)}</ol><p>Reinício previsto: {formatTime(season.resetAt)}</p><button class="cc-primary" onClick={onServers}>Voltar aos servidores</button></section></div>;
}

function ResourceBar({ realm }) {
  const economy = realm?.economy?.daily || {};
  return <div class="cc-resources">{RESOURCE_ORDER.map(resource => <span key={resource}><ResourceIcon resource={resource} /><i><small>{RESOURCE_META[resource].label}</small><b>{realm?.[resource] ?? 0}</b></i><em class={(economy[resource] || 0) < 0 ? 'negative' : ''}>{(economy[resource] || 0) >= 0 ? '+' : ''}{economy[resource] || 0}/d</em></span>)}<span class="prestige"><Icon name="crown" /><i><small>Prestígio</small><b>{realm?.prestige ?? 0}</b></i></span></div>;
}

function Game({ serverId, onLeave }) {
  const [bootstrap, setBootstrap] = useState(null);
  const [journal, setJournal] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeSection, setActiveSection] = useState('map');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mapController, setMapController] = useState(null);
  const [online, setOnline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(async () => { const data = await crownsApi.bootstrap(serverId); setBootstrap(data); setJournal(data.journal || []); setSelectedId(current => current || data.realm?.capitalRegionId || null); return data; }, [serverId]);
  const refreshJournal = useCallback(async () => { const data = await crownsApi.journal(serverId); setJournal(data.items || []); }, [serverId]);
  useEffect(() => { refresh().catch(err => setError(err.message)); }, [refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { const socket = io('/crowns-and-councils', { transports: ['websocket', 'polling'], auth: { serverId } }); socket.on('connect', () => setOnline(true)); socket.on('disconnect', () => setOnline(false)); socket.on('world.patch', refresh); socket.on('action.completed', refresh); socket.on('journal.published', refreshJournal); socket.on('season.ended', refresh); socket.on('season.reset', refresh); return () => socket.disconnect(); }, [serverId, refresh, refreshJournal]);
  const selected = useMemo(() => bootstrap?.regions.find(item => item.id === selectedId) || null, [bootstrap, selectedId]);
  const selectedAction = useMemo(() => bootstrap?.actions.find(item => item.regionId === selectedId && item.status === 'pending') || null, [bootstrap, selectedId]);
  const nextClaim = useMemo(() => bootstrap?.regions.find(item => item.isAdjacentToRealm && !item.ownerRealmId && item.status === 'neutral') || null, [bootstrap]);
  async function execute(action) { setBusy(true); setError(''); try { const result = await action(); await refresh(); return result; } catch (err) { setError(err.message); try { await refresh(); } catch {} return null; } finally { setBusy(false); } }
  function goMap(regionId) { if (regionId) setSelectedId(regionId); setActiveSection('map'); }
  if (!bootstrap) return <main class="cc-loading"><span class="cc-brand-sigil"><Icon name="crown" /></span><p>{error || 'Convocando o conselho...'}</p><button onClick={onLeave}>Voltar aos servidores</button></main>;
  const common = {
    bootstrap, now, busy, onGoMap: goMap,
    onBuild: (regionId, type) => execute(() => crownsApi.queueBuilding(serverId, regionId, type)),
    onRecruit: (regionId, type, groups) => execute(() => crownsApi.recruitArmy(serverId, regionId, type, groups)),
    onTransfer: (fromRegionId, toRegionId, troops) => execute(() => crownsApi.transferArmy(serverId, fromRegionId, toRegionId, troops)),
    onDefend: regionId => execute(() => crownsApi.defend(serverId, regionId)),
    onWar: (fromRegionId, regionId, troops) => execute(() => crownsApi.declareWar(serverId, fromRegionId, regionId, troops)),
    onTreaty: (targetId, type) => execute(() => crownsApi.proposeTreaty(serverId, targetId, type)),
    onGift: (targetId, resourceType, amount) => execute(() => crownsApi.sendDiplomaticGift(serverId, targetId, resourceType, amount)),
    onRespondRequest: (requestId, accept) => execute(() => crownsApi.respondDiplomaticRequest(serverId, requestId, accept)),
    onMarriage: targetId => execute(() => crownsApi.proposeMarriage(serverId, targetId, { dowry: 160, childReligion: bootstrap.realm.religion })),
    onMission: regionId => execute(() => crownsApi.religionMission(serverId, regionId)),
    onSuppress: regionId => execute(() => crownsApi.suppressHeresy(serverId, regionId)),
    onRespondReligion: (movementId, response) => execute(() => crownsApi.respondReligion(serverId, movementId, response)),
    onVote: (councilId, vote) => execute(() => crownsApi.voteCouncil(serverId, councilId, vote)),
    onReceive: (councilId, reception) => execute(() => crownsApi.receiveCouncil(serverId, councilId, reception)),
    onCancel: actionId => execute(() => crownsApi.cancelAction(serverId, actionId))
  };
  return <main class="cc-shell">
    <header class="cc-topbar"><button class="cc-server-brand" onClick={onLeave}><span class="cc-brand-sigil"><Icon name="crown" /></span><i><small>Servidor {serverId.replace('cc-world-', '')}</small><strong>{bootstrap.realm?.name || 'Crowns and Councils'}</strong></i></button><div class="cc-season"><small>{bootstrap.season.name.replace(/^Servidor \d+ — /, '')}</small><strong>{bootstrap.season.phase === 'waiting' ? 'Aguardando sua coroa' : `Dia ${bootstrap.season.day}/${bootstrap.season.totalDays}`}</strong><span>{bootstrap.season.statusLabel}</span></div><ResourceBar realm={bootstrap.realm} /><div class={`cc-online ${online ? 'connected' : ''}`}><i />{online ? 'Online' : 'Reconectando'}</div></header>
    <section class="cc-stage"><MapView bootstrap={bootstrap} selectedId={selectedId} onSelect={setSelectedId} onReady={(controller, err) => { setMapController(controller); if (err) setError(err.message); }} />
      <div class="cc-map-title"><span>TEATRO POLÍTICO</span><strong>{bootstrap.realm?.name || `${bootstrap.world.aiRealmCount} coroas em atividade`}</strong><small>{bootstrap.expedition.active}/{bootstrap.expedition.capacity} expedições em marcha</small></div>
      <div class="cc-zoom"><button onClick={() => mapController?.zoomIn()}>+</button><button onClick={() => mapController?.zoomOut()}>−</button><button onClick={() => mapController?.fit()}>⌂</button><button onClick={() => mapController?.fitWorld()}>◎</button></div>
      {activeSection === 'map' ? <RegionPanel region={selected} realm={bootstrap.realm} action={selectedAction} nextClaim={nextClaim} expedition={bootstrap.expedition} buildings={bootstrap.buildings} busy={busy} now={now} onShowNext={() => setSelectedId(nextClaim.id)} onClaim={() => execute(() => crownsApi.claimTerritory(serverId, selected.id))} /> : null}
      {activeSection !== 'map' ? <div class="cc-section-overlay"><button class="cc-close-section" onClick={() => goMap()}>×</button>{activeSection === 'realm' ? <RealmSection {...common} /> : activeSection === 'market' ? <MarketSection bootstrap={bootstrap} busy={busy} onCreate={payload => execute(() => crownsApi.createMarketOrder(serverId, payload))} onAccept={id => execute(() => crownsApi.acceptMarketOrder(serverId, id))} onCancel={id => execute(() => crownsApi.cancelMarketOrder(serverId, id))} /> : <JournalSection items={journal} realm={bootstrap.realm} busy={busy} onPublish={payload => execute(() => crownsApi.publishArticle(serverId, payload))} />}</div> : null}
      {error && bootstrap.realm ? <button class="cc-toast" onClick={() => setError('')}>{error}<span>×</span></button> : null}
    </section>
    <nav class="cc-command-dock">{NAV_ITEMS.map(item => <button key={item.id} class={activeSection === item.id ? 'active' : ''} onClick={() => setActiveSection(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
    {!bootstrap.realm && ['open', 'waiting'].includes(bootstrap.season.phase) ? <RealmModal selected={selected?.ownerRealmId || selected?.status !== 'neutral' ? null : selected} regions={bootstrap.regions} colors={bootstrap.customization.availableColors} religions={bootstrap.customization.religions} busy={busy} error={error} onSelect={setSelectedId} onSubmit={payload => execute(() => crownsApi.createRealm(serverId, payload))} /> : null}
    {bootstrap.season.phase === 'ended' ? <Winners season={bootstrap.season} winners={bootstrap.winners} onServers={onLeave} /> : null}
  </main>;
}

function App() {
  const [serverId, setServerId] = useState(null);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadServers = useCallback(async () => { setLoading(true); setError(''); try { const data = await crownsApi.servers(); setServers(data.servers || []); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { loadServers(); }, [loadServers]);
  if (serverId) return <Game serverId={serverId} onLeave={() => { setServerId(null); loadServers(); }} />;
  return <Lobby servers={servers} loading={loading} error={error} onRefresh={loadServers} onEnter={setServerId} />;
}

const appRoot = document.getElementById('app');
appRoot.replaceChildren();
render(<App />, appRoot);
