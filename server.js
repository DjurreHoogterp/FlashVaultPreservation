const express = require('express');
const Database = require('better-sqlite3');
const app = express();
const db = new Database('games.db');
const fs = require('fs');
const path = require('path');
// create back-up folder
const backupDir = path.join('/data', 'log-backups');
if (fs.existsSync('/data')) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('/data/log-backups folder created (or already exists)');
} else {
  console.warn('/data not available persistent disk not mounted');
}
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));


// Homepage: show 3 random games
app.get('/', (req, res) => {
  const stmt = db.prepare('SELECT * FROM games ORDER BY RANDOM() LIMIT 3');
  const games = stmt.all();
  res.render('index', { games });
});

// Session PID
const sessionMap = {}; // { pid: { actions: [], startedAt: Date } }

app.use((req, res, next) => {
  const pid = req.query.pid;

  if (pid) {
    // Only register once
    if (!sessionMap[pid]) {
      sessionMap[pid] = {
        startedAt: new Date(),
        actions: [],
        localEdits: {}
      };
      console.log(`Session started for PID: ${pid}`);
    }

    // Store pid in the request object so we can access it in routes
    req.pid = pid;
  }

  next();
});
app.use(express.json()); // needed to parse JSON body

//Admin page

app.get('/admin/logs', (req, res) => {
  const logPath = path.join('/data', 'session-log.json');
  if (!fs.existsSync(logPath)) return res.render('admin', { logsByPid: {}, logsRaw: '[]' });

  const raw = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
  const logs = raw.map(line => JSON.parse(line));

  const logsByPid = {};
  for (const entry of logs) {
    if (!logsByPid[entry.pid]) logsByPid[entry.pid] = [];
    logsByPid[entry.pid].push(entry);
  }

  res.render('admin', { logsByPid, logsRaw: JSON.stringify(logs, null, 2) });
});

app.post('/admin/download', (req, res) => {
  const logPath = path.join('/data', 'session-log.json');
  if (!fs.existsSync(logPath)) return res.status(404).send('Log file not found.');

  res.download(logPath, 'session-log.json');
});

// This creates or appends to logs/session-log.json
app.post('/log-action', express.json(), (req, res) => {
  const { pid, assignment, action, details, page } = req.body;

  if (!pid) return res.status(400).send('Missing PID');

  // In-memory log
  if (!sessionMap[pid]) {
    sessionMap[pid] = { startedAt: new Date(), actions: [] };
  }

  const entry = {
    timestamp: new Date().toISOString(),
    pid,
    assignment: assignment || null, 
    page: page || null,             
    action,
    details
  };

  sessionMap[pid].actions.push(entry);

  // File-based log
  const logPath = path.join('/data', 'session-log.json');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  fs.appendFile(logPath, JSON.stringify(entry) + '\n', (err) => {
    if (err) {
      console.error('Error writing to log:', err);
      res.status(500).send('Logging failed');
    } else {
      res.sendStatus(200);
    }
  });
});



// Route to inspect all sessions for debugging
app.get('/sessions', (req, res) => {
  res.json(sessionMap);
});



// Game page: /play/:id
app.get('/play/:id', (req, res) => {
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  const game = stmt.get(req.params.id);

  if (!game) return res.status(404).send('Game not found');

  const jsonFields = [
    'mechanics', 'controls', 'emotion',
    'platform', 'similar_titles', 'weapons',
    'character', 'genre', 'theme', 'multiplayer_mode'
  ];

  jsonFields.forEach(field => {
    try {
      if (game[field]) {
        const parsed = JSON.parse(game[field]);
        game[field] = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        game[field] = [];
      }
    } catch {
      game[field] = [];
    }})
});

