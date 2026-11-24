require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const seedBouquets = require("./utils/seedBouquets");

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME || "bouquets_db";

async function start() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required. Set it in your environment or .env file.");
  }

  await mongoose.connect(mongoUri, { dbName: databaseName });
  console.log(`Connected to MongoDB database "${databaseName}"`);
  await seedBouquets();

  app.listen(port, () => {
    console.log(`Bouquet API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Could not start the Bouquet API:", error.message);
  process.exitCode = 1;
});
