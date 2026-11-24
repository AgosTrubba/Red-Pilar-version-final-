import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  CATEGORIES,
  EMERGENCY_CONTACTS,
  STATUSES,
  SUBCATEGORIES,
} from './src/server/data/localities.ts';
import {
  castVote,
  createAlert,
  deleteAlertAsOwner,
  ensureOrCreateUser,
  findNearestLocality,
  getAlertById,
  getLocalityBySlug,
  getUserProfile,
  listAlerts,
  listLocalities,
  markNotificationsRead,
  updateLocalityCoords,
  updateUserProfile,
} from './src/server/db.ts';
import { formatAlertCopy, moderateText } from './src/server/moderation.ts';
import type { AlertCategory, VoteOption } from './src/shared/types.ts';

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME: Record<string, { ext: string; type: 'image' | 'video' }> = {
  'image/jpeg': { ext: '.jpg', type: 'image' },
  'image/jpg': { ext: '.jpg', type: 'image' },
  'image/png': { ext: '.png', type: 'image' },
  'image/webp': { ext: '.webp', type: 'image' },
  'image/heic': { ext: '.heic', type: 'image' },
  'video/mp4': { ext: '.mp4', type: 'video' },
  'video/webm': { ext: '.webm', type: 'video' },
  'video/quicktime': { ext: '.mov', type: 'video' },
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const info = ALLOWED_MIME[file.mimetype];
    const ext = info ? info.ext : '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 15 * 1024 * 1024, // 15MB per file
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Usá solo cámara de fotos o videos MP4/WebM.'));
    }
  },
});

