export type Economy = {
  offerings: number;
  gems: number;
  materials: number;
  reputation: number;
  districtPoints: number;
};

export type Population = {
  visitors: number;
  attendees: number;
  catechumens: number;
  members: number;
  volunteers: number;
};

export type StationState = {
  id: string;
  title: string;
  level: number;
  built: boolean;
  activeWorkerId: string | null;
  cycleSeconds: number;
  readyCycles: number;
  progress: number;
  upgradeCost: number | null;
  buildCost: number;
  maxLevel: number;
};

export type WorkerState = {
  id: string;
  role: string;
  level: number;
  rarity: string;
  specialty: string;
  assignedStation: string | null;
};

export type DistrictState = {
  id: string;
  name: string;
  crest: string;
  role: string;
  contribution: number;
  project: { total: number; goal: number };
  members: Array<{ userId: string; player: string; role: string; contribution: number }>;
};

export type BootstrapState = {
  gameId: string;
  serverNow: string;
  user: { id: string; name: string; avatarData: string | null };
  profile: { congregationName: string; level: number; xp: number; stage: number; tutorialStep: number; revision: number };
  economy: Economy;
  population: Population;
  stations: StationState[];
  workers: WorkerState[];
  offlineClaim: { secondsAway: number; offerings: number; members: number; createdAt: string } | null;
  district: DistrictState | null;
  openDistricts: Array<{ id: string; name: string; crest: string; members: number; project: { total: number; goal: number } }>;
  rankings: Array<{ rank: number; player: string; congregationName: string; level: number; stage: number; members: number }>;
  online: number;
};

type Listener = (state: BootstrapState) => void;

export class GameStore {
  private value: BootstrapState | null = null;
  private readonly listeners = new Set<Listener>();

  get state(): BootstrapState {
    if (!this.value) throw new Error('O estado ainda não foi carregado.');
    return this.value;
  }

  set(next: BootstrapState): void {
    this.value = next;
    this.listeners.forEach((listener) => listener(next));
    window.dispatchEvent(new CustomEvent('lutheran:state', { detail: next }));
  }

  patch(patch: Partial<BootstrapState>): void {
    this.set({ ...this.state, ...patch });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.value) listener(this.value);
    return () => this.listeners.delete(listener);
  }
}

export const stationById = (state: BootstrapState, id: string): StationState => {
  const station = state.stations.find((candidate) => candidate.id === id);
  if (!station) throw new Error(`Estação desconhecida: ${id}`);
  return station;
};
