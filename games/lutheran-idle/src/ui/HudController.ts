import type { GameStore, BootstrapState } from '../simulation/state';
import { stationById } from '../simulation/state';
import { stationDescriptions, tutorialObjectives } from '../content/stations';

type Actions = {
  collect: (stationId: string) => Promise<void>;
  upgrade: (stationId: string) => Promise<void>;
  build: (stationId: string) => Promise<void>;
  assign: (workerId: string, stationId: string) => Promise<void>;
  advanceStage: () => Promise<void>;
  claimDaily: () => Promise<void>;
  claimMission: (missionId: string) => Promise<void>;
  claimWeekly: () => Promise<void>;
  claimOffline: () => Promise<void>;
  createDistrict: (name: string) => Promise<void>;
  joinDistrict: (districtId: string) => Promise<void>;
  contribute: (amount: number) => Promise<void>;
};

const format = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

export class HudController {
  private selectedStation = 'pulpit';
  private readonly dialog = document.querySelector<HTMLDialogElement>('#panel-dialog')!;
  private readonly panelContent = document.querySelector<HTMLElement>('#panel-content')!;

  constructor(private readonly store: GameStore, private readonly actions: Actions) {
    store.subscribe((state) => this.render(state));
    this.bind();
  }

  selectStation(stationId: string): void {
    this.selectedStation = stationId;
    this.renderStation(this.store.state);
    if (window.matchMedia('(max-width: 899px)').matches) this.openPanel('station');
  }

  toast(message: string, kind: 'success' | 'error' = 'success'): void {
    const toast = document.querySelector<HTMLElement>('#toast')!;
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add('visible');
    window.setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  openPanel(name: string): void {
    this.panelContent.innerHTML = this.panelMarkup(name, this.store.state);
    if (!this.dialog.open) this.dialog.showModal();
  }

  private bind(): void {
    document.querySelector('#collect-button')?.addEventListener('click', () => void this.actions.collect('pulpit'));
    document.querySelector('#upgrade-button')?.addEventListener('click', () => void this.actions.upgrade(this.selectedStation));
    document.querySelector('#menu-button')?.addEventListener('click', () => this.openPanel('menu'));
    document.querySelector('#profile-button')?.addEventListener('click', () => this.openPanel('profile'));
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((button) => button.addEventListener('click', () => this.openPanel(button.dataset.panel || 'church')));
    document.querySelector('[data-close]')?.addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('click', (event) => { if (event.target === this.dialog) this.dialog.close(); });
    this.panelContent.addEventListener('click', (event) => void this.handlePanelClick(event));
    this.panelContent.addEventListener('submit', (event) => void this.handlePanelSubmit(event));
    window.addEventListener('lutheran:progress', (event) => {
      const progress = Number((event as CustomEvent<number>).detail || 0);
      const bar = document.querySelector<HTMLElement>('#objective-progress');
      const ready = document.querySelector<HTMLElement>('#collect-ready');
      if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
      if (ready) ready.textContent = progress >= 1 ? 'Pronto!' : `${Math.round(progress * 100)}%`;
      document.querySelector('#collect-button')?.classList.toggle('ready', progress >= 1);
    });
  }

  private async handlePanelClick(event: Event): Promise<void> {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'build') await this.actions.build(target.dataset.station || '');
    if (action === 'upgrade') await this.actions.upgrade(target.dataset.station || this.selectedStation);
    if (action === 'assign') await this.actions.assign(target.dataset.worker || '', target.dataset.station || '');
    if (action === 'advance-stage') await this.actions.advanceStage();
    if (action === 'claim-daily') await this.actions.claimDaily();
    if (action === 'claim-mission') await this.actions.claimMission(target.dataset.mission || '');
    if (action === 'claim-weekly') await this.actions.claimWeekly();
    if (action === 'claim-offline') await this.actions.claimOffline();
    if (action === 'join-district') await this.actions.joinDistrict(target.dataset.district || '');
    if (action === 'contribute') await this.actions.contribute(Number(target.dataset.amount || 50));
    if (action === 'hub') window.location.assign('/');
    if (action === 'close') this.dialog.close();
    if (this.dialog.open && action !== 'hub') this.openPanel(target.dataset.returnPanel || target.dataset.panel || 'build');
  }

