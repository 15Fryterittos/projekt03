import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./db.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS fish_species (
    species_id   INTEGER PRIMARY KEY,
    id           TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS fishes (
    id           INTEGER PRIMARY KEY,
    species_id   INTEGER NOT NULL REFERENCES fish_species(species_id) ON DELETE NO ACTION,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL,
    habitat      TEXT NOT NULL
  ) STRICT;
`);

const db_ops = {
  insert_species: db.prepare(`
    INSERT INTO fish_species (id, name)
    VALUES (?, ?)
    RETURNING species_id, id, name;
  `),

  insert_fish_by_id: db.prepare(`
    INSERT INTO fishes (species_id, name, description, habitat)
    VALUES (
      (SELECT species_id FROM fish_species WHERE id = ?),
      ?, ?, ?
    )
    RETURNING id, name, description, habitat;
  `),

  get_species: db.prepare("SELECT id, name FROM fish_species;"),

  get_species_by_id: db.prepare(`
    SELECT species_id, id, name
    FROM fish_species
    WHERE id = ?;
  `),

  get_fishes_by_species_id: db.prepare(`
    SELECT id, name, description, habitat
    FROM fishes
    WHERE species_id = ?;
  `),
};

export function getSpeciesSummaries() {
  return db_ops.get_species.all();
}

export function getSpecies(speciesId) {
  const species = db_ops.get_species_by_id.get(speciesId);
  if (!species) return null;
  species.fishes = db_ops.get_fishes_by_species_id.all(species.species_id);
  return species;
}

export function hasSpecies(id) {
  return db_ops.get_species_by_id.get(id) != null;
}

export function addSpecies(id, name) {
  return db_ops.insert_species.get(id, name);
}

export function addFish(speciesId, fish) {
  return db_ops.insert_fish_by_id.get(
    speciesId,
    fish.name,
    fish.description,
    fish.habitat
  );
}

export function validateFishData(fish) {
  const required = ["name", "description", "habitat"];
  const errors = [];

  for (const key of required) {
    if (!(key in fish)) errors.push(`Brak pola '${key}'`);
    else if (typeof fish[key] !== "string")
      errors.push(`Pole '${key}' powinno być tekstem`);
    else if (fish[key].length < 1 || fish[key].length > 500)
      errors.push(`Pole '${key}' długość: 1–500 znaków`);
  }

  return errors;
}

export function deleteFish(fishId) {
  const stmt = db.prepare("DELETE FROM fishes WHERE id = ?;");
  return stmt.run(fishId);
}

export function getFish(fishId) {
  return db.prepare(`
    SELECT id, species_id, name, description, habitat
    FROM fishes
    WHERE id = ?;
  `).get(fishId);
}

export function updateFish(fishId, newData) {
  return db.prepare(`
    UPDATE fishes
    SET name = ?, description = ?, habitat = ?
    WHERE id = ?;
  `).run(
    newData.name,
    newData.description,
    newData.habitat,
    fishId
  );
}

export default {
  getSpeciesSummaries,
  getSpecies,
  hasSpecies,
  addSpecies,
  addFish,
  validateFishData,
  deleteFish,
  getFish,
  updateFish
};