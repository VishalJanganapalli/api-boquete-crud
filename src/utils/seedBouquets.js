const Bouquet = require("../models/Bouquet");
const bouquets = require("../data/seedBouquets");

async function seedBouquets() {
  const count = await Bouquet.estimatedDocumentCount();
  if (count > 0) return;

  await Bouquet.insertMany(bouquets);
  console.log(`Inserted ${bouquets.length} starter bouquets`);
}

module.exports = seedBouquets;
