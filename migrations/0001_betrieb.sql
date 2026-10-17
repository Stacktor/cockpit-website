-- Nur Betriebsmetadaten; keine Lizenzschlüssel und keine verschlüsselten App-Inhalte.
CREATE TABLE IF NOT EXISTS person (
  id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS person_email ON person(email);
CREATE TABLE IF NOT EXISTS license_index (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_ref TEXT NOT NULL,
  person_id TEXT REFERENCES person(id), status TEXT NOT NULL, expires_at TEXT,
  device_limit INTEGER, archived_at TEXT, deleted_at TEXT, last_contact TEXT,
  last_validated TEXT, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS license_person ON license_index(person_id);
CREATE INDEX IF NOT EXISTS license_status ON license_index(status, archived_at);
CREATE TABLE IF NOT EXISTS license_device (
  license_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
  platform TEXT, version TEXT, last_contact TEXT, last_validated TEXT, status TEXT,
  PRIMARY KEY(license_id, id)
);
CREATE TABLE IF NOT EXISTS storage_owner (
  license_id TEXT PRIMARY KEY, prefix TEXT NOT NULL UNIQUE,
  bytes INTEGER, objects INTEGER, last_activity TEXT, scanned_at TEXT
);
CREATE TABLE IF NOT EXISTS operation (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, target TEXT NOT NULL,
  result TEXT, created_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS survey_dispatch (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, survey_id TEXT NOT NULL, definition TEXT NOT NULL,
  audience TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS survey_receipt (
  dispatch_id TEXT NOT NULL REFERENCES survey_dispatch(id), license_id TEXT NOT NULL,
  device_id TEXT NOT NULL, received_at TEXT, opened_at TEXT, answered_at TEXT,
  PRIMARY KEY(dispatch_id, license_id, device_id)
);
CREATE INDEX IF NOT EXISTS dispatch_created ON survey_dispatch(created_at);

CREATE TABLE IF NOT EXISTS rate_counter (
  bucket TEXT PRIMARY KEY, n INTEGER NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS license_auth_cache (
  cache_key TEXT PRIMARY KEY, info TEXT NOT NULL, expires_at INTEGER NOT NULL
);
