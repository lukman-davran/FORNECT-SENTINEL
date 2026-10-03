-- Porodica (V1): osobe kao nosioci pravila roditeljske kontrole.
--
-- Roditelj razmišlja "Ana, 12 godina", a ne "uređaj 3". Do sada su
-- pravila (profil, zabrane, raspored, pauza) živjela samo na uređaju,
-- pa je dijete s telefonom i laptopom tražilo dva ista podešavanja, a
-- novi telefon je ostajao bez ikakvih pravila.
--
-- Osoba nosi ista polja kao uređaj. Uređaj dodijeljen osobi dobija
-- pravila OSOBE (device-config-sync.ts); uređaj bez osobe radi kao i
-- do sada, po svojim poljima. Tako postojeći klijenti ne pucaju.
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  profile text NOT NULL DEFAULT 'Child'
    CHECK (profile IN ('Child', 'Teen', 'Adult', 'Admin')),
  -- Samo odstupanja od podrazumijevanog za profil; NULL = profil.
  restrictions jsonb,
  schedule jsonb,
  paused_until timestamptz,
  override_until timestamptz,
  -- Redoslijed na ekranu "Porodica" (roditelj ga sam slaže).
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS people_account_idx ON people (account_id, position, created_at);

-- Brisanje osobe ne briše uređaj: uređaj se vraća na svoja pravila.
ALTER TABLE network_devices
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS network_devices_person_idx ON network_devices (person_id);
