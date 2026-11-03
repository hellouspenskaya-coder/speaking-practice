# Story games: sources

Everything needed to edit a game or make a new one. Not used by the site itself (the site only serves `story-game.html` and `vocab-sets/*.json`).

- `games/<slug>/story.ink` - the story in Ink. `§` marks the good reply; `‹word›` or `‹shown=key›` is a vocabulary word; `# note` is the "Not this one" card; `Say:` inside a note is the phrase shown in the box.
- `games/<slug>/game.words.json` - the words (definition, example) for hints and for the Voc Practice set.
- `games/<slug>/meta.json` - title, level, intro texts, and the questions/replies for the Voc Practice set.
- `gen/` - the three Baltic Freight games are written as compact data (`data.py`) and turned into the files above by `gen.py` (definitions come from `vocab-sets/logistics-a2-*.json`).
- `engine/build.js` - compiles and checks a game (3000 random playthroughs, perfect path, word markup, duplicates).
- `engine/assemble.js` - builds `<slug>.json`, `<slug>-words.json` and `story-game.html`; it also draws an avatar for every speaker (`engine/avatars.py`; known characters look the same in every game, new ones get a look made from their name).

```
cd story-games-src/engine && npm install
node build.js ../games/<slug>
node assemble.js ../games/<slug> ../../out/<slug>   # then copy the two .json files into vocab-sets/ (and story-game.html if it changed)
```
