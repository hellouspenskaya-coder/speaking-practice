# Vocabulary Trainer — setup

New files added, all self-contained in this repo:

- `vocab-builder.html` — your builder page
- `vocab-trainer.html` — student practice page (link format: `vocab-trainer.html?set=SLUG`)
- `api/vocab-search-images.js` — image candidates via Pexels
- `api/vocab-generate-content.js` — Haiku generates definitions/examples/distractors
- `api/vocab-generate-audio.js` — Groq Orpheus TTS for sentence audio
- `api/vocab-save-set.js` — commits a finished set to `vocab-sets/*.json` in this repo
- `vocab-sets/demo-test.json` — a small hand-made set so you can test the trainer right away, no API keys needed:
  **https://speaking-practice-ruby.vercel.app/vocab-trainer.html?set=demo-test**

## New environment variables needed in Vercel

Project → Settings → Environment Variables → add these three:

1. **PEXELS_API_KEY** — free, sign up at pexels.com/api, instant key, generous free limit. Powers "Find images" in the builder.
2. **GITHUB_TOKEN** — a *separate* Personal Access Token from the one you gave me for this one-time push. This one needs to be **long-lived** (e.g. 1 year, or no expiration) since the live app uses it every time you click "Generate link" in the builder. Same steps as before (Settings → Developer settings → Fine-grained tokens → repository `speaking-practice` only → Contents: Read and write). Until this is set, the builder's "Generate link" button will show an error — use "Download JSON instead" and upload manually as a fallback in the meantime.
3. Nothing new needed for text-to-speech — it reuses your existing **GROQ_API_KEY**. One extra step: visit console.groq.com/playground, open the Orpheus V1 English model, and accept its model terms once — otherwise `vocab-generate-audio` will fail with a permissions error.

`ANTHROPIC_API_KEY` is already set from your other tools and is reused as-is.

## How it fits together

1. Open `vocab-builder.html`, add words/phrases, generate content/images/audio per item, pick which practice modes are on for this set.
2. Click "Generate link" — this saves the set as `vocab-sets/<topic-slug>.json` in the repo (via the GitHub API) and gives you back one shared link: `vocab-trainer.html?set=<topic-slug>`.
3. That link works for every student — no names, no tracking, no Notion writes. The trainer shuffles a fresh mix of exercises across the word list every time it's opened.
4. After clicking "Generate link", Vercel needs ~30-60 seconds to redeploy before the file is actually live — if the student link 404s immediately, that's why; it resolves itself shortly.

## What to test first

- Open the demo link above directly — checks the trainer engine (all 8 modes, session shuffling) without touching any API.
- Once `PEXELS_API_KEY` is set, try "Find images" in the builder on a real word.
- Once `GITHUB_TOKEN` is set, try the full "Generate link" flow end to end on a small 3-4 word set.

## Known rough edges to expect on first use

- Phrase image search uses `"person " + phrase"` as the query — works fine for concrete things ("person live in a house" → reasonable), less reliable for abstract phrases ("person say sorry"). You may need to hand-pick from fewer/weaker candidates for those, or skip the image.
- The AI-generated distractors and phrase chunks are a starting point — review them before publishing, same as you already do with images.
- No student-side progress is saved anywhere (by design, per what we discussed) — if you want to check comprehension, do it live in the lesson.
