// /api/v1/app/people — Porodica: osobe i njihova pravila.
//
// Osoba nosi pravila roditeljske kontrole (profil, zabrane, raspored,
// pauza); uređaji dodijeljeni osobi ih nasljeđuju (device-config-sync.ts).
// Dodjela uređaja: PATCH /app/network-devices/:id { person_id }.
//
//   GET    /people              lista osoba s ID-jevima uređaja
//   POST   /people              nova osoba
//   PATCH  /people/:id          izmjena (bilo koje polje ispod)
//   DELETE /people/:id          brisanje; uređaji ostaju, vraćaju se na svoja pravila
//
// Svaka izmjena odmah piše novu konfiguraciju svim hub-ovima naloga, pa
// je uređaj primijeni za ~minut.

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';

import { pool } from '../db';
import { syncDeviceConfig } from '../services/device-config-sync';

const PROFILES = ['Child', 'Teen', 'Adult', 'Admin'] as const;
type Profile = (typeof PROFILES)[number];

export const RESTRICTION_KEYS = [
  'blockAdultContent',
  'blockGambling',
  'blockSocialMedia',
  'blockGaming',
  'blockStreaming',
  'blockAdsTrackers',
  'safeSearch',
  'youtubeRestricted',
] as const;

interface PersonBody {
  name?: unknown;
  profile?: unknown;
  restrictions?: unknown;
  schedule?: unknown;
  paused_until?: unknown;
  override_until?: unknown;
  position?: unknown;
}

interface PersonRow {
  id: string;
  account_id: string;
  name: string;
  profile: Profile;
  restrictions: Record<string, boolean> | null;
  schedule: unknown;
  paused_until: string | null;
  override_until: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  device_ids: string[];
}

type Parsed = { ok: true; columns: string[]; values: unknown[] } | { ok: false; error: string };

/** Provjeri tijelo i složi kolone za INSERT/UPDATE. */
function parseBody(body: PersonBody, creating: boolean): Parsed {
  const columns: string[] = [];
  const values: unknown[] = [];
  const set = (col: string, val: unknown) => {
    columns.push(col);
    values.push(val);
  };

  if (body.name !== undefined || creating) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 40) {
      return { ok: false, error: 'name je obavezno (1–40 znakova).' };
    }
    set('name', name);
  }

  if (body.profile !== undefined) {
    if (!PROFILES.includes(body.profile as Profile)) {
      return { ok: false, error: 'profile mora biti Child, Teen, Adult ili Admin.' };
    }
    set('profile', body.profile);
  }

  if (body.restrictions !== undefined) {
    if (body.restrictions === null) {
      set('restrictions', null);
    } else if (typeof body.restrictions === 'object' && !Array.isArray(body.restrictions)) {
      const clean: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(body.restrictions as Record<string, unknown>)) {
        if (!(RESTRICTION_KEYS as readonly string[]).includes(key)) {
          return { ok: false, error: `Nepoznata zabrana: ${key}.` };
        }
        if (typeof value !== 'boolean') {
          return { ok: false, error: `${key} mora biti true ili false.` };
        }
        clean[key] = value;
      }
      set('restrictions', JSON.stringify(clean));
    } else {
      return { ok: false, error: 'restrictions mora biti objekat ili null.' };
    }
  }

  if (body.schedule !== undefined) {
    if (body.schedule !== null && (typeof body.schedule !== 'object' || Array.isArray(body.schedule))) {
      return { ok: false, error: 'schedule mora biti objekat ili null.' };
    }
    set('schedule', body.schedule === null ? null : JSON.stringify(body.schedule));
  }

  for (const key of ['paused_until', 'override_until'] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (value === null) {
      set(key, null);
      continue;
    }
    if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
      return { ok: false, error: `${key} mora biti ISO vrijeme ili null.` };
    }
    set(key, new Date(value).toISOString());
  }

  if (body.position !== undefined) {
    if (!Number.isInteger(body.position)) {
      return { ok: false, error: 'position mora biti cijeli broj.' };
    }
    set('position', body.position);
  }

  return { ok: true, columns, values };
}

const SELECT_PEOPLE = `
  SELECT p.*,
         coalesce(array_agg(nd.id ORDER BY nd.created_at) FILTER (WHERE nd.id IS NOT NULL), '{}') AS device_ids
  FROM people p
  LEFT JOIN network_devices nd ON nd.person_id = p.id
  WHERE p.account_id = $1`;

/** Nova konfiguracija svim hub-ovima naloga (pravila osobe važe na svima). */
export async function syncAccountHubs(client: PoolClient, accountId: string): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    'SELECT id FROM devices WHERE claimed_by_account_id = $1',
    [accountId],
  );
  for (const hub of rows) {
    await syncDeviceConfig(client, accountId, hub.id);
  }
}

export async function peopleRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (request) => {
    const { rows } = await pool.query<PersonRow>(
      `${SELECT_PEOPLE} GROUP BY p.id ORDER BY p.position, p.created_at`,
      [request.accountId],
    );
    return rows;
  });

  fastify.post<{ Body: PersonBody }>('/', async (request, reply) => {
    const parsed = parseBody(request.body ?? {}, true);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

    const columns = ['account_id', ...parsed.columns];
    const values = [request.accountId, ...parsed.values];
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO people (${columns.join(', ')})
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      values,
    );
    const { rows: out } = await pool.query<PersonRow>(
      `${SELECT_PEOPLE} AND p.id = $2 GROUP BY p.id`,
      [request.accountId, rows[0]!.id],
    );
    // Nova osoba još nema uređaja, pa nema ni čega da se pošalje hub-u.
    return reply.code(201).send(out[0]);
  });

  fastify.patch<{ Params: { id: string }; Body: PersonBody }>('/:id', async (request, reply) => {
    const parsed = parseBody(request.body ?? {}, false);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    if (parsed.columns.length === 0) return reply.code(400).send({ error: 'Nema polja za izmjenu.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sets = parsed.columns.map((col, i) => `${col} = $${i + 1}`);
      sets.push('updated_at = now()');
      const values = [...parsed.values, request.params.id, request.accountId];
      const { rowCount } = await client.query(
        `UPDATE people SET ${sets.join(', ')}
         WHERE id = $${values.length - 1} AND account_id = $${values.length}`,
        values,
      );
      if (!rowCount) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'Osoba nije pronađena.' });
      }
      await syncAccountHubs(client, request.accountId!);
      const { rows } = await client.query<PersonRow>(
        `${SELECT_PEOPLE} AND p.id = $2 GROUP BY p.id`,
        [request.accountId, request.params.id],
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        'DELETE FROM people WHERE id = $1 AND account_id = $2',
        [request.params.id, request.accountId],
      );
      if (!rowCount) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'Osoba nije pronađena.' });
      }
      // Uređaji (person_id → NULL) se vraćaju na svoja pravila.
      await syncAccountHubs(client, request.accountId!);
      await client.query('COMMIT');
      return reply.code(204).send();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}