// POST endpoint to add game metadata
app.post('/add-game', (req, res) => {
  const g = req.body;
  if (!g.id || !g.title) {
    return res.status(400).send('Missing required fields: id and title');
  }

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO games (
        id, title, description, file, genre, theme, controls,
        multiplayer_mode, series_link, series_name, similar_titles,
        weapons, mechanics, setting, visual_style, perspective,
        difficulty, emotion, character, year, platform, image, background_image
      ) VALUES (
        @id, @title, @description, @file, @genre, @theme, @controls,
        @multiplayer_mode, @series_link, @series_name, @similar_titles,
        @weapons, @mechanics, @setting, @visual_style, @perspective,
        @difficulty, @emotion, @character, @year, @platform, @image, @background_image
      )
    `);

    stmt.run({
      ...g,
      controls: JSON.stringify(g.controls || []),
      similar_titles: JSON.stringify(g.similar_titles || []),
      weapons: JSON.stringify(g.weapons || []),
      mechanics: JSON.stringify(g.mechanics || []),
      emotion: JSON.stringify(g.emotion || []),
      platform: JSON.stringify(g.platform || []),
      character: JSON.stringify(g.character || []),
      genre: JSON.stringify(g.genre || []),
      theme: JSON.stringify(g.theme || []),
      multiplayer_mode: JSON.stringify(g.multiplayer_mode || [])
    });

    res.send('Game metadata saved');
  } catch (e) {
    console.error('Error saving game:', e.message);
    res.status(500).send('Error saving game');
  }
});

// SEARCH
const Fuse = require('fuse.js');

app.get('/search', (req, res) => {
  const query = req.query.q || '';
  const field = req.query.field || '';

  const stmt = db.prepare('SELECT * FROM games');
  const rows = stmt.all();

  const jsonFields = [
    'mechanics', 'controls', 'emotion',
    'platform', 'similar_titles', 'weapons',
    'character', 'genre', 'theme', 'multiplayer_mode', 'game_series'
  ];

  const games = rows.map(row => {
    const game = { ...row };
    jsonFields.forEach(field => {
      try {
        game[field] = game[field] ? JSON.parse(game[field]) : [];
      } catch {
        game[field] = [];
      }
    });
    return game;
  });

  if (!query) {
    return res.render('search', { query, field, results: [] });
  }

  const flattenGame = game => ({
    ...game,
    character: game.character.join(' '),
    genre: game.genre.join(' '),
    theme: game.theme.join(' '),
    mechanics: game.mechanics.join(' '),
    emotion: game.emotion.join(' '),
    controls: Array.isArray(game.controls) ? game.controls.join(' ') : game.controls,
    platform: Array.isArray(game.platform) ? game.platform.join(' ') : game.platform,
    similar_titles: Array.isArray(game.similar_titles) ? game.similar_titles.join(' ') : game.similar_titles,
    weapons: Array.isArray(game.weapons) ? game.weapons.join(' ') : game.weapons,
    multiplayer_mode: Array.isArray(game.multiplayer_mode) ? game.multiplayer_mode.join(' ') : game.multiplayer_mode || '',
    year: String(game.year || ''),
    perspective: game.perspective || '',
    series_name: game.series_name || ''
  });

  const searchFields = [
    'title', 'description', 'mechanics', 'controls',
    'setting', 'visual_style', 'difficulty', 'emotion',
    'platform', 'character', 'genre', 'theme', 'perspective',
    'multiplayer_mode', 'similar_titles', 'weapons', 'series_name'
  ];

  let results = [];

  // Handle exact year-only queries (e.g. "2009")
  if (!field && /^\d{4}$/.test(query)) {
    results = games.filter(g => String(g.year) === query);
  } else {
    const keys = field && [...searchFields, 'year'].includes(field)
      ? [field]
      : [...searchFields, 'year'];
  
    const flattenedGames = games.map(flattenGame);
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  
    let resultSet = flattenedGames;
  
    tokens.forEach(token => {
      const fuse = new Fuse(resultSet, {
        keys,
        threshold: 0.4,
        ignoreLocation: true
      });
      resultSet = fuse.search(token).map(r => r.item);
    });
  
    results = resultSet.map(flat => games.find(g => g.id === flat.id));
  }
  

  const yearMatch = query.match(/^\b\d{4}\b$/);
  if (yearMatch && query.trim().length === 4) {
  // Only filter if query is just "2009" for exaple
  results = games.filter(g => String(g.year) === yearMatch[0]);
}

  res.render('search', { query, field, results });
});

// Search bar preview (live results)
app.get('/api/games-preview', (req, res) => {
  const stmt = db.prepare('SELECT * FROM games');
  const rows = stmt.all();

  const jsonFields = [
    'mechanics', 'controls', 'emotion',
    'platform', 'similar_titles', 'weapons',
    'character', 'genre', 'theme', 'multiplayer_mode'
  ];

  const games = rows.map(row => {
    const game = { ...row };
    jsonFields.forEach(field => {
      try {
        game[field] = game[field] ? JSON.parse(game[field]) : [];
      } catch {
        game[field] = [];
      }
    });
    return game;
  });

  res.json(games);
});

// Upload a new game
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // store in /uploads, dummy for now

// GET form page
app.get('/upload', (req, res) => {
  res.render('upload');
});

// POST form handler
app.post('/upload', upload.fields([{ name: 'swf' }, { name: 'image' }]), (req, res) => {
  const g = req.body;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO games (
      id, title, description, file, genre, theme, controls,
      multiplayer_mode, series_link, series_name, similar_titles,
      weapons, mechanics, setting, visual_style, perspective,
      difficulty, emotion, character, year, platform, image, background_image
    ) VALUES (
      @id, @title, @description, @file, @genre, @theme, @controls,
      @multiplayer_mode, @series_link, @series_name, @similar_titles,
      @weapons, @mechanics, @setting, @visual_style, @perspective,
      @difficulty, @emotion, @character, @year, @platform, @image, @background_image
    )
  `);

  stmt.run({
    ...g,
    file: req.files?.swf?.[0]?.originalname || 'dummy.swf',
    image: req.files?.image?.[0]?.originalname || 'dummy.png',
    genre: JSON.stringify(g.genre?.split(',') || []),
    theme: JSON.stringify(g.theme?.split(',') || []),
    controls: JSON.stringify(g.controls?.split(',') || []),
    similar_titles: JSON.stringify(g.similar_titles?.split(',') || []),
    weapons: JSON.stringify(g.weapons?.split(',') || []),
    mechanics: JSON.stringify(g.mechanics?.split(',') || []),
    emotion: JSON.stringify(g.emotion?.split(',') || []),
    character: JSON.stringify(g.character?.split(',') || []),
    platform: JSON.stringify(g.platform?.split(',') || []),
    multiplayer_mode: JSON.stringify(g.multiplayer_mode?.split(',') || [])
  });

  res.redirect('/');
});


