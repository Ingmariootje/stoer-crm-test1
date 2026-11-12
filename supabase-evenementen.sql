-- STOER CRM – Evenementen (12 november 2026)
-- Eerst uitvoeren in Supabase SQL Editor; daarna de nieuwe websitebestanden uploaden.
-- Geen bestaande organisaties, afspraken of contactmomenten worden gewijzigd.
create extension if not exists pgcrypto;

create table if not exists public.crm_events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  event_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.crm_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  constraint crm_event_participants_unique unique (event_id, organization_id)
);

create index if not exists crm_event_participants_organization_idx
  on public.crm_event_participants (organization_id);

alter table public.crm_events enable row level security;
alter table public.crm_event_participants enable row level security;

-- Geen toegang via de anonieme browserrol: uitsluitend ingelogde CRM-gebruikers.
revoke all on table public.crm_events from anon;
revoke all on table public.crm_event_participants from anon;
grant select, insert, update, delete on table public.crm_events to authenticated;
grant select, insert, update, delete on table public.crm_event_participants to authenticated;

drop policy if exists "crm events authenticated select" on public.crm_events;
drop policy if exists "crm events authenticated insert" on public.crm_events;
drop policy if exists "crm events authenticated update" on public.crm_events;
drop policy if exists "crm events authenticated delete" on public.crm_events;
create policy "crm events authenticated select" on public.crm_events for select to authenticated using (true);
create policy "crm events authenticated insert" on public.crm_events for insert to authenticated with check (true);
create policy "crm events authenticated update" on public.crm_events for update to authenticated using (true) with check (true);
create policy "crm events authenticated delete" on public.crm_events for delete to authenticated using (true);

drop policy if exists "crm participants authenticated select" on public.crm_event_participants;
drop policy if exists "crm participants authenticated insert" on public.crm_event_participants;
drop policy if exists "crm participants authenticated update" on public.crm_event_participants;
drop policy if exists "crm participants authenticated delete" on public.crm_event_participants;
create policy "crm participants authenticated select" on public.crm_event_participants for select to authenticated using (true);
create policy "crm participants authenticated insert" on public.crm_event_participants for insert to authenticated with check (true);
create policy "crm participants authenticated update" on public.crm_event_participants for update to authenticated using (true) with check (true);
create policy "crm participants authenticated delete" on public.crm_event_participants for delete to authenticated using (true);

-- Dwing af dat alleen scholen of bedrijven aan evenementen gekoppeld worden.
create or replace function public.crm_check_event_participant_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.organizations
    where id = new.organization_id and type in ('school', 'bedrijf')
  ) then
    raise exception 'Alleen scholen en bedrijven mogen deelnemen aan evenementen';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_validate_event_participant_type on public.crm_event_participants;
create trigger crm_validate_event_participant_type
before insert or update of organization_id on public.crm_event_participants
for each row execute function public.crm_check_event_participant_type();