  private async handlePanelSubmit(event: Event): Promise<void> {
    const form = event.target as HTMLFormElement;
    if (!form.matches('[data-district-create]')) return;
    event.preventDefault();
    const data = new FormData(form);
    await this.actions.createDistrict(String(data.get('name') || ''));
    this.openPanel('district');
  }

  private render(state: BootstrapState): void {
    document.querySelector('#boot-screen')?.classList.add('hidden');
    this.text('#offerings-value', format.format(state.economy.offerings));
    this.text('#members-value', format.format(state.population.members));
    this.text('#level-value', String(state.profile.level));
    this.text('#online-count', String(state.online));
    const tutorialComplete = state.profile.tutorialStep >= tutorialObjectives.length - 1;
    const objective = tutorialObjectives[Math.min(tutorialObjectives.length - 1, state.profile.tutorialStep)];
    this.text('#objective-title', tutorialComplete ? (state.progression.next ? `Rumo a ${state.progression.next.name}` : 'Sede distrital consolidada') : objective[0]);
    this.text('#objective-copy', tutorialComplete ? (state.progression.next ? `${state.progression.next.requirements.filter(item => item.current >= item.goal).length}/${state.progression.next.requirements.length} requisitos concluídos` : 'Continue nas missões e projetos semanais.') : objective[1]);
    const pulpit = stationById(state, 'pulpit');
    const progress = pulpit.readyCycles > 0 ? 1 : pulpit.progress;
    const bar = document.querySelector<HTMLElement>('#objective-progress');
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
    this.text('#collect-ready', progress >= 1 ? 'Pronto!' : `${Math.round(progress * 100)}%`);
    document.querySelector('#collect-button')?.classList.toggle('ready', progress >= 1);
    document.querySelector('[data-panel="offline"]')?.classList.toggle('has-reward', Boolean(state.offlineClaim));
    const retentionReady = !state.retention.checkin.claimedToday || state.retention.dailyMissions.some(mission => mission.ready && !mission.claimed) || (state.retention.weekly.ready && !state.retention.weekly.claimed);
    document.querySelector('[data-panel="missions"]')?.classList.toggle('has-reward', retentionReady);
    this.renderStation(state);
  }

  private renderStation(state: BootstrapState): void {
    const station = stationById(state, this.selectedStation);
    this.text('#station-title', station.title);
    this.text('#station-description', stationDescriptions[station.id] || 'Estação da congregação.');
    this.text('#station-level', station.built ? `${station.level}/${station.maxLevel}` : 'Não construída');
    this.text('#station-cycle', station.cycleSeconds ? `${station.cycleSeconds}s` : 'Bônus passivo');
    const worker = state.workers.find((candidate) => candidate.id === station.activeWorkerId);
    this.text('#station-worker', worker?.role || 'Sem trabalhador');
    this.text('#upgrade-cost', station.upgradeCost ? `${format.format(station.upgradeCost)} ofertas` : (station.level >= station.absoluteMaxLevel ? 'Nível máximo' : 'Avance o estágio'));
    const upgrade = document.querySelector<HTMLButtonElement>('#upgrade-button');
    if (upgrade) upgrade.disabled = !station.built || station.upgradeCost === null;
  }

