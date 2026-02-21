-- Add error and bytes_in to job_http_calls so app writes never silently fail (IF NOT EXISTS for existing DBs that already have these columns)
ALTER TABLE job_http_calls ADD COLUMN IF NOT EXISTS error text;
ALTER TABLE job_http_calls ADD COLUMN IF NOT EXISTS bytes_in integer;
