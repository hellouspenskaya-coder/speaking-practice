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
    if (action === 'listSets') return await listSets(req, res);
    if (action === 'repairImages') return await repairImages(req, res);
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

  // Chunk large word lists so each individual Haiku call stays small and
  // reliable. A single big request (e.g. 19 words with full B1+ fields)
  // can get truncated mid-response, producing invalid JSON — chunking keeps
  // this safe no matter how large the set grows.
  const CHUNK_SIZE = 6;
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) chunks.push(items.slice(i, i + CHUNK_SIZE));

  try {
    const results = await Promise.all(chunks.map(chunk => generateContentChunk(chunk, cefr)));
    res.status(200).json({ items: results.flat() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function generateContentChunk(items, cefr) {
  const isHigherLevel = ['B1', 'B2', 'C1'].includes(cefr);

  const levelGuidance = {
    A1: 'Definitions must be extremely simple (max 8 words), using only the most common everyday words. Example sentences: 3-6 words, simple present tense only.',
    A2: 'Definitions simple and short (max 10 words), everyday vocabulary. Example sentences: 4-8 words, simple tenses (present, past simple, going to).',
    B1: 'Definitions can use everyday natural English, a full sentence is fine. Example sentences should sound natural, using a range of common tenses and structures a B1 learner is expected to know.',
    B2: 'Definitions in natural, idiomatic English — do not oversimplify. Example sentences should reflect realistic, everyday use, including more complex clauses where natural.',
    C1: 'Definitions in full natural English, as a good monolingual dictionary would phrase them — no artificial simplification. Example sentences should reflect authentic, sophisticated usage, including nuance, register, and collocation.'
  }[cefr] || '';

  const higherLevelFields = `
- "requiresPreposition": true only if this item is a SINGLE VERB (not a phrase) commonly used with ONE specific dependent preposition that learners at this level typically get wrong (e.g. "interested" → "in", "depend" → "on", "arrive" → "at"). Always false for multi-word items that already include their own particle or preposition (e.g. "look after", "give up", "live in a house") — the particle is already visible in the item itself, so this exercise would be redundant.
- "correctPreposition": ONLY if requiresPreposition is true — the single correct preposition, lowercase, one word.
- "prepositionSentence": ONLY if requiresPreposition is true — a natural sentence containing the item, with the preposition replaced by exactly "___" (three underscores). Example for "interested": "She is interested ___ music."
- "wordFamily": an array of 2-4 objects {"form": "...", "pos": "noun|verb|adjective|adverb"} covering the different word-class forms of this item's root (e.g. for "success": success/noun, successful/adjective, successfully/adverb). Only include this if the item genuinely has 2+ distinct common forms; omit entirely otherwise.
- "wordFormationSentence": ONLY if "wordFamily" is included — one natural sentence with a blank (exactly "___") where ONE specific form from wordFamily correctly fits GRAMMATICALLY EXACTLY AS WRITTEN, with no further inflection needed (no added -ed, -s, -ing, etc.). If natural grammar would require inflecting a form (e.g. "succeeded" instead of "succeed"), either add that exact inflected string as its own entry in wordFamily, or rewrite the sentence so the blank needs a form already listed. Double-check before answering: reread the completed sentence with your chosen form substituted in and confirm it is grammatically correct with zero changes to that form.
- "wordFormationAnswer": ONLY if "wordFamily" is included — copy the correct form EXACTLY, character for character, from one of the "form" fields in wordFamily. It must be an exact string match to a wordFamily entry — never a modified, inflected, or conjugated version of one.
- "isCollocation": true only if the item is a fixed collocation with ONE word that learners commonly get wrong by substituting a similar-meaning word (e.g. "make a decision" — learners often wrongly say "do a decision"; "do homework" — learners often wrongly say "make homework"; "take a photo", "have a shower"). false for ordinary free phrases with no well-known confusable substitute.
- "collocationSentence": ONLY if isCollocation is true — a natural sentence containing the full collocation, with ONLY the one confusable word replaced by exactly "___". Example for "make a decision": "It's time to ___ a decision."
- "collocationAnswer": ONLY if isCollocation is true — the single correct word that fills the blank (e.g. "make").
- "collocationDistractors": ONLY if isCollocation is true — an array of exactly 3 other real English words that a learner might plausibly (but wrongly) substitute in that exact blank (e.g. for "make a decision": ["do","take","have"]). Never repeat collocationAnswer.
- "verbSentence": ONLY if isVerb is true — a natural sentence with a blank (exactly "___") that requires ONE specific form of this verb (base, past simple, or past participle — your choice, pick whichever makes the clearest test).
- "verbAnswer": ONLY if isVerb is true — the exact correct form (base form, pastSimple, or pastParticiple as generated above) that fills the blank in verbSentence.`;

  const prompt = `You are creating vocabulary trainer content for ${cefr}-level English learners.

${cefr === 'A1' || cefr === 'A2' ? 'These learners cannot yet build sentences on their own — everything must stay within their level.' : 'These learners can already build sentences and are working on precision, naturalness, and range.'}

Level-specific guidance: ${levelGuidance}

For each item below, decide if it is a single "word" or a multi-word "phrase" (e.g. "live in a house", "as far as I understand"), then produce:
- "definition": a ${cefr}-appropriate definition, per the guidance above
- "example": one example sentence, per the guidance above, that contains the item naturally
- "phonetic": IPA transcription (words only; omit for phrases)
- "chunks": for "phrase" items only - the phrase split into its individual words in correct order, as an array of strings. Omit for words.
- "illustrable": true or false. true only if the item names a concrete, physical, drawable thing or action (e.g. "laptop", "run", "umbrella"). false for abstract concepts, feelings, discourse markers, evaluative words, or anything a picture could not unambiguously convey (e.g. "guilty", "as far as I understand", "responsible", "rush hour" as a concept rather than a scene). When in doubt, prefer false — a wrong or misleading picture is worse than no picture.
- "imageHint": ONLY if "illustrable" is true — exactly 2-3 keywords (no commas, no phrases) for finding a clear isolated illustration on a stock image site. For ambiguous words add a disambiguating keyword (e.g. "key" → "door key", "tablet" → "tablet ipad", "glasses" → "glasses eyewear"). Omit this field entirely if "illustrable" is false.
- "isVerb": true only if the item is a single verb in its base form (e.g. "go", "eat", "buy"). false for everything else, including phrases containing a verb. This applies at every level, not just higher ones — beginners need this just as much for rote memorisation of irregular forms.
- "pastSimple": ONLY if isVerb is true — the past simple form (e.g. "went", "ate", "bought" — irregular verbs matter most here, but regular verbs are fine too).
- "pastParticiple": ONLY if isVerb is true — the past participle form (e.g. "gone", "eaten", "bought").
${isHigherLevel ? higherLevelFields : ''}

Items: ${JSON.stringify(items)}

IMPORTANT: keep all string values valid JSON — escape any double quotes or apostrophes-as-quotes inside sentences (prefer avoiding quotation marks inside example/sentence fields entirely).

Respond with ONLY a JSON array, one object per item, in the same order as the input, in this exact shape:
${isHigherLevel
  ? '[{"text":"...","type":"word|phrase","definition":"...","example":"...","phonetic":"...","chunks":["...","..."],"illustrable":true,"imageHint":"...","isVerb":false,"pastSimple":"...","pastParticiple":"...","requiresPreposition":false,"correctPreposition":"...","prepositionSentence":"...","wordFamily":[{"form":"...","pos":"..."}],"wordFormationSentence":"...","wordFormationAnswer":"...","isCollocation":false,"collocationSentence":"...","collocationAnswer":"...","collocationDistractors":["...","...","..."],"verbSentence":"...","verbAnswer":"..."}]'
  : '[{"text":"...","type":"word|phrase","definition":"...","example":"...","phonetic":"...","chunks":["...","..."],"illustrable":true,"imageHint":"...","isVerb":false,"pastSimple":"...","pastParticiple":"..."}]'}
No preamble, no markdown fences, no explanation - JSON only.`;

  const text = await callHaiku(prompt, 3000);
  return extractJsonArray(text);
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
  const rawQuery = (req.body.query || '').toString().trim();
  const definition = (req.body.definition || '').toString().trim();
  if (!rawQuery) {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  const isPhrase = rawQuery.includes(' ');

  // Build a disambiguated query using the definition when available.
  // Extract up to 3 meaningful words from the definition as context.
  let query;
  if (isPhrase) {
    query = rawQuery;
  } else if (definition) {
    const stopWords = new Set(['a','an','the','to','you','it','is','are','they','that','very','small','large','used','for','of','in','on','with','or','and','have','has','can','we','he','she','use','make','get','do','this','be','at','by','from','as','if','when','which']);
    const hint = definition
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 3)
      .join(' ');
    query = hint ? `${rawQuery} ${hint}` : `single ${rawQuery}`;
  } else {
    query = `single ${rawQuery}`;
  }

  // Random page (1-3) so repeated clicks return fresh results.
  const page = Math.floor(Math.random() * 3) + 1;

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'PIXABAY_API_KEY is not set in Vercel environment variables' });
    return;
  }

  // For single words, prefer vector illustrations — they show one clean object
  // on a plain background, which is much better for A1 vocabulary cards than
  // busy stock photos. Phrases fall back to photos since vectors rarely cover them.
  const imageType = isPhrase ? 'photo' : 'vector';

  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=${imageType}&orientation=horizontal&per_page=4&page=${page}&safesearch=true`;
  const response = await fetch(url);

  if (!response.ok) {
    res.status(502).json({ error: `Pixabay error ${response.status}` });
    return;
  }

  const data = await response.json();
  let hits = data.hits || [];

  // If no vectors found, fall back to photos
  if (!hits.length && imageType === 'vector') {
    const fallback = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=4&page=${page}&safesearch=true`);
    const fbData = await fallback.json();
    hits = fbData.hits || [];
  }

  const images = hits.map(h => ({
    thumb: h.previewURL,
    full: h.webformatURL,
    alt: h.tags || query
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

  // Pixabay's image URLs are not permanently stable (they can change or stop
  // working within a day). Bake every image into the saved JSON as base64
  // right now, so this set never depends on an external link staying alive.
  if (Array.isArray(data.items)) {
    await Promise.all(data.items.map(async (item) => {
      if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
        const embedded = await fetchAndEmbedImage(item.image);
        item.image = embedded; // null if the fetch failed — degrades gracefully, same as no image
      }
    }));
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

  // Also file this as a row in the Assignments database, if configured.
  let notion = { attempted: false };
  if (process.env.NOTION_ASSIGNMENTS_DATABASE_ID && process.env.NOTION_TOKEN) {
    notion.attempted = true;
    try {
      await addToAssignmentsDatabase(data, fullLink);
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

async function addToAssignmentsDatabase(data, fullLink) {
  const dbId = process.env.NOTION_ASSIGNMENTS_DATABASE_ID;

  // Anna wants every vocab practice assignment marked "short", regardless
  // of word count — this tool's exercises are quick regardless of set size.
  const timeRequired = 'short';

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: {
        'Assignment Title': { title: [{ text: { content: data.topic || 'Untitled set' } }] },
        'Format': { select: { name: 'Individual' } },
        'Platform': { select: { name: 'practice' } },
        'Skill': { multi_select: [{ name: 'vocabulary' }] },
        'Type': { multi_select: [{ name: 'vocpractice' }] },
        'Level': { multi_select: [{ name: data.level || 'A1' }] },
        'Time required': { multi_select: [{ name: timeRequired }] },
        'URL': { url: fullLink },
        'created': { date: { start: today } }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Notion error ${response.status}: ${errText}`);
  }
}

// Downloads an image and returns it as a permanent base64 data URL.
// Returns null on any failure so callers can degrade gracefully (same
// behaviour as an item having no image at all).
async function fetchAndEmbedImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 600000) return null; // sanity cap (~600KB) so sets don't bloat
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    return null;
  }
}

// Lists every saved set's slug, so a repair pass can process all of them
// without the caller needing to know the filenames in advance.
async function listSets(req, res) {
  const token = process.env.GITHUB_TOKEN;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/vocab-sets`;
  const response = await fetch(apiUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    res.status(502).json({ error: `Could not list sets: ${response.status}` });
    return;
  }
  const files = await response.json();
  const slugs = files
    .filter(f => f.name.endsWith('.json'))
    .map(f => f.name.replace(/\.json$/, ''));
  res.status(200).json({ slugs });
}

// Emergency repair: Pixabay's image URLs are not permanently stable, so any
// set saved before this was fixed may have dead image links. This re-fetches
// (or re-searches and re-fetches) each image and embeds it as permanent
// base64 data, then commits the repaired set back to the repo.
async function repairImages(req, res) {
  const { slug } = req.body;
  if (!slug) {
    res.status(400).json({ error: 'Missing slug' });
    return;
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN is not set' });
    return;
  }
  const pixabayKey = process.env.PIXABAY_API_KEY;

  const path = `vocab-sets/${slug}.json`;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const existing = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (!existing.ok) {
    res.status(404).json({ error: `Set not found: ${slug}` });
    return;
  }
  const existingData = await existing.json();
  const sha = existingData.sha;
  const data = JSON.parse(Buffer.from(existingData.content, 'base64').toString('utf-8'));

  const results = [];
  let changed = false;

  await Promise.all((data.items || []).map(async (item) => {
    if (!item.image || item.image.startsWith('data:')) {
      return; // no image, or already permanently embedded — nothing to do
    }
    changed = true;
    // Try the URL exactly as stored first — it may still work.
    let embedded = await fetchAndEmbedImage(item.image);

    // If that failed, re-search Pixabay using whatever the item remembers
    // about how it was found, and try the freshest top result instead.
    if (!embedded && pixabayKey) {
      const query = item.imageQuery || item.imageHint || item.text;
      const imageType = item.type === 'phrase' ? 'photo' : 'vector';
      try {
        let searchRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=${imageType}&orientation=horizontal&per_page=3&safesearch=true`);
        let searchData = await searchRes.json();
        let hit = (searchData.hits || [])[0];
        if (!hit && imageType === 'vector') {
          searchRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`);
          searchData = await searchRes.json();
          hit = (searchData.hits || [])[0];
        }
        if (hit) embedded = await fetchAndEmbedImage(hit.webformatURL);
      } catch (err) { /* leave embedded as null */ }
    }

    if (embedded) {
      item.image = embedded;
      results.push({ text: item.text, status: 'fixed' });
    } else {
      item.image = null;
      results.push({ text: item.text, status: 'could not recover — image removed' });
    }
  }));

  if (!changed) {
    res.status(200).json({ ok: true, slug, skipped: true, results: [] });
    return;
  }

  const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const commitResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: `Repair images: ${slug}`, content: newContent, sha })
  });
  if (!commitResponse.ok) {
    const errText = await commitResponse.text();
    res.status(502).json({ error: `GitHub error ${commitResponse.status}: ${errText}` });
    return;
  }

  res.status(200).json({ ok: true, slug, results });
}

module.exports.config = { maxDuration: 60 };