//Ontology search pages
app.get('/ontology', (req, res) => {
  const fields = [
    'perspective', 'difficulty', 'visual_style', 'setting',
    'genre', 'theme', 'mechanics', 'controls',
    'emotion', 'platform', 'character', 'multiplayer_mode'
  ];

  res.render('ontology', { fields });
});
app.get('/ontology/:field', (req, res) => {
  const field = req.params.field;

  const validFields = [
    'perspective', 'difficulty', 'visual_style', 'setting',
    'genre', 'theme', 'mechanics', 'controls',
    'emotion', 'platform', 'character', 'multiplayer_mode',
    'weapons', 'year' 
  ];

  if (!validFields.includes(field)) {
    return res.status(400).send('Invalid field');
  }

  const stmt = db.prepare('SELECT * FROM games');
  const rows = stmt.all();

  const jsonFields = [
    'genre', 'theme', 'mechanics', 'controls',
    'emotion', 'platform', 'character', 'multiplayer_mode',
    'weapons'
  ];

  const values = new Set();

  rows.forEach(row => {
    try {
      if (jsonFields.includes(field)) {
        const arr = JSON.parse(row[field] || '[]');
        arr.forEach(v => values.add(v));
      } else {
        if (row[field]) values.add(String(row[field]));
      }
    } catch {
      // skip invalid data
    }
  });

  const sortedValues = Array.from(values).sort((a, b) => a.localeCompare(b));

  res.render('ontology_field', { field, values: sortedValues });
});

// Start server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
