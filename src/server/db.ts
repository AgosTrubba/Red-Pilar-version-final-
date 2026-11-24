import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { PILAR_LOCALITIES } from './data/localities.ts';
import type {
  AlertCategory,
  AlertComment,
  AlertItem,
  AlertMediaItem,
  AlertStatus,
  Locality,
  NeighborNotification,
  NeighborUser,
  VoteCounts,
  VoteOption,
} from '../shared/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'redpilar.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS localities (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    previous_lat REAL,
    previous_lng REAL,
    coords_verified INTEGER NOT NULL DEFAULT 1,
    verification_note TEXT NOT NULL DEFAULT '',
    abiertos_json TEXT NOT NULL,
    cerrados_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    alias TEXT NOT NULL DEFAULT 'Vecino de Pilar',
    home_locality TEXT,
    home_barrio TEXT,
    is_anonymous INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    zone TEXT NOT NULL,
    locality TEXT NOT NULL,
    reference_text TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'En verificación',
    owner_id TEXT NOT NULL,
    lat REAL,
    lng REAL,
    has_exact_coords INTEGER NOT NULL DEFAULT 0,
    base_si INTEGER NOT NULL DEFAULT 0,
    base_no INTEGER NOT NULL DEFAULT 0,
    base_proc INTEGER NOT NULL DEFAULT 0,
    base_fin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    terminated_at INTEGER,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS alert_media (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    media_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    alert_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    option_key TEXT NOT NULL CHECK(option_key IN ('si','no','proc','fin')),
    comment TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (alert_id, user_id),
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS legacy_comments (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    text TEXT NOT NULL,
    author_alias TEXT NOT NULL DEFAULT 'Vecino',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    alert_title TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_alerts_locality ON alerts(locality);
  CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
`);

function seedLocalitiesAndAlerts(): void {
  const now = Date.now();
  const upsertLocality = db.prepare(`
    INSERT INTO localities (
      slug, name, lat, lng, previous_lat, previous_lng, coords_verified,
      verification_note, abiertos_json, cerrados_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      abiertos_json = excluded.abiertos_json,
      cerrados_json = excluded.cerrados_json
  `);

  for (const loc of PILAR_LOCALITIES) {
    upsertLocality.run(
      loc.slug,
      loc.name,
      loc.lat,
      loc.lng,
      loc.previousLat,
      loc.previousLng,
      loc.coordsVerified ? 1 : 0,
      loc.verificationNote,
      JSON.stringify(loc.abiertos),
      JSON.stringify(loc.cerrados),
      now
    );
  }

  const countRow = db.prepare('SELECT COUNT(*) as total FROM alerts').get() as { total: number };
  if (countRow.total === 0) {
    const H = 3600 * 1000;
    const seedUserId = 'seed-community';
    db.prepare(`
      INSERT OR IGNORE INTO users (id, alias, home_locality, home_barrio, is_anonymous, created_at, last_seen_at)
      VALUES (?, 'Vecinos de Pilar', 'Pilar (Centro)', 'Pilar Centro', 1, ?, ?)
    `).run(seedUserId, now, now);

    const insertAlert = db.prepare(`
      INSERT INTO alerts (
        id, category, subcategory, title, zone, locality, reference_text, description,
        status, owner_id, lat, lng, has_exact_coords, base_si, base_no, base_proc, base_fin,
        created_at, terminated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    insertAlert.run(
      'a1',
      'Movilidad',
      'Corte de calle',
      'Corte de calle en Eva Perón',
      'Pilar Centro',
      'Pilar (Centro)',
      'Eva Perón al 800',
      'Tareas de reparación del pavimento. La calle está cortada en ambos sentidos, se puede desviar por Rivadavia.',
      'En proceso',
      seedUserId,
      -34.4589,
      -58.9136,
      1,
      6,
      0,
      11,
      1,
      now - 3 * H,
      null
    );

    insertAlert.run(
      'a2',
      'Servicios',
      'Corte de agua',
      'Corte de agua en Villa Rosa',
      'Villa Rosa Centro',
      'Villa Rosa',
      '',
      'Mantenimiento programado. Normalización estimada para las 14 hs.',
      'Terminado',
      seedUserId,
      null,
      null,
      0,
      5,
      0,
      3,
      14,
      now - 9 * H,
      now - 2 * H
    );

    insertAlert.run(
      'a3',
      'Movilidad',
      'Accidente',
      'Accidente en Ruta 8',
      'Del Viso',
      'Del Viso',
      'Km 56',
      'Km 56. Choque entre dos autos. Circular con precaución.',
      'En proceso',
      seedUserId,
      -34.4497,
      -58.7998,
      1,
      4,
      0,
      9,
      0,
      now - 1.5 * H,
      null
    );

    insertAlert.run(
      'a4',
      'Alertas vecinales',
      'Convivencia',
      'Vecinos reportan pérdida de señal de internet',
      'Pilar Centro',
      'Pilar (Centro)',
      '',
      'Desde hace una hora no hay señal de internet en varias cuadras.',
      'En verificación',
      seedUserId,
      null,
      null,
      0,
      0,
      0,
      0,
      0,
      now - 1 * H,
      null
    );

    insertAlert.run(
      'a5',
      'Pilar en tiempo real',
      'Evento o festejo',
      'Festejo con fuegos artificiales en Villa Astolfi',
      'Villa Astolfi',
      'Villa Astolfi',
      'Plaza central',
      'Plaza central. Vecinos comentan que hay un festejo con fuegos artificiales. Precaución con las mascotas.',
      'Confirmado',
      seedUserId,
      null,
      null,
      0,
      12,
      1,
      0,
      0,
      now - 5 * H,
      null
    );

    const insertComment = db.prepare(`
      INSERT INTO legacy_comments (id, alert_id, text, author_alias, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertComment.run('cm1', 'a1', 'Hay desvío por Rivadavia, pasan lento.', 'Vecino de Pilar Centro', now - 2.5 * H);
    insertComment.run('cm2', 'a5', 'Sí, se escucha desde la otra cuadra.', 'Vecina de Astolfi', now - 4.5 * H);
  }
}

seedLocalitiesAndAlerts();

interface LocalityRow {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  previous_lat: number | null;
  previous_lng: number | null;
  coords_verified: number;
  verification_note: string;
  abiertos_json: string;
  cerrados_json: string;
  updated_at: number;
  active_count?: number;
}

export function listLocalities(): Locality[] {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const rows = db
    .prepare(
      `SELECT l.*,
        (SELECT COUNT(*) FROM alerts a
         WHERE a.locality = l.name
           AND a.deleted_at IS NULL
           AND NOT (a.status = 'Terminado' AND a.terminated_at IS NOT NULL AND a.terminated_at < ?)) as active_count
       FROM localities l
       ORDER BY l.name COLLATE NOCASE ASC`
    )
    .all(cutoff) as unknown as LocalityRow[];

  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    previousLat: r.previous_lat,
    previousLng: r.previous_lng,
    coordsVerified: r.coords_verified === 1,
    verificationNote: r.verification_note,
    abiertos: JSON.parse(r.abiertos_json) as string[],
    cerrados: JSON.parse(r.cerrados_json) as string[],
    activeAlertsCount: r.active_count ?? 0,
    updatedAt: r.updated_at,
  }));
}

export function getLocalityBySlug(slug: string): Locality | null {
  const row = db.prepare('SELECT * FROM localities WHERE slug = ?').get(slug) as unknown as LocalityRow | undefined;
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    previousLat: row.previous_lat,
    previousLng: row.previous_lng,
    coordsVerified: row.coords_verified === 1,
    verificationNote: row.verification_note,
    abiertos: JSON.parse(row.abiertos_json) as string[],
    cerrados: JSON.parse(row.cerrados_json) as string[],
    updatedAt: row.updated_at,
  };
}

export function updateLocalityCoords(
  slug: string,
  lat: number,
  lng: number,
  note?: string
): Locality | null {
  const existing = getLocalityBySlug(slug);
  if (!existing) return null;
  const now = Date.now();
  db.prepare(
    `UPDATE localities
     SET lat = ?, lng = ?, coords_verified = 1, verification_note = ?, updated_at = ?
     WHERE slug = ?`
  ).run(lat, lng, note || 'Verificada manualmente en plataforma', now, slug);
  return getLocalityBySlug(slug);
}

export function findNearestLocality(lat: number, lng: number): {
  locality: Locality;
  suggestedBarrio: string;
  distanceKm: number;
} {
  const localities = listLocalities();
  let best = localities[0];
  let bestDist = Number.POSITIVE_INFINITY;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  for (const loc of localities) {
    const dLat = toRad(loc.lat - lat);
    const dLon = toRad(loc.lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(loc.lat)) * Math.sin(dLon / 2) ** 2;
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < bestDist) {
      bestDist = dist;
      best = loc;
    }
  }

  const candidate = best.name.replace(' (Centro)', '').replace('Pilar Sur', 'Villa Verde');
  const suggestedBarrio = best.abiertos.includes(candidate) ? candidate : best.abiertos[0];
  return {
    locality: best,
    suggestedBarrio,
    distanceKm: Number(bestDist.toFixed(2)),
  };
}

export function ensureOrCreateUser(requestedId?: string | null): NeighborUser {
  const now = Date.now();
  const cleanId =
    requestedId && /^u[a-z0-9_-]{6,64}$/i.test(requestedId)
      ? requestedId
      : `u_${crypto.randomBytes(8).toString('hex')}`;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(cleanId) as
    | {
        id: string;
        alias: string;
        home_locality: string | null;
        home_barrio: string | null;
        is_anonymous: number;
        created_at: number;
        last_seen_at: number;
      }
    | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO users (id, alias, home_locality, home_barrio, is_anonymous, created_at, last_seen_at)
       VALUES (?, 'Vecino de Pilar', NULL, NULL, 1, ?, ?)`
    ).run(cleanId, now, now);
  } else {
    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now, cleanId);
  }

  return getUserProfile(cleanId)!;
}

export function getUserProfile(userId: string): NeighborUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | {
        id: string;
        alias: string;
        home_locality: string | null;
        home_barrio: string | null;
        is_anonymous: number;
        created_at: number;
        last_seen_at: number;
      }
    | undefined;
  if (!row) return null;

  const alertsRow = db
    .prepare('SELECT COUNT(*) as c FROM alerts WHERE owner_id = ? AND deleted_at IS NULL')
    .get(userId) as { c: number };
  const votesRow = db
    .prepare('SELECT COUNT(*) as c FROM votes WHERE user_id = ?')
    .get(userId) as { c: number };

  const notifRows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(userId) as unknown as Array<{
    id: string;
    message: string;
    alert_title: string | null;
    is_read: number;
    created_at: number;
  }>;

  const notifications: NeighborNotification[] = notifRows.map((n) => ({
    id: n.id,
    message: n.message,
    alertTitle: n.alert_title,
    isRead: n.is_read === 1,
    createdAt: n.created_at,
  }));

  return {
    id: row.id,
    alias: row.alias,
    homeLocality: row.home_locality,
    homeBarrio: row.home_barrio,
    isAnonymous: row.is_anonymous === 1,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    stats: {
      alertsCount: alertsRow.c,
      votesCount: votesRow.c,
    },
    notifications,
  };
}

export function updateUserProfile(
  userId: string,
  updates: { alias?: string; homeLocality?: string | null; homeBarrio?: string | null }
): NeighborUser {
  ensureOrCreateUser(userId);
  const current = getUserProfile(userId)!;
  const nextAlias = updates.alias !== undefined ? updates.alias.trim() || 'Vecino de Pilar' : current.alias;
  const nextLoc = updates.homeLocality !== undefined ? updates.homeLocality : current.homeLocality;
  const nextBarrio = updates.homeBarrio !== undefined ? updates.homeBarrio : current.homeBarrio;

  db.prepare(
    `UPDATE users SET alias = ?, home_locality = ?, home_barrio = ?, last_seen_at = ? WHERE id = ?`
  ).run(nextAlias, nextLoc, nextBarrio, Date.now(), userId);

  return getUserProfile(userId)!;
}

export function markNotificationsRead(userId: string): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
}

