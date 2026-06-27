-- Scheduled jobs via pg_cron (development.md §9.3).
-- Idempotent: unschedule existing jobs of the same name first.

do $$
begin
  perform cron.unschedule('release-expired-reserves');
exception when others then null; end $$;

do $$
begin
  perform cron.unschedule('refresh-sold-out');
exception when others then null; end $$;

-- Every 5 minutes: release reserves whose payment window has lapsed.
select cron.schedule('release-expired-reserves', '*/5 * * * *', $$select release_expired_reserves();$$);

-- Every 15 minutes: recompute sold-out flags as a safety net.
select cron.schedule('refresh-sold-out', '*/15 * * * *', $$select refresh_sold_out();$$);
