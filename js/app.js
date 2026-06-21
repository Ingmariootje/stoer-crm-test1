const state = {
  view: "dashboard",
  currentUser: null,
  relationType: null,
  selectedRelationId: null,
  selectedRelationSection: null,
  organizations: [],
  team: [],
  appointments: [],
  notes: [],
  documents: [],
  contactMoments: [],
  selectedDate: new Date().toISOString().slice(0, 10),
  calendarMonth: new Date(),
  search: "",
  relationCityFilter: "alles",
  relationFoundationFilter: "alles",
  agendaMode: "month",
  agendaTeamFilter: "all",
};

const views = {
  dashboard: { title: "", subtitle: "", render: renderDashboard },
  agenda: { title: "Agenda", subtitle: "Kalender met activiteiten en dagplanning.", render: renderAgenda },
  scholen: { title: "Scholen", subtitle: "Schoolrelaties, activiteiten en notities.", render: s => renderRelaties(s, "school") },
  bedrijven: { title: "Bedrijven", subtitle: "Bedrijfspartners en bedrijfsbezoeken.", render: s => renderRelaties(s, "bedrijf") },
  instellingen: { title: "Instellingen", subtitle: "Partners zoals bibliotheek, museum en andere instellingen.", render: s => renderRelaties(s, "instelling") },
  team: { title: "Team", subtitle: "Teamleden, werkdagen en gekoppelde activiteiten.", render: renderTeam },
  rapportages: { title: "Rapportages", subtitle: "Verantwoording per school, klaar om te printen of te mailen.", render: renderRapportages },
  beheer: { title: "Beheer", subtitle: "Snelle instellingen, bulkacties en import/export.", render: renderBeheer }
};

async function loadData() {
  const [organizations, team, appointments, notes, documents, contactMoments] = await Promise.all([
    db.from("organizations").select("*").order("name", { ascending: true }),
    db.from("team_members").select("*").order("name", { ascending: true }),
    db.from("appointments").select("*").order("date", { ascending: true }),
    db.from("notes").select("*").order("created_at", { ascending: false }),
    db.from("documents").select("*").order("created_at", { ascending: false }),
    db.from("contact_moments").select("*").order("contact_date", { ascending: false })
  ]);

  if (organizations.error) console.error(organizations.error);
  if (team.error) console.error(team.error);
  if (appointments.error) console.error(appointments.error);
  if (notes.error) console.error(notes.error);
  if (documents.error) console.warn("Documenten zijn nog niet actief. Voer eerst het SQL-script uit.", documents.error);
  if (contactMoments.error) console.warn("Contactgeschiedenis is nog niet actief. Voer eerst het SQL-script uit.", contactMoments.error);

  state.organizations = organizations.data || [];
  state.team = team.data || [];
  state.appointments = appointments.data || [];
  state.notes = notes.data || [];
  state.documents = documents.data || [];
  state.contactMoments = contactMoments.data || [];
}

async function refresh() {
  await loadData();
  render();
}

function render() {
  const view = views[state.view];
  document.getElementById("page-title").textContent = view.title;
  document.getElementById("page-subtitle").textContent = view.subtitle;
  document.getElementById("page-actions").innerHTML = renderPageActions();
  document.querySelector(".page-header").classList.toggle("is-empty", !view.title && !view.subtitle && !renderPageActions());
  document.getElementById("app-view").innerHTML = view.render(state);
  bindViewActions();
}

function renderPageActions() {
  switch (state.view) {
    case "agenda":
      return `<button type="button" onclick="openAppointmentModal(state.selectedDate)">+ Activiteit</button>`;
    case "scholen":
      return `<button type="button" class="ghost" onclick="openMailSelectionModal('school')">Mailselectie</button><button type="button" class="ghost" onclick="openBulkCommunicationModal('school')">Bulkactie</button><button type="button" onclick="openRelationModal('school')">+ School</button>`;
    case "bedrijven":
      return `<button type="button" class="ghost" onclick="openMailSelectionModal('bedrijf')">Mailselectie</button><button type="button" class="ghost" onclick="openBulkCommunicationModal('bedrijf')">Bulkactie</button><button type="button" class="secondary" onclick="openCompanyImportModal()">Importeer Excel/CSV</button><button type="button" onclick="openRelationModal('bedrijf')">+ Bedrijf</button>`;
    case "instellingen":
      return `<button type="button" class="ghost" onclick="openMailSelectionModal('instelling')">Mailselectie</button><button type="button" class="ghost" onclick="openBulkCommunicationModal('instelling')">Bulkactie</button><button type="button" onclick="openRelationModal('instelling')">+ Instelling</button>`;
    case "team":
      return `<button type="button" onclick="openTeamModal()">+ Teamlid</button>`;
    case "rapportages":
      return `<button type="button" onclick="window.print()">Print rapportage</button>`;
    default:
      return "";
  }
}