interface AlertDbRow {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  zone: string;
  locality: string;
  reference_text: string;
  description: string;
  status: string;
  owner_id: string;
  owner_alias: string | null;
  lat: number | null;
  lng: number | null;
  has_exact_coords: number;
  base_si: number;
  base_no: number;
  base_proc: number;
  base_fin: number;
  created_at: number;
  terminated_at: number | null;
  loc_lat: number | null;
  loc_lng: number | null;
}

function hydrateAlerts(rows: AlertDbRow[], viewerId?: string | null): AlertItem[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  const mediaRows = db
    .prepare(`SELECT * FROM alert_media WHERE alert_id IN (${placeholders}) ORDER BY sort_order ASC`)
    .all(...ids) as unknown as Array<{
    id: string;
    alert_id: string;
    url: string;
    mime_type: string;
    media_type: 'image' | 'video';
  }>;

  const voteRows = db
    .prepare(
      `SELECT v.*, u.alias as user_alias
       FROM votes v
       LEFT JOIN users u ON u.id = v.user_id
       WHERE v.alert_id IN (${placeholders})
       ORDER BY v.updated_at DESC`
    )
    .all(...ids) as unknown as Array<{
    alert_id: string;
    user_id: string;
    option_key: VoteOption;
    comment: string;
    updated_at: number;
    user_alias: string | null;
  }>;

  const legacyRows = db
    .prepare(`SELECT * FROM legacy_comments WHERE alert_id IN (${placeholders}) ORDER BY created_at DESC`)
    .all(...ids) as unknown as Array<{
    id: string;
    alert_id: string;
    text: string;
    author_alias: string;
    created_at: number;
  }>;

  const mediaByAlert = new Map<string, AlertMediaItem[]>();
  for (const m of mediaRows) {
    const arr = mediaByAlert.get(m.alert_id) || [];
    arr.push({ id: m.id, url: m.url, mimeType: m.mime_type, mediaType: m.media_type });
    mediaByAlert.set(m.alert_id, arr);
  }

  const votesByAlert = new Map<string, typeof voteRows>();
  for (const v of voteRows) {
    const arr = votesByAlert.get(v.alert_id) || [];
    arr.push(v);
    votesByAlert.set(v.alert_id, arr);
  }

  const legacyByAlert = new Map<string, AlertComment[]>();
  for (const c of legacyRows) {
    const arr = legacyByAlert.get(c.alert_id) || [];
    arr.push({
      id: c.id,
      text: c.text,
      authorAlias: c.author_alias,
      createdAt: c.created_at,
    });
    legacyByAlert.set(c.alert_id, arr);
  }

  return rows.map((r) => {
    const rowVotes = votesByAlert.get(r.id) || [];
    const counts: VoteCounts = {
      si: r.base_si,
      no: r.base_no,
      proc: r.base_proc,
      fin: r.base_fin,
    };
    let myVote: { option: VoteOption; comment: string } | null = null;
    const voteComments: AlertComment[] = [];

    for (const v of rowVotes) {
      counts[v.option_key] = (counts[v.option_key] || 0) + 1;
      if (viewerId && v.user_id === viewerId) {
        myVote = { option: v.option_key, comment: v.comment };
      }
      if (v.comment && v.comment.trim()) {
        voteComments.push({
          id: `v_${v.alert_id}_${v.user_id}`,
          text: v.comment.trim(),
          authorAlias: v.user_alias || 'Vecino de Pilar',
          createdAt: v.updated_at,
        });
      }
    }

    const comments = [...voteComments, ...(legacyByAlert.get(r.id) || [])].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    const hasExact = r.has_exact_coords === 1 && r.lat !== null && r.lng !== null;
    const effectiveLat = hasExact ? (r.lat as number) : (r.loc_lat ?? -34.4587);
    const effectiveLng = hasExact ? (r.lng as number) : (r.loc_lng ?? -58.9142);

    return {
      id: r.id,
      category: r.category as AlertCategory,
      subcategory: r.subcategory,
      title: r.title,
      zone: r.zone,
      locality: r.locality,
      referenceText: r.reference_text,
      description: r.description,
      status: r.status as AlertStatus,
      ownerId: r.owner_id,
      ownerAlias: r.owner_alias || 'Vecino de Pilar',
      lat: r.lat,
      lng: r.lng,
      hasExactCoords: hasExact,
      effectiveLat,
      effectiveLng,
      votes: counts,
      totalVotes: counts.si + counts.no + counts.proc + counts.fin,
      myVote,
      media: mediaByAlert.get(r.id) || [],
      comments,
      createdAt: r.created_at,
      terminatedAt: r.terminated_at,
    };
  });
}

