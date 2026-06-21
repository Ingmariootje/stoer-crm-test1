const seedData = {
  schools: [
    {
      id: "school-1",
      type: "school",
      name: "OBS De Horizon",
      director: "Marieke Jansen",
      contactPerson: "Tom de Vries",
      phone: "06-12345678",
      email: "info@obsdehorizon.nl"
    },
    {
      id: "school-2",
      type: "school",
      name: "IKC Het Kompas",
      director: "Sanne Bakker",
      contactPerson: "Niels Bos",
      phone: "06-87654321",
      email: "contact@ikchetkompas.nl"
    }
  ],

  companies: [
    {
      id: "company-1",
      type: "bedrijf",
      name: "TechLab Solutions",
      contactPerson: "Ruben Smit",
      phone: "06-22223333",
      email: "ruben@techlab.nl"
    }
  ],

  organizations: [
    {
      id: "org-1",
      type: "instelling",
      name: "Bibliotheek Midden-Brabant",
      contactPerson: "Eva Peters",
      phone: "013-1234567",
      email: "eva@bibliotheek.nl"
    }
  ],

  team: [
    {
      id: "team-1",
      name: "Ingmar",
      role: "Projectleider",
      workdays: ["maandag", "dinsdag", "woensdag", "donderdag"],
      email: "ingmar@techkwadraat.nl",
      phone: "06-11111111"
    },
    {
      id: "team-2",
      name: "Lisa",
      role: "Techcoach",
      workdays: ["woensdag", "donderdag", "vrijdag"],
      email: "lisa@techkwadraat.nl",
      phone: "06-22222222"
    }
  ],

  appointments: [
    {
      id: "appointment-1",
      date: "2026-06-04",
      startTime: "09:30",
      endTime: "11:00",
      type: "Gastles",
      title: "Robotica groep 5",
      organizationId: "school-1",
      teamMemberIds: ["team-1", "team-2"],
      notes: "LEGO Spike Essential meenemen."
    },
    {
      id: "appointment-2",
      date: "2026-06-06",
      startTime: "13:00",
      endTime: "14:30",
      type: "Overleg",
      title: "Samenwerking bedrijven",
      organizationId: "company-1",
      teamMemberIds: ["team-1"],
      notes: "Mogelijkheden voor bedrijfsbezoek bespreken."
    }
  ],

  notes: [
    {
      id: "note-1",
      organizationId: "school-1",
      date: "2026-06-01",
      text: "School wil meer doen met programmeren en techniekmiddagen."
    }
  ]
};