let fuse;
let games = [];

// Fetch full metadata for search, but only display title/image in preview
fetch('/api/games-preview')
  .then(res => res.json())
  .then(data => {
    games = data;
    fuse = new Fuse(games, {
      keys: [
        "title",
        "description",
        "tags",
        "mechanics",
        "setting",
        "visual_style",
        "difficulty",
        "emotion",
        "character",
        "platform",
        "multiplayer_mode",
        "theme",
        "controls",
        "genre",
        "perspective",
        "similar_titles"
      ],
      threshold: 0.4,
      ignoreLocation: true
    });
  });

const input = document.querySelector("input[name='q']");
const resultsBox = document.getElementById("live-results");

input.addEventListener("input", () => {
  const query = input.value.trim();
  resultsBox.innerHTML = "";

  if (!query || !fuse) {
    resultsBox.style.display = "none";
    return;
  }

  const results = fuse.search(query).slice(0, 5);
  resultsBox.style.display = results.length ? "block" : "none";

  if (results.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="no-results">No results found.</span>`;
    resultsBox.appendChild(li);
    return;
  }

  results.forEach(result => {
    const game = result.item;
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="/play/${game.id}">
        <div class="search-result">
          <img src="/data/images/${game.image}" alt="${game.title} thumbnail" />
          <span>${game.title}</span>
        </div>
      </a>
    `;
    resultsBox.appendChild(li);
  });
});