export interface AlertFilterParams {
  q?: string;
  zones?: string[]; // ["Pilar Centro|Pilar (Centro)", ...]
  locality?: string;
  category?: string;
  status?: string;
  hours?: number;
  ownerId?: string;
  includeExpired?: boolean;
  viewerId?: string | null;
}

export function listAlerts(filters: AlertFilterParams): AlertItem[] {
  const where: string[] = ['a.deleted_at IS NULL'];
  const args: Array<string | number> = [];

  if (!filters.includeExpired) {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    where.push("NOT (a.status = 'Terminado' AND a.terminated_at IS NOT NULL AND a.terminated_at < ?)");
    args.push(cutoff);
  }

  if (filters.q && filters.q.trim()) {
    where.push('(LOWER(a.title) LIKE ? OR LOWER(a.description) LIKE ? OR LOWER(a.zone) LIKE ?)');
    const pattern = `%${filters.q.trim().toLowerCase()}%`;
    args.push(pattern, pattern, pattern);
  }

  if (filters.category) {
    where.push('a.category = ?');
    args.push(filters.category);
  }

  if (filters.status) {
    where.push('a.status = ?');
    args.push(filters.status);
  }

  if (filters.locality) {
    where.push('a.locality = ?');
    args.push(filters.locality);
  }

  if (filters.hours && filters.hours > 0) {
    where.push('a.created_at >= ?');
    args.push(Date.now() - filters.hours * 3600 * 1000);
  }

  if (filters.ownerId) {
    where.push('a.owner_id = ?');
    args.push(filters.ownerId);
  }

  if (filters.zones && filters.zones.length > 0) {
    const zoneClauses: string[] = [];
    for (const pair of filters.zones) {
      const [barrio, loc] = pair.split('|');
      if (barrio && loc) {
        zoneClauses.push('(a.zone = ? AND a.locality = ?)');
        args.push(barrio, loc);
      }
    }
    if (zoneClauses.length > 0) {
      where.push(`(${zoneClauses.join(' OR ')})`);
    }
  }

  const sql = `
    SELECT a.*, u.alias as owner_alias, l.lat as loc_lat, l.lng as loc_lng
    FROM alerts a
    LEFT JOIN users u ON u.id = a.owner_id
    LEFT JOIN localities l ON l.name = a.locality
    WHERE ${where.join(' AND ')}
    ORDER BY a.created_at DESC
    LIMIT 200
  `;

  const rows = db.prepare(sql).all(...args) as unknown as AlertDbRow[];
  return hydrateAlerts(rows, filters.viewerId);
}

