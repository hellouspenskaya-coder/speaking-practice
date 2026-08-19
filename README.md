# Speaking Practice — deployment notes

This folder contains the whole tool:
- `index.html` — the page students see (question, record button, feedback, journal)
- `api/transcribe.js` — talks to Groq (Whisper) to turn speech into text
- `api/feedback.js` — talks to Claude to generate the dosed feedback

Your API keys are **not** in these files. They get added separately as
"environment variables" in Vercel's dashboard, so they stay private.

## Deploy steps (no coding required)

1. Create a free account at github.com if you don't have one.
2. Create a new repository (name it e.g. `speaking-practice`), and upload
   this whole folder to it (GitHub's "Add file → Upload files" page lets you
   drag the folder in).
3. Go to vercel.com, sign up (you can use your GitHub account to sign in —
   this also connects the two automatically).
4. Click "Add New Project", pick the `speaking-practice` repository you just
   created, and click Deploy. No settings need to change.
5. Once deployed, go to the project's Settings → Environment Variables and
   add two entries:
   - `ANTHROPIC_API_KEY` → your Claude API key (starts with `sk-ant-`)
   - `GROQ_API_KEY` → your Groq API key
6. Redeploy (Vercel will prompt you, or use the "Redeploy" button) so the new
   keys take effect.
7. Your tool is now live at a Vercel address like
   `speaking-practice.vercel.app`. Test it there first.
8. Once it works, point your subdomain (e.g.
   `practice.wetalktodevelop.com`) at this Vercel project — this is done in
   two places:
   - In Vercel: Project → Settings → Domains → add the subdomain
   - In Hostinger: DNS settings → add the CNAME record Vercel shows you
