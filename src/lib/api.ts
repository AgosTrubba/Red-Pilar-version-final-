import type {
  AlertItem,
  EmergencyContact,
  Locality,
  NeighborUser,
  VoteOption,
} from '../shared/types';

let memoryNeighborId = '';

export function getStoredNeighborId(): string {
  try {
    const existing = localStorage.getItem('rp_neighbor_id');
    if (existing) return existing;
  } catch {
    // ignore storage errors in restricted sandboxes
  }
  return memoryNeighborId;
}

export function setStoredNeighborId(id: string): void {
  memoryNeighborId = id;
  try {
    localStorage.setItem('rp_neighbor_id', id);
  } catch {
    // ignore storage errors
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const neighborId = getStoredNeighborId();
  const headers = new Headers(init?.headers || {});
  if (neighborId) {
    headers.set('X-Neighbor-Id', neighborId);
  }
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error de servidor (${res.status})`);
  }
  return data as T;
}

export async function initNeighborSession(): Promise<NeighborUser> {
  const existingId = getStoredNeighborId();
  const data = await requestJson<{ user: NeighborUser }>('/api/users/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: existingId || undefined }),
  });
  setStoredNeighborId(data.user.id);
  return data.user;
}

export async function fetchMyProfile(): Promise<{ user: NeighborUser; alerts: AlertItem[] }> {
  return requestJson('/api/users/me');
}

export async function updateMyProfile(payload: {
  alias?: string;
  homeLocality?: string | null;
  homeBarrio?: string | null;
}): Promise<NeighborUser> {
  const data = await requestJson<{ user: NeighborUser }>('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function markNotificationsRead(): Promise<NeighborUser> {
  const data = await requestJson<{ user: NeighborUser }>('/api/users/notifications/read', {
    method: 'POST',
  });
  return data.user;
}

export async function fetchLocalities(): Promise<Locality[]> {
  const data = await requestJson<{ localities: Locality[] }>('/api/localities');
  return data.localities;
}

export async function updateLocalityCoords(
  slug: string,
  lat: number,
  lng: number,
  verificationNote?: string
): Promise<Locality> {
  const data = await requestJson<{ locality: Locality }>(`/api/localities/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, verificationNote }),
  });
  return data.locality;
}

export async function fetchNearestLocality(lat: number, lng: number): Promise<{
  locality: Locality;
  suggestedBarrio: string;
  distanceKm: number;
}> {
  return requestJson(`/api/localities/nearest?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
}

export async function fetchContacts(): Promise<EmergencyContact[]> {
  const data = await requestJson<{ contacts: EmergencyContact[] }>('/api/contacts');
  return data.contacts;
}

export async function fetchAlerts(params: {
  q?: string;
  zones?: string[];
  locality?: string;
  category?: string;
  status?: string;
  hours?: string;
}): Promise<AlertItem[]> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.zones && params.zones.length > 0) sp.set('zones', params.zones.join(','));
  if (params.locality) sp.set('locality', params.locality);
  if (params.category) sp.set('category', params.category);
  if (params.status) sp.set('status', params.status);
  if (params.hours) sp.set('hours', params.hours);
  const qs = sp.toString();
  const data = await requestJson<{ alerts: AlertItem[] }>(`/api/alerts${qs ? `?${qs}` : ''}`);
  return data.alerts;
}

export async function fetchAlertDetail(id: string): Promise<{ alert: AlertItem; nearby: AlertItem[] }> {
  return requestJson(`/api/alerts/${encodeURIComponent(id)}`);
}

export async function createAlertSubmission(formData: FormData): Promise<{ alert: AlertItem; neighborId: string }> {
  const data = await requestJson<{ alert: AlertItem; neighborId: string }>('/api/alerts', {
    method: 'POST',
    body: formData,
  });
  if (data.neighborId) {
    setStoredNeighborId(data.neighborId);
  }
  return data;
}

export async function castAlertVote(
  alertId: string,
  option: VoteOption,
  comment: string
): Promise<{ deletedByCommunity: boolean; alert: AlertItem | null }> {
  return requestJson(`/api/alerts/${encodeURIComponent(alertId)}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ option, comment }),
  });
}

export async function deleteAlertById(alertId: string): Promise<void> {
  await requestJson(`/api/alerts/${encodeURIComponent(alertId)}`, {
    method: 'DELETE',
  });
}
