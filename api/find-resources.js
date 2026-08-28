// api/find-resources.js
// Finds two authentic English-language sources on a topic — one article and one
// video — via web search. Vocabulary with real example sentences is extracted
// from the ARTICLE ONLY (fast, no transcript needed). The video is just found
// by topic/duration relevance — Anna pulls video vocabulary manually via Twee,
// so there's no need to verify captions or read the video's transcript here,
// which used to be the main cost/time driver (repeated search-and-reject
// cycles hunting for a video with a real, findable transcript).
// Requires ANTHROPIC_API_KEY in Vercel environment variables (already set up).

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' });
    return;
  }

  const { topic, level } = req.body || {};
  if (!topic) {
    res.status(400).json({ error: 'No topic specified.' });
    return;
  }

  const lvl = level || 'B2';

  const materialsPrompt = `You are finding authentic English-language teaching material for an adult ${lvl} English learner.
Topic: "${topic}"

Use web search to find real, currently-live, authentic English-language sources on this topic:

(a) TWO candidate videos, each between 3 and 15 minutes long (this is just a rough search filter — do NOT report or worry about the exact duration in your output). Videos MUST be hosted on YouTube or Vimeo ONLY (a youtube.com/youtu.be or vimeo.com URL) — no other platform. Give two DIFFERENT video URLs — never return the same video twice.

(b) TWO candidate articles, each readable in UNDER 10 MINUTES (roughly 400-1100 words). Give two DIFFERENT article URLs — never return the same article twice. For "length", give an honest estimated reading time based on the actual word count (roughly 200 words/minute), e.g. "4 min read".

Both articles and videos must clearly and directly address this specific topic — not just tangentially related content.

All URLs must be real ones you found via search. Do not invent a URL.

Do NOT write a summary, description, or vocabulary/quotes for either the articles or the videos — just the bare title, URL, and (for articles only) the estimated reading time. Skip all explanatory text entirely to keep this fast.

Write everything in ENGLISH ONLY. No Russian, no other language, anywhere in the output values.

Respond with your FINAL message containing STRICT JSON only (no markdown fences, no commentary before or after, no trailing commas) with this exact shape:
{
  "materials": {
    "video_options": [
      {"title": "real title", "url": "real URL", "type": "video"}
    ],
    "article_options": [
      {"title": "real title", "url": "real URL", "type": "article", "length": "e.g. '4 min read'"}
    ]
  }
}`;

  try {
    const materialsResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: [{ role: 'user', content: materialsPrompt }]
      })
    });
    const materialsData = await materialsResp.json();
    if (!materialsResp.ok) {
      res.status(materialsResp.status).json({ error: materialsData.error?.message || 'Anthropic API returned an error (finding materials).' });
      return;
    }
    const materialsText = (materialsData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const materialsPlan = JSON.parse(sanitizeJson(extractJson(materialsText)));

    // Safety net: drop any video candidate that isn't actually YouTube/Vimeo,
    // in case the model didn't follow the platform restriction.
    if (materialsPlan.materials && Array.isArray(materialsPlan.materials.video_options)) {
      materialsPlan.materials.video_options = materialsPlan.materials.video_options.filter(v => {
        try {
          const host = new URL(v.url).hostname.replace(/^www\./, '');
          return host === 'youtube.com' || host === 'youtu.be' || host === 'vimeo.com' || host === 'm.youtube.com';
        } catch (e) {
          return false;
        }
      });

      // Real existence check via the platforms' own oEmbed endpoints (free,
      // no API key needed). Drops dead/invented links and replaces the
      // model's guessed title with the real one straight from the source.
      const verified = await Promise.all(
        materialsPlan.materials.video_options.map(async (v) => {
          const real = await verifyVideoExists(v.url);
          if (!real) return null;
          return { ...v, title: real.title || v.title };
        })
      );
      materialsPlan.materials.video_options = verified.filter(Boolean);
    }

    // Safety net: drop duplicate URLs in either list, in case the model
    // returned the same source twice despite being told not to.
    function dedupeByUrl(list) {
      if (!Array.isArray(list)) return list;
      const seen = new Set();
      return list.filter(item => {
        try {
          const key = new URL(item.url).href.replace(/\/$/, '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        } catch (e) {
          return true;
        }
      });
    }
    if (materialsPlan.materials) {
      materialsPlan.materials.video_options = dedupeByUrl(materialsPlan.materials.video_options);
      materialsPlan.materials.article_options = dedupeByUrl(materialsPlan.materials.article_options);
    }

    // Second, simpler call — no web search, just synthesis from what was found.
    // Smaller JSON, far less likely to come back malformed.
    const introPrompt = `You are preparing an adult ${lvl} English lesson on the topic "${topic}".
Here is the authentic material already found for this lesson:
${JSON.stringify(materialsPlan.materials)}

Propose, in ENGLISH ONLY:
- "icon": ONE emoji that best represents this topic.
- "title": a short lesson title (5-8 words), suitable as a Notion page title.
- "target": a SHORT phrase in the exact format "You will speak about [specific topic phrase]." — just that, nothing longer. Example: "You will speak about market economy and market society."
- "warmup_question": one standalone opening discussion question about the general topic (not about a specific source) to ask before the material is introduced.
- "discussion_questions": 6-8 open-ended discussion questions connecting to the material and the student's own life/views. Avoid yes/no questions. Make the LAST 1-2 questions in the list reflective/wrap-up ones about the lesson itself (e.g. what they'll remember, what stood out, how their view changed) rather than about the source material directly.
- "group_discussion_questions": 9-11 questions for a small group class (people talk in pairs, this is casual self-expression and reflection, NOT formal debate or public speaking). These must be DIFFERENT from discussion_questions, not reworded duplicates — assume some students already answered discussion_questions individually and would find repeats boring. Critical constraints:
  (a) NEVER use the specific name of the study/theory/person/technical term from the material (e.g. don't say "hedonic treadmill" or "Sapolsky's argument") — someone might join late or never have covered the source material, and shouldn't feel lost. Ask about the underlying everyday idea/experience instead, in plain words.
  (b) Keep it personal and reflective, not a debate — "have you ever...", "what's your experience with...", "do you agree that...", "how do you feel about..." rather than "argue for/against..." or framing it as taking opposing sides.
  (c) Simple, accessible phrasing — someone unfamiliar with the topic should still be able to answer from their own life.

Respond with STRICT JSON only (no markdown fences, no commentary, no trailing commas):
{
  "icon": "...",
  "title": "...",
  "target": "...",
  "warmup_question": "...",
  "discussion_questions": ["...", "...", "...", "...", "...", "..."],
  "group_discussion_questions": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]
}`;

    const introResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: introPrompt }]
      })
    });
    const introData = await introResp.json();
    if (!introResp.ok) {
      res.status(introResp.status).json({ error: introData.error?.message || 'Anthropic API returned an error (building title/questions).' });
      return;
    }
    const introText = (introData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const introPlan = JSON.parse(sanitizeJson(extractJson(introText)));

    res.status(200).json({ ...materialsPlan, ...introPlan });
  } catch (err) {
    res.status(500).json({ error: 'Could not find material: ' + (err.message || 'unknown error') + '. Try a different topic or try again — sometimes just retrying helps.' });
  }
};

// Finds the first top-level {...} object in text by tracking brace depth,
// instead of naively using the last "}" in the whole string.
function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('JSON object in response was not properly closed');
}

// Cheap repair pass for the single most common LLM JSON mistake: a trailing
// comma right before a closing } or ] — technically invalid JSON, but easy
// and safe to strip before parsing.
function sanitizeJson(jsonStr) {
  return jsonStr.replace(/,(\s*[}\]])/g, '$1');
}

// Confirms a video URL is real using the platform's own oEmbed endpoint —
// public, free, no API key. Returns { title } on success or null if the
// video doesn't exist / oEmbed rejects it (private, deleted, wrong URL).
async function verifyVideoExists(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const isYouTube = host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
    const oembedUrl = isYouTube
      ? 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json'
      : 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(url);
    const r = await fetch(oembedUrl);
    if (!r.ok) return null;
    const data = await r.json();
    return { title: data.title };
  } catch (e) {
    return null;
  }
}

module.exports.config = { maxDuration: 60 };
