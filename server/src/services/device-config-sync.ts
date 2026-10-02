// Sinhronizacija konfiguracije fizičkog hub-a.
//
// Ranije je ovo pisalo samo consented_macs i tako se i zvalo. Sada
// config nosi i OTA postavke (Zadatak 1, Tačka 6) i aktivan set filter
// lista, pa je preimenovano — funkcija koja radi više nego što joj ime
// kaže je greška koja čeka.
//
// Kad se pairing_state nekog network_device-a promijeni u/iz 'paired',
// pišemo NOVI red u device_configs (uvećana verzija) čiji config_json
// sadrži sve MAC adrese tog naloga koje su trenutno uparene SA ISTIM
// fizičkim hub-om (fornect_device_id). Orange Pi agent ovo povlači
// kroz GET /api/v1/devices/:id/config i upisuje u nftables set
// 'consented_macs'.
//
// Uređaji preko kapaciteta licence se NE šalju.
//
// Zadatak 1, Tačka 4, sloj L1: bez registracije nema ni DNS ni MITM
// usluge. Uređaj koji je izvan licence ne smije završiti u
// consented_macs setu, jer bi time dobio presretanje koje licenca ne
// pokriva — a to je tiša rupa nego da se ne prikaže u panelu: nigdje
// se ne vidi, a usluga se pruža.
//
// Koje mjesto uređaj zauzima računa se isto kao u GET /network-devices:
// po redoslijedu pojavljivanja, preko svih uređaja naloga.
//
// Namjerno se ne agregira preko CIJELOG naloga bez obzira na hub:
// Pro/agency nalozi mogu imati network_devices uparene sa različitim
// fizičkim hub-ovima (npr. više lokacija), pa bi slanje tuđih MAC
// adresa pogrešnom hub-u bilo curenje podataka. Za uobičajeni Home
// slučaj (jedan nalog = jedan hub) ovo se svodi na isto ponašanje
// koje je opisano u zadatku.

import type { PoolClient } from 'pg';

/**
 * Konfiguracija koju uređaj dobije. Uvijek POTPUNA.
 *
 * Ovo je bitno i lako se propusti: uređaj ono što dobije kroz
 * GET /devices/:id/config uzima kao cijelu svoju konfiguraciju, ne kao
 * izmjenu. Kad je config sadržavao samo `consented_macs`, to se nije
 * vidjelo — postojao je jedan pisac. Čim je pisaca više (MAC-ovi, OTA
 * postavke, set filter lista), parcijalan upis tiho obriše ono što je
 * upisao onaj drugi: sačuvaš prozor održavanja i uređaj ostane bez
 * ijedne consented MAC adrese, dakle bez zaštite, a nigdje greške.
 *
 * Zato postoji jedno mjesto koje sastavlja cijeli config, i svaka
 * izmjena bilo kojeg dijela prolazi kroz njega.
 */
export interface DeviceConfig {
  consented_macs: string[];
  ota: {
    ring: string;
    paused: boolean;
    maintenance_window: { start: string; end: string; timezone: string };
  };
  filter_lists: {
    set_id: string | null;
    label: string | null;
    urls: string[];
  };
  // Roditeljska kontrola (V1): šta hub provodi za svaki uređaj.
  // Raspored i pauzu hub računa sam, svake minute, u vremenskoj zoni
  // iz ota.maintenance_window.timezone — da noćni režim počne na
  // vrijeme i kad je veza s oblakom u prekidu.
  device_rules: DeviceRule[];
}

export type BlockCategory = 'adult' | 'gambling' | 'social' | 'gaming' | 'streaming';

export interface DeviceRule {
  mac: string;
  block: BlockCategory[];
  safe_search: boolean;
  youtube_restricted: boolean;
  // Pauza do (ISO). Hub blokira sve dok ne prođe.
  paused_until: string | null;
  // Privremena dozvola u vrijeme rasporeda (ISO).
  allow_until: string | null;
  schedule: unknown;
}

interface Restrictions {
  blockAdultContent: boolean;
  blockGambling: boolean;
  blockSocialMedia: boolean;
  blockGaming: boolean;
  blockStreaming: boolean;
  safeSearch: boolean;
  youtubeRestricted: boolean;
}