  private panelMarkup(name: string, state: BootstrapState): string {
    if (name === 'church') return `<p class="eyebrow">CONGREGAÇÃO</p><h2>${escape(state.profile.congregationName)}</h2><p>Toque em uma estação no ambiente para ver detalhes. O púlpito já está produzindo.</p><button class="panel-button" data-action="close">Voltar ao jogo</button>`;
    if (name === 'station') return this.stationMarkup(state);
    if (name === 'build') return this.buildMarkup(state);
    if (name === 'team') return this.teamMarkup(state);
    if (name === 'members') return this.membersMarkup(state);
    if (name === 'district') return this.districtMarkup(state);
    if (name === 'offline') return this.offlineMarkup(state);
    if (name === 'missions') return this.missionsMarkup(state);
    if (name === 'profile') return this.profileMarkup(state);
    return `<p class="eyebrow">MENU</p><h2>Lutheran Idle</h2><div class="menu-list"><button data-action="hub">Voltar ao Game Hub</button><button data-action="close">Continuar jogando</button></div><p class="panel-footnote">Save v${state.profile.revision} sincronizado com o servidor.</p>`;
  }

  private buildMarkup(state: BootstrapState): string {
    const artId = (stationId: string) => stationId === 'entrance' ? 'reception' : stationId;
    const cards = state.stations.map((station) => `
      <article class="station-card ${station.built ? 'built' : ''}">
        <img src="/assets/lutheran-idle/assets/game/station_${artId(station.id)}_l1.png" alt="${escape(station.title)}" />
        <div><h3>${escape(station.title)}</h3><p>${escape(stationDescriptions[station.id])}</p><strong>${station.built ? `Nível ${station.level}/${station.maxLevel}` : station.locked ? `Libera no estágio ${station.unlockStage}` : `${format.format(station.buildCost)} ofertas`}</strong></div>
        ${station.built ? (station.upgradeCost ? `<button data-action="upgrade" data-station="${station.id}" data-return-panel="build">Melhorar · ${format.format(station.upgradeCost)}</button>` : '<span class="built-mark">Limite do estágio</span>') : station.locked ? '<span class="built-mark locked">Bloqueada</span>' : `<button data-action="build" data-station="${station.id}" data-return-panel="build">Construir</button>`}
      </article>`).join('');
    return `<p class="eyebrow">CONSTRUÇÃO E MELHORIAS</p><h2>Estações · estágio ${state.profile.stage}</h2><p>Melhore todas as áreas para cumprir os requisitos da próxima expansão.</p><div class="station-list">${cards}</div>`;
  }

  private stationMarkup(state: BootstrapState): string {
    const station = stationById(state, this.selectedStation);
    const worker = state.workers.find((candidate) => candidate.id === station.activeWorkerId);
    return `<p class="eyebrow">ESTAÇÃO</p><h2>${escape(station.title)}</h2><p>${escape(stationDescriptions[station.id])}</p><div class="population-list"><div><span>Nível</span><strong>${station.built ? `${station.level}/${station.maxLevel}` : 'Bloqueada'}</strong></div><div><span>Ciclo</span><strong>${station.cycleSeconds ? `${station.cycleSeconds}s` : 'Passivo'}</strong></div><div><span>Trabalhador</span><strong>${escape(worker?.role || 'Nenhum')}</strong></div></div>${station.built && station.upgradeCost ? `<button class="panel-button" data-action="upgrade" data-station="${station.id}" data-return-panel="station">Melhorar · ${format.format(station.upgradeCost)} ofertas</button>` : ''}`;
  }

  private teamMarkup(state: BootstrapState): string {
    return `<p class="eyebrow">EQUIPE</p><h2>Trabalhadores</h2><div class="worker-list">${state.workers.map((worker) => {
      const eligible = worker.role === 'Pastor' ? ['pulpit', 'altar'] : ['reception', 'catechesis'];
      const buttons = eligible.map((stationId) => {
        const station = stationById(state, stationId);
        return station.built ? `<button data-action="assign" data-worker="${worker.id}" data-station="${stationId}" data-return-panel="team">${worker.assignedStation === stationId ? 'Alocado em' : 'Alocar em'} ${escape(station.title)}</button>` : '';
      }).join('');
      return `<article><div class="worker-portrait">${worker.role.slice(0, 1)}</div><div><h3>${escape(worker.role)}</h3><p>Nível ${worker.level} · ${escape(worker.specialty)}</p><div class="compact-actions">${buttons}</div></div></article>`;
    }).join('')}</div>`;
  }

