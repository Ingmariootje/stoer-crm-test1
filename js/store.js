const Store = {
  key: "techkwadraat-crm-data",

  load() {
    const savedData = localStorage.getItem(this.key);

    if (!savedData) {
      this.save(seedData);
      return structuredClone(seedData);
    }

    return JSON.parse(savedData);
  },

  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },

  reset() {
    this.save(seedData);
    return structuredClone(seedData);
  }
};