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
  bootstrap: () => request('/bootstrap'),
  createRealm: payload => request('/realm/create', { method: 'POST', body: JSON.stringify(payload) }),
  claimTerritory: regionId => request('/territory/claim', { method: 'POST', body: JSON.stringify({ regionId }) }),
  cancelAction: actionId => request('/actions/cancel', { method: 'POST', body: JSON.stringify({ actionId }) }),
  journal: () => request('/journal'),
  publishArticle: payload => request('/journal/articles', { method: 'POST', body: JSON.stringify(payload) })
};
