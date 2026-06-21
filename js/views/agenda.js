function renderAgenda(state) {
  const filteredAppointments = getAgendaFilteredAppointments();

  if (state.agendaMode === "day") return renderAgendaDayView(filteredAppointments);
  if (state.agendaMode === "week") return renderAgendaWeekView(filteredAppointments);

  return renderAgendaMonthView(filteredAppointments);
}

function agendaToolbar() {
  const teamOptions = state.team.map(member => `<option value="${member.id}" ${state.agendaTeamFilter === member.id ? "selected" : ""}>${escapeHtml(member.name)}</option>`).join("");
  return `
    <div class="agenda-toolbar panel">
      <div class="agenda-mode-tabs" role="tablist" aria-label="Agendaweergave">
        <button type="button" class="agenda-mode-button ${state.agendaMode === "day" ? "active" : ""}" data-agenda-mode="day">Vandaag</button>
        <button type="button" class="agenda-mode-button ${state.agendaMode === "week" ? "active" : ""}" data-agenda-mode="week">Deze week</button>
        <button type="button" class="agenda-mode-button ${state.agendaMode === "month" ? "active" : ""}" data-agenda-mode="month">Maand</button>
      </div>
      <div class="agenda-toolbar-actions">
        <select id="agenda-team-filter" class="filter-select small-filter">
          <option value="all" ${state.agendaTeamFilter === "all" ? "selected" : ""}>Alle teamleden</option>
          ${teamOptions}
        </select>
        <button type="button" class="ghost" onclick="jumpAgendaToday()">Naar vandaag</button>
      </div>
    </div>
  `;
}