  private membersMarkup(state: BootstrapState): string {
    const rows = Object.entries(state.population).map(([key, value]) => `<div><span>${escape({ visitors: 'Visitantes', attendees: 'Frequentadores', catechumens: 'Catecúmenos', members: 'Membros', volunteers: 'Voluntários' }[key as keyof typeof state.population])}</span><strong>${format.format(value)}</strong></div>`).join('');
    return `<p class="eyebrow">COMUNIDADE</p><h2>Pessoas</h2><div class="population-list">${rows}</div><p class="panel-footnote">Visitantes entram, participam e avançam pela catequese. Nenhuma pessoa existe apenas como moeda visual.</p>`;
  }

  private districtMarkup(state: BootstrapState): string {
    if (state.district) {
      const percent = Math.min(100, Math.round(state.district.project.total / state.district.project.goal * 100));
      return `<p class="eyebrow">DISTRITO ONLINE</p><h2>${escape(state.district.name)}</h2><p>${escape(state.district.role)} · ${state.district.members.length} membros</p><div class="district-project"><span>Projeto semanal</span><strong>${format.format(state.district.project.total)} / ${format.format(state.district.project.goal)}</strong><div><i style="width:${percent}%"></i></div></div><div class="compact-actions"><button data-action="contribute" data-amount="50" data-return-panel="district">Contribuir 50</button><button data-action="contribute" data-amount="200" data-return-panel="district">Contribuir 200</button></div><ol class="district-ranking">${state.district.members.map((member) => `<li><span>${escape(member.player)}</span><strong>${format.format(member.contribution)}</strong></li>`).join('')}</ol>`;
    }
    return `<p class="eyebrow">DISTRITO ONLINE</p><h2>Cooperar</h2><p>O distrito acelera projetos, mas o jogo solo continua completo.</p><form data-district-create><label>Nome do novo distrito<input name="name" maxlength="36" required placeholder="Distrito da Esperança" /></label><button class="panel-button">Criar distrito</button></form><div class="district-browser">${state.openDistricts.map((district) => `<article><div><h3>${escape(district.name)}</h3><p>${district.members} membros · ${format.format(district.project.total)} pontos</p></div><button data-action="join-district" data-district="${district.id}" data-return-panel="district">Entrar</button></article>`).join('') || '<p>Seja a primeira pessoa a fundar um distrito.</p>'}</div>`;
  }

  private offlineMarkup(state: BootstrapState): string {
    if (!state.offlineClaim) return `<p class="eyebrow">PROGRESSO OFFLINE</p><h2>Tudo em dia</h2><p>Continue jogando; neste estágio a congregação acumula produção por até ${state.progression.offlineHours} horas quando você sair.</p>`;
    const hours = Math.floor(state.offlineClaim.secondsAway / 3600);
    const minutes = Math.floor(state.offlineClaim.secondsAway % 3600 / 60);
    return `<p class="eyebrow">BEM-VINDO DE VOLTA</p><h2>A congregação continuou</h2><p>Você ficou fora por ${hours ? `${hours}h ` : ''}${minutes}min.</p><div class="offline-reward"><strong>+${format.format(state.offlineClaim.offerings)}</strong><span>ofertas</span>${state.offlineClaim.members ? `<strong>+${state.offlineClaim.members}</strong><span>membros</span>` : ''}</div><button class="panel-button" data-action="claim-offline" data-return-panel="offline">Receber produção</button>`;
  }

