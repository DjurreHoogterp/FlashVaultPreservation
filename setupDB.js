const Database = require('better-sqlite3');
const db = new Database('games.db');

// Create the table
db.prepare(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    file TEXT,
    genre TEXT,
    theme TEXT,
    controls TEXT,
    multiplayer_mode TEXT,
    series_link TEXT,
    series_name TEXT,
    similar_titles TEXT,
    weapons TEXT,
    mechanics TEXT,
    setting TEXT,
    visual_style TEXT,
    perspective TEXT,
    difficulty TEXT,
    emotion TEXT,
    character TEXT,
    year TEXT,
    platform TEXT,
    image TEXT,
    background_image TEXT
  )
`).run();

console.log('DB and table created');
