// Evenementen zijn een aparte weergave op bestaande CRM-relaties.
// Alleen werkelijk deelnemende scholen en bedrijven worden gekoppeld.
// Notities staan bij de koppeling en zijn ook op het CRM-relatieprofiel zichtbaar.

function crmEventById(id) {
  return state.crmEvents.find(item => item.id === id);
}

function crmEventParticipantOrg(participant) {
  return state.organizations.find(org => org.id === participant.organization_id);
}

function crmEventParticipantsByType(eventId, type) {
  return state.eventParticipants
    .filter(item => item.event_id === eventId)
    .map(item => ({ participant: item, organization: crmEventParticipantOrg(item) }))
    .filter(item => item.organization && item.organization.type === type)
    .sort((a, b) => a.organization.name.localeCompare(b.organization.name, "nl"));
}

function crmEventDateLabel(item) {
  return item.event_date ? formatDateLong(item.event_date) : "Datum nog niet ingevuld";
}

function renderEvenementen(s) {
  if (s.eventsLoadError) {
    return '<div class="crm-event-warning">Evenementen zijn nog niet beschikbaar. Laat de beheerder eerst het bestand <strong>supabase-evenementen.sql</strong> uitvoeren en controleer de toegangsrechten.</div>';
  }
  const item = s.selectedEventId ? crmEventById(s.selectedEventId) : null;
  if (item) return renderCrmEventDetail(item);
  const events = [...s.crmEvents].sort((a, b) =>
    String(b.event_date || b.created_at || "").localeCompare(String(a.event_date || a.created_at || ""))
  );
  return '<section class="crm-event-grid">' + (events.map(ev => {
    const schools = crmEventParticipantsByType(ev.id, "school").length;
    const companies = crmEventParticipantsByType(ev.id, "bedrijf").length;
    return '<button type="button" class="crm-event-card" onclick="openCrmEventDetail(\'' + ev.id + '\')">' +
      '<h2>' + escapeHtml(ev.name) + '</h2>' +
      '<p>' + escapeHtml(crmEventDateLabel(ev)) + '</p>' +
      '<div class="crm-event-counts"><span>' + schools + ' scholen</span><span>' + companies + ' bedrijven</span></div>' +
      '</button>';
  }).join("") || '<div class="panel crm-event-panel"><h2>Nog geen evenementen</h2><p>Maak bijvoorbeeld Girls’ Day aan met de knop rechtsboven. Voeg daarna de bevestigde deelnemers toe.</p></div>') + '</section>';
}

function renderCrmEventDetail(ev) {
  const schools = crmEventParticipantsByType(ev.id, "school");
  const companies = crmEventParticipantsByType(ev.id, "bedrijf");
  return '<div class="crm-event-toolbar">' +
    '<div><button type="button" class="ghost" onclick="closeCrmEventDetail()">← Alle evenementen</button>' +
    '<h2>' + escapeHtml(ev.name) + '</h2><p>' + escapeHtml(crmEventDateLabel(ev)) + '</p></div>' +
    '<div class="crm-event-actions"><button type="button" class="ghost" onclick="openCrmEventModal(\'' + ev.id + '\')">Bewerken</button>' +
    '<button type="button" class="ghost" onclick="removeCrmEvent(\'' + ev.id + '\')">Verwijderen</button></div>' +
    '</div>' +
    '<div class="crm-event-columns">' +
    renderCrmEventGroup("school", schools) +
    renderCrmEventGroup("bedrijf", companies) +
    '</div><p class="crm-event-hint">Alle getoonde deelnemers zijn bevestigd. Klik op een naam voor het bestaande CRM-profiel met de volledige contacthistorie.</p>';
}

function renderCrmEventGroup(type, rows) {
  const label = type === "school" ? "Scholen" : "Bedrijven";
  const singular = type === "school" ? "school" : "bedrijf";
  return '<section class="panel crm-event-panel"><div class="crm-event-panel-heading">' +
    '<h3>' + label + ' (' + rows.length + ')</h3>' +
    '<button type="button" onclick="openCrmEventOrganizationPicker(\'' + type + '\')">+ ' + (type === "school" ? "School" : "Bedrijf") + '</button></div>' +
    (rows.length ? rows.map(({ participant, organization: org }) =>
      '<div class="crm-event-row"><div>' +
      '<button type="button" class="crm-event-row-name" onclick="openCrmEventOrgProfile(\'' + org.id + '\')">' + escapeHtml(org.name) + '</button>' +
      '<p class="crm-event-row-note">' + (participant.note ? escapeHtml(participant.note) : 'Geen notitie') + '</p></div>' +
      '<div class="crm-event-row-actions">' +
      '<button type="button" class="ghost" onclick="openCrmEventNoteModal(\'' + participant.id + '\')">Notitie</button>' +
      '<button type="button" class="ghost" onclick="removeCrmEventParticipant(\'' + participant.id + '\')">Verwijder</button>' +
      '</div></div>'
    ).join("") : '<p class="empty">Nog geen deelnemende ' + (type === "school" ? "scholen" : "bedrijven") + ' toegevoegd.</p>') +
    '</section>';
}

