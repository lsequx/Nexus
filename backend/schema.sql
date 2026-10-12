-- Minimal PostgreSQL schema; inventory identities are registered at runtime.
CREATE TABLE IF NOT EXISTS devices (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE IF NOT EXISTS device_dependencies (upstream_device_id text REFERENCES devices(id), downstream_device_id text REFERENCES devices(id), PRIMARY KEY(upstream_device_id, downstream_device_id));
CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, device_id text REFERENCES devices(id), type text NOT NULL, severity text NOT NULL, timestamp timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS incidents (id text PRIMARY KEY, title text NOT NULL, severity text NOT NULL, status text DEFAULT 'Open', created_at timestamptz DEFAULT now(), root_cause_event_id text REFERENCES events(id), root_cause_reason text, root_cause_evidence jsonb DEFAULT '[]');
CREATE TABLE IF NOT EXISTS incident_history (id text PRIMARY KEY, incident_id text REFERENCES incidents(id), change_type text, severity text, root_cause_event_id text REFERENCES events(id), root_cause_reason text, root_cause_evidence jsonb DEFAULT '[]', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS incident_status_history (id text PRIMARY KEY, incident_id text REFERENCES incidents(id), old_status text, new_status text, changed_at timestamptz DEFAULT now());