export function getAlertById(id: string, viewerId?: string | null): AlertItem | null {
  const row = db
    .prepare(
      `SELECT a.*, u.alias as owner_alias, l.lat as loc_lat, l.lng as loc_lng
       FROM alerts a
       LEFT JOIN users u ON u.id = a.owner_id
       LEFT JOIN localities l ON l.name = a.locality
       WHERE a.id = ? AND a.deleted_at IS NULL`
    )
    .get(id) as unknown as AlertDbRow | undefined;

  if (!row) return null;
  return hydrateAlerts([row], viewerId)[0] || null;
}

export function createAlert(input: {
  category: AlertCategory;
  subcategory: string;
  title: string;
  zone: string;
  locality: string;
  referenceText: string;
  description: string;
  ownerId: string;
  lat: number | null;
  lng: number | null;
  media: Array<{ url: string; mimeType: string; mediaType: 'image' | 'video' }>;
}): AlertItem {
  ensureOrCreateUser(input.ownerId);
  const id = `a_${crypto.randomBytes(5).toString('hex')}${Date.now().toString(36)}`;
  const now = Date.now();
  const hasExact = input.lat !== null && input.lng !== null ? 1 : 0;

  db.prepare(
    `INSERT INTO alerts (
      id, category, subcategory, title, zone, locality, reference_text, description,
      status, owner_id, lat, lng, has_exact_coords, base_si, base_no, base_proc, base_fin,
      created_at, terminated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'En verificación', ?, ?, ?, ?, 0, 0, 0, 0, ?, NULL, NULL)`
  ).run(
    id,
    input.category,
    input.subcategory,
    input.title,
    input.zone,
    input.locality,
    input.referenceText,
    input.description,
    input.ownerId,
    input.lat,
    input.lng,
    hasExact,
    now
  );

  const insertMedia = db.prepare(
    `INSERT INTO alert_media (id, alert_id, url, mime_type, media_type, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  input.media.slice(0, 5).forEach((m, idx) => {
    insertMedia.run(
      `m_${crypto.randomBytes(5).toString('hex')}`,
      id,
      m.url,
      m.mimeType,
      m.mediaType,
      idx,
      now
    );
  });

  return getAlertById(id, input.ownerId)!;
}

export function deleteAlertAsOwner(alertId: string, userId: string): { ok: boolean; error?: string } {
  const alert = getAlertById(alertId, userId);
  if (!alert) return { ok: false, error: 'Aviso no encontrado' };
  if (alert.ownerId !== userId) {
    return { ok: false, error: 'Solo el vecino que publicó este aviso puede eliminarlo' };
  }
  if (alert.status !== 'En verificación') {
    return { ok: false, error: 'Solo podés eliminar avisos que sigan En verificación' };
  }
  db.prepare('UPDATE alerts SET deleted_at = ? WHERE id = ?').run(Date.now(), alertId);
  return { ok: true };
}

export function castVote(params: {
  alertId: string;
  userId: string;
  option: VoteOption;
  comment: string;
}): { deletedByCommunity: boolean; alert: AlertItem | null } {
  ensureOrCreateUser(params.userId);
  const existing = getAlertById(params.alertId, params.userId);
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const now = Date.now();
  db.prepare(
    `INSERT INTO votes (alert_id, user_id, option_key, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(alert_id, user_id) DO UPDATE SET
       option_key = excluded.option_key,
       comment = excluded.comment,
       updated_at = excluded.updated_at`
  ).run(params.alertId, params.userId, params.option, params.comment.trim(), now, now);

  const updated = getAlertById(params.alertId, params.userId)!;
  const counts = updated.votes;
  const sorted = (Object.keys(counts) as VoteOption[]).sort((a, b) => counts[b] - counts[a]);
  const topKey = sorted[0];
  const secondKey = sorted[1];

  if (counts[topKey] > 0 && counts[topKey] !== counts[secondKey]) {
    if (topKey === 'no') {
      db.prepare('UPDATE alerts SET deleted_at = ? WHERE id = ?').run(now, params.alertId);
      db.prepare(
        `INSERT INTO notifications (id, user_id, message, alert_title, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`
      ).run(
        `n_${crypto.randomBytes(5).toString('hex')}`,
        updated.ownerId,
        `Tu aviso fue eliminado porque la mayoría de los vecinos votó que no era cierto: “${updated.title}”.`,
        updated.title,
        now
      );
      return { deletedByCommunity: true, alert: null };
    }

    const statusMap: Record<'si' | 'proc' | 'fin', AlertStatus> = {
      si: 'Confirmado',
      proc: 'En proceso',
      fin: 'Terminado',
    };
    const nextStatus = statusMap[topKey];
    if (nextStatus && updated.status !== nextStatus) {
      const nextTerminatedAt = nextStatus === 'Terminado' ? now : null;
      db.prepare('UPDATE alerts SET status = ?, terminated_at = ? WHERE id = ?').run(
        nextStatus,
        nextTerminatedAt,
        params.alertId
      );
    }
  }

  return {
    deletedByCommunity: false,
    alert: getAlertById(params.alertId, params.userId)!,
  };
}