function bindEvenementenActions() {
  // De knoppen zijn met bestaande CRM-onclick-handlers verbonden.
}

function openCrmEventDetail(id) {
  state.selectedEventId = id;
  render();
}

function closeCrmEventDetail() {
  state.selectedEventId = null;
  render();
}

function openCrmEventModal(id = null) {
  const ev = id ? crmEventById(id) : null;
  if (id && !ev) return;
  openModal('<div class="modal-backdrop"><div class="modal"><div class="modal-header"><div>' +
    '<h2>' + (ev ? "Evenement bewerken" : "Nieuw evenement") + '</h2>' +
    '<p class="page-subtitle">Alleen bevestigde deelnemers worden later toegevoegd.</p></div>' +
    '<button type="button" class="close-button" onclick="closeModal()">×</button></div>' +
    '<form id="crm-event-form"><div class="modal-content form-grid">' +
    '<label class="full">Naam evenement<input class="form-input" name="name" maxlength="120" required value="' + escapeHtml(ev?.name || "") + '" placeholder="Bijvoorbeeld Girls’ Day"></label>' +
    '<label class="full">Datum (optioneel)<input class="form-input" type="date" name="event_date" value="' + escapeHtml(ev?.event_date || "") + '"></label>' +
    '</div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button>' +
    '<button type="submit">Opslaan</button></div></form></div></div>');

  document.getElementById("crm-event-form").addEventListener("submit", async e => {
    e.preventDefault();
    const button = e.target.querySelector('[type="submit"]');
    const form = new FormData(e.target);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    button.disabled = true;
    const payload = { name, event_date: String(form.get("event_date") || "") || null };
    const response = ev
      ? await db.from("crm_events").update(payload).eq("id", ev.id).select("id").single()
      : await db.from("crm_events").insert(payload).select("id").single();
    if (response.error) {
      console.error(response.error);
      alert("Evenement opslaan mislukt.");
      button.disabled = false;
      return;
    }
    closeModal();
    await refresh();
    state.selectedEventId = response.data.id;
    render();
  });
}

function crmEventOrganizationCandidates(type, query = "") {
  const existingIds = new Set(state.eventParticipants
    .filter(item => item.event_id === state.selectedEventId)
    .map(item => item.organization_id));
  const value = String(query).toLocaleLowerCase("nl").trim();
  return state.organizations
    .filter(org => org.type === type && !existingIds.has(org.id))
    .filter(org => (org.name + ' ' + (org.city || '')).toLocaleLowerCase("nl").includes(value))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"))
    .slice(0, 30);
}

function crmEventPickerResults(type, query = "") {
  const rows = crmEventOrganizationCandidates(type, query);
  return rows.map(org =>
    '<div class="crm-event-picker-result"><span><strong>' + escapeHtml(org.name) +
    '</strong>' + (org.city ? '<br><small>' + escapeHtml(org.city) + '</small>' : '') + '</span>' +
    '<button type="button" onclick="addCrmEventParticipant(\'' + org.id + '\')">Toevoegen</button></div>'
  ).join("") || '<p class="empty">Geen beschikbare ' + (type === "school" ? "scholen" : "bedrijven") + ' gevonden.</p>';
}

function openCrmEventOrganizationPicker(type) {
  if (!state.selectedEventId || !["school", "bedrijf"].includes(type)) return;
  const title = type === "school" ? "School toevoegen" : "Bedrijf toevoegen";
  openModal('<div class="modal-backdrop"><div class="modal modal-wide">' +
    '<div class="modal-header"><div><h2>' + title + '</h2><p class="page-subtitle">Zoek in de bestaande CRM-relaties.</p></div>' +
    '<button type="button" class="close-button" onclick="closeModal()">×</button></div>' +
    '<div class="modal-content"><p class="crm-event-hint">Toevoegen betekent dat de deelname is bevestigd.</p>' +
    '<input id="crm-event-org-type" type="hidden" value="' + type + '">' +
    '<input id="crm-event-org-search" class="search-input" autocomplete="off" placeholder="Typ een paar letters…" oninput="filterCrmEventOrganizationPicker()">' +
    '<div id="crm-event-picker-results" class="crm-event-picker">' + crmEventPickerResults(type) + '</div></div>' +
    '<div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Sluiten</button></div>' +
    '</div></div>');
  document.getElementById("crm-event-org-search").focus();
}