/**
 * Podrazumijevane zabrane po profilu. ISTE kao getDefaultRestrictions u
 * panelu (src/app/core/services/device.ts) — uređaj mora provoditi
 * tačno ono što roditelj vidi na ekranu. Mijenja se na oba mjesta.
 */
function defaultRestrictions(profile: string | null): Restrictions {
  switch (profile) {
    case 'Admin':
    case 'Adult':
      return {
        blockAdultContent: false,
        blockGambling: false,
        blockSocialMedia: false,
        blockGaming: false,
        blockStreaming: false,
        safeSearch: false,
        youtubeRestricted: false,
      };
    case 'Teen':
      return {
        blockAdultContent: true,
        blockGambling: true,
        blockSocialMedia: false,
        blockGaming: false,
        blockStreaming: false,
        safeSearch: true,
        youtubeRestricted: false,
      };
    case 'Child':
      return {
        blockAdultContent: true,
        blockGambling: true,
        blockSocialMedia: true,
        blockGaming: false,
        blockStreaming: false,
        safeSearch: true,
        youtubeRestricted: true,
      };
    // Bez profila: bez ograničenja (samo zaštita domaćinstva).
    default:
      return {
        blockAdultContent: false,
        blockGambling: false,
        blockSocialMedia: false,
        blockGaming: false,
        blockStreaming: false,
        safeSearch: false,
        youtubeRestricted: false,
      };
  }
}

function isScheduleEnabled(schedule: unknown): boolean {
  return !!schedule && typeof schedule === 'object' && (schedule as { enabled?: unknown }).enabled === true;
}

