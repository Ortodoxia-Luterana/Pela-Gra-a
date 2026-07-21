const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(`/api/crowns-and-councils${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: { ...JSON_HEADERS, ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'O servidor não concluiu a ordem.');
  return payload;
}

export const crownsApi = {
  servers: () => request('/servers'),
  bootstrap: serverId => request(`/bootstrap?serverId=${encodeURIComponent(serverId)}`),
  createRealm: (serverId, payload) => request('/realm/create', { method: 'POST', body: JSON.stringify({ ...payload, serverId }) }),
  claimTerritory: (serverId, regionId) => request('/territory/claim', { method: 'POST', body: JSON.stringify({ serverId, regionId }) }),
  queueBuilding: (serverId, regionId, buildingType) => request('/buildings/queue', { method: 'POST', body: JSON.stringify({ serverId, regionId, buildingType }) }),
  recruitArmy: (serverId, regionId) => request('/armies/recruit', { method: 'POST', body: JSON.stringify({ serverId, regionId }) }),
  defend: (serverId, regionId) => request('/armies/defend', { method: 'POST', body: JSON.stringify({ serverId, regionId }) }),
  declareWar: (serverId, regionId) => request('/war/declare', { method: 'POST', body: JSON.stringify({ serverId, regionId }) }),
  proposeTreaty: (serverId, targetRealmId, treatyType) => request('/diplomacy/propose', { method: 'POST', body: JSON.stringify({ serverId, targetRealmId, treatyType }) }),
  proposeMarriage: (serverId, targetRealmId, payload = {}) => request('/marriage/propose', { method: 'POST', body: JSON.stringify({ serverId, targetRealmId, ...payload }) }),
  religionMission: (serverId, regionId) => request('/religion/mission', { method: 'POST', body: JSON.stringify({ serverId, regionId }) }),
  suppressHeresy: (serverId, regionId) => request('/religion/suppress', { method: 'POST', body: JSON.stringify({ serverId, regionId }) }),
  voteCouncil: (serverId, councilId, vote) => request('/council/vote', { method: 'POST', body: JSON.stringify({ serverId, councilId, vote }) }),
  receiveCouncil: (serverId, councilId, reception) => request('/religion/receive', { method: 'POST', body: JSON.stringify({ serverId, councilId, reception }) }),
  cancelAction: (serverId, actionId) => request('/actions/cancel', { method: 'POST', body: JSON.stringify({ serverId, actionId }) }),
  journal: serverId => request(`/journal?serverId=${encodeURIComponent(serverId)}`),
  publishArticle: (serverId, payload) => request('/journal/articles', { method: 'POST', body: JSON.stringify({ ...payload, serverId }) })
};
