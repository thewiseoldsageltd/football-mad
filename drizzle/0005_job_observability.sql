-- Job observability: runs + HTTP calls (no secrets stored)
CREATE TABLE IF NOT EXISTS job_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  stopped_reason text,
  meta jsonb,
  counters jsonb,
  error text
);

CREATE INDEX IF NOT EXISTS job_runs_job_name_started_idx ON job_runs (job_name, started_at DESC);

CREATE TABLE IF NOT EXISTS job_http_calls (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id varchar NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  url text NOT NULL,
  method text DEFAULT 'GET',
  status_code integer,
  duration_ms integer,
  bytes_in integer,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_http_calls_run_created_idx ON job_http_calls (run_id, created_at);
