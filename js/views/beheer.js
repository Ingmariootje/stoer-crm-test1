function renderBeheer(state) {
  const schools = state.organizations.filter(org => org.type === "school");
  const companies = state.organizations.filter(org => org.type === "bedrijf");
  const institutions = state.organizations.filter(org => org.type === "instelling");
  const openAccountability = getOpenAccountabilityAppointments();
  const emailCount = state.organizations.filter(org => org.email).length;
  const activityTypes = uniqueValues([
    ...state.appointments.map(item => item.activity_type),
    "Gastles", "Busbezoek", "TechHub", "Bedrijfsbezoek", "Overleg", "Voorbereiding", "Evaluatie"
  ]);

  return `
    <section class="beheer-grid">
      <article class="panel beheer-card beheer-card-primary">
        <div class="panel-header">STOER CRM</div>
        <p class="page-subtitle">Beheercentrum voor dagelijks onderhoud. Geen losse database-acties nodig voor standaardtaken.</p>
        <div class="beheer-kpis">
          <div class="kpi"><strong>${schools.length}</strong><span>Scholen</span></div>
          <div class="kpi"><strong>${companies.length}</strong><span>Bedrijven</span></div>
          <div class="kpi"><strong>${institutions.length}</strong><span>Instellingen</span></div>
          <div class="kpi ${openAccountability.length ? "kpi-warning" : ""}"><strong>${openAccountability.length}</strong><span>Open verantwoording</span></div>
        </div>
      </article>

      <article class="panel beheer-card">
        <div class="beheer-section-header">
          <div>
            <div class="panel-header">Bulkacties</div>
            <p class="page-subtitle">Snel meerdere relaties mailen of tegelijk communicatie registreren.</p>
          </div>
        </div>
        <div class="beheer-action-grid">
          <button type="button" onclick="openMailSelectionModal('school')">Mail scholen</button>
          <button type="button" class="secondary" onclick="openMailSelectionModal('bedrijf')">Mail bedrijven</button>
          <button type="button" class="secondary" onclick="openMailSelectionModal('instelling')">Mail instellingen</button>
          <button type="button" class="ghost" onclick="openBulkCommunicationModal('school')">Communicatie naar scholen</button>
          <button type="button" class="ghost" onclick="openBulkCommunicationModal('bedrijf')">Communicatie naar bedrijven</button>
          <button type="button" class="ghost" onclick="openBulkCommunicationModal('instelling')">Communicatie naar instellingen</button>
        </div>
      </article>

      <article class="panel beheer-card">
        <div class="panel-header">Import en export</div>
        <p class="page-subtitle">Bedrijven kunnen rechtstreeks uit Excel of CSV worden toegevoegd. Export gebruikt CSV voor Excel.</p>
        <div class="beheer-action-grid two">
          <button type="button" onclick="openCompanyImportModal()">Importeer bedrijven</button>
          <button type="button" class="secondary" onclick="exportOrganizationsCSV()">Export relaties</button>
          <button type="button" class="ghost" onclick="exportSchoolReportCSV()">Export verantwoording</button>
        </div>
      </article>

      <article class="panel beheer-card">
        <div class="panel-header">Gebruikers</div>
        <p class="page-subtitle">Inloggen loopt via Supabase Auth. In deze CRM kunnen gebruikers hun eigen wachtwoord wijzigen.</p>
        <div class="beheer-user-box">
          <strong>${escapeHtml(state.currentUser?.email || "Ingelogde gebruiker")}</strong>
          <span>Actieve sessie</span>
        </div>
        <button type="button" class="ghost" onclick="openPasswordModal()">Wachtwoord wijzigen</button>
      </article>

      <article class="panel beheer-card beheer-card-wide">
        <div class="panel-header">Activiteitstypes</div>
        <p class="page-subtitle">Deze types zijn gevonden in de agenda. Nieuwe types kun je ook direct intypen bij een activiteit.</p>
        <div class="beheer-chip-list">
          ${activityTypes.map(type => `<span class="event-label ${activityClass(type)}">${escapeHtml(type)}</span>`).join("")}
        </div>
      </article>

      <article class="panel beheer-card beheer-card-wide">
        <div class="panel-header">Controle voor livegang</div>
        <div class="beheer-checklist">
          <span class="done">Vaste sidebar</span>
          <span class="done">Afspraken bewerken</span>
          <span class="done">Veilige BCC-mailselectie zonder dubbele adressen</span>
          <span class="done">Excel/CSV-import bedrijven met sjabloon</span>
          <span class="done">Communicatie als tijdlijn</span>
          <span class="todo">Logo/favicons later toevoegen</span>
        </div>
      </article>
    </section>
  `;
}

function bindBeheerActions() {
  // Knoppen gebruiken directe onclick-handlers.
}

function exportOrganizationsCSV() {
  const header = ["Type", "Naam", "Contactpersoon", "Telefoon", "E-mail", "Adres", "Plaats", "Stichting", "Directeur"];
  const rows = state.organizations
    .slice()
    .sort((a, b) => `${a.type} ${a.name}`.localeCompare(`${b.type} ${b.name}`, "nl"))
    .map(org => [
      typeLabel(org.type),
      org.name || "",
      org.contact_person || "",
      org.phone || "",
      org.email || "",
      org.address || "",
      org.city || cityFromAddress(org.address) || "",
      org.foundation || "",
      org.director || ""
    ]);

  const lines = [header, ...rows]
    .map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stoer-crm-relaties-${todayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
