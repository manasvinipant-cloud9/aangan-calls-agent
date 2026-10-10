-- Designer follow-up on each call, so speed-to-lead is measurable and HubSpot stays in step.
alter table calls
  add column if not exists lead_status text not null default 'new'
    check (lead_status in ('new','contacted','consultation_booked','not_a_fit')),
  add column if not exists assigned_to text,
  add column if not exists designer_notes text,
  add column if not exists contacted_at timestamptz;
create index if not exists calls_lead_status_idx on calls (lead_status, started_at);
