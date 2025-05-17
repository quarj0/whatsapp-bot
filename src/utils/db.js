const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Ensure data folder exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Open (or create) the SQLite file
const dbPath = path.join(dataDir, 'messages.db');
const db = new Database(dbPath);

// Create base table if missing
db.prepare(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    prefix TEXT,
    fromJid TEXT,
    body TEXT,
    timestamp INTEGER,
    mediaPath TEXT,
    mediaType TEXT,
    isViewOnce INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0
  )
`).run();

// Add missing columns if necessary
try {
  db.prepare(`ALTER TABLE messages ADD COLUMN prefix TEXT`).run();
} catch (e) {
  // Ignore if the column already exists
}

try {
  db.prepare(`ALTER TABLE messages ADD COLUMN mediaPath TEXT`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE messages ADD COLUMN mediaType TEXT`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE messages ADD COLUMN isViewOnce INTEGER DEFAULT 0`).run();
} catch (e) {}

try {
  db.prepare(`ALTER TABLE messages ADD COLUMN processed INTEGER DEFAULT 0`).run();
} catch (e) {}

module.exports = db;