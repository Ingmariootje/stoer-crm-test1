-- Techkwadraat CRM - login en beveiliging
-- Uitvoeren NADAT je de 6 gebruikers hebt aangemaakt of voordat je ze aanmaakt.
-- Daarna mogen alleen ingelogde Supabase Auth-gebruikers de CRM-data lezen/schrijven.

-- Bestaande publieke policies opruimen op CRM-tabellen.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations', 'team_members', 'appointments', 'notes', 'documents', 'contact_moments')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table organizations enable row level security;
alter table team_members enable row level security;
alter table appointments enable row level security;
alter table notes enable row level security;
alter table documents enable row level security;
alter table contact_moments enable row level security;

create policy "authenticated read organizations" on organizations for select to authenticated using (true);
create policy "authenticated insert organizations" on organizations for insert to authenticated with check (true);
create policy "authenticated update organizations" on organizations for update to authenticated using (true) with check (true);
create policy "authenticated delete organizations" on organizations for delete to authenticated using (true);

create policy "authenticated read team_members" on team_members for select to authenticated using (true);
create policy "authenticated insert team_members" on team_members for insert to authenticated with check (true);
create policy "authenticated update team_members" on team_members for update to authenticated using (true) with check (true);
create policy "authenticated delete team_members" on team_members for delete to authenticated using (true);

create policy "authenticated read appointments" on appointments for select to authenticated using (true);
create policy "authenticated insert appointments" on appointments for insert to authenticated with check (true);
create policy "authenticated update appointments" on appointments for update to authenticated using (true) with check (true);
create policy "authenticated delete appointments" on appointments for delete to authenticated using (true);

create policy "authenticated read notes" on notes for select to authenticated using (true);
create policy "authenticated insert notes" on notes for insert to authenticated with check (true);
create policy "authenticated update notes" on notes for update to authenticated using (true) with check (true);
create policy "authenticated delete notes" on notes for delete to authenticated using (true);

create policy "authenticated read documents" on documents for select to authenticated using (true);
create policy "authenticated insert documents" on documents for insert to authenticated with check (true);
create policy "authenticated update documents" on documents for update to authenticated using (true) with check (true);
create policy "authenticated delete documents" on documents for delete to authenticated using (true);

create policy "authenticated read contact_moments" on contact_moments for select to authenticated using (true);
create policy "authenticated insert contact_moments" on contact_moments for insert to authenticated with check (true);
create policy "authenticated update contact_moments" on contact_moments for update to authenticated using (true) with check (true);
create policy "authenticated delete contact_moments" on contact_moments for delete to authenticated using (true);

-- Documentenbucket privé maken en alleen toegankelijk voor ingelogde gebruikers.
update storage.buckets
set public = false
where id = 'crm-documents';

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname ilike '%crm documents%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "authenticated read crm documents"
on storage.objects for select to authenticated
using (bucket_id = 'crm-documents');

create policy "authenticated insert crm documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'crm-documents');

create policy "authenticated update crm documents"
on storage.objects for update to authenticated
using (bucket_id = 'crm-documents')
with check (bucket_id = 'crm-documents');

create policy "authenticated delete crm documents"
on storage.objects for delete to authenticated
using (bucket_id = 'crm-documents');
