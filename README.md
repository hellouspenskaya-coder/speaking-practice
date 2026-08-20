# Speaking Practice — what's inside & how to deploy

## Files
- `index.html` — the page students open (target words, question, record button,
  transcription, dosed feedback, gap-fill exercise, personal journal). Questions
  and words are passed in through the link, so a new lesson is just a new link.
- `builder.html` — YOUR private page for building lessons. Enter a topic, level,
  and (optionally) target words; it generates reflective discussion questions and
  a word list, then builds the ready-to-share link. Do not share this page.
- `api/transcribe.js` — sends recorded audio to Groq (Whisper) → text.
- `api/feedback.js` — sends question + answer to Claude → 3-line feedback plus a
  grammar-form gap-fill exercise (structured JSON).
- `api/generate-questions.js` — sends topic/level/words to Claude → questions +
  vocabulary (structured JSON). Used by builder.html only.

Your API keys are NOT in these files. They live as environment variables in
Vercel: ANTHROPIC_API_KEY and GROQ_API_KEY.

## Deploy / update
1. Upload the files to your GitHub repo (Add file → Upload files; same-named
   files are replaced automatically). Keep the three api/*.js files inside the
   `api` folder, not in the root.
2. Vercel redeploys automatically from GitHub.
3. Environment variables (set once, in Vercel → Settings → Environment Variables):
   - ANTHROPIC_API_KEY — your Claude key (starts with sk-ant-)
   - GROQ_API_KEY — your Groq key
   After adding or changing them, redeploy once.

## Using it
1. Open builder.html on your live site (e.g. speaking-practice-ruby.vercel.app/builder.html).
2. Enter topic + level, optionally your target words, click Generate questions.
3. Adjust questions/words by hand if you like, click Generate link, copy it.
4. Paste the link into your Notion lesson as a normal link (NOT an embed —
   embeds block the microphone and the journal).

## Notes
- Journal is stored per-device in the browser for now (each student sees only
  their own; a shared journal across devices is a planned next step).
- Audio is never stored — only the text transcript and feedback.
- Cost at ~10-15 students is a couple of dollars a month at most.
