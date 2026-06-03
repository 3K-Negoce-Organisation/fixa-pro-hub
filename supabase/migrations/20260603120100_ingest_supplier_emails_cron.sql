-- pg_cron job for ingest-supplier-emails
-- Run per environment after deploy (replace URL and secret):

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ingest-supplier-emails';

-- Configure once per database (SQL Editor):
-- ALTER DATABASE postgres SET app.settings.supabase_functions_url = 'https://<project-ref>.supabase.co/functions/v1';
-- ALTER DATABASE postgres SET app.settings.cron_shared_secret = '<CRON_SHARED_SECRET>';

-- Then uncomment and run:
/*
SELECT cron.schedule(
  'ingest-supplier-emails',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_functions_url', true) || '/ingest-supplier-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_shared_secret', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
*/