function setView(viewName) {
  state.view = viewName;
  state.selectedRelationId = null;
  state.selectedRelationSection = null;
  state.search = "";
  state.relationCityFilter = "alles";
  state.relationFoundationFilter = "alles";
  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  render();
}

function bindNavigation() {
  document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
}

function bindViewActions() {
  if (state.view === "agenda") bindAgendaActions();
  if (["scholen", "bedrijven", "instellingen"].includes(state.view)) bindRelatieActions();
  if (state.view === "team") bindTeamActions();
  if (state.view === "rapportages") bindRapportageActions();
  if (state.view === "beheer") bindBeheerActions();
}

function viewToType(viewName) {
  if (viewName === "scholen") return "school";
  if (viewName === "bedrijven") return "bedrijf";
  return "instelling";
}

function typeToView(type) {
  if (type === "school") return "scholen";
  if (type === "bedrijf") return "bedrijven";
  return "instellingen";
}

function typeLabel(type) {
  if (type === "school") return "school";
  if (type === "bedrijf") return "bedrijf";
  return "instelling";
}

function typePluralLabel(type) {
  if (type === "school") return "scholen";
  if (type === "bedrijf") return "bedrijven";
  return "instellingen";
}

function typeLabelCapital(type) {
  if (type === "school") return "School";
  if (type === "bedrijf") return "Bedrijf";
  return "Instelling";
}

function phoneHref(phone) {
  return String(phone || "").replace(/[^+0-9]/g, "");
}

function getOrganizationName(id) {
  const org = state.organizations.find(item => item.id === id);
  return org ? org.name : "Geen organisatie";
}

function getTeamNames(ids) {
  const selected = Array.isArray(ids) ? ids : [];
  return state.team.filter(member => selected.includes(member.id)).map(member => member.name).join(", ");
}

function cleanTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function formatDateLong(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function activityClass(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("bus")) return "event-bus";
  if (value.includes("techhub")) return "event-techhub";
  if (value.includes("gast")) return "event-gastles";
  if (value.includes("bedrijf")) return "event-bedrijf";
  return "event-techhub";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFileName(value) {
  return String(value || "document")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function openModal(html) {
  document.getElementById("modal-root").innerHTML = html;
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}


function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isPastAppointment(appointment) {
  return appointment.date < todayKey();
}

function daysBetweenTodayAndAppointment(appointment) {
  if (!appointment.date) return null;
  const today = new Date(`${todayKey()}T12:00:00`);
  const date = new Date(`${appointment.date}T12:00:00`);
  return Math.floor((today - date) / 86400000);
}

function needsAccountability(appointment) {
  const childrenMissing = appointment.participant_children === null || appointment.participant_children === undefined || appointment.participant_children === "";
  const teachersMissing = appointment.participant_teachers === null || appointment.participant_teachers === undefined || appointment.participant_teachers === "";
  const ageInDays = daysBetweenTodayAndAppointment(appointment);

  return ageInDays !== null &&
    ageInDays >= 1 &&
    ageInDays <= 30 &&
    (childrenMissing || teachersMissing);
}

function getOpenAccountabilityAppointments() {
  return state.appointments
    .filter(needsAccountability)
    .sort((a, b) => `${a.date} ${a.start_time || ""}`.localeCompare(`${b.date} ${b.start_time || ""}`));
}

function accountabilitySummary(appointment) {
  const children = appointment.participant_children ?? "-";
  const teachers = appointment.participant_teachers ?? "-";
  return `${children} kinderen · ${teachers} leerkrachten`;
}

function openAccountabilityReminderModal() {
  const openItems = getOpenAccountabilityAppointments();

  openModal(`
    <div class="modal-backdrop">
      <div class="modal modal-wide accountability-modal">
        <div class="modal-header">
          <div>
            <h2>Openstaande verantwoording</h2>
            <p class="page-subtitle">Alleen activiteiten van de afgelopen 30 dagen die nog aantallen missen.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>
        <div class="modal-content">
          ${openItems.length ? openItems.map(item => `
            <article class="accountability-reminder-row">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${formatDate(item.date)} · ${cleanTime(item.start_time)} - ${cleanTime(item.end_time)} · ${escapeHtml(getOrganizationName(item.organization_id))}</p>
              </div>
              <button type="button" onclick="openAccountabilityModal('${item.id}')">Invullen</button>
            </article>
          `).join("") : `<p class="empty">Geen openstaande verantwoording.</p>`}
        </div>
        <div class="modal-footer">
          <button type="button" class="ghost" onclick="closeModal()">Sluiten</button>
          <button type="button" onclick="setView('rapportages'); closeModal();">Naar rapportages</button>
        </div>
      </div>
    </div>
  `);
}

function openAccountabilityModal(appointmentId) {
  const appointment = state.appointments.find(item => item.id === appointmentId);
  if (!appointment) return;

  openModal(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Verantwoording invullen</h2>
            <p class="page-subtitle">${escapeHtml(appointment.title)} · ${formatDateLong(appointment.date)}</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>
        <form id="accountability-form">
          <div class="modal-content form-grid">
            <div class="full accountability-context">
              <strong>${escapeHtml(getOrganizationName(appointment.organization_id))}</strong><br>
              ${cleanTime(appointment.start_time)} - ${cleanTime(appointment.end_time)} · ${escapeHtml(appointment.activity_type || "Activiteit")}
            </div>
            <label>
              Aantal kinderen
              <input name="participant_children" type="number" min="0" step="1" class="form-input" value="${appointment.participant_children ?? ""}" placeholder="Bijvoorbeeld 24" required>
            </label>
            <label>
              Aantal leerkrachten
              <input name="participant_teachers" type="number" min="0" step="1" class="form-input" value="${appointment.participant_teachers ?? ""}" placeholder="Bijvoorbeeld 2" required>
            </label>
          </div>
          <div class="modal-footer">
            <button type="button" class="ghost" onclick="closeModal()">Annuleren</button>
            <button type="submit">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById("accountability-form").addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      participant_children: Number(formData.get("participant_children")),
      participant_teachers: Number(formData.get("participant_teachers"))
    };
    const { error } = await db.from("appointments").update(payload).eq("id", appointmentId);
    if (error) {
      alert("Verantwoording opslaan mislukt. Controleer of het Supabase SQL-script is uitgevoerd.");
      console.error(error);
      return;
    }
    closeModal();
    await refresh();
  });
}

