-- Run after the private_traffic migration, before enabling collection.
-- Hourly cleanup uses a one-hour margin to retain data for at most 90 days.
create extension if not exists pg_cron;
select cron.schedule('valmiro-traffico-retention','0 * * * *',
 $$delete from private.visite where ricevuto <= now() - interval '89 days 23 hours'$$);
