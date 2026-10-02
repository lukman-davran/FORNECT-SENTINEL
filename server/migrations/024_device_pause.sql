-- Roditeljska kontrola (V1): pauza interneta po uređaju.
--
-- Do sada je "Pauziraj internet" živjelo samo u localStorage-u
-- pregledača i na mreži nije radilo ništa. Sada je stanje na serveru,
-- ide u konfiguraciju hub-a (device_rules.paused_until), a hub ga
-- provodi preko Pi-hole grupe koja blokira sve.
--
-- Vrijeme kraja, ne boolean: pauza "do jutra" mora sama prestati i
-- kada telefon roditelja nije na mreži da je ugasi. NULL = nije
-- pauzirano.
ALTER TABLE network_devices
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;
