-- Techkwadraat CRM 2.9
-- Verantwoording per activiteit
-- Plak dit in Supabase > SQL Editor > New query > Run

alter table appointments
add column if not exists participant_children integer;

alter table appointments
add column if not exists participant_teachers integer;

-- Optioneel handig voor controle in Supabase zelf:
comment on column appointments.participant_children is 'Aantal kinderen dat daadwerkelijk heeft meegedaan aan deze activiteit.';
comment on column appointments.participant_teachers is 'Aantal leerkrachten dat daadwerkelijk heeft meegedaan aan deze activiteit.';
