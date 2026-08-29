PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS providers (
  provider_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  homepage_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  provider_id TEXT,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  authority TEXT NOT NULL,
  poll_strategy TEXT NOT NULL DEFAULT 'http',
  poll_interval_seconds INTEGER NOT NULL DEFAULT 21600,
  etag TEXT,
  last_modified TEXT,
  last_status INTEGER,
  raw_hash TEXT,
  normalized_hash TEXT,
  relevant_hash TEXT,
  last_checked_at TEXT,
  last_changed_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(provider_id) REFERENCES providers(provider_id)
);

CREATE TABLE IF NOT EXISTS source_observations (
  observation_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  http_status INTEGER,
  etag TEXT,
  last_modified TEXT,
  raw_hash TEXT,
  normalized_hash TEXT,
  relevant_hash TEXT,
  changed INTEGER NOT NULL DEFAULT 0,
  storage_ref TEXT,
  FOREIGN KEY(source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_observations_source_time
  ON source_observations(source_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL,
  field TEXT NOT NULL,
  quote_text TEXT,
  selector_or_path TEXT,
  evidence_hash TEXT NOT NULL,
  FOREIGN KEY(observation_id) REFERENCES source_observations(observation_id)
);

CREATE TABLE IF NOT EXISTS facts (
  fact_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  value_json TEXT NOT NULL,
  unit TEXT,
  evidence_id TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  confidence REAL NOT NULL DEFAULT 1.0,
  verification_state TEXT NOT NULL DEFAULT 'verified',
  FOREIGN KEY(evidence_id) REFERENCES evidence(evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_facts_current
  ON facts(entity_id, field, valid_to);

CREATE TABLE IF NOT EXISTS offers (
  offer_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  product TEXT NOT NULL,
  deal_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(provider_id) REFERENCES providers(provider_id)
);

CREATE TABLE IF NOT EXISTS offer_facts (
  offer_id TEXT NOT NULL,
  fact_id TEXT NOT NULL,
  PRIMARY KEY (offer_id, fact_id),
  FOREIGN KEY(offer_id) REFERENCES offers(offer_id),
  FOREIGN KEY(fact_id) REFERENCES facts(fact_id)
);

CREATE TABLE IF NOT EXISTS derivations (
  derivation_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  formula_id TEXT NOT NULL,
  formula_version TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  value_json TEXT NOT NULL,
  computed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  profile TEXT NOT NULL,
  score REAL,
  verdict TEXT,
  reasons_json TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  FOREIGN KEY(offer_id) REFERENCES offers(offer_id)
);

CREATE TABLE IF NOT EXISTS discovery_queries (
  query_id TEXT PRIMARY KEY,
  engine TEXT NOT NULL,
  query_text TEXT NOT NULL,
  params_json TEXT NOT NULL,
  purpose TEXT NOT NULL,
  min_interval_seconds INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  paid_runs INTEGER NOT NULL DEFAULT 0,
  useful_hits INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT
);

CREATE TABLE IF NOT EXISTS search_runs (
  search_run_id TEXT PRIMARY KEY,
  query_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  serpapi_search_id TEXT,
  executed_at TEXT NOT NULL,
  from_local_cache INTEGER NOT NULL DEFAULT 0,
  response_hash TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  new_url_count INTEGER NOT NULL DEFAULT 0,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  verified_change_count INTEGER NOT NULL DEFAULT 0,
  raw_storage_ref TEXT,
  FOREIGN KEY(query_id) REFERENCES discovery_queries(query_id)
);

CREATE INDEX IF NOT EXISTS idx_search_runs_query_time
  ON search_runs(query_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS search_results (
  search_result_id TEXT PRIMARY KEY,
  search_run_id TEXT NOT NULL,
  position INTEGER,
  title TEXT,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  snippet TEXT,
  source_name TEXT,
  published_at TEXT,
  result_digest TEXT NOT NULL,
  FOREIGN KEY(search_run_id) REFERENCES search_runs(search_run_id)
);

CREATE INDEX IF NOT EXISTS idx_search_results_url
  ON search_results(canonical_url);

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  provider_hint TEXT,
  product_hint TEXT,
  change_type TEXT,
  discovered_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'unverified',
  priority REAL NOT NULL DEFAULT 0,
  official_source_url TEXT,
  notes_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS candidate_search_results (
  candidate_id TEXT NOT NULL,
  search_result_id TEXT NOT NULL,
  PRIMARY KEY(candidate_id, search_result_id),
  FOREIGN KEY(candidate_id) REFERENCES candidates(candidate_id),
  FOREIGN KEY(search_result_id) REFERENCES search_results(search_result_id)
);

CREATE TABLE IF NOT EXISTS change_events (
  change_event_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  field TEXT,
  before_json TEXT,
  after_json TEXT,
  evidence_id TEXT,
  occurred_at TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  FOREIGN KEY(evidence_id) REFERENCES evidence(evidence_id)
);

CREATE TABLE IF NOT EXISTS search_cache (
  request_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  response_json TEXT NOT NULL,
  serpapi_search_id TEXT
);