function openTeamModal() {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Nieuw teamlid</h2><p class="page-subtitle">Teamlid toevoegen.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="team-form"><div class="modal-content form-grid">
        <input name="name" class="form-input full" placeholder="Naam" required>
        <input name="role" class="form-input" placeholder="Functie">
        <input name="email" class="form-input" placeholder="E-mail">
        <input name="phone" class="form-input" placeholder="Telefoon">
        <input name="workdays" class="form-input full" placeholder="Werkdagen, bijvoorbeeld: maandag, dinsdag, woensdag">
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Opslaan</button></div></form>
    </div></div>`);

  document.getElementById("team-form").addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const workdays = String(formData.get("workdays") || "").split(",").map(day => day.trim()).filter(Boolean);
    const payload = {
      name: formData.get("name"),
      role: formData.get("role"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      workdays
    };
    const { error } = await db.from("team_members").insert(payload);
    if (error) { alert("Teamlid toevoegen mislukt."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

async function deleteRecord(table, id) {
  const confirmation = prompt("Typ VERWIJDEREN om definitief te verwijderen.");
  if (confirmation !== "VERWIJDEREN") return;

  const { error } = await db.from(table).delete().eq("id", id);

  if (error) {
    alert("Verwijderen mislukt.");
    console.error(error);
    return;
  }

  await refresh();
}

function showLoginScreen() {
  document.getElementById("login-screen").classList.remove("app-hidden");
  document.getElementById("crm-app").classList.add("app-hidden");
}

function showCrmApp() {
  document.getElementById("login-screen").classList.add("app-hidden");
  document.getElementById("crm-app").classList.remove("app-hidden");

  const userEmail = document.getElementById("user-email");
  if (userEmail) {
    const email = state.currentUser?.email || "Ingelogd";
    const namePart = email.includes("@") ? email.split("@")[0] : email;
    const displayName = namePart
      .split(/[._-]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    userEmail.innerHTML = `<strong>${escapeHtml(displayName || "Gebruiker")}</strong><small>${escapeHtml(email)}</small>`;
  }
}

function bindLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errorElement = document.getElementById("login-error");
    const button = form.querySelector("button[type='submit']");

    errorElement.textContent = "";
    button.disabled = true;
    button.textContent = "Inloggen...";

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    button.disabled = false;
    button.textContent = "Inloggen";

    if (error) {
      errorElement.textContent = "Inloggen mislukt. Controleer e-mailadres en wachtwoord.";
      console.error(error);
      return;
    }

    state.currentUser = data.user;
    showCrmApp();
    await refresh();
  });
}


function getPasswordResetRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function openForgotPasswordModal() {
  const currentEmail = document.getElementById("login-email")?.value?.trim() || "";

  openModal(`
    <div class="modal-backdrop"><div class="modal modal-small">
      <div class="modal-header"><div><h2>Wachtwoord vergeten?</h2><p class="page-subtitle">Vul je e-mailadres in. Je ontvangt een veilige link om een nieuw wachtwoord te kiezen.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="forgot-password-form"><div class="modal-content form-grid">
        <label class="full">E-mailadres
          <input id="reset-email" name="email" type="email" class="form-input" autocomplete="email" required placeholder="naam@organisatie.nl" value="${escapeHtml(currentEmail)}">
        </label>
        <p id="reset-message" class="login-message full"></p>
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Resetlink versturen</button></div></form>
    </div></div>`);

  document.getElementById("forgot-password-form").addEventListener("submit", async event => {
    event.preventDefault();
    const email = document.getElementById("reset-email").value.trim();
    const messageElement = document.getElementById("reset-message");
    const button = event.target.querySelector("button[type='submit']");

    messageElement.className = "login-message full";
    messageElement.textContent = "";
    button.disabled = true;
    button.textContent = "Versturen...";

    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl()
    });

    button.disabled = false;
    button.textContent = "Resetlink versturen";

    if (error) {
      messageElement.className = "login-error full";
      messageElement.textContent = "Resetlink versturen mislukt. Controleer het e-mailadres of probeer het later opnieuw.";
      console.error(error);
      return;
    }

    messageElement.textContent = "Als dit e-mailadres bekend is, ontvang je binnen enkele minuten een resetlink.";
  });
}

function openPasswordModal() {
  openPasswordUpdateModal({ recovery: false });
}

function openPasswordRecoveryModal() {
  openPasswordUpdateModal({ recovery: true });
}

function openPasswordUpdateModal({ recovery = false } = {}) {
  const title = recovery ? "Nieuw wachtwoord instellen" : "Wachtwoord wijzigen";
  const subtitle = recovery
    ? "Kies een nieuw wachtwoord voor je STOER CRM-account."
    : "Kies een nieuw wachtwoord voor je CRM-account.";
  const cancelButton = recovery ? "" : `<button type="button" class="ghost" onclick="closeModal()">Annuleren</button>`;

  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>${title}</h2><p class="page-subtitle">${subtitle}</p></div>${recovery ? "" : `<button type="button" class="close-button" onclick="closeModal()">×</button>`}</div>
      <form id="password-form"><div class="modal-content form-grid">
        <label class="full">Nieuw wachtwoord
          <input id="new-password" name="password" type="password" class="form-input" autocomplete="new-password" minlength="8" required placeholder="Minimaal 8 tekens">
        </label>
        <label class="full">Herhaal nieuw wachtwoord
          <input id="repeat-password" name="repeat_password" type="password" class="form-input" autocomplete="new-password" minlength="8" required placeholder="Herhaal wachtwoord">
        </label>
        <p id="password-error" class="login-error full"></p>
      </div><div class="modal-footer">${cancelButton}<button type="submit">Wachtwoord opslaan</button></div></form>
    </div></div>`);

  document.getElementById("password-form").addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.getElementById("new-password").value;
    const repeatPassword = document.getElementById("repeat-password").value;
    const errorElement = document.getElementById("password-error");
    const button = event.target.querySelector("button[type='submit']");

    errorElement.textContent = "";

    if (password !== repeatPassword) {
      errorElement.textContent = "De wachtwoorden zijn niet gelijk.";
      return;
    }

    button.disabled = true;
    button.textContent = "Opslaan...";

    const { error } = await db.auth.updateUser({ password });

    button.disabled = false;
    button.textContent = "Wachtwoord opslaan";

    if (error) {
      errorElement.textContent = "Wachtwoord wijzigen mislukt. Kies eventueel een sterker wachtwoord.";
      console.error(error);
      return;
    }

    closeModal();

    if (recovery) {
      window.history.replaceState({}, document.title, getPasswordResetRedirectUrl());
      showCrmApp();
      await refresh();
      alert("Wachtwoord ingesteld. Je bent nu ingelogd.");
      return;
    }

    alert("Wachtwoord gewijzigd.");
  });
}

async function logout() {
  await db.auth.signOut();
  state.currentUser = null;
  showLoginScreen();
}

function isPasswordRecoveryUrl() {
  return window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
}

async function init() {
  bindLoginForm();
  bindNavigation();

  const { data, error } = await db.auth.getSession();
  if (error) console.error(error);

  if (!data.session?.user) {
    showLoginScreen();
    return;
  }

  state.currentUser = data.session.user;

  if (isPasswordRecoveryUrl()) {
    showLoginScreen();
    openPasswordRecoveryModal();
    return;
  }

  showCrmApp();
  await refresh();
}

db.auth.onAuthStateChange((event, session) => {
  state.currentUser = session?.user || null;

  if (event === "PASSWORD_RECOVERY" && state.currentUser) {
    showLoginScreen();
    setTimeout(() => openPasswordRecoveryModal(), 0);
    return;
  }

  if (!state.currentUser) {
    showLoginScreen();
  }
});

init();