  private missionsMarkup(state: BootstrapState): string {
    const checkin = state.retention.checkin;
    const weekly = state.retention.weekly;
    const rewardText = (reward: { offerings?: number; gems?: number; materials?: number }) => [reward.offerings ? `${format.format(reward.offerings)} ofertas` : '', reward.materials ? `${format.format(reward.materials)} materiais` : '', reward.gems ? `${reward.gems} gemas` : ''].filter(Boolean).join(' · ');
    const dailyCards = state.retention.dailyMissions.map(mission => {
      const percent = Math.min(100, Math.round(mission.current / mission.goal * 100));
      const action = mission.claimed ? '<span class="reward-status">Recebida</span>' : mission.ready ? `<button data-action="claim-mission" data-mission="${mission.id}" data-return-panel="missions">Receber</button>` : `<small>${rewardText(mission.reward)}</small>`;
      return `<article><span>${escape(mission.label)}</span><strong>${format.format(Math.min(mission.current, mission.goal))}/${format.format(mission.goal)}</strong><div><i style="width:${percent}%"></i></div>${action}</article>`;
    }).join('');
    const checkinAction = checkin.claimedToday ? '<span class="reward-status">Recebido hoje</span>' : `<button class="panel-button" data-action="claim-daily" data-return-panel="missions">Receber dia ${checkin.day}</button>`;
    const weeklyAction = weekly.claimed ? '<span class="reward-status">Semana concluída</span>' : weekly.ready ? '<button data-action="claim-weekly" data-return-panel="missions">Receber recompensa semanal</button>' : `<small>${rewardText(weekly.reward)}</small>`;
    return `<p class="eyebrow">CALENDÁRIO E RETENÇÃO</p><h2>Dia ${checkin.day} de 28</h2><section class="checkin-card"><div><strong>Check-in diário</strong><span>${rewardText(checkin.reward)}</span></div>${checkinAction}</section><h3>Missões de hoje</h3><div class="mission-list">${dailyCards}</div><h3>Projeto pessoal semanal</h3><article class="weekly-card"><span>${format.format(Math.min(weekly.current, weekly.goal))} / ${format.format(weekly.goal)} pontos</span><div><i style="width:${Math.min(100, weekly.current / weekly.goal * 100)}%"></i></div>${weeklyAction}</article>`;
  }

  private profileMarkup(state: BootstrapState): string {
    const next = state.progression.next;
    const requirements = next ? next.requirements.map(item => `<article><span>${escape(item.label)}</span><strong>${item.goal === 0 ? 'Concluído' : `${format.format(Math.min(item.current, item.goal))}/${format.format(item.goal)}`}</strong><div><i style="width:${item.goal === 0 ? 100 : Math.min(100, item.current / item.goal * 100)}%"></i></div></article>`).join('') : '';
    const advance = next ? `<section class="stage-roadmap"><p class="eyebrow">PRÓXIMO ESTÁGIO</p><h3>${escape(next.name)}</h3><div class="mission-list">${requirements}</div><button class="panel-button" data-action="advance-stage" data-return-panel="profile" ${next.ready ? '' : 'disabled'}>Expandir congregação · ${format.format(next.requirement.offerings)} ofertas</button></section>` : '<section class="stage-roadmap"><h3>Estágio máximo atual</h3><p>A Sede distrital foi alcançada. Missões, temporadas e ranking continuam ativos.</p></section>';
    return `<p class="eyebrow">PERFIL E PROGRESSÃO</p><h2>${escape(state.profile.congregationName)}</h2><div class="profile-summary"><strong>Nível ${state.profile.level}</strong><span>${format.format(state.profile.xp)} XP</span><span>Estágio ${state.profile.stage}: ${escape(state.progression.current.name)}</span><span>Limite das estações: nível ${state.progression.levelCap}</span></div>${advance}<h3>Ranking de congregações</h3><ol class="district-ranking">${state.rankings.slice(0, 8).map((row) => `<li><span>#${row.rank} ${escape(row.congregationName)}<small>${escape(row.player)}</small></span><strong>${row.members} membros</strong></li>`).join('')}</ol>`;
  }

  private text(selector: string, value: string): void {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }
}
