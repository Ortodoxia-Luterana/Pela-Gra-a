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
  { id: 'economy', label: 'Economia' },
  { id: 'army', label: 'Exército' },
  { id: 'religion', label: 'Religião' },
  { id: 'councils', label: 'Concílios' },
  { id: 'dynasty', label: 'Dinastia' },
  { id: 'diplomacy', label: 'Diplomacia' },
  { id: 'internal', label: 'Assuntos internos' }
];
const CATEGORY_LABELS = {
  gazette: 'Edição diária', realm: 'Novo reino', campaign: 'Campanha', war: 'Guerra', peace: 'Paz',
  alliance: 'Aliança', marriage: 'Casamento', revolution: 'Revolução', article: 'Artigo dos jogadores',
  economy: 'Economia', army: 'Exército', religion: 'Religião', council: 'Concílio', world: 'Mundo'
};

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

function Lobby({ servers, loading, error, onRefresh, onEnter }) {
  return <main class="cc-lobby">
    <header class="cc-lobby-top"><a href="/" class="cc-brand"><span class="cc-crown">♔</span><span><small>CROWNS AND</small><strong>COUNCILS</strong></span></a><a href="/">Voltar ao Game Hub</a></header>
    <section class="cc-lobby-hero"><p class="cc-kicker">UMA CAMPANHA POLÍTICA, DINÁSTICA E RELIGIOSA</p><h1>Escolha seu servidor.<br />Erga sua coroa.</h1><p>Conduza um reino por 60 dias reais. Expedições, construções, recrutamentos e decisões econômicas levam tempo — cada ordem precisa ser pensada.</p></section>
    <section class="cc-how-to"><article><b>01</b><div><strong>Funde uma casa</strong><span>Escolha capital, cor exclusiva e dinastia. Todos começam cristãos.</span></div></article><article><b>02</b><div><strong>Expanda com estratégia</strong><span>Exploradores reservam o destino ao partir e chegam depois do tempo de viagem.</span></div></article><article><b>03</b><div><strong>Governe por 60 dias</strong><span>Construa, recrute, negocie e contenha revoluções e heresias.</span></div></article><article><b>04</b><div><strong>Dispute a classificação</strong><span>No fim, território, prestígio e recursos definem os vencedores.</span></div></article></section>
    <section class="cc-server-section"><div class="cc-server-heading"><div><p class="cc-kicker">TRÊS MUNDOS PERSISTENTES</p><h2>Servidores disponíveis</h2></div><button onClick={onRefresh} disabled={loading}>↻ Atualizar</button></div>
      {error ? <div class="cc-error">{error}</div> : null}
      <div class="cc-server-grid">{servers.map(server => <article class={`cc-server-card ${server.phase}`} key={server.id}>
        <div class="cc-server-number">{String(server.number).padStart(2, '0')}</div><p class="cc-kicker">{server.subtitle}</p><h3>{server.name}</h3>
        <div class="cc-server-day"><strong>{server.phase === 'waiting' ? 'AGUARDANDO INÍCIO' : `DIA ${server.day}/${server.totalDays}`}</strong><span>{server.statusLabel}</span><small>{server.phase === 'waiting' ? 'O calendário começa quando o primeiro jogador humano fundar um reino' : server.mode === 'persistente' ? `${formatTime(server.startsAt)} — ${formatTime(server.endsAt)}` : 'Teste: 5 segundos por dia · temporada de 5 minutos'}</small></div>
        <dl><div><dt>Jogadores</dt><dd>{server.playerCount}</dd></div><div><dt>Reinos de IA</dt><dd>{server.aiCount}</dd></div><div><dt>Seu reino</dt><dd>{server.realmName || 'Ainda não fundado'}</dd></div></dl>
        <button class="cc-primary" disabled={server.phase === 'ended'} onClick={() => onEnter(server.id)}>{server.phase === 'ended' ? 'Apurando vencedores' : server.joined ? 'Continuar campanha' : 'Entrar e fundar reino'}</button>
      </article>)}</div>
      {servers.some(server => server.mode !== 'persistente') ? <p class="cc-test-note">Modo de teste local: o relógio está acelerado para você verificar filas, economia e expansão sem esperar horas.</p> : null}
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

function RealmModal({ selected, regions, colors, busy, error, onSelect, onSubmit }) {
  const [name, setName] = useState('');
  const [houseName, setHouseName] = useState('');
  const [color, setColor] = useState(colors[0] || '#df5f98');
  const religion = 'Cristianismo';
  useEffect(() => { if (!colors.includes(color) && colors[0]) setColor(colors[0]); }, [colors, color]);
  return <div class="cc-modal-backdrop"><form class="cc-modal cc-parchment" onSubmit={event => { event.preventDefault(); onSubmit({ name, houseName, color, religion, regionId: selected?.id }); }}>
    <p class="cc-kicker">FUNDAÇÃO DA CASA</p><h1>Erga seu primeiro estandarte</h1><p>Dez coroas de IA já disputam este servidor. Todos começam cristãos; novas doutrinas e heresias surgirão durante a campanha.</p>
    <label>Capital inicial<select value={selected?.id || ''} onChange={event => onSelect(event.currentTarget.value || null)} required><option value="">Selecione uma região neutra</option>{regions.filter(region => !region.ownerRealmId && region.status === 'neutral').map(region => <option key={region.id} value={region.id}>{region.name} · {region.countryName}</option>)}</select></label>
    <label>Nome do reino<input value={name} onInput={event => setName(event.currentTarget.value)} maxLength="40" placeholder="Reino de Albor" required /></label>
    <label>Casa governante<input value={houseName} onInput={event => setHouseName(event.currentTarget.value)} maxLength="40" placeholder="Casa de Valença" required /></label>
    <div class="cc-starting-faith"><span>Fé inicial comum</span><strong>✝ Cristianismo</strong><small>Todos começam cristãos. Heresias e novos movimentos aparecerão durante a campanha.</small></div>
    <fieldset><legend>Cor exclusiva do estandarte</legend><small class="cc-color-note">Cores usadas por IAs ou outros jogadores não aparecem aqui.</small><div class="cc-color-row">{colors.map(item => <button key={item} type="button" aria-label={`Escolher cor ${item}`} class={color === item ? 'active' : ''} style={{ '--swatch': item }} onClick={() => setColor(item)} />)}</div></fieldset>
    {error ? <div class="cc-error">{error}</div> : null}<button class="cc-primary" disabled={!selected || busy || !colors.length}>{busy ? 'Selando juramento...' : 'Fundar reino'}</button>
  </form></div>;
}

function RegionPanel({ region, realm, action, nextClaim, onClaim, onShowNext, busy, now }) {
  if (!region) return <aside class="cc-region-panel cc-parchment empty"><p class="cc-kicker">MAPA POLÍTICO</p><h2>Escolha uma região</h2><p>Toque no mapa para ver soberania, fronteiras e rotas marítimas.</p></aside>;
  const owned = region.ownerRealmId === realm?.id;
  const canClaim = Boolean(realm && !region.ownerRealmId && region.isAdjacentToRealm && region.status === 'neutral');
  const domainLabel = owned ? 'DOMÍNIO DA COROA' : region.ownerRealmId ? (region.ownerIsAi ? 'REINO CONTROLADO PELA IA' : 'REINO ESTRANGEIRO') : region.status === 'claiming' ? 'TERRITÓRIO RESERVADO' : 'TERRITÓRIO NEUTRO';
  return <aside class="cc-region-panel cc-parchment"><div class="cc-region-heading"><div><p class="cc-kicker">{domainLabel}</p><h2>{region.name}</h2><span>{region.countryName} · {region.levelLabel}</span>{region.ownerName && !owned ? <strong class="cc-owner-name">{region.ownerName}</strong> : null}</div><b class={`cc-seal ${owned ? 'own' : ''}`}>⌘</b></div>
    <dl><div><dt>Desenvolvimento</dt><dd>{region.development}</dd></div><div><dt>Conexões</dt><dd>{region.neighborIds.length}</dd></div></dl>
    {region.routeNeighborIds?.length ? <p class="cc-route-note">⛵ {region.routeNeighborIds.length} rota(s) marítima(s) disponível(is)</p> : null}
    {region.reservedByName ? <div class="cc-order"><span>Reservada por {region.reservedByName}</span><strong>Chegada em {remaining(region.reservedUntil, now)}</strong></div> : null}
    {action ? <div class="cc-order"><span>{action.label}</span><strong>Conclui em {remaining(action.completesAt, now)}</strong></div> : null}
    {canClaim ? <button class="cc-primary" onClick={onClaim} disabled={busy}>{busy ? 'Enviando explorador...' : 'Enviar explorador e reservar'}</button> : null}
    {owned && nextClaim ? <button class="cc-secondary" onClick={onShowNext}>Ver fronteira disponível</button> : null}
    {!canClaim && !owned && !region.ownerRealmId && region.status === 'neutral' && !region.isAdjacentToRealm ? <p class="cc-muted">Ainda não há fronteira terrestre nem rota marítima desde seu reino.</p> : null}
  </aside>;
}

function Meter({ label, value, danger = false }) { return <div class={`cc-meter ${danger ? 'danger' : ''}`}><div><span>{label}</span><strong>{value}%</strong></div><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div>; }

function Orders({ actions, regions, now, busy, onCancel }) {
  return <div class="cc-orders"><div class="cc-panel-title"><div><p class="cc-kicker">FILAS DO CONSELHO</p><h2>Ordens em andamento</h2></div><span>{actions.length}/3 ocupadas</span></div>{actions.length ? actions.map(action => <article key={action.id}><div><strong>{action.label}</strong><span>{regions.find(item => item.id === action.regionId)?.name || 'Região'} · {remaining(action.completesAt, now)}</span></div><button disabled={busy} onClick={() => onCancel(action.id)}>Cancelar</button></article>) : <p class="cc-muted">Nenhuma ordem está consumindo tempo agora.</p>}</div>;
}

function RealmSection({ bootstrap, now, busy, onGoMap, onBuild, onRecruit, onDefend, onWar, onTreaty, onMarriage, onMission, onSuppress, onRespondReligion, onVote, onReceive, onCancel }) {
  const [tab, setTab] = useState('overview');
  const realm = bootstrap.realm;
  if (!realm) return <section class="cc-realm-board cc-parchment"><p class="cc-kicker">SALA DO TRONO</p><h1>Nenhuma coroa foi erguida</h1><p>Volte ao mapa e escolha uma capital.</p><button class="cc-primary" onClick={() => onGoMap()}>Escolher capital</button></section>;
  const capital = bootstrap.regions.find(region => region.id === realm.capitalRegionId);
  const frontier = bootstrap.regions.find(region => region.isAdjacentToRealm && !region.ownerRealmId && region.status === 'neutral');
  const court = realm.court;
  return <section class="cc-realm-board cc-parchment"><header class="cc-realm-header"><div><p class="cc-kicker">GOVERNO DA COROA</p><h1>{realm.name}</h1><p>{realm.houseName} · {realm.religion} · capital em {capital?.name}</p></div><div class="cc-realm-world"><strong>{bootstrap.world.aiRealmCount}</strong><span>reinos de IA</span></div></header>
    <nav class="cc-realm-tabs">{REALM_TABS.map(item => <button key={item.id} class={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    <div class="cc-realm-content">
      {tab === 'overview' ? <div><div class="cc-stat-grid"><div><span>Domínio</span><strong>{realm.regionCount} região(ões)</strong></div><div><span>Prestígio</span><strong>{realm.prestige}</strong></div><div><span>Tesouro</span><strong>{realm.treasury}</strong></div><div><span>Provisões</span><strong>{realm.provisions}</strong></div></div><Orders {...{ actions: bootstrap.actions, regions: bootstrap.regions, now, busy, onCancel }} /><div class="cc-section-actions"><button class="cc-primary" onClick={() => onGoMap(capital?.id)}>Mostrar capital</button>{frontier ? <button class="cc-secondary" onClick={() => onGoMap(frontier.id)}>Abrir fronteira</button> : null}</div></div> : null}
      {tab === 'economy' ? <div class="cc-government-panel"><div class="cc-panel-title"><div><p class="cc-kicker">ECONOMIA E CONSTRUÇÕES</p><h2>Obras da coroa</h2></div><span>Próxima coleta em {remaining(realm.nextEconomyAt, now)}</span></div><div class="cc-building-grid">{Object.entries(bootstrap.buildingCatalog).map(([type, item]) => { const level = bootstrap.buildings.filter(building => building.type === type).reduce((sum, building) => sum + building.level, 0); return <article key={type}><div><strong>{item.name}</strong><em>Níveis no reino: {level}</em></div><p>{item.description}</p><small>{item.treasury} ouro · {item.provisions} provisões · {item.hours}h</small><button disabled={busy || bootstrap.actions.length >= 3} onClick={() => onBuild(capital.id, type)}>Construir na capital</button></article>; })}</div><Orders {...{ actions: bootstrap.actions, regions: bootstrap.regions, now, busy, onCancel }} /></div> : null}
      {tab === 'army' ? <div class="cc-government-panel"><p class="cc-kicker">COMANDO MILITAR</p><h2>Exércitos da coroa</h2><div class="cc-army-list">{bootstrap.armies.map(army => <article key={army.id}><div><strong>Hoste de {army.regionName}</strong><span>{army.total} combatentes · moral {army.morale}%</span></div><dl><div><dt>Infantaria</dt><dd>{army.infantry}</dd></div><div><dt>Arqueiros</dt><dd>{army.archers}</dd></div><div><dt>Cavalaria</dt><dd>{army.cavalry}</dd></div></dl><div class="cc-inline-actions"><button class="cc-primary" disabled={busy || bootstrap.actions.length >= 3} onClick={() => onRecruit(army.regionId)}>Recrutar 320</button><button disabled={busy || bootstrap.actions.length >= 3} onClick={() => onDefend(army.regionId)}>Preparar defesa</button></div></article>)}</div>{bootstrap.attackTargets.length ? <div class="cc-decision-list"><h3>Fronteiras hostis</h3>{bootstrap.attackTargets.map(target => <article key={target.regionId}><div><strong>{target.regionName}</strong><span>Defendida por {target.realmName} · resultado calculado pelo servidor</span></div><button class="cc-danger" disabled={busy || bootstrap.actions.length >= 3} onClick={() => onWar(target.regionId)}>Declarar guerra</button></article>)}</div> : <p class="cc-muted">Nenhuma província estrangeira toca sua fronteira.</p>}<Orders {...{ actions: bootstrap.actions, regions: bootstrap.regions, now, busy, onCancel }} /></div> : null}
      {tab === 'religion' ? <div class="cc-government-panel"><p class="cc-kicker">CAPELA E DOUTRINA</p><h2>{court.religion.faith}</h2><div class="cc-meter-grid"><Meter label="Unidade religiosa" value={court.religion.unity} /><Meter label="Pressão herética" value={court.religion.heresyPressure} danger /></div><div class="cc-decision-list"><h3>Movimentos surgidos nesta temporada</h3>{bootstrap.religiousMovements.length ? bootstrap.religiousMovements.map(movement => <article key={movement.id}><div><strong>{movement.name}</strong><span>{movement.description}</span><small>Surgiu no dia {movement.startsDay} · {movement.convertedRealms} coroa(s) aderiram</small></div><div class="cc-inline-actions">{movement.response ? <b>{movement.response === 'accept' ? 'Sua coroa aderiu' : 'Sua coroa resistiu'}</b> : <><button disabled={busy} onClick={() => onRespondReligion(movement.id, 'accept')}>Aceitar doutrina</button><button class="cc-danger" disabled={busy} onClick={() => onRespondReligion(movement.id, 'resist')}>Resistir à heresia</button></>}</div></article>) : <p class="cc-muted">Ainda não surgiu nenhuma heresia organizada. Todos os reinos professam o Cristianismo.</p>}</div><div class="cc-decision-list"><h3>Religião das províncias</h3>{bootstrap.regionReligions.map(faith => <article key={faith.regionId}><div><strong>{faith.regionName}</strong><span>{faith.majorityReligion}: {faith.majorityShare}% · {faith.heresyName}: {faith.heresyShare}%</span></div><div class="cc-inline-actions"><button disabled={busy} onClick={() => onMission(faith.regionId)}>Enviar missão</button><button class="cc-danger" disabled={busy || faith.heresyShare <= 0} onClick={() => onSuppress(faith.regionId)}>Conter heresia</button></div></article>)}</div><div class="cc-revolt-warning"><strong>{court.religion.warning}</strong><p>Os movimentos surgem ao longo da temporada. Aceitar muda a confissão da corte; resistir fortalece a unidade, mas pode gerar tensão.</p></div></div> : null}
      {tab === 'councils' ? <div class="cc-government-panel"><p class="cc-kicker">ASSEMBLEIAS DA FÉ</p><h2>Concílios históricos e regionais</h2><div class="cc-decision-list">{bootstrap.councils.length ? bootstrap.councils.map(council => <article key={council.id}><div><strong>{council.name}</strong><span>{council.kind === 'historical' ? 'Concílio histórico' : 'Concílio criado pelo mundo'} · {council.theme}</span><small>Aceitar {council.totals.accept || 0} · Rejeitar {council.totals.reject || 0} · Abster {council.totals.abstain || 0}</small></div>{council.status === 'voting' ? <div class="cc-inline-actions"><button disabled={busy || council.vote} onClick={() => onVote(council.id, 'accept')}>Aprovar</button><button disabled={busy || council.vote} onClick={() => onVote(council.id, 'reject')}>Rejeitar</button><button disabled={busy || council.vote} onClick={() => onVote(council.id, 'abstain')}>Abster</button></div> : <div class="cc-inline-actions"><b>Decreto {council.result === 'accept' ? 'aprovado' : 'rejeitado'}</b><button disabled={busy || council.reception} onClick={() => onReceive(council.id, 'receive')}>Receber</button><button class="cc-danger" disabled={busy || council.reception} onClick={() => onReceive(council.id, 'resist')}>Resistir</button></div>}</article>) : <p class="cc-muted">O primeiro concílio será convocado no dia 6.</p>}</div></div> : null}
      {tab === 'dynasty' ? <div class="cc-government-panel"><p class="cc-kicker">LIVRO DA CASA</p><h2>{court.dynasty.houseName}</h2><div class="cc-court-list"><article><span>Governante</span><strong>{court.dynasty.rulerName}</strong></article><article><span>Herdeiro</span><strong>{court.dynasty.heirName}</strong></article></div><Meter label="Legitimidade dinástica" value={court.dynasty.legitimacy} /><div class="cc-decision-list"><h3>Propostas matrimoniais</h3>{court.diplomacy.knownRealms.slice(0, 6).map(other => <article key={other.id}><div><strong>{other.houseName}</strong><span>{other.name} · contrato sem união automática dos reinos</span></div><button disabled={busy || bootstrap.marriages.some(item => item.status === 'accepted' && (item.proposerName === other.name || item.targetName === other.name))} onClick={() => onMarriage(other.id)}>Propor casamento</button></article>)}</div>{bootstrap.marriages.map(item => <p class="cc-panel-note" key={item.id}>{item.proposerSpouse} + {item.targetSpouse} · dote {item.dowry} · filhos em {item.childReligion} · {item.status === 'accepted' ? 'aceito' : 'pendente'}</p>)}</div> : null}
      {tab === 'diplomacy' ? <div class="cc-government-panel"><p class="cc-kicker">CHANCELARIA</p><h2>Relações entre as coroas</h2><div class="cc-diplomacy-list">{court.diplomacy.knownRealms.map(other => <article key={other.id}><i style={{ background: other.color }} /><div><strong>{other.name}</strong><span>{other.capitalName} · {other.regionCount} região(ões) · {other.religion}</span></div><div class="cc-inline-actions"><em>{other.realmKind === 'separatist' ? 'Separatista · IA' : other.isAi ? `IA · ${other.relation}` : other.relation}</em><button disabled={busy} onClick={() => onTreaty(other.id, 'alliance')}>Aliança</button><button disabled={busy} onClick={() => onTreaty(other.id, 'non_aggression')}>Não agressão</button></div></article>)}</div>{bootstrap.treaties.map(item => <p class="cc-panel-note" key={item.id}>{item.proposerName} + {item.targetName}: {item.treatyType === 'alliance' ? 'aliança' : 'não agressão'} ({item.status === 'accepted' ? 'vigente' : 'proposto'})</p>)}</div> : null}
      {tab === 'internal' ? <div class="cc-government-panel"><p class="cc-kicker">CONSELHO INTERNO</p><h2>Coesão do reino</h2><div class="cc-meter-grid"><Meter label="Estabilidade" value={court.internal.stability} /><Meter label="Apoio popular" value={court.internal.popularSupport} /><Meter label="Risco separatista" value={court.internal.separatistRisk} danger /></div><div class={`cc-revolt-warning ${court.internal.canRevolt ? 'armed' : ''}`}><strong>{court.internal.canRevolt ? 'Revoluções estão habilitadas neste domínio' : 'O domínio ainda é pequeno para uma revolução'}</strong><p>{court.internal.explanation}</p></div></div> : null}
    </div>
  </section>;
}

function JournalSection({ items, realm, busy, onPublish }) {
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  async function submit(event) { event.preventDefault(); const published = await onPublish({ title, body }); if (published) { setTitle(''); setBody(''); } }
  return <section class="cc-journal cc-parchment"><header><div><p class="cc-kicker">GAZETA DOS REINOS</p><h1>Notícias do mundo</h1><p>Guerras, obras, recrutamentos, alianças, revoluções e textos dos jogadores.</p></div><time>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</time></header><div class="cc-journal-layout"><div class="cc-news-feed">{items.map(item => <article key={item.id} class={`cc-news-item ${item.kind} ${item.category}`}><div><span>{CATEGORY_LABELS[item.category] || item.category}</span><time>{formatTime(item.createdAt)}</time></div><h2>{item.headline}</h2><p>{item.summary}</p>{item.authorName ? <footer>Por {item.authorName}{item.realmName ? ` · ${item.realmName}` : ''}</footer> : null}</article>)}</div><form class="cc-article-form" onSubmit={submit}><p class="cc-kicker">ENVIAR À TIPOGRAFIA</p><h2>Publicar artigo</h2><label>Título<input value={title} onInput={event => setTitle(event.currentTarget.value)} maxLength="90" required disabled={!realm} /></label><label>Artigo<textarea value={body} onInput={event => setBody(event.currentTarget.value)} maxLength="1600" rows="8" required disabled={!realm} /></label><button class="cc-primary" disabled={!realm || busy}>{busy ? 'Imprimindo...' : 'Publicar no Jornal'}</button></form></div></section>;
}

function Winners({ season, winners, onServers }) {
  return <div class="cc-winners"><section class="cc-parchment"><p class="cc-kicker">TEMPORADA ENCERRADA</p><h1>As coroas vencedoras</h1><p>O servidor chegou ao dia {season.totalDays}. Ele será reiniciado 24 horas depois do encerramento.</p><ol>{winners.map(item => <li key={item.rank}><b>{item.rank}º</b><div><strong>{item.realm_name}</strong><span>{item.house_name} · {item.regions} regiões · {item.prestige} prestígio</span></div><em>{item.score} pts</em></li>)}</ol><p>Reinício previsto: {formatTime(season.resetAt)}</p><button class="cc-primary" onClick={onServers}>Voltar aos servidores</button></section></div>;
}

function Game({ serverId, onLeave }) {
  const [bootstrap, setBootstrap] = useState(null); const [journal, setJournal] = useState([]); const [selectedId, setSelectedId] = useState(null); const [activeSection, setActiveSection] = useState('map'); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [mapController, setMapController] = useState(null); const [online, setOnline] = useState(false); const [now, setNow] = useState(Date.now());
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
  if (!bootstrap) return <main class="cc-loading"><div class="cc-crown">♔</div><p>{error || 'Convocando o conselho...'}</p><button onClick={onLeave}>Voltar aos servidores</button></main>;
  const common = { bootstrap, now, busy, onGoMap: goMap, onBuild: (regionId, type) => execute(() => crownsApi.queueBuilding(serverId, regionId, type)), onRecruit: regionId => execute(() => crownsApi.recruitArmy(serverId, regionId)), onDefend: regionId => execute(() => crownsApi.defend(serverId, regionId)), onWar: regionId => execute(() => crownsApi.declareWar(serverId, regionId)), onTreaty: (targetId, type) => execute(() => crownsApi.proposeTreaty(serverId, targetId, type)), onMarriage: targetId => execute(() => crownsApi.proposeMarriage(serverId, targetId, { dowry: 160, childReligion: bootstrap.realm.religion })), onMission: regionId => execute(() => crownsApi.religionMission(serverId, regionId)), onSuppress: regionId => execute(() => crownsApi.suppressHeresy(serverId, regionId)), onRespondReligion: (movementId, response) => execute(() => crownsApi.respondReligion(serverId, movementId, response)), onVote: (councilId, vote) => execute(() => crownsApi.voteCouncil(serverId, councilId, vote)), onReceive: (councilId, reception) => execute(() => crownsApi.receiveCouncil(serverId, councilId, reception)), onCancel: actionId => execute(() => crownsApi.cancelAction(serverId, actionId)) };
  return <main class="cc-shell"><header class="cc-topbar"><button class="cc-brand cc-brand-button" onClick={onLeave}><span class="cc-crown">♔</span><span><small>SERVIDOR</small><strong>{serverId.replace('cc-world-', '0')}</strong></span></button><div class="cc-season"><small>{bootstrap.season.name}</small><strong>{bootstrap.season.phase === 'waiting' ? 'AGUARDANDO SUA COROA' : `DIA ${bootstrap.season.day}/${bootstrap.season.totalDays} · ${bootstrap.season.statusLabel}`}</strong></div><div class="cc-resources"><span><small>OURO</small><b>{bootstrap.realm?.treasury ?? 0}</b></span><span><small>PROVISÕES</small><b>{bootstrap.realm?.provisions ?? 0}</b></span><span><small>PRESTÍGIO</small><b>{bootstrap.realm?.prestige ?? 0}</b></span></div><div class={`cc-online ${online ? 'connected' : ''}`}><i />{online ? 'Online' : 'Reconectando'}</div></header>
    <section class="cc-stage"><MapView bootstrap={bootstrap} selectedId={selectedId} onSelect={setSelectedId} onReady={(controller, err) => { setMapController(controller); if (err) setError(err.message); }} /><div class="cc-map-title"><small>TEATRO POLÍTICO · DIA {bootstrap.season.day}/{bootstrap.season.totalDays}</small><strong>{bootstrap.realm?.name || `${bootstrap.world.aiRealmCount} coroas de IA em atividade`}</strong></div><div class="cc-zoom"><button onClick={() => mapController?.zoomIn()}>+</button><button onClick={() => mapController?.zoomOut()}>−</button><button onClick={() => mapController?.fit()}>⌂</button><button onClick={() => mapController?.fitWorld()} title="Ver o mundo não jogável">◎</button></div>
      {activeSection === 'map' ? <RegionPanel region={selected} realm={bootstrap.realm} action={selectedAction} nextClaim={nextClaim} busy={busy} now={now} onShowNext={() => setSelectedId(nextClaim.id)} onClaim={() => execute(() => crownsApi.claimTerritory(serverId, selected.id))} /> : null}
      {activeSection !== 'map' ? <div class="cc-section-overlay"><button class="cc-close-section" onClick={() => goMap()}>×</button>{activeSection === 'realm' ? <RealmSection {...common} /> : <JournalSection items={journal} realm={bootstrap.realm} busy={busy} onPublish={payload => execute(() => crownsApi.publishArticle(serverId, payload))} />}</div> : null}
      {error && bootstrap.realm ? <button class="cc-toast" onClick={() => setError('')}>{error}<span>×</span></button> : null}</section>
    <nav class="cc-bottom-nav">{NAV_ITEMS.map(item => <button key={item.id} class={activeSection === item.id ? 'active' : ''} onClick={() => setActiveSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
    {!bootstrap.realm && ['open', 'waiting'].includes(bootstrap.season.phase) ? <RealmModal selected={selected?.ownerRealmId || selected?.status !== 'neutral' ? null : selected} regions={bootstrap.regions} colors={bootstrap.customization.availableColors} busy={busy} error={error} onSelect={setSelectedId} onSubmit={payload => execute(() => crownsApi.createRealm(serverId, payload))} /> : null}
    {bootstrap.season.phase === 'ended' ? <Winners season={bootstrap.season} winners={bootstrap.winners} onServers={onLeave} /> : null}
  </main>;
}

function App() {
  const [serverId, setServerId] = useState(null); const [servers, setServers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const loadServers = useCallback(async () => { setLoading(true); setError(''); try { const data = await crownsApi.servers(); setServers(data.servers || []); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { loadServers(); }, [loadServers]);
  if (serverId) return <Game serverId={serverId} onLeave={() => { setServerId(null); loadServers(); }} />;
  return <Lobby servers={servers} loading={loading} error={error} onRefresh={loadServers} onEnter={setServerId} />;
}

const appRoot = document.getElementById('app');
appRoot.replaceChildren();
render(<App />, appRoot);
