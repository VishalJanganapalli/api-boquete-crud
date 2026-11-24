const Bouquet = require("../models/Bouquet");
const bouquets = require("../data/seedBouquets");

async function seedBouquets() {
  const count = await Bouquet.estimatedDocumentCount();
  if (count === 0) {
    await Bouquet.insertMany(bouquets);
    console.log(`Inserted ${bouquets.length} starter bouquets`);
    return;
  }

  const imageUpdates = bouquets.map(({ sku, images }) => ({
    updateOne: {
      filter: { sku, $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] },
      update: { $set: { images } }
    }
  }));
  const result = await Bouquet.bulkWrite(imageUpdates);
  if (result.modifiedCount > 0) {
    console.log(`Added gallery images to ${result.modifiedCount} starter bouquets`);
  }
}

module.exports = seedBouquets;