export async function syncDeviceConfig(
  client: PoolClient,
  accountId: string,
  fornectDeviceId: string | null,
): Promise<void> {
  // Nema uparenog fizičkog hub-a za ovaj network_device — nema kome
  // pisati config, pa nema šta sinhronizovati.
  if (!fornectDeviceId) {
    return;
  }

  const { rows: pairedRows } = await client.query<{ mac_address: string }>(
    `WITH licence AS (
       SELECT coalesce(capacity, 0) AS capacity FROM devices WHERE id = $2
     ),
     ranked AS (
       SELECT nd.mac_address,
              nd.pairing_state,
              nd.fornect_device_id,
              (row_number() OVER (ORDER BY nd.created_at ASC, nd.id ASC))::int AS slot
       FROM network_devices nd
       WHERE nd.account_id = $1
     )
     SELECT mac_address
     FROM ranked
     WHERE fornect_device_id = $2
       AND pairing_state = 'paired'
       -- Kapacitet 0 znači "licenca nije poznata"; tada se ne oduzima
       -- usluga nikome, jer izmišljena granica je gora od nikakve.
       AND (
         (SELECT capacity FROM licence) = 0
         OR slot <= (SELECT capacity FROM licence)
       )
     ORDER BY mac_address`,
    [accountId, fornectDeviceId],
  );

  const consentedMacs = pairedRows.map((row) => row.mac_address);

  // OTA postavke i prozor održavanja. Vremenska zona ide UZ prozor, a
  // ne odvojeno: „02:00 lokalno" uređaju ne znači ništa dok mu se ne
  // kaže koje je to lokalno vrijeme. Uređaj koji pogodi pogrešno radi
  // update u podne.
  const { rows: otaRows } = await client.query<{
    ota_ring: string;
    ota_paused: boolean;
    maintenance_start: string;
    maintenance_end: string;
    timezone: string;
  }>(
    `SELECT d.ota_ring,
            d.ota_paused,
            to_char(d.maintenance_start, 'HH24:MI') AS maintenance_start,
            to_char(d.maintenance_end, 'HH24:MI') AS maintenance_end,
            COALESCE(a.timezone, 'Europe/Sarajevo') AS timezone
     FROM devices d
     LEFT JOIN accounts a ON a.id = d.claimed_by_account_id
     WHERE d.id = $1`,
    [fornectDeviceId],
  );

  const ota = otaRows[0];

  // Aktivan set filter lista je najnoviji red. Rollback je takođe red,
  // pa se vraćeni set ovdje pojavi kao i svaki drugi.
  const { rows: listRows } = await client.query<{
    id: string;
    label: string | null;
    urls: string[];
  }>(
    `SELECT id, label, urls
     FROM filter_list_sets
     WHERE device_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [fornectDeviceId],
  );

  const activeList = listRows[0];

  // Pravila po uređaju. Uređaj bez profila i bez ručno podešenih
  // zabrana NE dobija dječiji preset na mreži, iako ga panel tako
  // prikazuje kao polaznu tačku: auto-preuzimanje mreže bi inače
  // roditelju i TV-u u kući isti dan ugasilo društvene mreže. Takav
  // uređaj ima samo zaštitu cijelog domaćinstva (prevare, reklame).
  const { rows: ruleRows } = await client.query<{
    mac_address: string;
    profile: string | null;
    restrictions: Partial<Restrictions> | null;
    schedule: unknown;
    override_until: string | null;
    paused_until: string | null;
  }>(
    `SELECT mac_address, profile, restrictions, schedule,
            to_char(override_until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS override_until,
            to_char(paused_until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS paused_until
     FROM network_devices
     WHERE account_id = (SELECT claimed_by_account_id FROM devices WHERE id = $1)
       AND fornect_device_id = $1
     ORDER BY mac_address`,
    [fornectDeviceId],
  );

  const deviceRules: DeviceRule[] = [];

  for (const row of ruleRows) {
    const hasCategories = row.profile !== null || row.restrictions !== null;
    const scheduled = isScheduleEnabled(row.schedule);

    if (!hasCategories && !scheduled && !row.paused_until) {
      continue;
    }

    const r: Restrictions = { ...defaultRestrictions(row.profile), ...(row.restrictions ?? {}) };

    const block: BlockCategory[] = [];
    if (r.blockAdultContent) block.push('adult');
    if (r.blockGambling) block.push('gambling');
    if (r.blockSocialMedia) block.push('social');
    if (r.blockGaming) block.push('gaming');
    if (r.blockStreaming) block.push('streaming');

    deviceRules.push({
      mac: row.mac_address,
      block,
      safe_search: !!r.safeSearch,
      youtube_restricted: !!r.youtubeRestricted,
      paused_until: row.paused_until,
      allow_until: row.override_until,
      schedule: scheduled ? row.schedule : null,
    });
  }

  const config: DeviceConfig = {
    consented_macs: consentedMacs,
    ota: {
      ring: ota?.ota_ring ?? 'all',
      paused: ota?.ota_paused ?? false,
      maintenance_window: {
        start: ota?.maintenance_start ?? '02:00',
        end: ota?.maintenance_end ?? '04:00',
        timezone: ota?.timezone ?? 'Europe/Sarajevo',
      },
    },
    filter_lists: {
      set_id: activeList?.id ?? null,
      label: activeList?.label ?? null,
      // Prazan niz znači „panel nema šta reći o listama"; uređaj tada
      // ostaje na svom ugrađenom setu. Prazan niz NE znači „ugasi
      // filtriranje" — to bi bila zaštita ugašena greškom u panelu.
      urls: activeList?.urls ?? [],
    },
    device_rules: deviceRules,
  };

  const serialised = JSON.stringify(config);

  const { rows: latestRows } = await client.query<{
    version: number;
    config_json: unknown;
  }>(
    `SELECT version, config_json
     FROM device_configs
     WHERE device_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [fornectDeviceId],
  );

  const latest = latestRows[0];

  // Isti config se ne upisuje ponovo. Bez ove provjere bi svako
  // snimanje ekrana flote podiglo verziju, uređaj bi povukao identičan
  // sadržaj, a historija configa bi bila niz redova koji se ne
  // razlikuju — pa se iz nje ne bi vidjelo kad se nešto STVARNO
  // promijenilo.
  if (
    latest &&
    JSON.stringify(normalise(latest.config_json)) === JSON.stringify(normalise(config))
  ) {
    return;
  }

  await client.query(
    `INSERT INTO device_configs (device_id, version, config_json)
     VALUES ($1, $2, $3::jsonb)`,
    [fornectDeviceId, (latest?.version ?? 0) + 1, serialised],
  );
}

/**
 * Config iz baze u isti oblik ključeva kao onaj koji upravo gradimo,
 * da poređenje ne padne na redoslijedu ključeva.
 */
function normalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalise);
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;

    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((out, key) => {
        out[key] = normalise(source[key]);

        return out;
      }, {});
  }

  return value;
}
