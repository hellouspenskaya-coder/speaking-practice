// All vocabulary-trainer backend actions live in this ONE serverless
// function, because Vercel's Hobby plan allows a maximum of 12 of them
// and this project was already close to that ceiling. Adding a new
// capability here costs nothing; adding a new api/*.js file may break
// the whole deployment.
//
// POST /api/vocab  with { action: "...", ...params }
//   action: "content"   -> Haiku writes definitions/examples/distractors
//   action: "antonyms"  -> Haiku finds opposite pairs within the set
//   action: "audio"     -> Groq Orpheus speaks a sentence
//   action: "images"    -> Pexels returns candidate pictures
//   action: "save"      -> commits the finished set to vocab-sets/*.json

const OWNER = 'hellouspenskaya-coder';
const REPO = 'speaking-practice';
const SITE_ORIGIN = 'https://speaking-practice-ruby.vercel.app';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const { action } = req.body || {};

  try {
    if (action === 'content') return await generateContent(req, res);
    if (action === 'antonyms') return await findAntonyms(req, res);
    if (action === 'audio') return await generateAudio(req, res);
    if (action === 'images') return await searchImages(req, res);
    if (action === 'save') return await saveSet(req, res);
    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- shared helpers ----------

async function callHaiku(prompt, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens || 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function extractJsonArray(raw) {
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Could not find JSON array in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ---------- actions ----------

async function generateContent(req, res) {
  const { items, level } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items must be a non-empty array' });
    return;
  }
  const cefr = level || 'A1';

  const prompt = `You are creating vocabulary trainer content for ${cefr}-level English learners who cannot yet build sentences on their own.

For each item below, decide if it is a single "word" or a multi-word "phrase" (e.g. "live in a house", "say sorry"), then produce:
- "definition": one very simple ${cefr}-level definition (max 8 words, no difficult words)
- "example": one short example sentence, 3-6 words, simple present tense, using only common ${cefr} vocabulary, that contains the item naturally
- "phonetic": IPA transcription (words only; omit for phrases)
- "distractors": for "word" items only - exactly 2 other real English words that sound similar (rhyme or near-minimal pairs, for listening practice). Never repeat the item itself. Omit for phrases.
- "chunks": for "phrase" items only - the phrase split into its individual words in correct order, as an array of strings. Omit for words.

Items: ${JSON.stringify(items)}

Respond with ONLY a JSON array, one object per item, in the same order as the input, in this exact shape:
[{"text":"...","type":"word|phrase","definition":"...","example":"...","phonetic":"...","distractors":["...","..."],"chunks":["...","..."]}]
No preamble, no markdown fences, no explanation - JSON only.`;

  const text = await callHaiku(prompt, 2000);
  res.status(200).json({ items: extractJsonArray(text) });
}

async function findAntonyms(req, res) {
  const { words } = req.body;
  if (!Array.isArray(words) || words.length < 2) {
    res.status(400).json({ error: 'words must be an array of at least 2 items' });
    return;
  }

  const prompt = `Here is a list of English vocabulary items: ${JSON.stringify(words)}

Find which of them are opposites (antonyms) of each other. Only pair items that are BOTH in the list above. Only include clear, everyday opposites that a beginner would recognise (like big/small, hot/cold, open/closed). Do not invent words that are not in the list. If there are no clear pairs, return an empty array.

Respond with ONLY a JSON array of pairs, no preamble, no markdown fences:
[["big","small"],["clean","dirty"]]`;

  const text = await callHaiku(prompt, 800);
  const pairs = extractJsonArray(text);

  // Safety net: drop anything referencing a word that isn't in the set.
  const lower = words.map((w) => String(w).toLowerCase());
  const valid = pairs.filter(
    (p) =>
      Array.isArray(p) &&
      p.length === 2 &&
      lower.includes(String(p[0]).toLowerCase()) &&
      lower.includes(String(p[1]).toLowerCase()) &&
      String(p[0]).toLowerCase() !== String(p[1]).toLowerCase()
  );

  res.status(200).json({ pairs: valid });
}

const VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'];

async function generateAudio(req, res) {
  const { text, voice } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing text' });
    return;
  }
  const chosenVoice = VOICES.includes(voice) ? voice : 'hannah';

  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-v1-english',
      voice: chosenVoice,
      input: text,
      response_format: 'mp3'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    res.status(502).json({ error: `Groq TTS error ${response.status}: ${errText}` });
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  res.status(200).json({ audio: `data:audio/mpeg;base64,${base64}` });
}

async function searchImages(req, res) {
  const query = (req.body.query || '').toString().trim();
  if (!query) {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'PEXELS_API_KEY is not set in Vercel environment variables' });
    return;
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=4&orientation=square`;
  const response = await fetch(url, { headers: { Authorization: apiKey } });

  if (!response.ok) {
    res.status(502).json({ error: `Pexels error ${response.status}` });
    return;
  }

  const data = await response.json();
  const images = (data.photos || []).map((p) => ({
    thumb: p.src.medium,
    full: p.src.large,
    alt: p.alt || query
  }));
  res.status(200).json({ images });
}

async function saveSet(req, res) {
  const { slug, data } = req.body;
  if (!slug || !data) {
    res.status(400).json({ error: 'Missing slug or data' });
    return;
  }

  const cleanSlug = slug.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!cleanSlug) {
    res.status(400).json({ error: 'slug produced an empty filename' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN is not set in Vercel environment variables' });
    return;
  }

  const path = `vocab-sets/${cleanSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  let sha;
  const existing = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (existing.ok) {
    const existingData = await existing.json();
    sha = existingData.sha;
  }

  const commitResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: sha ? `Update vocab set: ${cleanSlug}` : `Add vocab set: ${cleanSlug}`,
      content,
      ...(sha ? { sha } : {})
    })
  });

  if (!commitResponse.ok) {
    const errText = await commitResponse.text();
    res.status(502).json({ error: `GitHub error ${commitResponse.status}: ${errText}` });
    return;
  }

  const trainerLink = `/vocab-trainer.html?set=${cleanSlug}`;
  const fullLink = `${SITE_ORIGIN}${trainerLink}`;

  // Also file the link in the Notion library page, if one is configured.
  let notion = { attempted: false };
  if (process.env.NOTION_VOCAB_PAGE_ID && process.env.NOTION_TOKEN) {
    notion.attempted = true;
    try {
      await addToNotionLibrary(data, fullLink);
      notion.ok = true;
    } catch (err) {
      // A Notion failure must never lose the set — it's already committed.
      notion.ok = false;
      notion.error = err.message;
    }
  }

  res.status(200).json({
    ok: true,
    path: `/vocab-sets/${cleanSlug}.json`,
    trainerLink,
    notion
  });
}

async function addToNotionLibrary(data, fullLink) {
  const pageId = process.env.NOTION_VOCAB_PAGE_ID;
  const wordCount = (data.items || []).length;
  const label = `${data.topic} (${data.level}) — ${wordCount} words`;

  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: { content: label, link: { url: fullLink } }
              }
            ]
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Notion error ${response.status}: ${errText}`);
  }
}

module.exports.config = { maxDuration: 60 };