function getNeighborId(req: express.Request): string | null {
  const headerId = req.header('x-neighbor-id');
  const queryId = typeof req.query.userId === 'string' ? req.query.userId : null;
  const raw = headerId || queryId;
  if (raw && /^u[a-z0-9_-]{6,64}$/i.test(raw)) {
    return raw;
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Safely serve uploaded camera media with path confinement
  app.get('/uploads/:filename', (req, res) => {
    const rawName = path.basename(req.params.filename || '');
    const resolved = path.resolve(UPLOADS_DIR, rawName);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Archivo no encontrado' });
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  });

  // Health & config
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'Red Pilar API',
      authRequired: false,
      localitiesCount: 15,
      timestamp: Date.now(),
    });
  });

  // Emergency & municipal contacts
  app.get('/api/contacts', (_req, res) => {
    res.json({ contacts: EMERGENCY_CONTACTS });
  });

  // --- LOCALITIES ENDPOINTS ---
  app.get('/api/localities', (_req, res) => {
    const localities = listLocalities();
    res.json({ localities });
  });

  app.get('/api/localities/nearest', (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Coordenadas inválidas' });
      return;
    }
    const match = findNearestLocality(lat, lng);
    res.json(match);
  });

  app.get('/api/localities/:slug', (req, res) => {
    const locality = getLocalityBySlug(req.params.slug);
    if (!locality) {
      res.status(404).json({ error: 'Localidad no encontrada' });
      return;
    }
    res.json({ locality });
  });

  app.patch('/api/localities/:slug', (req, res) => {
    const { lat, lng, verificationNote } = req.body || {};
    const numLat = Number(lat);
    const numLng = Number(lng);

    if (
      !Number.isFinite(numLat) ||
      !Number.isFinite(numLng) ||
      numLat < -34.65 ||
      numLat > -34.25 ||
      numLng < -59.2 ||
      numLng > -58.65
    ) {
      res.status(400).json({
        error: 'Las coordenadas deben estar dentro del Partido del Pilar (Lat -34.65 a -34.25, Lng -59.20 a -58.65).',
      });
      return;
    }

    const note = typeof verificationNote === 'string' ? verificationNote.slice(0, 180).trim() : undefined;
    const updated = updateLocalityCoords(req.params.slug, Number(numLat.toFixed(4)), Number(numLng.toFixed(4)), note);
    if (!updated) {
      res.status(404).json({ error: 'Localidad no encontrada' });
      return;
    }
    res.json({ locality: updated });
  });

  // --- USERS / NEIGHBOR SESSION ENDPOINTS (NO LOGIN REQUIRED) ---
  app.post('/api/users/session', (req, res) => {
    const requestedId = typeof req.body?.userId === 'string' ? req.body.userId : getNeighborId(req);
    const user = ensureOrCreateUser(requestedId);
    res.json({ user, authRequired: false });
  });

  app.get('/api/users/me', (req, res) => {
    const id = getNeighborId(req);
    if (!id) {
      res.status(400).json({ error: 'Falta identificador de vecino (X-Neighbor-Id)' });
      return;
    }
    const user = ensureOrCreateUser(id);
    const myAlerts = listAlerts({ ownerId: user.id, includeExpired: true, viewerId: user.id });
    res.json({ user, alerts: myAlerts });
  });

  app.patch('/api/users/me', (req, res) => {
    const id = getNeighborId(req);
    if (!id) {
      res.status(400).json({ error: 'Falta identificador de vecino (X-Neighbor-Id)' });
      return;
    }

    const { alias, homeLocality, homeBarrio } = req.body || {};
    if (typeof alias === 'string' && alias.trim().length > 40) {
      res.status(400).json({ error: 'El alias puede tener hasta 40 caracteres.' });
      return;
    }
    if (typeof alias === 'string' && alias.trim()) {
      const modErr = moderateText(alias.trim());
      if (modErr) {
        res.status(400).json({ error: modErr });
        return;
      }
    }

    const user = updateUserProfile(id, {
      alias: typeof alias === 'string' ? alias : undefined,
      homeLocality: homeLocality === null || typeof homeLocality === 'string' ? homeLocality : undefined,
      homeBarrio: homeBarrio === null || typeof homeBarrio === 'string' ? homeBarrio : undefined,
    });
    res.json({ user });
  });

  app.post('/api/users/notifications/read', (req, res) => {
    const id = getNeighborId(req);
    if (!id) {
      res.status(400).json({ error: 'Falta identificador de vecino' });
      return;
    }
    markNotificationsRead(id);
    res.json({ ok: true, user: getUserProfile(id) });
  });

  // --- ALERTS ENDPOINTS ---
  app.get('/api/alerts', (req, res) => {
    const viewerId = getNeighborId(req);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const locality = typeof req.query.locality === 'string' ? req.query.locality : undefined;
    const hours = req.query.hours ? Number(req.query.hours) : undefined;
    const zonesRaw = typeof req.query.zones === 'string' ? req.query.zones : '';
    const zones = zonesRaw
      ? zonesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const alerts = listAlerts({
      q,
      category: category || undefined,
      status: status && STATUSES.includes(status as any) ? status : undefined,
      locality: locality || undefined,
      hours: Number.isFinite(hours) ? hours : undefined,
      zones,
      viewerId,
    });
    res.json({ alerts });
  });

  app.get('/api/alerts/:id', (req, res) => {
    const viewerId = getNeighborId(req);
    const alert = getAlertById(req.params.id, viewerId);
    if (!alert) {
      res.status(404).json({ error: 'Aviso no encontrado' });
      return;
    }
    const nearby = listAlerts({ locality: alert.locality, viewerId })
      .filter((a) => a.id !== alert.id)
      .slice(0, 4);
    res.json({ alert, nearby });
  });

  app.post('/api/alerts', (req, res) => {
    upload.array('media', 5)(req, res, (uploadErr) => {
      if (uploadErr) {
        res.status(400).json({ error: uploadErr.message || 'Error al subir archivos de cámara' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const cleanupFiles = () => {
        for (const f of files) {
          fs.unlink(f.path, () => {});
        }
      };

      try {
        const neighborId = getNeighborId(req) || ensureOrCreateUser(null).id;
        const { category, subcategory, zone, locality, referenceText, description, lat, lng } = req.body || {};

        if (!CATEGORIES.includes(category as AlertCategory)) {
          cleanupFiles();
          res.status(400).json({ error: 'Categoría inválida' });
          return;
        }
        const validSubs = SUBCATEGORIES[category as AlertCategory] || [];
        if (typeof subcategory !== 'string' || !validSubs.includes(subcategory)) {
          cleanupFiles();
          res.status(400).json({ error: 'Subcategoría inválida' });
          return;
        }

        if (typeof zone !== 'string' || !zone.trim() || typeof locality !== 'string' || !locality.trim()) {
          cleanupFiles();
          res.status(400).json({ error: 'Seleccioná un barrio y localidad válida' });
          return;
        }

        const rawDesc = typeof description === 'string' ? description.trim() : '';
        if (rawDesc.length < 10 || rawDesc.length > 2000) {
          cleanupFiles();
          res.status(400).json({ error: 'El detalle debe tener entre 10 y 2000 caracteres.' });
          return;
        }

        const refText = typeof referenceText === 'string' ? referenceText.trim().slice(0, 160) : '';
        const descModErr = moderateText(rawDesc);
        if (descModErr) {
          cleanupFiles();
          res.status(400).json({ error: descModErr, field: 'description' });
          return;
        }

        if (refText) {
          const refModErr = moderateText(refText);
          if (refModErr) {
            cleanupFiles();
            res.status(400).json({ error: refModErr, field: 'referenceText' });
            return;
          }
        }

        const parsedLat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : null;
        const parsedLng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : null;
        const validCoords =
          parsedLat !== null &&
          parsedLng !== null &&
          Number.isFinite(parsedLat) &&
          Number.isFinite(parsedLng) &&
          parsedLat >= -90 &&
          parsedLat <= 90 &&
          parsedLng >= -180 &&
          parsedLng <= 180;

        const formatted = formatAlertCopy({
          subcategory,
          zone: zone.trim(),
          referenceText: refText,
          rawDescription: rawDesc,
        });

        const mediaItems = files.map((f) => ({
          url: `/uploads/${path.basename(f.filename)}`,
          mimeType: f.mimetype,
          mediaType: ALLOWED_MIME[f.mimetype]?.type || 'image',
        }));

        const created = createAlert({
          category: category as AlertCategory,
          subcategory,
          title: formatted.title,
          zone: zone.trim(),
          locality: locality.trim(),
          referenceText: refText,
          description: formatted.description,
          ownerId: neighborId,
          lat: validCoords ? parsedLat : null,
          lng: validCoords ? parsedLng : null,
          media: mediaItems,
        });

        res.status(201).json({ alert: created, neighborId });
      } catch (err) {
        cleanupFiles();
        console.error('Error creating alert:', err);
        res.status(500).json({ error: 'No pudimos guardar el aviso. Intentá nuevamente.' });
      }
    });
  });

  app.post('/api/alerts/:id/vote', (req, res) => {
    const neighborId = getNeighborId(req);
    if (!neighborId) {
      res.status(400).json({ error: 'Falta identificador de vecino' });
      return;
    }

    const { option, comment } = req.body || {};
    if (!['si', 'no', 'proc', 'fin'].includes(option)) {
      res.status(400).json({ error: 'Opción de voto inválida' });
      return;
    }

    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 140) : '';
    if (cleanComment) {
      const modErr = moderateText(cleanComment);
      if (modErr) {
        res.status(400).json({ error: modErr });
        return;
      }
    }

    try {
      const result = castVote({
        alertId: req.params.id,
        userId: neighborId,
        option: option as VoteOption,
        comment: cleanComment,
      });
      res.json(result);
    } catch (err) {
      if ((err as Error).message === 'NOT_FOUND') {
        res.status(404).json({ error: 'Aviso no encontrado' });
        return;
      }
      console.error('Error casting vote:', err);
      res.status(500).json({ error: 'Error al registrar tu voto' });
    }
  });

  app.delete('/api/alerts/:id', (req, res) => {
    const neighborId = getNeighborId(req);
    if (!neighborId) {
      res.status(400).json({ error: 'Falta identificador de vecino' });
      return;
    }
    const result = deleteAlertAsOwner(req.params.id, neighborId);
    if (!result.ok) {
      res.status(result.error === 'Aviso no encontrado' ? 404 : 403).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  // Frontend serving (Vite dev middleware or built dist)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Red Pilar server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Red Pilar server:', err);
  process.exit(1);
});
