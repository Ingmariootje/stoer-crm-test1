-- Techkwadraat CRM 2.7
-- Documenten + contactgeschiedenis/mailtjes
-- Plak dit in Supabase > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  document_type text default 'Overig',
  status text default 'Concept',
  file_name text,
  file_path text,
  file_url text,
  created_at timestamp with time zone default now()
);

create table if not exists contact_moments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  contact_type text not null default 'Notitie',
  contact_date date not null default current_date,
  contact_person text,
  direction text,
  subject text not null,
  summary text,
  created_at timestamp with time zone default now()
);

alter table documents enable row level security;
alter table contact_moments enable row level security;

-- Policies opnieuw aanmaken zodat het script veilig opnieuw gedraaid kan worden.
drop policy if exists "public read documents" on documents;
drop policy if exists "public insert documents" on documents;
drop policy if exists "public update documents" on documents;
drop policy if exists "public delete documents" on documents;

create policy "public read documents" on documents for select using (true);
create policy "public insert documents" on documents for insert with check (true);
create policy "public update documents" on documents for update using (true);
create policy "public delete documents" on documents for delete using (true);

drop policy if exists "public read contact_moments" on contact_moments;
drop policy if exists "public insert contact_moments" on contact_moments;
drop policy if exists "public update contact_moments" on contact_moments;
drop policy if exists "public delete contact_moments" on contact_moments;

create policy "public read contact_moments" on contact_moments for select using (true);
create policy "public insert contact_moments" on contact_moments for insert with check (true);
create policy "public update contact_moments" on contact_moments for update using (true);
create policy "public delete contact_moments" on contact_moments for delete using (true);

-- Publieke storage bucket voor testdocumenten.
-- Voor de testfase handig; later kunnen we dit beveiligen met login.
insert into storage.buckets (id, name, public)
values ('crm-documents', 'crm-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "public read crm documents" on storage.objects;
drop policy if exists "public insert crm documents" on storage.objects;
drop policy if exists "public update crm documents" on storage.objects;
drop policy if exists "public delete crm documents" on storage.objects;

create policy "public read crm documents"
on storage.objects for select
using (bucket_id = 'crm-documents');

create policy "public insert crm documents"
on storage.objects for insert
with check (bucket_id = 'crm-documents');

create policy "public update crm documents"
on storage.objects for update
using (bucket_id = 'crm-documents');

create policy "public delete crm documents"
on storage.objects for delete
using (bucket_id = 'crm-documents');
