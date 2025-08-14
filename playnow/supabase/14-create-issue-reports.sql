-- Create table to capture user-submitted issue reports
-- Includes reporter user, optional venue, page context, and message

create table if not exists issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  venue_id uuid references venues(id) on delete set null,
  page_url text,
  category text,
  message text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_issue_reports_venue on issue_reports(venue_id);
create index if not exists idx_issue_reports_user on issue_reports(user_id);

