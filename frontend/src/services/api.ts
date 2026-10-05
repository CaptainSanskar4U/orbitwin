const BASE = "";

async function j(res: Response) {
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

export const api = {
  mission: () => fetch(`${BASE}/api/mission`).then(j),
  state: () => fetch(`${BASE}/api/state`).then(j),
  faults: () => fetch(`${BASE}/api/faults`).then(j),
  analysis: () => fetch(`${BASE}/api/analysis`).then(j),
  telemetry: () => fetch(`${BASE}/api/telemetry?limit=200`).then(j),
  events: () => fetch(`${BASE}/api/events?limit=200`).then(j),
  incidents: () => fetch(`${BASE}/api/incidents`).then(j),
  settings: () => fetch(`${BASE}/api/settings`).then(j),
  inject: (fault_type: string) =>
    fetch(`${BASE}/api/faults/inject`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fault_type }),
    }).then(j),
  recover: (iid: string) => fetch(`${BASE}/api/incidents/${iid}/recover`, { method: "POST" }).then(j),
  reset: () => fetch(`${BASE}/api/reset`, { method: "POST" }).then(j),
  explain: (iid: string) => fetch(`${BASE}/api/incidents/${iid}/explain`, { method: "POST" }).then(j),
  setKey: (key: string, model: string) =>
    fetch(`${BASE}/api/settings/ai-key`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, model }),
    }).then(j),
  reportUrl: (iid: string) => `${BASE}/api/incidents/${iid}/report`,
};
