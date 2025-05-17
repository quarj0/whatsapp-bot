const fs = require('fs');
const path = require('path');
const knex = require('knex');
const config = require('../../knexfile');

// Ensure data folder exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = knex(config.development);

(async () => {
  try {
    await db.migrate.latest();
    console.log("✅ Database migrated");
  } catch (err) {
    console.error("❌ Migration error:", err);
  }
})();

module.exports = db;
