function renderRelaties(state, type) {
  const label = typeLabel(type);
  const active = state.selectedRelationId ? state.organizations.find(o => o.id === state.selectedRelationId) : null;

  if (active && state.selectedRelationSection === "notes") return renderRelationContactsPage(active, type);
  if (active && state.selectedRelationSection === "documents") return renderRelationDocumentsPage(active, type);
  if (active && state.selectedRelationSection === "contacts") return renderRelationContactsPage(active, type);
  if (active) return renderRelationDetail(active, type);

  const baseItems = state.organizations.filter(org => org.type === type);
  const cities = uniqueValues(baseItems.map(org => org.city || cityFromAddress(org.address)));
  const foundations = uniqueValues(baseItems.map(org => org.foundation));

  const items = baseItems.filter(org => {
    const city = org.city || cityFromAddress(org.address);
    const haystack = `${org.name || ""} ${org.contact_person || ""} ${org.phone || ""} ${org.email || ""} ${city || ""} ${org.foundation || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(state.search.toLowerCase());
    const matchesCity = state.relationCityFilter === "alles" || city === state.relationCityFilter;
    const matchesFoundation = type !== "school" || state.relationFoundationFilter === "alles" || (org.foundation || "") === state.relationFoundationFilter;
    return matchesSearch && matchesCity && matchesFoundation;
  });

  return `
    <section class="toolbar compact-toolbar">
      <div class="toolbar-left relation-filter-row">
        <input id="relation-search" class="search-input" placeholder="Zoek ${label}..." value="${escapeHtml(state.search)}">
        <select id="city-filter" class="filter-select small-filter">
          <option value="alles">Alle plaatsen</option>
          ${cities.map(city => `<option value="${escapeHtml(city)}" ${state.relationCityFilter === city ? "selected" : ""}>${escapeHtml(city)}</option>`).join("")}
        </select>
        ${type === "school" ? `
          <select id="foundation-filter" class="filter-select small-filter">
            <option value="alles">Alle stichtingen</option>
            ${foundations.map(foundation => `<option value="${escapeHtml(foundation)}" ${state.relationFoundationFilter === foundation ? "selected" : ""}>${escapeHtml(foundation)}</option>`).join("")}
          </select>
        ` : ""}
      </div>
    </section>
    <section class="card-grid ${type === "school" ? "school-card-grid" : ""}">
      ${items.map(org => relationCard(org)).join("") || `<p class="empty">Geen ${typePluralLabel(type)} gevonden.</p>`}
    </section>`;
}

function relationCard(org) {
  const appointments = state.appointments.filter(a => a.organization_id === org.id);
  const future = appointments.filter(a => a.date >= new Date().toISOString().slice(0, 10)).sort((a,b) => a.date.localeCompare(b.date))[0];
  const notes = state.notes.filter(n => n.organization_id === org.id);
  const documents = state.documents.filter(d => d.organization_id === org.id);
  const contactMoments = state.contactMoments.filter(m => m.organization_id === org.id);
  const status = future ? "actief" : appointments.length ? "nieuw" : "leeg";
  const city = org.city || cityFromAddress(org.address);
  const relationExtra = `<p class="school-meta-line">${escapeHtml(city || "Plaats onbekend")}${org.type === "school" && org.foundation ? ` · ${escapeHtml(org.foundation)}` : ""}</p>`;

  return `
    <article class="crm-card relation-card relation-card-modern ${org.type === "school" ? "school-relation-card" : ""} status-${status}" onclick="openRelationDetail('${org.id}')">
      <div class="relation-card-top">
        <span class="relation-type-pill ${org.type}">${typeLabel(org.type)}</span>
        <span class="relation-status-dot status-${status}">${future ? "gepland" : appointments.length ? "historie" : "nieuw"}</span>
      </div>
      <h2>${escapeHtml(org.name)}</h2>
      ${relationExtra}
      <div class="relation-contact-lines">
        <span>${escapeHtml(org.contact_person) || "Geen contactpersoon"}</span>
        <span>${escapeHtml(org.phone) || "Geen telefoon"}</span>
      </div>
      <div class="note-card compact-planning relation-next-box"><strong>${future ? "Volgende activiteit" : "Planning"}</strong><p class="card-meta">${future ? `${formatDate(future.date)} · ${escapeHtml(future.title)}` : "Nog niets gepland"}</p></div>
      <div class="relation-card-footer"><span>${communicationItemsForOrganization(org.id).length} communicatie</span><span>${documents.length} document(en)</span></div>
    </article>`;
}

function renderRelationDetail(org, type) {
  const appointments = state.appointments.filter(a => a.organization_id === org.id).sort((a,b) => `${a.date} ${a.start_time || ""}`.localeCompare(`${b.date} ${b.start_time || ""}`));
  const notes = state.notes.filter(n => n.organization_id === org.id);
  const documents = state.documents.filter(d => d.organization_id === org.id);
  const contactMoments = state.contactMoments.filter(m => m.organization_id === org.id);
  const future = appointments.filter(a => a.date >= new Date().toISOString().slice(0, 10));
  const city = org.city || cityFromAddress(org.address);
  const pastAppointments = appointments.filter(isPastAppointment);
  const missingAccountability = appointments.filter(needsAccountability);
  const childrenTotal = appointments.reduce((sum, item) => sum + (Number(item.participant_children) || 0), 0);
  const teachersTotal = appointments.reduce((sum, item) => sum + (Number(item.participant_teachers) || 0), 0);

  return `
    <button class="ghost" onclick="closeRelationDetail()">← Terug naar ${typePluralLabel(type)}</button><br><br>
    <section class="detail-layout detail-layout-compact">
      <div class="panel relation-main-panel">
        <div class="detail-title relation-detail-title-modern">
          <div>
            <span class="relation-type-pill ${type}">${typeLabel(type)}</span>
            <h2>${escapeHtml(org.name)}</h2>
            <p class="page-subtitle">Overzicht van contactgegevens, activiteiten, communicatie en documenten.</p>
          </div>
          <div class="relation-detail-actions">
            <span class="event-label ${future.length ? "label-green" : "label-orange"}">${future.length ? "ingepland" : "nog plannen"}</span>
            <button type="button" class="ghost small-button" onclick="openEditOrganizationModal(\'${org.id}\')">✏️ Bewerken</button>
            <button type="button" class="small-button" onclick="openAppointmentModal()">+ Activiteit</button>
          </div>
        </div>
        <div class="contact-summary contact-summary-compact">
          <p><strong>Contactpersoon</strong><br>${escapeHtml(org.contact_person) || "-"}</p>
          <p><strong>Telefoon</strong><br>${org.phone ? `<a href="tel:${phoneHref(org.phone)}">${escapeHtml(org.phone)}</a>` : "-"}</p>
          <p><strong>Mail</strong><br>${org.email ? `<a href="mailto:${escapeHtml(org.email)}">${escapeHtml(org.email)}</a>` : "-"}</p>
          <p><strong>Adres</strong><br>${escapeHtml(org.address) || "-"}</p>
          <p><strong>Plaats</strong><br>${escapeHtml(city) || "-"}</p>
          ${type === "school" ? `<p><strong>Stichting</strong><br>${escapeHtml(org.foundation) || "-"}</p><p><strong>Directeur</strong><br>${escapeHtml(org.director) || "-"}</p>` : ""}
        </div>
        <div class="kpi-grid relation-kpi-grid relation-kpi-grid-3">
          <div class="kpi"><strong>${appointments.length}</strong><span>Activiteiten</span></div>
          <button type="button" class="kpi kpi-button" onclick="openRelationContacts('${org.id}')"><strong>${communicationItemsForOrganization(org.id).length}</strong><span>Communicatie</span></button>
          <button type="button" class="kpi kpi-button" onclick="openRelationDocuments('${org.id}')"><strong>${documents.length}</strong><span>Documenten</span></button>
        </div>
        <section class="accountability-summary-card ${missingAccountability.length ? "has-missing" : ""}">
          <div>
            <strong>Verantwoording</strong>
            <p>${childrenTotal} kinderen · ${teachersTotal} leerkrachten · ${pastAppointments.length} uitgevoerde activiteit(en)</p>
            ${missingAccountability.length ? `
              <div class="relation-open-actions">
                ${missingAccountability.slice(0, 3).map(item => `
                  <button type="button" class="relation-open-action" onclick="openAccountabilityModal('${item.id}')">
                    ⚠ ${formatDate(item.date)} · ${escapeHtml(item.title)}
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
          ${missingAccountability.length ? `<button type="button" onclick="openAccountabilityModal('${missingAccountability[0].id}')">${missingAccountability.length} open</button>` : `<span class="accountability-complete">Compleet</span>`}
        </section>
        <div class="panel-header">Activiteiten</div>
        <div class="compact-activity-list">
          ${appointments.map(a => relationActivityRow(a)).join("") || `<p class="empty">Nog geen activiteiten.</p>`}
        </div>
      </div>
      <aside class="panel notes-side-panel relation-side-panel">
        <section class="side-block">
          <div class="side-block-header">
            <div>
              <div class="panel-header">Communicatie</div>
              <p class="card-meta">Mails, contactmomenten en losse notities.</p>
            </div>
            <button type="button" class="ghost small-button" onclick="openRelationContacts('${org.id}')">Alles</button>
          </div>

          <div class="notes-action-row side-action-grid">
            <button type="button" onclick="openCommunicationModal('${org.id}')">+ Communicatie</button>
          </div>

          <div class="side-section-title">Laatste communicatie</div>
          ${communicationItemsForOrganization(org.id).slice(0, 5).map(item => communicationRow(item, org.id)).join("") || `<p class="empty">Nog geen communicatie.</p>`}
        </section>

        <section class="side-block side-block-separated">
          <div class="side-block-header">
            <div>
              <div class="panel-header">Documenten</div>
              <p class="card-meta">Inspanningsverklaringen en andere bestanden.</p>
            </div>
            <button type="button" class="ghost small-button" onclick="openRelationDocuments('${org.id}')">Alles</button>
          </div>

          <div class="notes-action-row side-action-grid">
            <button type="button" onclick="openDocumentModal('${org.id}')">+ Document</button>
          </div>

          <div class="side-section-title">Laatste documenten</div>
          ${documents.slice(0, 3).map(document => documentRow(document)).join("") || `<p class="empty">Nog geen documenten.</p>`}
        </section>
      </aside>
    </section>`;
}

function renderRelationNotesPage(org, type) {
  const notes = state.notes.filter(n => n.organization_id === org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button><br><br>
    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div><h2>Notities</h2><p class="page-subtitle">${escapeHtml(org.name)}</p></div>
          <button type="button" onclick="openNoteModal('${org.id}')">+ Nieuwe notitie</button>
        </div>
        <div class="notes-page-list">
          ${notes.map(note => `<article class="note-row note-row-page"><div class="note-date">${formatDateLong(note.created_at ? note.created_at.slice(0,10) : "")}</div><div class="note-text">${escapeHtml(note.text)}</div><div class="card-actions"><button class="danger small-button" onclick="deleteRecord('notes', '${note.id}')">Verwijderen</button></div></article>`).join("") || `<p class="empty">Nog geen notities.</p>`}
        </div>
      </div>
    </section>`;
}

function renderRelationContactsPage(org, type) {
  const communicationItems = communicationItemsForOrganization(org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button><br><br>
    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div><h2>Communicatie</h2><p class="page-subtitle">${escapeHtml(org.name)} · mails, contactmomenten en notities</p></div>
          <button type="button" onclick="openCommunicationModal('${org.id}')">+ Communicatie</button>
        </div>
        <div class="notes-page-list communication-page-list">
          ${communicationItems.map(item => communicationPageRow(item)).join("") || `<p class="empty">Nog geen communicatie.</p>`}
        </div>
      </div>
    </section>`;
}

function renderRelationDocumentsPage(org, type) {
  const documents = state.documents.filter(d => d.organization_id === org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button><br><br>
    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div><h2>Documenten</h2><p class="page-subtitle">${escapeHtml(org.name)}</p></div>
          <button type="button" onclick="openDocumentModal('${org.id}')">+ Document uploaden</button>
        </div>
        <div class="document-grid">
          ${documents.map(document => documentCard(document)).join("") || `<p class="empty">Nog geen documenten.</p>`}
        </div>
      </div>
    </section>`;
}

function relationActivityRow(appointment) {
  const teamNames = getTeamNames(appointment.team_member_ids);
  const missing = needsAccountability(appointment);
  const filled = isPastAppointment(appointment) && !missing;

  return `
    <article class="relation-activity-row ${missing ? "accountability-missing" : ""}">
      <div class="relation-activity-date">
        <strong>${formatDate(appointment.date)}</strong>
        <span>${cleanTime(appointment.start_time)} - ${cleanTime(appointment.end_time)}</span>
      </div>
      <div class="relation-activity-main">
        <strong>${escapeHtml(appointment.title)}</strong>
        <span>${teamNames ? escapeHtml(teamNames) : "Geen teamleden gekoppeld"}</span>
        ${missing ? `<em>Verantwoording ontbreekt</em>` : ""}
        ${filled ? `<em>${accountabilitySummary(appointment)}</em>` : ""}
      </div>
      <div class="relation-activity-actions">
        <span class="event-label ${activityClass(appointment.activity_type)}">${escapeHtml(appointment.activity_type)}</span>
        <button type="button" class="ghost small-button" onclick="openAppointmentModal('${appointment.date}', '${appointment.id}')">Bewerken</button>
        <button type="button" class="ghost small-button" onclick="openAccountabilityModal('${appointment.id}')">Verantwoording</button>
      </div>
    </article>`;
}

function contactMomentRow(moment, orgId) {
  return `
    <button type="button" class="note-row note-row-large note-clickable contact-row-small" onclick="openRelationContacts('${orgId}')">
      <div class="note-date">${escapeHtml(moment.contact_type || "Contact")} · ${formatDate(moment.contact_date)}</div>
      <div class="note-text"><strong>${escapeHtml(moment.subject || "Geen onderwerp")}</strong><br>${escapeHtml(moment.summary || "")}</div>
    </button>`;
}

function contactMomentPageRow(moment) {
  return `
    <article class="note-row note-row-page contact-moment-card">
      <div class="note-date">${escapeHtml(moment.contact_type || "Contact")} · ${formatDateLong(moment.contact_date)}</div>
      <h3>${escapeHtml(moment.subject || "Geen onderwerp")}</h3>
      <p>${escapeHtml(moment.summary || "")}</p>
      <p class="card-meta">Contactpersoon: ${escapeHtml(moment.contact_person) || "-"}${moment.direction ? ` · Richting: ${escapeHtml(moment.direction)}` : ""}</p>
      <div class="card-actions"><button class="danger small-button" onclick="deleteRecord('contact_moments', '${moment.id}')">Verwijderen</button></div>
    </article>`;
}

function communicationItemsForOrganization(organizationId) {
  const moments = state.contactMoments
    .filter(item => item.organization_id === organizationId)
    .map(item => ({
      source: "contact_moments",
      id: item.id,
      type: item.contact_type || "Contactmoment",
      date: item.contact_date || (item.created_at ? item.created_at.slice(0, 10) : ""),
      subject: item.subject || "Geen onderwerp",
      summary: item.summary || "",
      contactPerson: item.contact_person || "",
      direction: item.direction || ""
    }));

  const notes = state.notes
    .filter(item => item.organization_id === organizationId)
    .map(item => ({
      source: "notes",
      id: item.id,
      type: "Notitie",
      date: item.created_at ? item.created_at.slice(0, 10) : "",
      subject: "Notitie",
      summary: item.text || "",
      contactPerson: "",
      direction: ""
    }));

  return [...moments, ...notes].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function communicationIcon(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("mail")) return "📧";
  if (value.includes("telefoon")) return "📞";
  if (value.includes("overleg")) return "💬";
  if (value.includes("bezoek")) return "📍";
  if (value.includes("notitie")) return "📝";
  return "💬";
}

function communicationRow(item, orgId) {
  return `
    <button type="button" class="note-row note-row-large note-clickable contact-row-small" onclick="openRelationContacts('${orgId}')">
      <div class="note-date">${communicationIcon(item.type)} ${escapeHtml(item.type)} · ${formatDate(item.date)}</div>
      <div class="note-text"><strong>${escapeHtml(item.subject || item.type)}</strong><br>${escapeHtml(item.summary || "")}</div>
    </button>`;
}

function communicationPageRow(item) {
  const table = item.source === "notes" ? "notes" : "contact_moments";
  return `
    <article class="note-row note-row-page contact-moment-card communication-card">
      <div class="note-date">${communicationIcon(item.type)} ${escapeHtml(item.type)} · ${formatDateLong(item.date)}</div>
      <h3>${escapeHtml(item.subject || item.type)}</h3>
      <p>${escapeHtml(item.summary || "")}</p>
      ${item.contactPerson || item.direction ? `<p class="card-meta">${item.contactPerson ? `Contactpersoon: ${escapeHtml(item.contactPerson)}` : ""}${item.direction ? ` · Richting: ${escapeHtml(item.direction)}` : ""}</p>` : ""}
      <div class="card-actions"><button class="danger small-button" onclick="deleteRecord('${table}', '${item.id}')">Verwijderen</button></div>
    </article>`;
}

function documentRow(document) {
  return `
    <div class="document-row-small">
      <strong>${escapeHtml(document.title || document.file_name)}</strong>
      <span>${escapeHtml(document.document_type || "Document")} · ${escapeHtml(document.status || "")}</span>
      <button type="button" class="ghost small-button" onclick="openDocumentFile('${escapeHtml(document.file_path)}')">Openen</button>
    </div>`;
}

function documentCard(document) {
  return `
    <article class="document-card">
      <div class="document-icon">📄</div>
      <div>
        <h3>${escapeHtml(document.title || document.file_name)}</h3>
        <p class="card-meta">${escapeHtml(document.document_type || "Document")} · ${escapeHtml(document.status || "Status onbekend")}</p>
        <p class="card-meta">${formatDateLong(document.created_at ? document.created_at.slice(0,10) : "")}</p>
        <div class="card-actions">
          <button type="button" class="secondary small-button" onclick="openDocumentFile('${escapeHtml(document.file_path)}')">Openen</button>
          <button class="danger small-button" onclick="deleteDocument('${document.id}', '${escapeHtml(document.file_path)}')">Verwijderen</button>
        </div>
      </div>
    </article>`;
}

function openRelationDetail(id) { state.selectedRelationId = id; state.selectedRelationSection = null; render(); }
function closeRelationDetail() { state.selectedRelationId = null; state.selectedRelationSection = null; render(); }
function openRelationNotes(id) { state.selectedRelationId = id; state.selectedRelationSection = "contacts"; render(); }
function openRelationContacts(id) { state.selectedRelationId = id; state.selectedRelationSection = "contacts"; render(); }
function openRelationDocuments(id) { state.selectedRelationId = id; state.selectedRelationSection = "documents"; render(); }
function backToRelationDetail() { state.selectedRelationSection = null; render(); }

function bindRelatieActions() {
  const search = document.getElementById("relation-search");
  if (search) search.addEventListener("input", event => { state.search = event.target.value; render(); });

  const cityFilter = document.getElementById("city-filter");
  if (cityFilter) cityFilter.addEventListener("change", event => { state.relationCityFilter = event.target.value; render(); });

  const foundationFilter = document.getElementById("foundation-filter");
  if (foundationFilter) foundationFilter.addEventListener("change", event => { state.relationFoundationFilter = event.target.value; render(); });
}

function openRelationModal(type) {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Nieuwe ${typeLabel(type)}</h2><p class="page-subtitle">Incidenteel beheer, daarom in een pop-up.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="relation-form"><div class="modal-content form-grid">
        <input name="name" class="form-input full" placeholder="Naam" required>
        <input name="contact_person" class="form-input" placeholder="Contactpersoon">
        <input name="director" class="form-input" placeholder="Directeur">
        <input name="phone" class="form-input" placeholder="Telefoon">
        <input name="email" class="form-input" placeholder="E-mail">
        <input name="city" class="form-input" placeholder="Plaats">
        ${type === "school" ? `<input name="foundation" class="form-input" placeholder="Stichting">` : ""}
        <input name="address" class="form-input full" placeholder="Adres">
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Opslaan</button></div></form>
    </div></div>`);
  document.getElementById("relation-form").addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = { type, name: formData.get("name"), contact_person: formData.get("contact_person"), director: formData.get("director"), phone: formData.get("phone"), email: formData.get("email"), city: formData.get("city"), foundation: type === "school" ? formData.get("foundation") : null, address: formData.get("address"), status: "nieuw" };
    const { error } = await db.from("organizations").insert(payload);
    if (error) { alert("Toevoegen mislukt."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

function openNoteModal(organizationId) {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Nieuwe notitie</h2><p class="page-subtitle">Koppel een losse notitie aan ${escapeHtml(getOrganizationName(organizationId))}.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="note-form"><div class="modal-content"><textarea name="text" placeholder="Typ je notitie..." required></textarea></div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Notitie opslaan</button></div></form>
    </div></div>`);
  document.getElementById("note-form").addEventListener("submit", async event => {
    event.preventDefault();
    const text = new FormData(event.target).get("text");
    const { error } = await db.from("notes").insert({ organization_id: organizationId, text });
    if (error) { alert("Notitie toevoegen mislukt."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

function openCommunicationModal(organizationId, preferredType = "") {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Communicatie registreren</h2><p class="page-subtitle">Bij ${escapeHtml(getOrganizationName(organizationId))}. Kies het soort contact en leg kort vast wat belangrijk is.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="communication-form"><div class="modal-content form-grid">
        <label>
          Soort communicatie
          <select name="contact_type" class="form-select">
            ${["Mail", "Telefoon", "Overleg", "Bezoek", "Notitie"].map(type => `<option value="${type}" ${preferredType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </label>
        <label>
          Datum
          <input name="contact_date" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" required>
        </label>
        <label>
          Contactpersoon
          <input name="contact_person" class="form-input" placeholder="Contactpersoon">
        </label>
        <label>
          Richting
          <select name="direction" class="form-select">
            <option value="">Richting onbekend</option>
            <option value="Inkomend">Inkomend</option>
            <option value="Uitgaand">Uitgaand</option>
          </select>
        </label>
        <input name="subject" class="form-input full" placeholder="Onderwerp" required>
        <textarea name="summary" class="full" placeholder="Korte samenvatting, notitie of belangrijkste tekst uit de mail..." required></textarea>
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Opslaan</button></div></form>
    </div></div>`);

  document.getElementById("communication-form").addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      organization_id: organizationId,
      contact_type: formData.get("contact_type"),
      contact_date: formData.get("contact_date"),
      contact_person: formData.get("contact_person"),
      direction: formData.get("direction"),
      subject: formData.get("subject"),
      summary: formData.get("summary")
    };
    const { error } = await db.from("contact_moments").insert(payload);
    if (error) { alert("Communicatie toevoegen mislukt. Controleer of het SQL-script is uitgevoerd."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

function openContactMomentModal(organizationId, preferredType = "") {
  openCommunicationModal(organizationId, preferredType);
}

function openDocumentModal(organizationId) {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Document uploaden</h2><p class="page-subtitle">Koppel een document aan ${escapeHtml(getOrganizationName(organizationId))}.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="document-form"><div class="modal-content form-grid">
        <input name="title" class="form-input full" placeholder="Titel, bijvoorbeeld Inspanningsverklaring 2026" required>
        <select name="document_type" class="form-select">
          <option value="Inspanningsverklaring">Inspanningsverklaring</option>
          <option value="Overeenkomst">Overeenkomst</option>
          <option value="Evaluatie">Evaluatie</option>
          <option value="Offerte">Offerte</option>
          <option value="Overig">Overig</option>
        </select>
        <select name="status" class="form-select">
          <option value="Concept">Concept</option>
          <option value="Verzonden">Verzonden</option>
          <option value="Ondertekend">Ondertekend</option>
          <option value="Vervallen">Vervallen</option>
        </select>
        <input name="file" type="file" class="form-input full" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" required>
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Uploaden</button></div></form>
    </div></div>`);

  document.getElementById("document-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!file || !file.name) return;

    const filePath = `${organizationId}/${Date.now()}-${safeFileName(file.name)}`;
    const uploadButton = form.querySelector("button[type='submit']");
    uploadButton.disabled = true;
    uploadButton.textContent = "Uploaden...";

    const uploadResult = await db.storage.from("crm-documents").upload(filePath, file, { upsert: false });
    if (uploadResult.error) {
      alert("Upload mislukt. Controleer of de storage bucket crm-documents bestaat.");
      console.error(uploadResult.error);
      uploadButton.disabled = false;
      uploadButton.textContent = "Uploaden";
      return;
    }

    const payload = {
      organization_id: organizationId,
      title: formData.get("title"),
      document_type: formData.get("document_type"),
      status: formData.get("status"),
      file_name: file.name,
      file_path: filePath,
      file_url: null
    };

    const { error } = await db.from("documents").insert(payload);
    if (error) {
      alert("Documentgegevens opslaan mislukt.");
      console.error(error);
      return;
    }

    closeModal(); await refresh();
  });
}

async function openDocumentFile(filePath) {
  if (!filePath) {
    alert("Geen bestand gevonden bij dit document.");
    return;
  }

  const { data, error } = await db.storage
    .from("crm-documents")
    .createSignedUrl(filePath, 60 * 60);

  if (error || !data?.signedUrl) {
    alert("Document openen mislukt. Controleer of je bent ingelogd en of het bestand bestaat.");
    console.error(error);
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener");
}

async function deleteDocument(id, filePath) {
  const confirmation = prompt("Typ VERWIJDEREN om dit document definitief te verwijderen.");
  if (confirmation !== "VERWIJDEREN") return;

  if (filePath) {
    const storageResult = await db.storage.from("crm-documents").remove([filePath]);
    if (storageResult.error) console.warn("Bestand verwijderen uit storage mislukt.", storageResult.error);
  }

  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) { alert("Document verwijderen mislukt."); console.error(error); return; }
  await refresh();
}

function uniqueValues(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));
}

function cityFromAddress(address) {
  if (!address) return "";
  const parts = String(address).split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}



function openEditOrganizationModal(id) {
  const org = state.organizations.find(o => o.id === id);
  if (!org) return;

  const type = org.type || "school";
  const label = typeLabel(type);

  openModal(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>${typeLabelCapital(type)} bewerken</h2>
            <p class="page-subtitle">Pas de gegevens aan of verwijder deze ${label}.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>

        <form id="relation-edit-form">
          <div class="modal-content form-grid">
            <input name="name" class="form-input full" placeholder="Naam" value="${escapeHtml(org.name)}" required>
            <input name="contact_person" class="form-input" placeholder="Contactpersoon" value="${escapeHtml(org.contact_person)}">
            <input name="director" class="form-input" placeholder="${type === "school" ? "Directeur" : "Directeur / leidinggevende"}" value="${escapeHtml(org.director)}">
            <input name="phone" class="form-input" placeholder="Telefoon" value="${escapeHtml(org.phone)}">
            <input name="email" class="form-input" placeholder="E-mail" value="${escapeHtml(org.email)}">
            <input name="city" class="form-input" placeholder="Plaats" value="${escapeHtml(org.city || cityFromAddress(org.address))}">
            ${type === "school" ? `<input name="foundation" class="form-input" placeholder="Stichting" value="${escapeHtml(org.foundation)}">` : ""}
            <input name="address" class="form-input full" placeholder="Adres" value="${escapeHtml(org.address)}">
          </div>

          <div class="modal-footer modal-footer-split">
            <button type="button" class="danger" onclick="deleteOrganizationFromEdit('${org.id}')">Verwijderen</button>
            <div>
              <button type="button" class="ghost" onclick="closeModal()">Annuleren</button>
              <button type="submit">Opslaan</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById("relation-edit-form").addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact_person: String(formData.get("contact_person") || "").trim() || null,
      director: String(formData.get("director") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      foundation: type === "school" ? (String(formData.get("foundation") || "").trim() || null) : null,
      address: String(formData.get("address") || "").trim() || null
    };

    const { error } = await db.from("organizations").update(payload).eq("id", id);

    if (error) {
      alert("Wijzigen mislukt.");
      console.error(error);
      return;
    }

    closeModal();
    await refresh();
  });
}

async function deleteOrganizationFromEdit(id) {
  const confirmation = prompt("Typ VERWIJDEREN om deze organisatie definitief te verwijderen.");
  if (confirmation !== "VERWIJDEREN") return;

  const { error } = await db.from("organizations").delete().eq("id", id);

  if (error) {
    alert("Verwijderen mislukt.");
    console.error(error);
    return;
  }

  state.selectedRelationId = null;
  state.selectedRelationSection = null;
  closeModal();
  await refresh();
}


function normalizeEmailAddress(value) {
  return String(value || "")
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/[;,\s]+$/g, "")
    .toLowerCase();
}

function dedupeEmails(values) {
  const seen = new Set();
  return values
    .map(value => String(value || "").trim())
    .filter(Boolean)
    .filter(value => {
      const key = normalizeEmailAddress(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function groupedMailRecipients(organizations) {
  const groups = new Map();

  organizations.forEach(org => {
    const email = String(org.email || "").trim();
    const key = normalizeEmailAddress(email);
    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        email,
        organizations: [],
        names: [],
        contacts: [],
        cities: [],
        foundations: [],
        search: ""
      });
    }

    const group = groups.get(key);
    const city = org.city || cityFromAddress(org.address) || "";
    group.organizations.push(org);
    group.names.push(org.name || "");
    group.contacts.push(org.contact_person || "");
    if (city && !group.cities.includes(city)) group.cities.push(city);
    if (org.foundation && !group.foundations.includes(org.foundation)) group.foundations.push(org.foundation);
  });

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      organizationIds: group.organizations.map(org => org.id),
      relationCount: group.organizations.length,
      search: `${group.names.join(" ")} ${group.contacts.join(" ")} ${group.cities.join(" ")} ${group.foundations.join(" ")} ${group.email}`.toLowerCase()
    }))
    .sort((a, b) => a.names.join(" ").localeCompare(b.names.join(" "), "nl"));
}

function openMailSelectionModal(type = viewToType(state.view)) {
  const label = typePluralLabel(type);
  const organizations = state.organizations
    .filter(org => org.type === type && org.email)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "nl"));
  const recipients = groupedMailRecipients(organizations);
  const cities = uniqueValues(organizations.map(org => org.city || cityFromAddress(org.address)));
  const foundations = type === "school" ? uniqueValues(organizations.map(org => org.foundation)) : [];
  const duplicateCount = organizations.length - recipients.length;

  openModal(`
    <div class="modal-backdrop">
      <div class="modal modal-wide">
        <div class="modal-header">
          <div>
            <h2>Mailselectie ${label}</h2>
            <p class="page-subtitle">Veilig mailen via BCC. Dubbele mailadressen worden automatisch samengevoegd.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>

        <div class="modal-content">
          <div class="mail-tools-grid">
            <input id="mail-selection-search" class="search-input" placeholder="Zoek op naam, plaats, contactpersoon of e-mail...">
            <select id="mail-city-filter" class="filter-select">
              <option value="alles">Alle plaatsen</option>
              ${cities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join("")}
            </select>
            ${type === "school" ? `
              <select id="mail-foundation-filter" class="filter-select">
                <option value="alles">Alle stichtingen</option>
                ${foundations.map(foundation => `<option value="${escapeHtml(foundation)}">${escapeHtml(foundation)}</option>`).join("")}
              </select>
            ` : `<span></span>`}
            <div class="mail-selection-counter"><strong id="mail-selection-count">0</strong><span>unieke mailadressen</span></div>
          </div>

          ${duplicateCount > 0 ? `<div class="safe-mail-notice">${duplicateCount} dubbele relatievermelding(en) samengevoegd. Eén contactpersoon met meerdere scholen krijgt dus maar één mail.</div>` : ""}

          <div class="toolbar compact-toolbar">
            <button type="button" class="secondary" onclick="setAllMailSelection(true)">Alles selecteren</button>
            <button type="button" class="ghost" onclick="setAllMailSelection(false)">Niets selecteren</button>
          </div>

          <div class="report-table-wrap mail-selection-table-wrap">
            <table class="report-table">
              <thead><tr><th></th><th>Ontvanger / relatie</th><th>Contactpersoon</th><th>Plaats</th><th>${type === "school" ? "Stichting" : "Type"}</th><th>E-mail</th></tr></thead>
              <tbody id="mail-selection-list">
                ${recipients.map(group => {
                  const relationNames = group.names.filter(Boolean);
                  const contacts = uniqueValues(group.contacts.filter(Boolean));
                  const citiesForGroup = uniqueValues(group.cities.filter(Boolean));
                  const foundationsForGroup = uniqueValues(group.foundations.filter(Boolean));
                  const relationLabel = relationNames.slice(0, 3).map(escapeHtml).join(", ") + (relationNames.length > 3 ? ` +${relationNames.length - 3}` : "");
                  return `
                    <tr class="mail-selection-row" data-cities="${escapeHtml(citiesForGroup.join("||"))}" data-foundations="${escapeHtml(foundationsForGroup.join("||"))}" data-search="${escapeHtml(group.search)}">
                      <td><input type="checkbox" class="mail-selection-checkbox" data-organization-ids="${escapeHtml(group.organizationIds.join(","))}" value="${escapeHtml(group.email)}" checked></td>
                      <td><strong>${relationLabel}</strong>${group.relationCount > 1 ? `<br><small>${group.relationCount} relaties gekoppeld</small>` : ""}</td>
                      <td>${contacts.length ? escapeHtml(contacts.join(", ")) : "-"}</td>
                      <td>${citiesForGroup.length ? escapeHtml(citiesForGroup.join(", ")) : "-"}</td>
                      <td>${type === "school" ? (foundationsForGroup.length ? escapeHtml(foundationsForGroup.join(", ")) : "-") : typeLabelCapital(type)}</td>
                      <td>${escapeHtml(group.email)}</td>
                    </tr>`;
                }).join("") || `<tr><td colspan="6">Geen mailadressen gevonden.</td></tr>`}
              </tbody>
            </table>
          </div>

          <label class="full mail-bcc-output">
            BCC-lijst
            <textarea id="bcc-output" readonly></textarea>
          </label>
          <p class="page-subtitle">Gebruik altijd BCC. Zet deze adressen niet in Aan of CC.</p>
        </div>

        <div class="modal-footer">
          <button type="button" class="ghost" onclick="closeModal()">Sluiten</button>
          <button type="button" class="ghost" onclick="prepareBulkCommunicationFromMailSelection()">+ Communicatie voor selectie</button>
          <button type="button" class="secondary" onclick="copyBccList()">Kopieer BCC-lijst</button>
          <button type="button" onclick="openMailToBcc()">Open mailprogramma</button>
        </div>
      </div>
    </div>
  `);

  bindMailSelectionModal();
}

function bindMailSelectionModal() {
  const search = document.getElementById("mail-selection-search");
  const city = document.getElementById("mail-city-filter");
  const foundation = document.getElementById("mail-foundation-filter");
  [search, city, foundation].filter(Boolean).forEach(input => input.addEventListener("input", applyMailSelectionFilters));
  [city, foundation].filter(Boolean).forEach(input => input.addEventListener("change", applyMailSelectionFilters));

  document.querySelectorAll(".mail-selection-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", updateBccOutput);
  });

  applyMailSelectionFilters();
}

function applyMailSelectionFilters() {
  const query = (document.getElementById("mail-selection-search")?.value || "").toLowerCase().trim();
  const city = document.getElementById("mail-city-filter")?.value || "alles";
  const foundation = document.getElementById("mail-foundation-filter")?.value || "alles";

  document.querySelectorAll(".mail-selection-row").forEach(row => {
    const rowCities = String(row.dataset.cities || "").split("||").filter(Boolean);
    const rowFoundations = String(row.dataset.foundations || "").split("||").filter(Boolean);
    const matchesSearch = row.dataset.search.includes(query);
    const matchesCity = city === "alles" || rowCities.includes(city);
    const matchesFoundation = foundation === "alles" || rowFoundations.includes(foundation);
    row.style.display = matchesSearch && matchesCity && matchesFoundation ? "" : "none";
  });

  updateBccOutput();
}

function selectedBccEmails() {
  const values = Array.from(document.querySelectorAll(".mail-selection-row"))
    .filter(row => row.style.display !== "none")
    .map(row => row.querySelector(".mail-selection-checkbox"))
    .filter(checkbox => checkbox && checkbox.checked && checkbox.value)
    .map(checkbox => checkbox.value.trim())
    .filter(Boolean);
  return dedupeEmails(values);
}

function selectedMailOrganizationIds() {
  const ids = Array.from(document.querySelectorAll(".mail-selection-row"))
    .filter(row => row.style.display !== "none")
    .map(row => row.querySelector(".mail-selection-checkbox"))
    .filter(checkbox => checkbox && checkbox.checked && checkbox.dataset.organizationIds)
    .flatMap(checkbox => checkbox.dataset.organizationIds.split(","))
    .map(value => value.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function updateBccOutput() {
  const emails = selectedBccEmails();
  const output = document.getElementById("bcc-output");
  const count = document.getElementById("mail-selection-count");
  if (output) output.value = emails.join("; ");
  if (count) count.textContent = emails.length;
}

function setAllMailSelection(checked) {
  document.querySelectorAll(".mail-selection-row").forEach(row => {
    if (row.style.display !== "none") {
      const checkbox = row.querySelector(".mail-selection-checkbox");
      if (checkbox) checkbox.checked = checked;
    }
  });
  updateBccOutput();
}

async function copyBccList() {
  const text = selectedBccEmails().join("; ");
  if (!text) { alert("Geen mailadressen geselecteerd."); return; }
  try {
    await navigator.clipboard.writeText(text);
    alert("BCC-lijst gekopieerd.");
  } catch (error) {
    const output = document.getElementById("bcc-output");
    if (output) { output.focus(); output.select(); }
    alert("Kopiëren lukt niet automatisch. Selecteer de BCC-lijst handmatig.");
  }
}

function openMailToBcc() {
  const emails = selectedBccEmails();
  if (!emails.length) { alert("Geen mailadressen geselecteerd."); return; }
  window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
}

function prepareBulkCommunicationFromMailSelection() {
  const ids = selectedMailOrganizationIds();
  if (!ids.length) { alert("Selecteer eerst minimaal één relatie."); return; }
  const first = state.organizations.find(org => org.id === ids[0]);
  openBulkCommunicationModal(first?.type || viewToType(state.view), ids);
}

function openBulkCommunicationModal(type = viewToType(state.view), preselectedIds = null) {
  const organizations = state.organizations
    .filter(org => type === "all" || org.type === type)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "nl"));
  const selectedSet = new Set(preselectedIds || organizations.map(org => org.id));
  const label = type === "all" ? "relaties" : typePluralLabel(type);

  openModal(`
    <div class="modal-backdrop">
      <div class="modal modal-wide">
        <div class="modal-header">
          <div>
            <h2>Bulk communicatie</h2>
            <p class="page-subtitle">Registreer één contactmoment bij meerdere ${label}. Handig voor nieuwsbrieven, uitnodigingen en gezamenlijke afspraken.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>
        <form id="bulk-communication-form">
          <div class="modal-content bulk-communication-layout">
            <section>
              <div class="toolbar compact-toolbar">
                <input id="bulk-communication-search" class="search-input" placeholder="Zoek relatie...">
                <button type="button" class="secondary" onclick="setAllBulkCommunication(true)">Alles selecteren</button>
                <button type="button" class="ghost" onclick="setAllBulkCommunication(false)">Niets selecteren</button>
              </div>
              <div class="bulk-relation-list">
                ${organizations.map(org => `
                  <label class="bulk-relation-row" data-search="${escapeHtml(`${org.name} ${org.city || cityFromAddress(org.address)} ${org.contact_person || ""}`.toLowerCase())}">
                    <input type="checkbox" class="bulk-communication-checkbox" value="${org.id}" ${selectedSet.has(org.id) ? "checked" : ""}>
                    <span><strong>${escapeHtml(org.name)}</strong><small>${escapeHtml(org.city || cityFromAddress(org.address)) || "Plaats onbekend"} · ${escapeHtml(org.contact_person) || "Geen contactpersoon"}</small></span>
                  </label>
                `).join("") || `<p class="empty">Geen relaties gevonden.</p>`}
              </div>
            </section>

            <section class="bulk-communication-form-panel">
              <div class="form-grid">
                <label>
                  Soort
                  <select name="contact_type" class="form-select">
                    ${["Mail", "Telefoon", "Overleg", "Bezoek", "Notitie"].map(type => `<option value="${type}">${type}</option>`).join("")}
                  </select>
                </label>
                <label>
                  Datum
                  <input name="contact_date" type="date" class="form-input" value="${todayKey()}" required>
                </label>
                <label class="full">
                  Onderwerp
                  <input name="subject" class="form-input" placeholder="Bijvoorbeeld uitnodiging techniekactiviteit" required>
                </label>
                <label class="full">
                  Samenvatting
                  <textarea name="summary" placeholder="Wat is verstuurd of afgesproken?" required></textarea>
                </label>
                <p class="page-subtitle full"><strong id="bulk-communication-count">0</strong> relaties geselecteerd.</p>
              </div>
            </section>
          </div>
          <div class="modal-footer">
            <button type="button" class="ghost" onclick="closeModal()">Annuleren</button>
            <button type="submit">Communicatie opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `);

  bindBulkCommunicationModal();
}

function bindBulkCommunicationModal() {
  const search = document.getElementById("bulk-communication-search");
  if (search) {
    search.addEventListener("input", event => {
      const query = event.target.value.toLowerCase().trim();
      document.querySelectorAll(".bulk-relation-row").forEach(row => {
        row.style.display = row.dataset.search.includes(query) ? "" : "none";
      });
      updateBulkCommunicationCount();
    });
  }

  document.querySelectorAll(".bulk-communication-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", updateBulkCommunicationCount);
  });

  const form = document.getElementById("bulk-communication-form");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const ids = selectedBulkCommunicationIds();
    if (!ids.length) { alert("Selecteer minimaal één relatie."); return; }

    const formData = new FormData(event.target);
    const rows = ids.map(organizationId => ({
      organization_id: organizationId,
      contact_type: formData.get("contact_type"),
      contact_date: formData.get("contact_date"),
      contact_person: null,
      direction: "Uitgaand",
      subject: formData.get("subject"),
      summary: formData.get("summary")
    }));

    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Opslaan...";

    const { error } = await db.from("contact_moments").insert(rows);
    if (error) {
      alert("Bulkcommunicatie opslaan mislukt. Controleer of het SQL-script voor contactgeschiedenis is uitgevoerd.");
      console.error(error);
      button.disabled = false;
      button.textContent = "Communicatie opslaan";
      return;
    }

    closeModal();
    await refresh();
    alert(`${rows.length} contactmomenten toegevoegd.`);
  });

  updateBulkCommunicationCount();
}

function selectedBulkCommunicationIds() {
  return Array.from(document.querySelectorAll(".bulk-relation-row"))
    .filter(row => row.style.display !== "none")
    .map(row => row.querySelector(".bulk-communication-checkbox"))
    .filter(checkbox => checkbox && checkbox.checked)
    .map(checkbox => checkbox.value);
}

function updateBulkCommunicationCount() {
  const count = document.getElementById("bulk-communication-count");
  if (count) count.textContent = selectedBulkCommunicationIds().length;
}

function setAllBulkCommunication(checked) {
  document.querySelectorAll(".bulk-relation-row").forEach(row => {
    if (row.style.display !== "none") {
      const checkbox = row.querySelector(".bulk-communication-checkbox");
      if (checkbox) checkbox.checked = checked;
    }
  });
  updateBulkCommunicationCount();
}

function openCompanyImportModal() {
  openModal(`
    <div class="modal-backdrop">
      <div class="modal modal-wide">
        <div class="modal-header">
          <div>
            <h2>Bedrijven importeren</h2>
            <p class="page-subtitle">Gebruik Excel (.xlsx/.xls) of CSV. Je ziet altijd eerst een controlelijst voordat er iets wordt opgeslagen.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>

        <div class="modal-content">
          <div class="toolbar compact-toolbar">
            <button type="button" class="secondary" onclick="downloadCompanyImportTemplate()">Download importsjabloon</button>
            <span class="page-subtitle">Tip: CSV UTF-8 werkt het meest stabiel.</span>
          </div>
          <input id="company-import-file" type="file" class="form-input full" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel">
          <div class="import-hint-grid">
            <div><strong>Minimaal</strong><span>Kolom: naam of bedrijfsnaam</span></div>
            <div><strong>Optioneel</strong><span>contactpersoon, telefoon, email, adres, plaats</span></div>
            <div><strong>Veiligheid</strong><span>Dubbele bedrijfsnamen worden overgeslagen</span></div>
          </div>
          <div id="company-import-preview" class="report-table-wrap import-preview">
            <p class="page-subtitle">Kies een bestand om de preview te tonen.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="ghost" onclick="closeModal()">Annuleren</button>
          <button type="button" id="company-import-button" disabled onclick="importPreviewCompanies()">Importeren</button>
        </div>
      </div>
    </div>
  `);

  window.companyImportPreviewRows = [];
  const input = document.getElementById("company-import-file");
  if (input) input.addEventListener("change", handleCompanyImportFile);
}

function downloadCompanyImportTemplate() {
  const rows = [
    ["bedrijfsnaam", "contactpersoon", "telefoon", "email", "adres", "plaats", "directeur"],
    ["Voorbeeldbedrijf BV", "Sam de Vries", "0612345678", "info@voorbeeldbedrijf.nl", "Voorbeeldstraat 1", "Hardenberg", "Alex Jansen"]
  ];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stoer-bedrijven-import-sjabloon.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeImportHeader(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsv(text) {
  const clean = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/).find(line => line.trim()) || "";
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function pickImportValue(record, names) {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== null && String(record[name]).trim() !== "") return String(record[name]).trim();
  }
  return "";
}

function mapCompanyImportRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeImportHeader);

  return rows.slice(1).map((values, index) => {
    const record = {};
    headers.forEach((header, columnIndex) => { record[header] = values[columnIndex] ?? ""; });

    return {
      import_row_number: index + 2,
      type: "bedrijf",
      name: pickImportValue(record, ["naam", "bedrijf", "bedrijfsnaam", "organisatie", "organisatie_naam", "organization", "company", "company_name", "name", "relatie", "relatienaam"]),
      contact_person: pickImportValue(record, ["contactpersoon", "contact_persoon", "contact", "contactperson", "contact_person", "naam_contactpersoon", "contactpersoon_naam", "persoon"]),
      director: pickImportValue(record, ["directeur", "leidinggevende", "directie", "director", "vestigingsmanager", "manager"]),
      phone: pickImportValue(record, ["telefoon", "telefoonnummer", "phone", "tel", "mobiel", "mobiele_telefoon", "mobile", "nummer"]),
      email: pickImportValue(record, ["email", "e_mail", "mail", "mailadres", "e_mailadres", "e-mailadres", "e_mailadres_contact", "e-mailadres_contact", "emailadres"]),
      city: pickImportValue(record, ["plaats", "stad", "city", "woonplaats", "vestigingsplaats", "gemeente"]),
      foundation: null,
      address: pickImportValue(record, ["adres", "address", "straat", "straat_en_huisnummer", "bezoekadres", "postadres", "adresregel"]),
      status: "nieuw"
    };
  });
}

function rowsFromWorkbook(arrayBuffer) {
  if (!window.XLSX) {
    throw new Error("Excel lezen lukt niet omdat de XLSX-bibliotheek niet geladen is. Sla het bestand op als CSV UTF-8 en probeer opnieuw.");
  }
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
}

function handleCompanyImportFile(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("company-import-preview");
  const button = document.getElementById("company-import-button");
  if (!file || !preview || !button) return;

  preview.innerHTML = `<p class="page-subtitle">Bestand wordt gelezen...</p>`;
  button.disabled = true;
  window.companyImportPreviewRows = [];

  const extension = String(file.name.split(".").pop() || "").toLowerCase();
  const reader = new FileReader();

  reader.onerror = () => {
    preview.innerHTML = `<p class="empty">Bestand lezen mislukt. Probeer het bestand opnieuw te kiezen of sla Excel op als CSV UTF-8.</p>`;
  };

  reader.onload = () => {
    try {
      let rows = [];
      if (extension === "csv") {
        rows = parseCsv(String(reader.result || ""));
      } else if (["xlsx", "xls"].includes(extension)) {
        rows = rowsFromWorkbook(reader.result);
      } else {
        throw new Error("Bestandstype niet herkend. Gebruik .xlsx, .xls of .csv.");
      }
      renderCompanyImportPreview(rows, preview, button);
    } catch (error) {
      console.error(error);
      preview.innerHTML = `<p class="empty">${escapeHtml(error.message || "Import lezen mislukt.")}</p>`;
    }
  };

  if (extension === "csv") reader.readAsText(file, "utf-8");
  else reader.readAsArrayBuffer(file);
}

function renderCompanyImportPreview(rows, preview, button) {
  const mapped = mapCompanyImportRows(rows);
  const existingNames = new Set(state.organizations.filter(org => org.type === "bedrijf").map(org => String(org.name || "").toLowerCase().trim()));
  const seen = new Set();
  const skipped = [];
  const unique = [];

  mapped.forEach(row => {
    const key = String(row.name || "").toLowerCase().trim();
    if (!key) {
      skipped.push({ reason: "geen bedrijfsnaam", row });
      return;
    }
    if (existingNames.has(key)) {
      skipped.push({ reason: "bestaat al", row });
      return;
    }
    if (seen.has(key)) {
      skipped.push({ reason: "dubbel in bestand", row });
      return;
    }
    seen.add(key);
    unique.push(row);
  });

  window.companyImportPreviewRows = unique.map(({ import_row_number, ...row }) => row);
  button.disabled = unique.length === 0;

  preview.innerHTML = `
    <p class="page-subtitle">${mapped.length} regels gelezen · ${unique.length} nieuw · ${skipped.length} overgeslagen.</p>
    ${!rows.length ? `<p class="empty">Geen regels gevonden in het bestand.</p>` : ""}
    <table class="report-table">
      <thead><tr><th>Naam</th><th>Contactpersoon</th><th>Plaats</th><th>E-mail</th><th>Telefoon</th></tr></thead>
      <tbody>
        ${unique.slice(0, 75).map(row => `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${escapeHtml(row.contact_person) || "-"}</td><td>${escapeHtml(row.city) || "-"}</td><td>${escapeHtml(row.email) || "-"}</td><td>${escapeHtml(row.phone) || "-"}</td></tr>`).join("") || `<tr><td colspan="5">Geen nieuwe bedrijven gevonden.</td></tr>`}
      </tbody>
    </table>
    ${unique.length > 75 ? `<p class="page-subtitle">Alleen de eerste 75 regels worden in de preview getoond.</p>` : ""}
    ${skipped.length ? `
      <details class="import-skipped-details">
        <summary>${skipped.length} overgeslagen regel(s) bekijken</summary>
        <ul>
          ${skipped.slice(0, 30).map(item => `<li>Rij ${item.row.import_row_number || "?"}: ${escapeHtml(item.row.name || "zonder naam")} — ${escapeHtml(item.reason)}</li>`).join("")}
        </ul>
      </details>
    ` : ""}
  `;
}

async function importPreviewCompanies() {
  const rows = window.companyImportPreviewRows || [];
  if (!rows.length) { alert("Geen bedrijven om te importeren."); return; }

  const button = document.getElementById("company-import-button");
  button.disabled = true;
  button.textContent = "Importeren...";

  const { error } = await db.from("organizations").insert(rows);
  if (error) {
    alert("Importeren mislukt. Controleer of de organizations-tabel de velden name, type, contact_person, phone, email, address, city, director en status bevat.");
    console.error(error);
    button.disabled = false;
    button.textContent = "Importeren";
    return;
  }

  closeModal();
  await refresh();
  alert(`${rows.length} bedrijven geïmporteerd.`);
}