function filterCrmEventOrganizationPicker() {
  const type = document.getElementById("crm-event-org-type")?.value;
  const value = document.getElementById("crm-event-org-search")?.value || "";
  if (!["school", "bedrijf"].includes(type)) return;
  document.getElementById("crm-event-picker-results").innerHTML = crmEventPickerResults(type, value);
}

async function addCrmEventParticipant(organizationId) {
  const org = state.organizations.find(o => o.id === organizationId);
  const eventId = state.selectedEventId;
  const type = document.getElementById("crm-event-org-type")?.value;
  if (!org || org.type !== type || !eventId) return;
  const { error } = await db.from("crm_event_participants").insert({
    event_id: eventId,
    organization_id: org.id
  });
  if (error) { console.error(error); alert("Deelnemer toevoegen mislukt. Is deze al gekoppeld?"); return; }
  closeModal();
  await refresh();
}

function openCrmEventNoteModal(participantId) {
  const participant = state.eventParticipants.find(item => item.id === participantId);
  if (!participant) return;
  const org = crmEventParticipantOrg(participant);
  openModal('<div class="modal-backdrop"><div class="modal"><div class="modal-header"><div>' +
    '<h2>Notitie bij deelname</h2><p class="page-subtitle">' + escapeHtml(org?.name || "") + '</p></div>' +
    '<button type="button" class="close-button" onclick="closeModal()">×</button></div>' +
    '<form id="crm-event-note-form"><div class="modal-content"><label>Korte notitie' +
    '<textarea id="crm-event-note-input" name="note" class="form-input" maxlength="2000" rows="4" placeholder="Bijvoorbeeld: ontvangt 20 leerlingen">' + escapeHtml(participant.note || "") + '</textarea>' +
    '</label><p class="crm-event-hint">Deze notitie is ook zichtbaar bij de school of het bedrijf in het CRM.</p></div>' +
    '<div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button>' +
    '<button type="submit">Opslaan</button></div></form></div></div>');
  document.getElementById("crm-event-note-form").addEventListener("submit", async e => {
    e.preventDefault();
    const note = document.getElementById("crm-event-note-input").value.trim();
    const { error } = await db.from("crm_event_participants").update({ note }).eq("id", participantId);
    if (error) { console.error(error); alert("Notitie opslaan mislukt."); return; }
    closeModal();
    await refresh();
  });
}

async function removeCrmEventParticipant(participantId) {
  if (!confirm("Deelname aan dit evenement verwijderen? De school of het bedrijf blijft gewoon in het CRM staan.")) return;
  const { error } = await db.from("crm_event_participants").delete().eq("id", participantId);
  if (error) { console.error(error); alert("Deelnemer verwijderen mislukt."); return; }
  await refresh();
}

async function removeCrmEvent(id) {
  const ev = crmEventById(id);
  if (!ev || !confirm('Evenement "' + ev.name + '" verwijderen, inclusief alle deelnemerkoppelingen en evenementnotities? De CRM-relaties blijven bestaan.')) return;
  const { error } = await db.from("crm_events").delete().eq("id", id);
  if (error) { console.error(error); alert("Evenement verwijderen mislukt."); return; }
  state.selectedEventId = null;
  await refresh();
}

function openCrmEventOrgProfile(orgId) {
  const org = state.organizations.find(item => item.id === orgId);
  if (!org || !["school", "bedrijf"].includes(org.type)) return;
  setView(typeToView(org.type));
  openRelationDetail(org.id);
}

function openCrmEventFromRelation(id) {
  setView("evenementen");
  state.selectedEventId = id;
  render();
}

function renderOrganizationEventLinks(organizationId) {
  const linked = state.eventParticipants
    .filter(item => item.organization_id === organizationId)
    .map(item => ({ participant: item, event: crmEventById(item.event_id) }))
    .filter(item => item.event);
  if (!linked.length) return "";
  return '<section class="crm-event-relation-box"><h3>Deelname aan evenementen</h3>' +
    linked.map(({ participant, event: ev }) =>
      '<div class="crm-event-relation-row"><button type="button" class="crm-event-row-name" onclick="openCrmEventFromRelation(\'' + ev.id + '\')">' +
      escapeHtml(ev.name) + '</button>' +
      '<span class="card-meta"> · ' + escapeHtml(crmEventDateLabel(ev)) + '</span>' +
      (participant.note ? '<p>' + escapeHtml(participant.note) + '</p>' : '') + '</div>'
    ).join("") + '</section>';
}
