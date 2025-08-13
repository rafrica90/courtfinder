-- Add a state column to venues and index it

alter table if exists venues
  add column if not exists state text;

create index if not exists idx_venues_state on venues(state);

-- Optional: backfill common AU state codes from address strings (best-effort)
update venues
set state = upper(regexp_replace(address, '.*\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b.*', '\1', 'i'))
where state is null and address ~* '\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b';


