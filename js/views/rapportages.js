function renderRapportages(state) {
  const schools = state.organizations.filter(org => org.type === "school");
  const rows = schools.map(school => schoolReportRowData(school));
  const totals = rows.reduce((acc, row) => {
    acc.activities += row.activities;
    acc.children += row.children;
    acc.teachers += row.teachers;
    acc.open += row.open;
    return acc;
  }, { activities: 0, children: 0, teachers: 0, open: 0 });

  return `
    <section class="report-layout">
      <div class="panel report-main-panel">
        <div class="report-header">
          <div>
            <div class="panel-header">Verantwoording scholen</div>
            <p class="page-subtitle">Concrete lijst per school. Geschikt om te printen, te kopiëren of te mailen.</p>
          </div>
          <div class="report-actions">
            <button type="button" onclick="window.print()">Printen</button>
            <button type="button" class="secondary" onclick="exportSchoolReportCSV()">CSV export</button>
            <button type="button" class="ghost" onclick="mailSchoolReport()">Mail lijst</button>
          </div>
        </div>

        <div class="report-summary-grid">
          <div class="kpi"><strong>${totals.activities}</strong><span>Activiteiten</span></div>
          <div class="kpi"><strong>${totals.children}</strong><span>Kinderen</span></div>
          <div class="kpi"><strong>${totals.teachers}</strong><span>Leerkrachten</span></div>
          <div class="kpi ${totals.open ? "kpi-warning" : ""}"><strong>${totals.open}</strong><span>Open verantwoording</span></div>
        </div>

        <div class="report-table-wrap">
          <table class="report-table" id="school-report-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Plaats</th>
                <th>Stichting</th>
                <th>Activiteiten</th>
                <th>Kinderen</th>
                <th>Leerkrachten</th>
                <th>Open</th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr class="${row.open ? "report-row-warning" : ""}">
                  <td>${escapeHtml(row.name)}</td>
                  <td>${escapeHtml(row.city || "-")}</td>
                  <td>${escapeHtml(row.foundation || "-")}</td>
                  <td>${row.activities}</td>
                  <td>${row.children}</td>
                  <td>${row.teachers}</td>
                  <td>${row.open}</td>
                  <td>${row.email ? `<a href="mailto:${escapeHtml(row.email)}">Mail</a>` : "-"}</td>
                </tr>
              `).join("") || `<tr><td colspan="8">Geen scholen gevonden.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <aside class="panel report-side-panel">
        <div class="panel-header">Nog invullen</div>
        ${getOpenAccountabilityAppointments().slice(0, 12).map(item => `
          <button type="button" class="report-open-item" onclick="openAccountabilityModal('${item.id}')">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${formatDate(item.date)} · ${escapeHtml(getOrganizationName(item.organization_id))}</span>
          </button>
        `).join("") || `<p class="empty">Alle uitgevoerde activiteiten zijn ingevuld.</p>`}
      </aside>
    </section>
  `;
}

function schoolReportRowData(school) {
  const appointments = state.appointments.filter(item => item.organization_id === school.id);
  const past = appointments.filter(isPastAppointment);
  return {
    name: school.name,
    city: school.city || cityFromAddress(school.address),
    foundation: school.foundation || "",
    email: school.email || "",
    activities: appointments.length,
    children: appointments.reduce((sum, item) => sum + (Number(item.participant_children) || 0), 0),
    teachers: appointments.reduce((sum, item) => sum + (Number(item.participant_teachers) || 0), 0),
    open: past.filter(needsAccountability).length
  };
}

function bindRapportageActions() {
  // Geen extra listeners nodig; knoppen gebruiken expliciete handlers.
}

function exportSchoolReportCSV() {
  const schools = state.organizations.filter(org => org.type === "school");
  const rows = schools.map(schoolReportRowData);
  const header = ["School", "Plaats", "Stichting", "Activiteiten", "Kinderen", "Leerkrachten", "Open", "Mail"];
  const lines = [header, ...rows.map(row => [row.name, row.city, row.foundation, row.activities, row.children, row.teachers, row.open, row.email])]
    .map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stoer-verantwoording-scholen-${todayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function mailSchoolReport() {
  const schools = state.organizations.filter(org => org.type === "school" && org.email);
  const rows = state.organizations.filter(org => org.type === "school").map(schoolReportRowData);
  const rawEmails = schools.map(school => school.email);
  const bcc = (typeof dedupeEmails === "function" ? dedupeEmails(rawEmails) : Array.from(new Set(rawEmails.map(email => String(email || "").trim()).filter(Boolean)))).join(",");
  const body = rows.map(row => `${row.name}: ${row.activities} activiteiten, ${row.children} kinderen, ${row.teachers} leerkrachten, ${row.open} open`).join("%0D%0A");
  window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent("STOER verantwoording scholen")}&body=${body}`;
}
