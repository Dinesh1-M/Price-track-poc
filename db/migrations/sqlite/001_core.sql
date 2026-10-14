CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS application_state(id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pricing_cases(id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL UNIQUE, account TEXT NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pricing_versions(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES pricing_cases(id), number INTEGER NOT NULL, snapshot TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(case_id,number));
CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS integration_messages(id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, payload TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS immutable_version_snapshot BEFORE UPDATE OF snapshot ON pricing_versions WHEN OLD.snapshot <> NEW.snapshot BEGIN SELECT RAISE(ABORT,'Submitted snapshot is immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_audit BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);
