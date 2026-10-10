create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,            -- call id from Vaani
  caller_number text,
  caller_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_sec int,
  after_hours boolean not null default false,  -- outside 10am-7pm IST
  first_response_ms int,                       -- pickup/first reply latency
  transcript jsonb not null default '[]',
  state jsonb not null default '{}',           -- extracted fields, five criteria, flags
  status text not null default 'in_progress'
    check (status in ('in_progress','qualified','declined','borderline','escalated','missed','incomplete')),
  reason text,
  price_asked boolean not null default false,
  price_blocked_count int not null default 0,  -- times the guardrail rewrote a reply (should stay ~0)
  hubspot_contact_id text,
  hubspot_deal_id text,
  finalized_at timestamptz
);
create index if not exists calls_started_at_idx on calls (started_at desc);

create table if not exists handoffs (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references calls(id) on delete cascade,
  channel text not null default 'telegram',
  target text not null,                        -- designers | front_desk | founder
  note text not null,
  sent_at timestamptz not null default now(),
  ok boolean not null,
  error text
);

create table if not exists usage (
  call_id uuid primary key references calls(id) on delete cascade,
  call_minutes numeric not null default 0,
  gemini_input_tokens int not null default 0,
  gemini_output_tokens int not null default 0,
  telephony_cost_inr numeric not null default 0,
  speech_cost_inr numeric not null default 0,
  gemini_cost_inr numeric not null default 0,
  total_cost_inr numeric not null default 0
);

-- Server-side only (service-role key). No policies = no anon/public access.
alter table calls enable row level security;
alter table handoffs enable row level security;
alter table usage enable row level security;
