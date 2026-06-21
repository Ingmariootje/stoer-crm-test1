function renderTeam(state) {
  const todayName = new Date().toLocaleDateString("nl-NL", { weekday: "long" });
  return `
    <section class="panel">
      <div class="panel-header">Teamleden</div>
      <section class="card-grid">
        ${state.team.map(member => {
          const memberAppointments = state.appointments.filter(a => Array.isArray(a.team_member_ids) && a.team_member_ids.includes(member.id));
          const upcoming = memberAppointments.filter(a => a.date >= new Date().toISOString().slice(0,10)).slice(0,3);
          const presentToday = (member.workdays || []).includes(todayName);
          return `
            <article class="crm-card status-${presentToday ? "actief" : "nieuw"}">
              <div class="card-logo">${escapeHtml(member.name.slice(0, 2).toUpperCase())}</div>
              <h2>${escapeHtml(member.name)}</h2>
              <p class="card-meta">Functie: ${escapeHtml(member.role) || "-"}<br>Mail: ${escapeHtml(member.email) || "-"}<br>Telefoon: ${escapeHtml(member.phone) || "-"}<br>Werkdagen: ${(member.workdays || []).join(", ")}</p>
              <div class="note-card"><strong>${presentToday ? "Vandaag aanwezig" : "Vandaag niet standaard aanwezig"}</strong></div>
              <div class="note-card"><strong>Komende activiteiten</strong>${upcoming.map(a => `<p class="card-meta">${formatDate(a.date)} · ${escapeHtml(a.title)}</p>`).join("") || `<p class="card-meta">Geen komende activiteiten.</p>`}</div>
              <div class="card-actions"><button class="danger" onclick="deleteRecord('team_members', '${member.id}')">Verwijderen</button></div>
            </article>`;
        }).join("")}
      </section>
    </section>`;
}

function bindTeamActions() {}
