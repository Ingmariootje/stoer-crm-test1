# STOER CRM – uitbreiding Evenementen (Girls' Day)

Datum: 12 november 2026
Bron: GitHub-repository `Ingmariootje/stoer-crm-test1`, gebaseerd op de daar beschikbare **3.4.2**-versie.

## Wat is toegevoegd?
- Hoofdtab **Evenementen**: meerdere evenementen kunnen worden aangemaakt.
- Een evenement toont uitsluitend daadwerkelijk deelnemende scholen en bedrijven.
- Twee afzonderlijke lijsten: **Scholen** en **Bedrijven**, met aantallen.
- Via **+ School** / **+ Bedrijf** zoeken in bestaande CRM-relaties (live zoeken terwijl je typt).
- **Geen extra CRM-relaties** en geen dubbele contactgegevens.
- Per evenement-deelnemer een bewerkbare **korte notitie** (max. 2000 tekens).
- Dezelfde evenementnaam en notitie verschijnen in het bestaande school-/bedrijfsprofiel onder **Deelname aan evenementen**.
- Klik op een deelnemer voor het bestaande profiel en alle bestaande communicatie.
- Je kunt een deelnemerkoppeling verwijderen zonder de organisatie te verwijderen.
- Geen voortgangsstatus of veld voor verantwoordelijke medewerker (bewust buiten scope).

## Bestanden
- `index.html` – menu-item en scriptregel, cacheversie gewijzigd.
- `js/app.js` – state, gegevens ophalen, routering en rendering.
- `js/views/relaties.js` – evenementenverwijzing op organisatieprofiel.
- `js/views/evenementen.js` – nieuw; alle evenementenfunctionaliteit.
- `css/style.css` – nieuwe, afzonderlijk gescopeerde stijlen.
- `supabase-evenementen.sql` – nieuwe tabellen en toegangsregels.

## Uitrollen (Martin)
1. Maak voor de zekerheid een backup van de huidige live webroot en database (of herstelpunt).
2. **Vergelijk met de actuele live-code**. Deze branch is gebouwd op de in GitHub beschikbare CRM 3.4.2. Als live 3.4.3 of nieuwer is, neem alleen de relevante wijzigingen over op de actuele versie en overschrijf de nieuwe code niet blind.
3. Voer `supabase-evenementen.sql` uit in het juiste Supabase-project, ingelogd als beheerder. Bestaande organisaties en contacten worden niet aangepast.
4. Upload (na samenvoegen) alle gewijzigde websitebestanden naar de bestaande webroot. Geen tweede website, geen nieuw Supabase-project.
5. Ververs de browsercache. Controleer dat `/js/views/evenementen.js?v=343-events` als JavaScript geladen wordt.
6. Maak via het CRM **Girls' Day** aan. Vul de datum alleen in als die vaststaat. Voeg in het overzicht een bestaande school en bedrijf toe, schrijf een korte notitie en klik op de relatie om die notitie ook daar te zien.
7. Test wijzigen, ontkoppelen, live zoeken, opnieuw aanmelden, tweede evenement, mobiele weergave en toegangsbeveiliging (anonieme gebruikers mogen nieuwe tabellen niet uitlezen).
8. Maak na akkoord pas live; de hoofdbranch is niet gewijzigd door het aanmaken van dit pakket.

## Wat dit niet doet
- Geen aanmeldformulier, groepsindeling, mailingtool, nieuwe contacten of uitgebreide takenmodule.
- De actuele livecode en live Supabase-database zijn niet gemigreerd; dit is een review-/overdrachtspakket.
- Een eventuele bestaande mailkoppeling blijft buiten deze wijziging.

## Aandachtspunten
De toegevoegde tabellen hebben RLS-beleid voor ingelogde `authenticated`-gebruikers. De app leest deze tabellen pas na inloggen. Controleer bij implementatie of het bestaande CRM dezelfde Supabase-sessie en autorisatie toepast.
