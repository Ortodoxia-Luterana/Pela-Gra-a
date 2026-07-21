import type { BootstrapState } from '../simulation/state';

const API_ROOT = '/api/lutheran-idle';

type ActionResponse = {
  ok: true;
  action: string;
  state: BootstrapState;
  reward?: Record<string, number>;
  cost?: number;
  amount?: number;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (response.status === 401) {
    window.location.assign('/login');
    throw new Error('Login necessário.');
  }
  if (response.status === 403) {
    window.location.assign('/');
    throw new Error('Abra o jogo pelo Hub.');
  }
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || 'O servidor recusou a ação.');
  return payload as T;
}

const post = <T>(path: string, payload: Record<string, unknown>): Promise<T> => request<T>(path, {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const api = {
  bootstrap: (): Promise<BootstrapState> => request('/bootstrap'),
  collect: (stationId: string): Promise<ActionResponse> => post('/collect', { stationId, idempotencyKey: crypto.randomUUID() }),
  upgrade: (stationId: string): Promise<ActionResponse> => post('/upgrade', { stationId }),
  build: (stationId: string): Promise<ActionResponse> => post('/build', { stationId }),
  assignWorker: (workerId: string, stationId: string): Promise<ActionResponse> => post('/assign-worker', { workerId, stationId }),
  advanceStage: (): Promise<ActionResponse> => post('/advance-stage', {}),
  claimDaily: (): Promise<ActionResponse> => post('/daily-claim', {}),
  claimMission: (missionId: string): Promise<ActionResponse> => post('/mission-claim', { missionId }),
  claimWeekly: (): Promise<ActionResponse> => post('/weekly-claim', {}),
  claimOffline: (): Promise<ActionResponse> => post('/offline-claim', { idempotencyKey: crypto.randomUUID() }),
  createDistrict: (name: string): Promise<ActionResponse> => post('/district/create', { name, crest: 'rosa-madeira' }),
  joinDistrict: (districtId: string): Promise<ActionResponse> => post('/district/join', { districtId }),
  contribute: (amount: number): Promise<ActionResponse> => post('/district/contribute', { amount })
};