function renderAgendaMonthView(filteredAppointments) {
  const month = state.calendarMonth;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthName = month.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const firstDay = new Date(year, monthIndex, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let cells = "";

  for (let i = 0; i < startDay; i++) cells += `<div class="calendar-day"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayAppointments = filteredAppointments.filter(item => item.date === dateString);
    const today = todayKey();
    cells += `
      <div class="calendar-day ${dateString === today ? "today" : ""} ${dateString === state.selectedDate ? "selected-day" : ""}" data-date="${dateString}">
        <span class="day-number">${day}</span>
        ${dayAppointments.slice(0, 3).map(renderCalendarEvent).join("")}
        ${dayAppointments.length > 3 ? `<button type="button" class="calendar-more">+${dayAppointments.length - 3}</button>` : ""}
      </div>`;
  }

  const selectedAppointments = filteredAppointments.filter(item => item.date === state.selectedDate);

  return `
    ${agendaToolbar()}
    <section class="agenda-layout agenda-layout-polished">
      <div class="calendar-panel">
        <div class="calendar-header">
          <button id="prev-month" class="secondary">‹</button>
          <h2>${monthName}</h2>
          <button id="next-month" class="secondary">›</button>
        </div>
        <div class="calendar-weekdays"><div>Ma</div><div>Di</div><div>Wo</div><div>Do</div><div>Vr</div><div>Za</div><div>Zo</div></div>
        <div class="calendar-grid">${cells}</div>
      </div>

      <aside class="agenda-side-panel">
        <div class="panel-header">${formatDateLong(state.selectedDate)}</div>
        <button type="button" onclick="openAppointmentModal('${state.selectedDate}')">+ Activiteit op deze dag</button>
        <br><br>
        ${selectedAppointments.map(renderAgendaItem).join("") || `<p class="empty">Geen activiteiten op deze dag.</p>`}
      </aside>
    </section>`;
}

function renderAgendaDayView(filteredAppointments) {
  const today = todayKey();
  state.selectedDate = state.selectedDate || today;
  const appointments = filteredAppointments
    .filter(item => item.date === state.selectedDate)
    .sort(sortAppointments);

  return `
    ${agendaToolbar()}
    <section class="panel agenda-list-panel">
      <div class="agenda-list-header">
        <div>
          <div class="panel-header">${formatDateLong(state.selectedDate)}</div>
          <p class="page-subtitle">Dagplanning met alle activiteiten en open verantwoording.</p>
        </div>
        <button type="button" onclick="openAppointmentModal('${state.selectedDate}')">+ Activiteit</button>
      </div>
      <div class="agenda-list">
        ${appointments.map(renderAgendaListRow).join("") || `<p class="empty">Geen activiteiten op deze dag.</p>`}
      </div>
    </section>
  `;
}

function renderAgendaWeekView(filteredAppointments) {
  const range = agendaWeekRange(state.selectedDate || todayKey());
  const appointments = filteredAppointments
    .filter(item => item.date >= range.startKey && item.date <= range.endKey)
    .sort(sortAppointments);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(range.start);
    date.setDate(range.start.getDate() + i);
    days.push(toAgendaDateKey(date));
  }

  return `
    ${agendaToolbar()}
    <section class="panel agenda-week-panel">
      <div class="agenda-list-header">
        <div>
          <div class="panel-header">Week van ${formatDate(range.startKey)} t/m ${formatDate(range.endKey)}</div>
          <p class="page-subtitle">${appointments.length} activiteit(en) deze week.</p>
        </div>
        <button type="button" onclick="openAppointmentModal('${todayKey()}')">+ Activiteit</button>
      </div>
      <div class="agenda-week-columns">
        ${days.map(dateKey => {
          const dayItems = appointments.filter(item => item.date === dateKey);
          return `
            <section class="agenda-week-day ${dateKey === todayKey() ? "today" : ""}">
              <button type="button" class="agenda-week-day-header" onclick="openAgendaDay('${dateKey}')">
                <span>${formatDate(dateKey)}</span>
                <strong>${dayItems.length}</strong>
              </button>
              ${dayItems.map(renderAgendaListRow).join("") || `<p class="empty small-empty">Geen activiteiten</p>`}
            </section>`;
        }).join("")}
      </div>
    </section>
  `;
}

function getAgendaFilteredAppointments() {
  return state.appointments.filter(item => {
    if (state.agendaTeamFilter === "all") return true;
    return Array.isArray(item.team_member_ids) && item.team_member_ids.includes(state.agendaTeamFilter);
  });
}

function renderCalendarEvent(item) {
  const teamNames = getTeamNames(item.team_member_ids);
  const missing = needsAccountability(item);
  const filled = isPastAppointment(item) && !missing;

  return `
    <div class="calendar-event calendar-event-rich ${activityClass(item.activity_type)} ${missing ? "calendar-accountability-missing" : ""}">
      <div class="calendar-event-time">${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</div>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(getOrganizationName(item.organization_id))}</span>
      ${teamNames ? `<small>${escapeHtml(teamNames)}</small>` : ""}
      ${missing ? `<small class="calendar-accountability-label">🔴 Verantwoording ontbreekt</small>` : ""}
      ${filled ? `<small class="calendar-accountability-label done">🟢 Verantwoording compleet</small>` : ""}
    </div>`;
}

function renderAgendaItem(item) {
  const teamNames = getTeamNames(item.team_member_ids);
  const missing = needsAccountability(item);
  const filled = isPastAppointment(item) && !missing;

  return `
    <div class="agenda-item ${missing ? "accountability-missing" : ""}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</span><br>
      <span>${getOrganizationName(item.organization_id)}</span><br>
      ${teamNames ? `<span>Team: ${teamNames}</span><br>` : ""}
      <span class="event-label ${activityClass(item.activity_type)}">${escapeHtml(item.activity_type)}</span>
      ${item.notes ? `<p class="card-meta">${escapeHtml(item.notes)}</p>` : ""}

      ${missing ? `
        <div class="accountability-warning">
          Verantwoording ontbreekt
          <button type="button" class="small-button" onclick="openAccountabilityModal('${item.id}')">Nu invullen</button>
        </div>
      ` : ""}

      ${filled ? `<p class="accountability-done">Verantwoording: ${accountabilitySummary(item)}</p>` : ""}

      <div class="card-actions">
        <button type="button" class="ghost small-button" onclick="openAppointmentModal('${item.date}', '${item.id}')">Bewerken</button>
        <button type="button" class="ghost small-button" onclick="openAccountabilityModal('${item.id}')">Verantwoording</button>
        <button class="danger small-button" onclick="deleteRecord('appointments', '${item.id}')">Verwijderen</button>
      </div>
    </div>`;
}

function renderAgendaListRow(item) {
  const teamNames = getTeamNames(item.team_member_ids);
  const missing = needsAccountability(item);
  return `
    <article class="agenda-list-row ${missing ? "accountability-missing" : ""}">
      <div class="date-block compact-date-block">
        <span>${formatDate(item.date).split(" ")[0]}</span>
        <strong>${new Date(`${item.date}T12:00:00`).getDate()}</strong>
        <small>${new Date(`${item.date}T12:00:00`).toLocaleDateString("nl-NL", { month: "short" })}</small>
      </div>
      <div class="agenda-list-row-main">
        <div class="event-time">${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(getOrganizationName(item.organization_id))}${teamNames ? ` · ${escapeHtml(teamNames)}` : ""}</p>
        <div class="agenda-row-labels">
          <span class="event-label ${activityClass(item.activity_type)}">${escapeHtml(item.activity_type)}</span>
          ${missing ? `<span class="event-label label-orange">Verantwoording open</span>` : ""}
        </div>
      </div>
      <div class="agenda-list-row-actions">
        <button type="button" class="ghost small-button" onclick="openAppointmentModal('${item.date}', '${item.id}')">Bewerken</button>
        <button type="button" class="ghost small-button" onclick="openAccountabilityModal('${item.id}')">Verantwoording</button>
      </div>
    </article>
  `;
}

function bindAgendaActions() {
  document.querySelectorAll(".agenda-mode-button").forEach(button => {
    button.addEventListener("click", () => {
      state.agendaMode = button.dataset.agendaMode;
      if (state.agendaMode === "day") state.selectedDate = todayKey();
      render();
    });
  });

  const teamFilter = document.getElementById("agenda-team-filter");
  if (teamFilter) {
    teamFilter.addEventListener("change", event => {
      state.agendaTeamFilter = event.target.value;
      render();
    });
  }

  document.querySelectorAll(".calendar-day[data-date]").forEach(day => {
    day.addEventListener("click", () => { state.selectedDate = day.dataset.date; render(); });
  });

  const prev = document.getElementById("prev-month");
  const next = document.getElementById("next-month");
  if (prev) prev.addEventListener("click", () => { state.calendarMonth.setMonth(state.calendarMonth.getMonth() - 1); render(); });
  if (next) next.addEventListener("click", () => { state.calendarMonth.setMonth(state.calendarMonth.getMonth() + 1); render(); });
}

function openAgendaDay(dateKey) {
  state.selectedDate = dateKey;
  state.calendarMonth = new Date(`${dateKey}T12:00:00`);
  state.agendaMode = "day";
  render();
}

function jumpAgendaToday() {
  state.selectedDate = todayKey();
  state.calendarMonth = new Date(`${state.selectedDate}T12:00:00`);
  render();
}

function agendaWeekRange(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, startKey: toAgendaDateKey(start), endKey: toAgendaDateKey(end) };
}

function toAgendaDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sortAppointments(a, b) {
  return `${a.date || ""} ${a.start_time || ""}`.localeCompare(`${b.date || ""} ${b.start_time || ""}`);
}

function organizationOptions(selectedId = "") {
  return `
    <option value="">Geen organisatie</option>
    <optgroup label="Scholen">${state.organizations.filter(o => o.type === "school").map(o => `<option value="${o.id}" ${selectedId === o.id ? "selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}</optgroup>
    <optgroup label="Bedrijven">${state.organizations.filter(o => o.type === "bedrijf").map(o => `<option value="${o.id}" ${selectedId === o.id ? "selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}</optgroup>
    <optgroup label="Instellingen">${state.organizations.filter(o => o.type === "instelling").map(o => `<option value="${o.id}" ${selectedId === o.id ? "selected" : ""}>${escapeHtml(o.name)}</option>`).join("")}</optgroup>`;
}

function openAppointmentModal(date = state.selectedDate, appointmentId = null) {
  const appointment = appointmentId ? state.appointments.find(item => item.id === appointmentId) : null;
  const modalDate = appointment ? appointment.date : (date || state.selectedDate);
  state.selectedDate = modalDate;

  const suggestions = ["Gastles", "Busbezoek", "TechHub", "Bedrijfsbezoek", "Overleg", "Voorbereiding", "Evaluatie"];
  const dayAppointments = state.appointments
    .filter(item => item.date === state.selectedDate)
    .sort((a, b) => `${a.start_time || ""}`.localeCompare(`${b.start_time || ""}`));

  openModal(`
    <div class="modal-backdrop">
      <div class="modal modal-wide">
        <div class="modal-header">
          <div><h2>${formatDateLong(state.selectedDate)}</h2><p class="page-subtitle">Dagoverzicht en ${appointment ? "activiteit bewerken" : "nieuwe activiteit"}.</p></div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>
        <div class="modal-content day-modal-layout">
          <section class="day-overview-panel">
            <h3>Deze dag</h3>
            ${dayAppointments.map(item => `<div class="agenda-item day-overview-item ${needsAccountability(item) ? "accountability-missing" : ""}"><strong>${escapeHtml(item.title)}</strong><span>${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</span><br><span>${escapeHtml(getOrganizationName(item.organization_id))}</span><br>${getTeamNames(item.team_member_ids) ? `<span>${escapeHtml(getTeamNames(item.team_member_ids))}</span>` : ""}<div class="card-actions"><button type="button" class="ghost small-button" onclick="openAppointmentModal('${item.date}', '${item.id}')">Bewerken</button>${needsAccountability(item) ? `<button type="button" class="small-button" onclick="openAccountabilityModal('${item.id}')">Verantwoording invullen</button>` : ""}</div></div>`).join("") || `<p class="empty">Nog geen activiteiten op deze dag.</p>`}
          </section>

          <form id="appointment-form" class="appointment-form-panel" data-appointment-id="${appointment ? appointment.id : ""}">
            <h3>${appointment ? "Activiteit bewerken" : "Nieuwe activiteit"}</h3>
            <div class="form-grid">
              <input name="title" class="form-input full" placeholder="Titel" value="${escapeHtml(appointment?.title || "")}" required>
              <select name="organization_id" class="form-select full">${organizationOptions(appointment?.organization_id || "")}</select>
              <input name="date" type="date" class="form-input" value="${appointment?.date || state.selectedDate}" required>
              <input name="start_time" type="time" class="form-input" value="${cleanTime(appointment?.start_time || "")}">
              <input name="end_time" type="time" class="form-input" value="${cleanTime(appointment?.end_time || "")}">
              <input name="activity_type" class="form-input full" list="activity-suggestions" placeholder="Activiteitstype zelf typen" value="${escapeHtml(appointment?.activity_type || "")}" required>
              <datalist id="activity-suggestions">${suggestions.map(s => `<option value="${s}"></option>`).join("")}</datalist>
              <div class="full suggestion-row">${suggestions.map(s => `<button type="button" class="suggestion-chip" data-activity="${s}">${s}</button>`).join("")}</div>
              <div class="full"><p class="page-subtitle" style="margin-bottom:10px;">Teamleden</p><div class="team-chip-list">${state.team.map(member => `<button type="button" class="team-chip ${(appointment?.team_member_ids || []).includes(member.id) ? "selected" : ""}" data-team-id="${member.id}">${escapeHtml(member.name)}</button>`).join("")}</div></div>
              <textarea name="notes" class="full" placeholder="Notities">${escapeHtml(appointment?.notes || "")}</textarea>
              <p class="full accountability-help">Aantallen kinderen en leerkrachten vul je achteraf in via de knop Verantwoording.</p>
            </div>
            <div class="modal-footer inline-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">${appointment ? "Wijzigingen opslaan" : "Activiteit opslaan"}</button></div>
          </form>
        </div>
      </div>
    </div>`);
  bindAppointmentModal(appointment);
}

function bindAppointmentModal(appointment = null) {
  const selectedTeamIds = new Set(appointment?.team_member_ids || []);
  document.querySelectorAll(".team-chip").forEach(chip => {
    chip.addEventListener("click", () => { chip.classList.toggle("selected"); chip.classList.contains("selected") ? selectedTeamIds.add(chip.dataset.teamId) : selectedTeamIds.delete(chip.dataset.teamId); });
  });
  document.querySelectorAll(".suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => { document.querySelector("#appointment-form [name='activity_type']").value = chip.dataset.activity; });
  });
  document.getElementById("appointment-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = {
      title: formData.get("title"),
      activity_type: formData.get("activity_type"),
      date: formData.get("date"),
      start_time: formData.get("start_time") || null,
      end_time: formData.get("end_time") || null,
      organization_id: formData.get("organization_id") || null,
      team_member_ids: Array.from(selectedTeamIds),
      notes: formData.get("notes")
    };

    const appointmentId = form.dataset.appointmentId;
    const query = appointmentId
      ? db.from("appointments").update(payload).eq("id", appointmentId)
      : db.from("appointments").insert(payload);

    const { error } = await query;
    if (error) { alert(appointmentId ? "Activiteit aanpassen mislukt." : "Activiteit toevoegen mislukt."); console.error(error); return; }
    state.selectedDate = payload.date;
    state.calendarMonth = new Date(`${payload.date}T12:00:00`);
    closeModal();
    await refresh();
  });
}
