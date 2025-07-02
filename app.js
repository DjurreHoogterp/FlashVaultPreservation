const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const games = require('./public/data/games.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { games });
});


app.get('/play/:id', (req, res) => {
  const game = games.find(g => g.id === req.params.id);
  if (game) {
    res.render('play', { game });
  } else {
    res.status(404).send('Game not found');
  }
});

function flattenGame(game) {
  return {
    ...game,
    'protagonist.type': game.protagonist?.type || '',
    'protagonist.vehicle': game.protagonist?.vehicle || ''
  };
}

app.get('/search', (req, res) => {
  const query = req.query.q || '';
  const field = req.query.field || '';
  const Fuse = require('fuse.js');

  const SEARCHABLE_FIELDS = [
    'title',
    'tags',
    'description',
    'mechanics',
    'setting',
    'visual_style',
    'difficulty',
    'emotion',
    'platform',
    'year',
    'protagonist.type',
    'protagonist.vehicle'
  ];

  const searchKeys = field && SEARCHABLE_FIELDS.includes(field) ? [field] : SEARCHABLE_FIELDS;

  const flattenedGames = games.map(flattenGame);

  const fuse = new Fuse(flattenedGames, {
    keys: searchKeys,
    threshold: 0.4
  });

  const results = query ? fuse.search(query).map(result => result.item) : [];

  res.render('search', { query, results, field });
});


app.get('/about', (req, res) => {
  res.render('about');
});

app.use('/data/images', express.static('data/images'));

app.listen(port, () => {
  console.log(`Flash game site running at http://localhost:${port}`);
});
