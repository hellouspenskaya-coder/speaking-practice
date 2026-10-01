# Vocabulary Trainer — setup

New files added, all self-contained in this repo:

- `vocab-builder.html` — your builder page
- `vocab-trainer.html` — student practice page (link format: `vocab-trainer.html?set=SLUG`)
- `api/vocab.js` — **one** serverless function handling all vocab actions (content, antonyms, audio, images, save)
- `vocab-sets/demo-test.json` — a small hand-made set so you can test the trainer right away, no API keys needed:
  **https://speaking-practice-ruby.vercel.app/vocab-trainer.html?set=demo-test**

## Important: Vercel's function limit

The Hobby (free) plan allows a maximum of **12 serverless functions** per project. This project already had 8 before the vocab trainer, so all vocab backend actions live in a single `api/vocab.js` file, routed by an `action` field in the POST body. Adding a new capability there is free; adding a new `api/*.js` file risks pushing the project over the limit, which makes the **entire deployment fail silently** and leaves the live site stuck on the previous version.

## New environment variables needed in Vercel

Project → Settings → Environment Variables → add these three:

1. **PEXELS_API_KEY** — free, sign up at pexels.com/api, instant key, generous free limit. Powers "Find images" in the builder.
2. **GITHUB_TOKEN** — a *separate* Personal Access Token from the one you gave me for this one-time push. This one needs to be **long-lived** (e.g. 1 year, or no expiration) since the live app uses it every time you click "Generate link" in the builder. Same steps as before (Settings → Developer settings → Fine-grained tokens → repository `speaking-practice` only → Contents: Read and write). Until this is set, the builder's "Generate link" button will show an error — use "Download JSON instead" and upload manually as a fallback in the meantime.
3. Nothing new needed for text-to-speech — it reuses your existing **GROQ_API_KEY**. One extra step: visit console.groq.com/playground, open the Orpheus V1 English model, and accept its model terms once — otherwise the audio action will fail with a permissions error.
4. **NOTION_ASSIGNMENTS_DATABASE_ID** *(optional)* — logs every published set as a row in your "Assignments" database (inside the "Assignment Tracking" page), matching your existing tracker: Assignment Title, Format (Individual), Platform (practice), Skill (vocabulary), Type (vocpractice), Level (from the set), Time required (auto: ≤10 words → short, 11-20 → normal, >20 → huge), URL, and created date. This variable already exists in your Vercel project (shared with Lesson Assembler) — no new setup needed, as long as the Notion integration it uses ("Lesson Assembler") is connected to the "Assignments" database (Notion → database → "..." → Connections). Reuses your existing `NOTION_TOKEN`. If this isn't set, publishing still works — sets just aren't logged in Notion.

## A note on audio and storage

Generated audio is stored as base64 inside each set's JSON, which means it lives in this repo and ships with every deployment. Roughly 20-60 KB per sentence, so a 15-word set with audio is 0.3-0.9 MB. That's fine for dozens of sets; if you ever reach several hundred, deployments will slow down and audio should move to separate storage.

The trainer falls back to the browser's built-in speech synthesis whenever a set has no generated audio, and that costs nothing and takes no space. Generating Orpheus audio is worth it mainly for listening exercises where voice quality matters.

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

## Text sets (reading + highlighted words)

- Builder page: `text-builder.html` (teacher side, all English).
- Student side: the same `vocab-trainer.html?set=SLUG`. A set whose JSON has a `passage` opens with a reading screen
  (highlighted words, tap for the English definition), then the word gallery, then reading-skill taps
  (hedge / reference / paraphrase / main idea), then the usual word practice plus the new `contextGap` mode.
- New backend actions inside `api/vocab.js` (no new function files): `textAreas`, `textSearch`, `textFetch`, `textBuild`.
- The passage is never written by the model: the server fetches a CC BY article page and builds the excerpt from
  its own sentences, word for word (citations removed). Source, authors and licence are stored in `passage.source`
  and shown under the text.
- Notion: published text sets are logged in Assignments with Type `text set`, Skill `reading` + `vocabulary`,
  Platform `practice`, and Area from the builder.
- `vercel.json` sets `maxDuration: 60` for `api/vocab.js` (safe on both the old 60 s limit and Fluid compute).

### Added later: adaptation and "Complete the story" for any set

- `text-builder.html`: tick "Adapt the wording to the level" (auto-ticked for B1; B1 and B2 only, C1 keeps the original).
  Action `textAdapt` (Sonnet) rewrites the excerpt; the original stays visible under it for comparison.
  Adapted sets carry `passage.source.adaptedFor` and the trainer shows "wording adapted for B1" under the text.
- Text sets end with "Complete the text": the same excerpt with the highlighted words removed (tap a word, tap its gap).
  Switch off per set with the checkbox in the builder (`passage.cloze: false`).
- `vocab-builder.html`: optional "Story at the end" card for ANY set. Action `storyBuild` (Haiku) writes a short story
  from the set's words; gap words are marked **like this** and can be edited. Stored as
  `stories: [{ stories: [{ src: "builder", label, text, gaps }] }]`, i.e. the same structure the irregular verbs sets already use.
- The builder now keeps fields it does not edit (`stories`, `sampleSize`, `passage`, `passageForm`) when an existing set
  is opened with `?set=slug` and saved again. Before, such a re-save silently dropped them.

### "Words" button in the student practice screen

- Top row of every exercise: `Words` (next to `Skip`). It opens a panel IN PLACE of the exercise: the question and the
  answer controls are hidden (`display:none`, not removed), so the panel works as a reminder, not as a place to copy from.
  Score, streak and the queue are untouched; "Back to the exercise" shows the same step again. No limit on how often.
- Panel: tab "Words" (the same cards as the gallery, tap for the detail card) and, for text sets, tab "Text"
  (the passage with tappable highlighted words).
- In the two steps where the text itself gives the answer ("Complete the text" and "Choose the word in context")
  the Text tab is hidden and the word cards do not show their example sentence.
- Not shown in worksheet mode (`&worksheet=1` has its own screen).
