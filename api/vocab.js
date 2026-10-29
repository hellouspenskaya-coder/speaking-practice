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
//   action: "textAreas"  -> Area options from the Notion Assignments database
//   action: "textSearch" -> Sonnet + web search finds open-access (CC BY) articles
//   action: "textFetch"  -> reads one article page, returns verbatim excerpt candidates
//   action: "textBuild"  -> Haiku makes highlighted words + reading-skill taps for an excerpt
//   action: "textAdapt"  -> Sonnet rewrites an excerpt for a lower level (teacher reviews it)
//   action: "storyBuild" -> Haiku writes a short gap-fill story from the words of any set
//   action: "imageData" -> downloads one Pixabay picture so the builder can shrink it in the browser before saving
//   action: "testBuild"  -> Sonnet drafts a grammar test (4 parts + teacher's key) from pasted text or a topic
//                           (a grammar test is saved with action "save", kind "grammarTest", and opens in grammar-test.html)

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
    if (action === 'gaps') return await generateGaps(req, res);
    if (action === 'qa') return await generateQa(req, res);
    if (action === 'audio') return await generateAudio(req, res);
    if (action === 'images') return await searchImages(req, res);
    if (action === 'save') return await saveSet(req, res);
    if (action === 'listSets') return await listSets(req, res);
    if (action === 'repairImages') return await repairImages(req, res);
    if (action === 'textAreas') return await textAreas(req, res);
    if (action === 'tracks') return await listTracksAction(req, res);
    if (action === 'createTrack') return await createTrackAction(req, res);
    if (action === 'trackSets') return await trackSetsAction(req, res);
    if (action === 'textSearch') return await textSearch(req, res);
    if (action === 'textFetch') return await textFetch(req, res);
    if (action === 'pdfFetch') return await pdfFetch(req, res);
    if (action === 'textOcr') return await textOcr(req, res);
    if (action === 'textBuild') return await textBuild(req, res);
    if (action === 'textAdapt') return await textAdapt(req, res);
    if (action === 'textMoreWords') return await textMoreWords(req, res);
    if (action === 'storyBuild') return await storyBuild(req, res);
    if (action === 'testBuild') return await testBuild(req, res);
    if (action === 'imageData') return await imageData(req, res);
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
    B1: 'Definitions can use everyday natural English, phrased as one full sentence. Example sentences should sound natural, using a range of common tenses and structures a B1 learner is expected to know.',
    B2: 'Definitions in natural, idiomatic English — do not oversimplify, but keep it to one sentence. Example sentences should reflect realistic, everyday use, including more complex clauses where natural.',
    C1: 'Definitions in full natural English, as a good monolingual dictionary\'s single-sentence definition would phrase it — no artificial simplification, but still one sentence. Example sentences should reflect authentic, sophisticated usage, including nuance, register, and collocation.'
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
- "definition": a ${cefr}-appropriate definition, per the guidance above. ALWAYS exactly ONE sentence, no matter the level — never a second explanatory clause, never a semicolon-joined addition, never a "used when..." follow-up sentence. If the concept needs more nuance, express it more precisely within that single sentence rather than adding a second one.
- "example": one example sentence, per the guidance above, that contains the item naturally
- "phonetic": IPA transcription (words only; omit for phrases)
- "chunks": for "phrase" items only - the phrase split into its individual words in correct order, as an array of strings. Keep contractions as ONE single token exactly as written — never expand them (e.g. "I don't know" → ["I","don't","know"], NOT ["I","do","not","know"]; "I'm ready" → ["I'm","ready"], not ["I","am","ready"]). The learner needs the natural contracted form, not an expanded rewrite. Always capitalize the first-person pronoun "I" (and contractions starting with it, like "I'm", "I've", "I'd") — never output a lowercase "i". Omit for words.
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

// ---------- "Choose the word in context" sentences ----------
// Optional mode. For every word the model writes one sentence in which the word (in whatever
// form fits: dog -> dogs, write -> wrote) is the only sensible choice among the set's words.
// Step 1 writes the sentences; step 2 checks, for every sentence, which OTHER forms from the
// set would also fit. Those "rivals" are saved with the item and never offered as wrong options.
function escapeRegExpGap(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function generateGaps(req, res) {
  const { items, level, known } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Nothing to write' });
    return;
  }
  const cefr = level || 'A1';
  // items: words that still need a sentence. known: forms of words that already have one (they
  // stay in the list of options the new sentences are checked against, but are not rewritten).
  const knownForms = (Array.isArray(known) ? known : []).map((k) => String(k || '').trim()).filter(Boolean);
  const words = items.map((i) => ({ id: String(i.id), text: String(i.text || '').trim(), type: i.type }));
  try {
    const CHUNK = 10;
    const chunks = [];
    for (let i = 0; i < words.length; i += CHUNK) chunks.push(words.slice(i, i + CHUNK));
    const all = words.map((w) => w.text).concat(knownForms);
    const written = (await Promise.all(chunks.map(async (chunk) => {
      const prompt = `You are writing gap-fill sentences for ${cefr}-level English learners (use only vocabulary and grammar they know).
Learners will see the sentence with ONE blank and must pick the missing word from a list made of the other words of the same set. The set: ${JSON.stringify(all)}.

For each word below write ONE natural sentence that contains it. Rules:
- The word may change form to fit the sentence (plural, -ing, past simple, past participle, third person -s, be -> is/was), or stay as it is. "form" is the exact characters used in the sentence, copied from it. Examples: target "be obsessed with", sentence "My brother is obsessed with football." -> form "is obsessed with"; target "eavesdrop", sentence "She eavesdropped on our talk." -> form "eavesdropped".
- Make the sentence so clear that this word is the ONLY one of the set that fits the blank, both in meaning and in grammar. Give strong context clues; do not use vague sentences like "I like ___".
- Do NOT put any other word of the set in the sentence.
- The form must appear exactly once in the sentence, and be a whole word (or whole phrase for phrases).
- No quotation marks inside the sentence.

Words: ${JSON.stringify(chunk.map((w) => ({ id: w.id, text: w.text, type: w.type })))}

Respond with ONLY a JSON array, one object per word: [{"id":"(copy the id)","text":"(the word)","sentence":"...","form":"..."}] - no preamble, no markdown.`;
      return extractJsonArray(await callHaiku(prompt, 3000));
    }))).flat();

    const byId = new Map(words.map((w) => [w.id, w]));
    const byText = new Map(words.map((w) => [w.text.toLowerCase(), w]));
    const good = [];
    const dropped = [];
    const countForm = (sentence, form) =>
      (sentence.match(new RegExp('(?<![A-Za-z])' + escapeRegExpGap(form) + '(?![A-Za-z])', 'gi')) || []).length;
    const unmatched = [];
    written.forEach((w) => {
      if (!w) return;
      // The model sometimes echoes the word instead of the id; accept either.
      const src = byId.get(String(w.id)) || byText.get(String(w.text || w.word || '').toLowerCase());
      if (!src) { dropped.push('unknown id'); return; }
      const sentence = String(w.sentence || '').trim();
      const form = String(w.form || '').trim();
      if (!sentence) { dropped.push(src.text + ': empty'); return; }
      if (form && countForm(sentence, form) === 1) {
        if (!good.some((g) => g.id === src.id)) good.push({ id: src.id, sentence, form });
      } else {
        // Typical case: the sentence uses "is obsessed with" / "eavesdropped" but "form" holds the base word.
        unmatched.push({ src, sentence, gave: form });
      }
    });
    // Repair pass: ask the model to copy the exact words out of its own sentence.
    if (unmatched.length) {
      try {
        const fixPrompt = `For each item, the sentence contains the target word or phrase, possibly in a changed form (for example "be obsessed with" appears as "is obsessed with", "eavesdrop" as "eavesdropped", "moral judgment" as "moral judgments").
Copy, character for character, the part of the sentence that fills the place of the target - the target in the form used there. It must be a contiguous piece of the sentence. If the target is not in the sentence at all, return an empty string.

Items: ${JSON.stringify(unmatched.map((u) => ({ id: u.src.id, target: u.src.text, sentence: u.sentence })))}

Respond with ONLY a JSON array: [{"id":"...","form":"..."}] - no preamble, no markdown.`;
        const fixed = extractJsonArray(await callHaiku(fixPrompt, 2000));
        unmatched.forEach((u) => {
          const f = fixed.find((x) => x && String(x.id) === u.src.id);
          const form = f ? String(f.form || '').trim() : '';
          if (form && countForm(u.sentence, form) === 1) {
            if (!good.some((g) => g.id === u.src.id)) good.push({ id: u.src.id, sentence: u.sentence, form });
          } else {
            dropped.push(u.src.text + ': "' + (form || u.gave) + '" not found once in "' + u.sentence.slice(0, 60) + '"');
          }
        });
      } catch (e) {
        unmatched.forEach((u) => dropped.push(u.src.text + ': repair failed'));
      }
    }
    const stats = { asked: words.length, written: written.length, valid: good.length, checked: 0, dropped: dropped.slice(0, 8) };
    if (!good.length) {
      res.status(200).json({ gaps: [], stats });
      return;
    }

    // Step 2: which other forms would also fit? (one retry if the reply is unusable)
    const forms = good.map((g) => g.form).concat(knownForms);
    const blank = (g) => g.sentence.replace(new RegExp('(?<![A-Za-z])' + escapeRegExpGap(g.form) + '(?![A-Za-z])', 'i'), '___');
    const checkPrompt = `Here are gap-fill sentences. Each has one blank (___). The options are this list of words/forms: ${JSON.stringify(forms)}.
For EACH sentence, list every option from the list, other than the intended answer, that would ALSO make a grammatically correct and sensible sentence in the blank. Be strict about meaning but think about real learners: if a reasonable person could accept it, list it. If no other option fits, return an empty list.

Sentences:
${good.map((g) => JSON.stringify({ id: g.id, answer: g.form, sentence: blank(g) })).join('\n')}

Respond with ONLY a JSON array with one object per sentence: [{"id":"...","answer":"...","rivals":["...","..."]}] - no preamble, no markdown.`;
    let checks = [];
    for (let attempt = 0; attempt < 2 && !checks.length; attempt++) {
      try { checks = extractJsonArray(await callHaiku(checkPrompt, 3000)); } catch (e) { checks = []; }
    }
    const rivalsFor = (g) => {
      const c = checks.find((x) => x && (String(x.id) === g.id || String(x.answer || '').toLowerCase() === g.form.toLowerCase()));
      if (!c || !Array.isArray(c.rivals)) return null;
      return c.rivals.map((r) => String(r)).filter((r) => forms.some((f) => f.toLowerCase() === r.toLowerCase()) && r.toLowerCase() !== g.form.toLowerCase());
    };
    const gaps = [];
    good.forEach((g) => {
      const rivals = rivalsFor(g);
      // Without the check we cannot promise that only one word fits, so the sentence is not used.
      if (rivals === null) return;
      gaps.push({ id: g.id, gapSentence: g.sentence, gapForm: g.form, gapRivals: rivals });
    });
    stats.checked = gaps.length;
    
    res.status(200).json({ gaps, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ---------- "Question -> choose the answer" ----------
// For items that are questions (or prompts that need a reply): one correct short reply and two wrong
// replies, then a second call that removes any wrong reply that would also be acceptable.
async function generateQa(req, res) {
  const { items, level } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Nothing to write' });
    return;
  }
  const cefr = level || 'A1';
  const list = items.map((i) => ({ id: String(i.id), text: String(i.text || '').trim() })).filter((i) => i.text);
  try {
    const prompt = `You are writing replies for a "choose the answer" exercise for ${cefr}-level English learners (use only vocabulary and grammar they know).
Below are phrases. Decide for each one whether it is a QUESTION or a request that a person answers with a short reply (for example "Any liquids in your bag?", "What is the purpose of your visit?", "Could you open your suitcase?"). If it is not (a statement, a single word, a label), skip it.
For each question write:
- "qaAnswer": ONE natural, short, correct reply (max 8 words) that a learner could really say.
- "qaWrong": exactly 2 replies that are clearly WRONG for this question: they answer a different question or do not make sense here, but are still real English sentences. Neither may be an acceptable answer to the question, and both must be about the same length and style as the correct one.

Phrases: ${JSON.stringify(list)}

Respond with ONLY a JSON array: [{"id":"...","qaAnswer":"...","qaWrong":["...","..."]}] with entries only for the questions - no preamble, no markdown.`;
    const made = extractJsonArray(await callHaiku(prompt, 3000));
    const byId = new Map(list.map((i) => [i.id, i]));
    const good = [];
    made.forEach((m) => {
      if (!m || !byId.has(String(m.id))) return;
      const ans = String(m.qaAnswer || '').trim();
      const wrong = (Array.isArray(m.qaWrong) ? m.qaWrong : []).map((w) => String(w).trim()).filter((w) => w && w.toLowerCase() !== ans.toLowerCase());
      if (!ans || wrong.length < 1) return;
      good.push({ id: String(m.id), q: byId.get(String(m.id)).text, qaAnswer: ans, qaWrong: wrong.slice(0, 2) });
    });
    let qa = good;
    if (good.length) {
      const checkPrompt = `For each question below, three replies are given as "wrong". For EACH wrong reply decide whether it would ALSO be an acceptable, sensible answer to the question. Be strict: if a reasonable person could answer that way, it counts as acceptable.

Questions: ${good.map((g) => JSON.stringify({ id: g.id, question: g.q, wrong: g.qaWrong })).join('\n')}

Respond with ONLY a JSON array: [{"id":"...","acceptable":["...copy the wrong replies that would also be acceptable..."]}] - one entry per question, empty list if none - no preamble, no markdown.`;
      let checks = [];
      for (let attempt = 0; attempt < 2 && !checks.length; attempt++) {
        try { checks = extractJsonArray(await callHaiku(checkPrompt, 2000)); } catch (e) { checks = []; }
      }
      qa = [];
      good.forEach((g) => {
        const c = checks.find((x) => x && String(x.id) === g.id);
        // Without the check we cannot promise the wrong replies are really wrong, so the question is skipped.
        if (!c || !Array.isArray(c.acceptable)) return;
        const bad = new Set(c.acceptable.map((a) => String(a).toLowerCase()));
        const keep = g.qaWrong.filter((w) => !bad.has(w.toLowerCase()));
        qa.push({ id: g.id, qaAnswer: g.qaAnswer, qaWrong: keep });
      });
    }
    res.status(200).json({ qa, stats: { asked: list.length, questions: good.length, kept: qa.length } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  if (!rawQuery) {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  // Used to auto-append 3 keywords pulled out of the item's own AI-written
  // definition (hoping to disambiguate words like "key" → "door key").
  // In practice a one-sentence dictionary definition of a concrete noun
  // almost always contains its hypernym/category word — "shorts"/"skirt"/
  // "pyjamas" all defined themselves as "a piece of CLOTHING that COVERS/
  // WEARS the TOP/legs..." — and appending that pulled in generic shirts,
  // boots, and jackets for every single garment word, completely invisibly
  // to the teacher (the Image search box only ever showed the bare word).
  // Same failure mode as the topic-blending idea below, just one step
  // removed. Plain word only now; for the rare ambiguous word, the teacher
  // can type extra context into the Image search field herself.
  //
  // Tried blending the lesson topic into every single-word query (e.g.
  // "gate" + "Airport") too, hoping it would help disambiguate. It
  // backfired the same way — "balcony", "hall", "garden" all got swamped
  // by generic "house" results once the topic was added, since Pixabay
  // apparently has far more indexed matches for "house" than for a
  // specific room/feature.
  //
  // Used to prefix bare words with "single" (e.g. "single balcony") to
  // bias toward one object on a plain background rather than a group
  // photo. In practice "single" is a heavily overloaded word in stock
  // photo tagging (Single Sign-On, Single Page App, dating-site content)
  // and appears to have been dragging in unrelated tech/business results
  // for words that have no natural defense against that association.
  const query = rawQuery;

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'PIXABAY_API_KEY is not set in Vercel environment variables' });
    return;
  }

  // Always page 1 — Pixabay's own ranking puts its best matches there, and
  // for a word with only a handful of genuinely relevant images (most
  // concrete nouns), page 2+ is already past the good results and into
  // unrelated filler. We used to randomize page 1-3 so repeated clicks of
  // "Find images" would show something different, but that traded away
  // relevance for variety — for a thin-content word like "shorts" it meant
  // regularly skipping the few real matches entirely. Pulling a bigger pool
  // from page 1 and shuffling WHICH of those we show keeps every candidate
  // on-topic while still giving a different 12 each time.
  //
  // Vector illustrations are great for discrete objects (an apple, a key)
  // but a room or place ("kitchen", "classroom") doesn't reduce to one
  // clean icon — vector search still returns SOMETHING (a cutting board, a
  // random house icon), just not an actual kitchen, and since that's a
  // non-empty result the old "only fall back to photo if vector is
  // completely empty" logic never kicked in. Fetching both at once and
  // merging them means an object gets its clean vector options, a
  // room/place still gets real recognizable photos alongside whatever
  // vectors turned up, and either way there are more candidates to choose
  // from.
  const POOL_SIZE = 15;
  const [vectorRes, photoRes] = await Promise.all([
    fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=vector&orientation=horizontal&per_page=${POOL_SIZE}&page=1&safesearch=true`),
    fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${POOL_SIZE}&page=1&safesearch=true`)
  ]);

  if (!vectorRes.ok && !photoRes.ok) {
    res.status(502).json({ error: `Pixabay error ${vectorRes.status}/${photoRes.status}` });
    return;
  }

  const vectorData = vectorRes.ok ? await vectorRes.json() : { hits: [] };
  const photoData = photoRes.ok ? await photoRes.json() : { hits: [] };
  const hits = [...(vectorData.hits || []), ...(photoData.hits || [])];

  // Fisher-Yates shuffle, then take 12 — same on-topic pool every time, a
  // different-looking set of candidates on each click.
  for (let i = hits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hits[i], hits[j]] = [hits[j], hits[i]];
  }
  const shown = hits.slice(0, 12);

  const images = shown.map(h => ({
    thumb: h.previewURL,
    full: h.webformatURL,
    alt: h.tags || query
  }));
  res.status(200).json({ images });
}

async function saveSet(req, res) {
  const { slug, data, track, order } = req.body;
  if (!slug || !data) {
    res.status(400).json({ error: 'Missing slug or data' });
    return;
  }

  const cleanSlug = slug.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!cleanSlug) {
    res.status(400).json({ error: 'slug produced an empty filename' });
    return;
  }

  if (data.kind === 'grammarTest') {
    const bad = validateGrammarTest(data);
    if (bad) {
      res.status(400).json({ error: bad });
      return;
    }
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

  const trainerLink = data.kind === 'grammarTest'
    ? `/grammar-test.html?set=${cleanSlug}`
    : `/vocab-trainer.html?set=${cleanSlug}`;
  const fullLink = `${SITE_ORIGIN}${trainerLink}`;

  // Also file this as a row in the Assignments database — but only the
  // first time this set is published. Re-saving an existing set (fixing
  // pictures, tweaking a definition) reuses the same slug/link, so it
  // would otherwise file a duplicate row under the same name every time.
  let notion = { attempted: false };
  if (sha) {
    // This is a re-save of an existing set, not a not-configured situation —
    // the frontend needs to tell these two apart to avoid showing a
    // "configure Notion" tip when Notion is already working fine.
    notion.reason = 'existing_set';
  } else if (!process.env.NOTION_ASSIGNMENTS_DATABASE_ID || !process.env.NOTION_TOKEN) {
    notion.reason = 'not_configured';
  } else {
    notion.attempted = true;
    try {
      await addToAssignmentsDatabase(data, fullLink, { track, order });
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

async function addToAssignmentsDatabase(data, fullLink, delivery = {}) {
  const dbId = process.env.NOTION_ASSIGNMENTS_DATABASE_ID;

  // Anna wants every vocab practice assignment marked "short", regardless
  // of word count — this tool's exercises are quick regardless of set size.
  const timeRequired = 'short';

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Email delivery: optional Track (relation) and Order. Order defaults to "end of the track".
  let trackProps = {};
  if (delivery.track) {
    let order = Number(delivery.order);
    if (delivery.order === undefined || delivery.order === null || delivery.order === '' || Number.isNaN(order)) {
      order = await require('../lib/set-delivery/notion').nextOrder(delivery.track);
    }
    trackProps = { 'Track': { relation: [{ id: delivery.track }] }, 'Order': { number: order } };
  }
  const isTextSet = data.kind === 'textSet';
  const isGrammarTest = data.kind === 'grammarTest';

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
        'Skill': { multi_select: isGrammarTest ? [{ name: 'grammar' }] : isTextSet ? [{ name: 'reading' }, { name: 'vocabulary' }] : [{ name: 'vocabulary' }] },
        'Type': { multi_select: [{ name: isGrammarTest ? 'test' : isTextSet ? 'text set' : 'vocpractice' }] },
        'Level': { multi_select: [{ name: data.level || 'A1' }] },
        'Time required': { multi_select: [{ name: timeRequired }] },
        'URL': { url: fullLink },
        'created': { date: { start: today } },
        ...trackProps,
        // Area is only filled for text sets; Notion creates a new option
        // automatically the first time a new area name is used.
        ...(isTextSet && data.area ? { 'Area': { multi_select: [{ name: String(data.area).slice(0, 100) }] } } : {}),
        // Grammar tests: the grammar point goes into the Grammar text property.
        ...(isGrammarTest ? { 'Grammar': { rich_text: [{ text: { content: String(data.topic || '').slice(0, 200) } }] } } : {})
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

// =====================================================================
// TEXT SETS: a short, real, openly licensed (CC BY) excerpt with
// highlighted words, plus a few tap questions about how academic text
// works (hedging, reference words, main idea).
//
// Design rule: the model NEVER writes the passage. It only points at
// sentences of a page this server fetched itself, and the server builds
// the passage from those sentences word for word. That removes invented
// quotes and silent rewrites, and keeps the CC BY licence honest.
// =====================================================================

const TEXT_UA = 'Mozilla/5.0 (compatible; EnglishHubTextSets/1.0)';

function extractJsonObject(raw) {
  let cleaned = String(raw || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Could not find a JSON object in the model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function wordCount(s) {
  return (String(s).match(/\S+/g) || []).length;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\[/.test(h) || h.includes(':')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

function decodeEntities(s) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '\u2013', mdash: '\u2014',
    rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026', shy: '' };
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ' '; } })
    .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return ' '; } })
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in named ? named[n.toLowerCase()] : m));
}

function metaAll(html, name) {
  const out = [];
  const re1 = new RegExp('<meta[^>]+(?:name|property)=["\']' + escapeRegExp(name) + '["\'][^>]*content=["\']([^"\']*)["\']', 'gi');
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']' + escapeRegExp(name) + '["\']', 'gi');
  let m;
  while ((m = re1.exec(html))) out.push(decodeEntities(m[1]).trim());
  while ((m = re2.exec(html))) out.push(decodeEntities(m[1]).trim());
  return out.filter(Boolean);
}

// Removes in-text citations such as (Bowlby, 1969), (Smith et al., 2015),
// (2019) and numbered ones like [12] or [3-5].
function stripCitations(text) {
  return String(text)
    .replace(/\s*\[\s*(?:\d+(?:\s*[-\u2013,;]\s*\d+)*)\s*\]/g, '')
    .replace(/\s*\(([^()]*)\)/g, (m, inner) => {
      const hasYear = /(?:19|20)\d{2}[a-z]?/.test(inner);
      if (!hasYear) return m;
      const onlyYear = /^\s*(?:19|20)\d{2}[a-z]?\s*$/.test(inner);
      const authorYear = /[A-Z][A-Za-z\-']+(?:\s+et al\.?|\s+(?:and|&)\s+[A-Z][A-Za-z\-']+)?,?\s+(?:19|20)\d{2}/.test(inner);
      return (onlyYear || authorYear) ? '' : m;
    })
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitSentences(text) {
  const guarded = String(text).replace(/\b(e\.g|i\.e|et al|vs|Fig|Figs|approx|cf|Dr|Mr|Mrs|Ms|Prof|No|U\.S|etc)\./g, (m) => m.replace(/\./g, '\u00a7'));
  return guarded
    .split(/(?<=[.!?])\s+(?=[A-Z\u201c"\u2018'(\[])/)
    .map((p) => p.replace(/\u00a7/g, '.').trim())
    .filter(Boolean);
}

async function fetchArticlePage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let resp;
  try {
    resp = await fetch(url, {
      headers: { 'User-Agent': TEXT_UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ctrl.signal
    });
  } catch (err) {
    throw new Error('Could not open the page (' + (err.name === 'AbortError' ? 'timed out' : err.message) + ')');
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error('The page answered with status ' + resp.status);
  const ct = resp.headers.get('content-type') || '';
  if (!/html/i.test(ct)) throw new Error('This link is not a normal web page (a PDF, maybe)');
  let html = await resp.text();
  if (html.length > 3000000) html = html.slice(0, 3000000);

  // Licence: only a plain CC BY licence counts as OK.
  let license = 'unknown';
  let licenseOk = false;
  const lic = html.match(/creativecommons\.org\/licenses\/by\/(\d\.\d)/i);
  if (lic && !/creativecommons\.org\/licenses\/by-n[cd]/i.test(html)) {
    license = 'CC BY ' + lic[1];
    licenseOk = true;
  } else if (/creativecommons\.org\/licenses\/by-/i.test(html)) {
    const other = html.match(/creativecommons\.org\/licenses\/(by-[a-z-]+)\/(\d\.\d)/i);
    license = other ? ('CC ' + other[1].toUpperCase() + ' ' + other[2]) + ' (not plain CC BY)' : 'unknown';
  }

  const title = (metaAll(html, 'citation_title')[0] || metaAll(html, 'og:title')[0]
    || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).trim() || 'Untitled article');
  const authorsAll = metaAll(html, 'citation_author');
  const authors = authorsAll.length > 3 ? authorsAll.slice(0, 3).join(', ') + ' et al.' : authorsAll.join(', ');
  const journal = metaAll(html, 'citation_journal_title')[0] || metaAll(html, 'og:site_name')[0] || '';

  const body = html
    .replace(/<(script|style|noscript|nav|header|footer|aside|figure|figcaption|table|form|button|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, '');
  const paragraphs = [];
  const seen = new Set();
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  const BAD = /(\u00a9|copyright|creative commons|licensee|received:|accepted:|published:|correspondence|conflict of interest|funding|supplementary|data availability|author contributions|doi\.org|https?:\/\/|\bFigure\s*\d|\bFig\.\s*\d|\bTable\s*\d|participants were|were recruited|we recruited|our participants|this study|the present study|our study|\bp\s*[<=]\s*0?\.\d)/i;
  while ((m = re.exec(body)) && paragraphs.length < 60) {
    const raw = decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const clean = stripCitations(raw);
    const wc = wordCount(clean);
    if (wc < 40 || wc > 260) continue;
    if (!/[.?!]["\u201d)]?$/.test(clean)) continue;
    if (BAD.test(clean)) continue;
    const digitTokens = (clean.match(/\S*\d\S*/g) || []).length;
    if (digitTokens / wc > 0.06) continue;
    const sentences = splitSentences(clean);
    if (sentences.length < 2) continue;
    const key = clean.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    paragraphs.push({ sentences, words: wc });
  }
  return { title, authors, journal, license, licenseOk, paragraphs };
}

async function trackSetsAction(req, res) {
  try {
    const { track } = req.body || {};
    if (!process.env.NOTION_TOKEN || !track) return res.status(200).json({ sets: [] });
    res.status(200).json({ sets: await require('../lib/set-delivery/notion').listTrackSets(track) });
  } catch (err) {
    res.status(200).json({ sets: [], error: err.message });
  }
}

async function createTrackAction(req, res) {
  try {
    if (!process.env.NOTION_TOKEN) { res.status(400).json({ error: 'Notion is not connected.' }); return; }
    const t = await require('../lib/set-delivery/notion').ensureTrack((req.body || {}).name);
    res.status(200).json(t);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function listTracksAction(req, res) {
  try {
    if (!process.env.NOTION_TOKEN) return res.status(200).json({ tracks: [] });
    res.status(200).json({ tracks: await require('../lib/set-delivery/notion').listTracks() });
  } catch (err) {
    res.status(200).json({ tracks: [], error: err.message });
  }
}

async function textAreas(req, res) {
  const fallback = ['psychology', 'culture', 'management', 'exam practice'];
  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_ASSIGNMENTS_DATABASE_ID) {
      res.status(200).json({ areas: fallback, source: 'default' });
      return;
    }
    const r = await fetch('https://api.notion.com/v1/databases/' + process.env.NOTION_ASSIGNMENTS_DATABASE_ID, {
      headers: { Authorization: 'Bearer ' + process.env.NOTION_TOKEN, 'Notion-Version': '2022-06-28' }
    });
    if (!r.ok) throw new Error('Notion ' + r.status);
    const db = await r.json();
    const opts = (((db.properties || {}).Area || {}).multi_select || {}).options || [];
    const names = opts.map((o) => o.name).filter(Boolean);
    res.status(200).json({ areas: names.length ? names : fallback, source: names.length ? 'notion' : 'default' });
  } catch (err) {
    res.status(200).json({ areas: fallback, source: 'default' });
  }
}

async function textSearch(req, res) {
  const { area, topic, level, exclude, openOnly } = req.body || {};
  if (!area && !topic) {
    res.status(400).json({ error: 'Give an area or a topic.' });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' });
    return;
  }
  const avoid = Array.isArray(exclude) && exclude.length
    ? '\nDo NOT return any of these URLs: ' + exclude.slice(0, 15).join(', ') + '.' : '';
  const prompt = `An English teacher needs a readable source text for an adult ${level || 'B2'} learner.
Field: "${area || ''}"${topic ? `\nTopic: "${topic}"` : ''}

${openOnly
    ? 'Use web search to find 4 DIFFERENT real articles whose full text is freely readable as a normal HTML web page (not a PDF) and is openly licensed under Creative Commons Attribution (CC BY). Good sources: Frontiers journals, PLOS ONE, BMC journals, MDPI journals, and PubMed Central articles with a CC BY licence. Prefer review or conceptual articles with a clear introduction or discussion over dense statistics papers.'
    : 'Use web search to find 5 DIFFERENT real articles on this topic whose full text can be read for free as a normal HTML web page (not a PDF, not behind a paywall or login, not just an abstract). Any reputable source is fine: open-access or subscription journals that show full text, university or institute pages, professional bodies, industry or government reports in HTML, quality magazines. Prefer explanatory, review or discussion-style articles over dense statistics papers.'}
All URLs must be real ones you found via search. Never invent a URL.${avoid}

Reply with STRICT JSON only, no commentary, no markdown fences:
{"candidates":[{"title":"real title","url":"real URL"}]}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await resp.json();
  if (!resp.ok) {
    res.status(resp.status).json({ error: (data.error && data.error.message) || 'Anthropic API error (search).' });
    return;
  }
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const parsed = extractJsonObject(text);
  const skip = new Set((exclude || []).map((u) => String(u).replace(/\/$/, '')));
  const out = [];
  (parsed.candidates || []).forEach((c) => {
    try {
      const u = new URL(c.url);
      if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) return;
      if (skip.has(u.href.replace(/\/$/, ''))) return;
      out.push({ title: String(c.title || u.hostname), url: u.href });
    } catch (e) { /* ignore bad url */ }
  });
  res.status(200).json({ candidates: out.slice(0, openOnly ? 4 : 5) });
}

function pastedPage(raw) {
  const paragraphs = [];
  const SKIP = /(©|copyright|all rights reserved|https?:\/\/|www\.|doi\b|@|ISSN|\bFigure\s*\d|\bTable\s*\d|^(author contributions?|conflicts? of interest|funding|acknowledg(e)?ments?|supplementary|data availability)\b)/i;
  String(raw || '').slice(0, 80000).split(/\n\s*\n/).forEach((chunk) => {
    const clean = stripCitations(chunk.replace(/\s+/g, ' ').trim());
    const wc = wordCount(clean);
    if (wc < 25 || wc > 260) return;
    if (!/[.?!]["”)]?$/.test(clean)) return;
    if (SKIP.test(clean)) return;
    const digitTokens = (clean.match(/\S*\d\S*/g) || []).length;
    if (digitTokens / wc > 0.06) return;
    const sentences = splitSentences(clean);
    if (sentences.length < 2) return;
    paragraphs.push({ sentences, words: wc });
  });
  return paragraphs;
}

async function textFetch(req, res) {
  const { url, area, topic, level, pasted } = req.body || {};
  const want = Math.max(1, Math.min(10, Number((req.body || {}).count) || 1));
  const askFor = want > 1 ? want + 4 : 5;  // ask for a few extra: some picks fail the checks below
  let u = null;
  let page;
  if (pasted) {
    // Teacher's own text: no fetching, no licence detection. Same excerpt picking.
    page = { title: '', authors: '', journal: '', license: 'not stated', licenseOk: false, paragraphs: pastedPage(pasted) };
    if (!page.paragraphs.length) {
      res.status(422).json({ error: 'Paste at least one paragraph of 25 to 260 words (with a blank line between paragraphs).' });
      return;
    }
  } else {
    try { u = new URL(url); } catch (e) { res.status(400).json({ error: 'That is not a valid link.' }); return; }
    if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) {
      res.status(400).json({ error: 'That link cannot be used.' });
      return;
    }
    try {
      page = await fetchArticlePage(u.href);
    } catch (err) {
      res.status(422).json({ error: err.message });
      return;
    }
    if (!page.paragraphs.length) {
      res.status(422).json({ error: 'No readable paragraphs (probably a paywall, an abstract-only page or a page that blocks automatic reading).' });
      return;
    }
  }

  const list = page.paragraphs.slice(0, pasted ? 90 : 40).map((p, i) =>
    `P${i + 1} (${p.words} words): ` + p.sentences.map((s, k) => `[${k + 1}] ${s}`).join(' ')
  ).join('\n\n');
  const prompt = `You are choosing short reading excerpts for an adult ${level || 'B2'} English learner studying: ${area || 'general academic English'}${topic ? ` (topic: ${topic})` : ''}.

Below are numbered paragraphs from one article, each split into numbered sentences. Choose up to ${askFor} excerpts. Each excerpt is 2 to 6 CONSECUTIVE sentences from ONE paragraph, between 65 and 115 words in total (never shorter than 65 words). Always give as many excerpts as you are asked for if the article has enough good paragraphs: the level only decides how technical a passage may be, it is not a reason to return fewer excerpts.

Good excerpts: understandable on their own (no "this study", "our participants", "as shown above", figures or tables), explain an idea or argue a point, contain academic features such as cautious wording (may, appears to, tends to), reference words (which, this, these) and useful subject vocabulary. Prefer introduction and discussion style paragraphs. Avoid methods and statistics. Different excerpts should come from different paragraphs where possible. Put the best excerpt first. For each excerpt also write a short English label of 3 to 6 words naming its idea (for example "what depression is" or "why hedging matters"), no quotation marks.

${list}

Reply with STRICT JSON only: {"picks":[{"p":3,"from":1,"to":3,"label":"short idea label"}]}`;

  let picksRaw;
  try {
    picksRaw = extractJsonObject(await callHaiku(prompt, 2000)).picks || [];
  } catch (err) {
    res.status(502).json({ error: 'Could not choose an excerpt: ' + err.message });
    return;
  }
  const picks = [];
  const seenText = new Set();
  picksRaw.forEach((pk) => {
    const para = page.paragraphs[(Number(pk.p) || 0) - 1];
    if (!para) return;
    const from = Math.max(1, Number(pk.from) || 1);
    const to = Math.min(para.sentences.length, Number(pk.to) || from);
    if (to < from) return;
    const text = para.sentences.slice(from - 1, to).join(' ');
    const wc = wordCount(text);
    if (wc < 60 || wc > 130 || seenText.has(text)) return;
    seenText.add(text);
    const label = String(pk.label || '').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    picks.push({ text, words: wc, label, p: Number(pk.p) || 0, from, to });
  });
  // Not enough good picks: fill up with plain consecutive sentences from paragraphs not used yet
  // (and from the unused rest of long paragraphs), 65 to 115 words each.
  if (want > 1 && picks.length < want) {
    const taken = new Map();
    picks.forEach((pk) => { const e = taken.get(pk.p) || 0; taken.set(pk.p, Math.max(e, pk.to)); });
    const extra = [];
    page.paragraphs.forEach((para, idx) => {
      let at = (taken.get(idx + 1) || 0); // sentences already used in this paragraph
      while (at < para.sentences.length) {
        let k = at, acc = [];
        while (k < para.sentences.length && wordCount(acc.concat(para.sentences[k]).join(' ')) <= 115) { acc.push(para.sentences[k]); k++; }
        const text = acc.join(' ');
        const wc = wordCount(text);
        if (wc >= 65 && !seenText.has(text)) { seenText.add(text); extra.push({ text, words: wc, label: '', p: idx + 1, from: at + 1, to: k }); }
        if (!acc.length) break;
        at = k;
      }
    });
    // spread the extra picks over the article, then add as many as needed
    const need = want - picks.length;
    const step = extra.length / Math.max(1, need);
    for (let i = 0; i < need && extra.length; i++) picks.push(extra[Math.min(extra.length - 1, Math.floor(i * step))]);
  }
  if (!picks.length) {
    res.status(422).json({ error: 'No suitable excerpt found in this article.' });
    return;
  }
  res.status(200).json({
    article: { title: page.title, url: u ? u.href : '', authors: page.authors, journal: page.journal, license: page.license, licenseOk: page.licenseOk },
    picks: picks.slice(0, want > 1 ? want : 5).map((pk) => ({ text: pk.text, words: pk.words, label: pk.label }))
  });
}

// ---------- PDF by link (returned to the browser, which extracts the text) ----------

async function pdfFetch(req, res) {
  const { url } = req.body || {};
  let u;
  try { u = new URL(url); } catch (e) { res.status(400).json({ error: 'That is not a valid link.' }); return; }
  if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname)) {
    res.status(400).json({ error: 'That link cannot be used.' });
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let buf;
  try {
    const resp = await fetch(u.href, { headers: { 'User-Agent': TEXT_UA, Accept: 'application/pdf,*/*' }, redirect: 'follow', signal: ctrl.signal });
    if (!resp.ok) throw new Error('The site answered with status ' + resp.status + ' (it may block automatic downloads)');
    const len = Number(resp.headers.get('content-length') || 0);
    if (len > 3200000) throw new Error('This PDF is larger than 3 MB. Download it and load the file instead.');
    buf = Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'The download timed out' : err.message;
    res.status(422).json({ error: msg + '. You can download the PDF yourself and load the file instead.' });
    return;
  } finally {
    clearTimeout(timer);
  }
  if (buf.length > 3200000) {
    res.status(422).json({ error: 'This PDF is larger than 3 MB. Download it and load the file instead.' });
    return;
  }
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') {
    res.status(422).json({ error: 'The link did not give a PDF file (maybe a login or a web page).' });
    return;
  }
  res.status(200).json({ base64: buf.toString('base64'), bytes: buf.length });
}

// ---------- text from a photo or screenshot of a page ----------

async function textOcr(req, res) {
  const { image, mediaType } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' }); return; }
  const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : '';
  if (!mt || typeof image !== 'string' || image.length < 200) { res.status(400).json({ error: 'Send a JPEG, PNG or WebP image.' }); return; }
  if (image.length > 4000000) { res.status(400).json({ error: 'The image is too large. Try a smaller screenshot.' }); return; }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mt, data: image } },
        { type: 'text', text: 'Transcribe the main body text of this page exactly as written, in reading order. Separate paragraphs with one blank line and join the lines of a paragraph into one line. Leave out page numbers, running headers and footers, footnotes, figure captions and any menus or buttons. Do not translate, correct, summarise or comment. If there is no readable text, reply with exactly: NO TEXT' }
      ] }]
    })
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: (data.error && data.error.message) || 'Anthropic API error (image).' }); return; }
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!text || /^NO TEXT$/i.test(text)) { res.status(422).json({ error: 'No readable text found in this image.' }); return; }
  res.status(200).json({ text });
}

async function textBuild(req, res) {
  const { passage, level, area } = req.body || {};
  const text = String(passage || '').trim();
  const wc = wordCount(text);
  if (wc < 30 || wc > 260) {
    res.status(400).json({ error: 'The passage should be between 30 and 260 words.' });
    return;
  }
  const lvl = level || 'B2';
  const prompt = `You help an English teacher. Below is a short excerpt from a text in the field: ${area || 'general academic English'}. The learner's level is ${lvl}.

EXCERPT:
"""
${text}
"""

Return STRICT JSON only (no markdown fences) with this shape:
{
 "title": "short set title, max 6 words",
 "words": [ {"text":"base form","passageForm":"exact characters as they appear in the excerpt","type":"word or phrase","definition":"..."} ],
 "taps": [ ... ]
}

WORDS: 6 to 9 of the most useful words or fixed expressions for a ${lvl} learner of this field. Mix academic vocabulary (e.g. contribute to, substantial) with field terms. No proper names, no very basic words.
- "passageForm" must be copied EXACTLY from the excerpt (same inflection and spelling).
- "text" is the dictionary form (for a phrase, the base phrase).
- "definition": simple English, max 12 words, easier words than the target, true to the meaning in THIS excerpt, never containing the target word itself.

TAPS: 4 or 5 questions about how the text works. Use only kinds the excerpt supports:
- {"kind":"hedge","sentence":"EXACT sentence from the excerpt with a hedging expression (appears to, may, tends to, suggest, likely...)","strong":"the same sentence rewritten to sound completely certain","explain":"one short sentence naming the hedging words"}  (at most 2)
- {"kind":"reference","sentence":"EXACT sentence from the excerpt containing a reference word","pronoun":"the exact reference word, e.g. which / this / these / it / they","correct":"what it refers to, copied from the excerpt","wrong":["plausible wrong noun phrase from the excerpt","another one"],"explain":"short"}  (at most 2)
- {"kind":"paraphrase","sentence":"EXACT long or complex sentence from the excerpt","correct":"a simpler sentence with the same meaning","wrong":["a sentence with a subtly different meaning","another one"],"explain":"short"}  (at most 1)
- {"kind":"mainIdea","correct":"the main idea in one sentence","wrong":["a plausible but wrong idea","another one"],"explain":"short"}  (exactly 1)
Options must be short (max 20 words).`;

  let out;
  try {
    out = extractJsonObject(await callHaiku(prompt, 3500));
  } catch (err) {
    res.status(502).json({ error: 'Could not generate: ' + err.message });
    return;
  }

  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(text);
  const findSentence = (s) => {
    const n = norm(s);
    return sentences.find((x) => norm(x) === n) || null;
  };

  const words = [];
  const usedForms = new Set();
  (out.words || []).forEach((w) => {
    const form = norm(w.passageForm);
    if (!form || !w.definition) return;
    const m = text.match(new RegExp('(?<![A-Za-z])' + escapeRegExp(form) + '(?![A-Za-z])', 'i'));
    if (!m) return;
    const actual = m[0];
    if (usedForms.has(actual.toLowerCase())) return;
    usedForms.add(actual.toLowerCase());
    const example = sentences.find((s) => new RegExp('(?<![A-Za-z])' + escapeRegExp(actual) + '(?![A-Za-z])', 'i').test(s)) || '';
    const isPhrase = /\s/.test(actual) || w.type === 'phrase';
    words.push({
      text: norm(w.text) || actual,
      passageForm: actual,
      type: isPhrase ? 'phrase' : 'word',
      definition: norm(w.definition),
      example,
      chunks: isPhrase ? actual.split(/\s+/) : []
    });
  });

  const taps = [];
  (out.taps || []).forEach((t) => {
    const wrong = (Array.isArray(t.wrong) ? t.wrong : []).map(norm).filter(Boolean).slice(0, 2);
    if (t.kind === 'hedge') {
      const sent = findSentence(t.sentence);
      if (!sent || !t.strong) return;
      taps.push({ kind: 'hedge', prompt: 'Which sentence sounds more cautious?', context: null, mark: null, correct: sent, wrong: [norm(t.strong)], explain: norm(t.explain) });
    } else if (t.kind === 'reference') {
      const sent = findSentence(t.sentence);
      const pron = norm(t.pronoun);
      if (!sent || !pron || !t.correct || wrong.length < 2) return;
      if (!new RegExp('(?<![A-Za-z])' + escapeRegExp(pron) + '(?![A-Za-z])', 'i').test(sent)) return;
      taps.push({ kind: 'reference', prompt: 'What does "' + pron + '" refer to?', context: sent, mark: pron, correct: norm(t.correct), wrong, explain: norm(t.explain) });
    } else if (t.kind === 'paraphrase') {
      const sent = findSentence(t.sentence);
      if (!sent || !t.correct || wrong.length < 2) return;
      taps.push({ kind: 'paraphrase', prompt: 'Which sentence means the same?', context: sent, mark: null, correct: norm(t.correct), wrong, explain: norm(t.explain) });
    } else if (t.kind === 'mainIdea') {
      if (!t.correct || wrong.length < 2) return;
      taps.push({ kind: 'mainIdea', prompt: 'What is the main idea of the text?', context: null, mark: null, correct: norm(t.correct), wrong, explain: norm(t.explain) });
    }
  });

  if (!words.length) {
    res.status(502).json({ error: 'No usable words came back. Try again.' });
    return;
  }
  res.status(200).json({ title: norm(out.title) || 'Reading set', words: words.slice(0, 9), taps: taps.slice(0, 5) });
}



// ---------- more word suggestions for an excerpt ----------

async function textMoreWords(req, res) {
  const { passage, level, area, have } = req.body || {};
  const text = String(passage || '').trim();
  const wc = wordCount(text);
  if (wc < 30 || wc > 300) {
    res.status(400).json({ error: 'The passage should be between 30 and 300 words.' });
    return;
  }
  const lvl = level || 'B2';
  const haveList = (Array.isArray(have) ? have : []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 30);
  const prompt = `You help an English teacher. Below is a short excerpt in the field: ${area || 'general academic English'}. The learner's level is ${lvl}.

EXCERPT:
"""
${text}
"""

ALREADY CHOSEN (do not suggest these again): ${haveList.length ? haveList.join('; ') : 'none'}

Suggest 6 MORE useful words or fixed expressions for a ${lvl} learner from this excerpt: academic vocabulary and field terms, no proper names, no very basic words.
- "passageForm" must be copied EXACTLY from the excerpt (same inflection and spelling).
- "text" is the dictionary form (for a phrase, the base phrase).
- "definition": simple English, max 12 words, easier words than the target, true to the meaning in THIS excerpt, never containing the target word itself.

Reply with STRICT JSON only: {"words":[{"text":"base form","passageForm":"exact characters in the excerpt","type":"word or phrase","definition":"..."}]}`;
  let out;
  try {
    out = extractJsonObject(await callHaiku(prompt, 1500));
  } catch (err) {
    res.status(502).json({ error: 'Could not suggest words: ' + err.message });
    return;
  }
  const norm = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(text);
  const taken = new Set(haveList.map((x) => x.toLowerCase()));
  const words = [];
  (out.words || []).forEach((w) => {
    const form = norm(w.passageForm);
    if (!form || !w.definition) return;
    const m = text.match(new RegExp('(?<![A-Za-z])' + escapeRegExp(form) + '(?![A-Za-z])', 'i'));
    if (!m) return;
    const actual = m[0];
    if (taken.has(actual.toLowerCase())) return;
    taken.add(actual.toLowerCase());
    const example = sentences.find((x) => new RegExp('(?<![A-Za-z])' + escapeRegExp(actual) + '(?![A-Za-z])', 'i').test(x)) || '';
    const isPhrase = /\s/.test(actual) || w.type === 'phrase';
    words.push({ text: norm(w.text) || actual, passageForm: actual, type: isPhrase ? 'phrase' : 'word', definition: norm(w.definition), example, chunks: isPhrase ? actual.split(/\s+/) : [] });
  });
  if (!words.length) {
    res.status(502).json({ error: 'No new words came back. Try again.' });
    return;
  }
  res.status(200).json({ words: words.slice(0, 8) });
}

// ---------- adaptation of an excerpt to a level ----------

async function callSonnet(prompt, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens || 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

async function textAdapt(req, res) {
  const { passage, level, area } = req.body || {};
  const text = String(passage || '').trim();
  const wc = wordCount(text);
  if (wc < 30 || wc > 260) {
    res.status(400).json({ error: 'The passage should be between 30 and 260 words.' });
    return;
  }
  const lvl = ['A2', 'B1', 'B2', 'C1'].includes(level) ? level : null;
  if (!lvl) {
    res.status(400).json({ error: 'Choose a level: A2, B1, B2 or C1.' });
    return;
  }
  const how = lvl === 'C1'
    ? `- A lighter C1 version: still a demanding academic text, but easier to read than the original. Keep the academic register and the key terms.
- Sentences: about 20 words on average, NEVER more than 30 words. Split sentences that are longer, and untangle stacked subordinate clauses and long participle phrases.
- Replace only the most unusual or overloaded words and noun chains with clearer academic wording. Do not make the vocabulary simpler than B2 where a precise academic word is natural.`
    : lvl === 'A2'
    ? `- This is a real A2 text for an elementary learner, MUCH easier than the original. Use only very common everyday words (about the 1500 most frequent English words) and simple grammar: present simple, past simple, "can", "will", "going to". Avoid passive voice, relative clauses with whose/whom, conditionals and long noun chains.
- Sentences: about 8 words on average, NEVER more than 14 words. One idea per sentence. Split every long sentence.
- Replace difficult, abstract or specialist words with simple ones or a very short plain explanation (for example "money that the government gives to farmers" instead of "subsidies"). Keep only 3 or 4 key subject terms that the learner really needs (for example farm, crop, harvest, price), and make their meaning clear from the sentence around them.
- Numbers and names of places may stay. Keep the text concrete: who does what.`
    : lvl === 'B1'
    ? `- This is a real B1 text, clearly easier than the original. Use mostly everyday CEFR A2-B1 words and simple grammar (active voice where possible, no long noun chains, no stacked clauses).
- Sentences: about 12 words on average, NEVER more than 18 words. One idea per sentence. Split every long sentence.
- Replace specialist jargon, rare, abstract or low-frequency words with common ones or with a short plain explanation (for example "workers who load and unload a ship" instead of "stevedores"). Keep only 3 or 4 key subject terms that the learner really needs, and make their meaning clear from the sentence around them.
- Keep a few useful academic words (for example "contribute to", "factor", "outcome", "tend to") as learning targets.`
    : `- Keep a clearly academic register, but replace unusually rare words and untangle sentences longer than 30 words.
- Do not simplify the grammar more than necessary.`;
  const prompt = (feedback) => `You adapt an authentic text for an adult ${lvl} learner of English. Field: ${area || 'general academic English'}.

ORIGINAL:
"""
${text}
"""

Rewrite it as ONE paragraph of ${lvl === 'A2' ? '45 to 110' : lvl === 'B1' ? '55 to 120' : Math.max(60, Math.round(wc * 0.85)) + ' to ' + Math.min(140, Math.round(wc * 1.2))} words.${lvl === 'B1' || lvl === 'A2' ? '' : ' Do NOT shorten it: keep all the content and the length of the original (the result must have at least 85% of its words); make it easier by splitting and untangling sentences, not by cutting.'}
Rules:
${how}
- Keep the meaning and the main claims. Do not add facts, examples or opinions. You may shorten secondary detail (long lists of examples) to keep the text easy.
- Do NOT add anything that is not in the ORIGINAL: no definitions, no expansions of abbreviations, no explanations, no new examples. If an abbreviation (for example PPE) is not explained in the original, leave it exactly as it is.
- KEEP the author's cautious wording (appear to, may, tends to, suggest, likely ...) and keep the same degree of certainty. Never make a claim stronger or weaker.
- KEEP reference words such as which, this, these, it, they where they make sense, because learners are trained on them.
- No citations, no brackets, no quotation marks around the text, no headings, no commentary.${feedback ? '\n- IMPORTANT: ' + feedback : ''}

Reply with STRICT JSON only: {"text":"the adapted paragraph"}`;

  const sentStats = (t) => {
    const lens = splitSentences(t).map(wordCount);
    return { avg: lens.reduce((x, y) => x + y, 0) / (lens.length || 1), max: Math.max(0, ...lens) };
  };
  const tooHard = (t) => {
    const st = sentStats(t);
    return lvl === 'A2' ? (st.avg > 11 || st.max > 16) : lvl === 'B1' ? (st.avg > 16 || st.max > 22) : lvl === 'C1' ? (st.avg > 24 || st.max > 32) : (st.max > 36);
  };

  let adapted = '';
  try {
    let out = extractJsonObject(await callSonnet(prompt(''), 900));
    adapted = String(out.text || '').replace(/\s+/g, ' ').trim();
    if (tooHard(adapted)) {
      out = extractJsonObject(await callSonnet(prompt('Your previous version was still too hard: its sentences were too long. Make it simpler: split sentences so none is longer than ' + (lvl === 'C1' ? '30' : lvl === 'A2' ? '14' : '18') + ' words, and replace difficult words with clearer ones.'), 900));
      const second = String(out.text || '').replace(/\s+/g, ' ').trim();
      if (second) adapted = second;
    }
  } catch (err) {
    res.status(502).json({ error: 'Could not adapt the text: ' + err.message });
    return;
  }
  const awc = wordCount(adapted);
  if (awc < (lvl === 'A2' ? 35 : lvl === 'B1' ? 40 : Math.max(55, Math.round(wc * 0.7))) || awc > 150 || /[\[\]{}*#]/.test(adapted) || !/[.!?]["\u201d)]?$/.test(adapted)) {
    res.status(502).json({ error: 'The adapted text did not come out right. Try again.' });
    return;
  }
  res.status(200).json({ text: adapted, words: awc });
}

// ---------- optional "Complete the story" for any word set ----------

async function storyBuild(req, res) {
  const { words, level, topic } = req.body || {};
  const list = (Array.isArray(words) ? words : [])
    .map((w) => ({ text: String((w && w.text) || '').trim(), type: (w && w.type) || 'word', definition: String((w && w.definition) || '').trim() }))
    .filter((w) => w.text);
  if (list.length < 4) {
    res.status(400).json({ error: 'Add at least 4 words to the set first.' });
    return;
  }
  const lvl = level || 'B1';
  const given = list.slice(0, 40).map((w) => '- ' + w.text + (w.definition ? ' (' + w.definition + ')' : '')).join('\n');
  const prompt = `Write ONE short story for adult English learners at level ${lvl}. Topic of the word set: ${topic || 'general'}.

WORD LIST:
${given}

Rules:
- 60 to 110 words, simple and clear, a little story with a beginning and an end (a person, a problem, what happens). Natural and neutral, suitable for adults.
- Use between 5 and 8 words from the list. Put each used word in double asterisks, written the way it appears in YOUR sentence, then a vertical bar, then the word exactly as it is written in the list. The word may change its form to fit the sentence (plural, past tense, -ing, -s), but it must be the same word. Examples: "She wanted to **cook|cook** dinner." "He **lingered|linger** at the door." "There were many **deviations|deviation** from the plan."
- Use each marked word only once. Do not use the other list words unmarked.
- The context must make each missing word easy to guess, and different marked words must not fit the same gap.
- Plain text only. No other markdown, no title inside the text.

Reply with STRICT JSON only: {"text":"the story with **form|listword** marked words"}`;

  const allowed = new Set(list.map((w) => w.text.toLowerCase()));
  // the model may write the singular of a plural list word (deviation for deviations): accept a close match
  const inList = (w) => allowed.has(w) || [...allowed].some((a) => a.length >= 4 && w.length >= 4 && (a.startsWith(w) || w.startsWith(a)));
  let text = '';
  let marked = [];
  let lastError = 'The story did not come out right (gaps or length). Try again.';
  // Up to 3 tries: the model sometimes misses a rule (too short, a word marked twice, a word not from the list).
  for (let attempt = 0; attempt < 3; attempt++) {
    let out;
    try {
      out = extractJsonObject(await callHaiku(prompt + (attempt ? '\nIMPORTANT: the previous try broke a rule. Mark 5 to 8 DIFFERENT list words, each exactly once, as **form|listword**, and write 60 to 110 words.' : ''), 1200));
    } catch (err) {
      lastError = 'Could not write the story: ' + err.message;
      continue;
    }
    const raw = String(out.text || '').replace(/[ \t]+/g, ' ').trim();
    const bases = [];
    // **form|listword** -> **form**; the list word is only used to check the choice of word.
    const cleaned = raw.replace(/\*\*(.+?)\*\*/g, (m, inner) => {
      const parts = inner.split('|');
      const form = parts[0].trim();
      const base = (parts[1] || parts[0]).trim().toLowerCase();
      bases.push(base);
      return '**' + form + '**';
    });
    const wc = wordCount(cleaned);
    const unique = new Set(bases);
    if (bases.length < 4 || unique.size !== bases.length || bases.some((w) => !inList(w)) || wc < 40 || wc > 150) {
      lastError = 'The story did not come out right (gaps or length). Try again.';
      continue;
    }
    text = cleaned;
    marked = bases;
    break;
  }
  if (!text) {
    res.status(502).json({ error: lastError });
    return;
  }
  res.status(200).json({ text, gaps: marked.length });
}

// =====================================================================
// GRAMMAR TESTS (action "testBuild"; saved with action "save", kind "grammarTest")
// A test has four parts: choose / complete / find-and-correct / write,
// plus a teacher's key that grammar-test.html prints as the last page.
// =====================================================================

const TEST_PARTS = [
  { type: 'choice', title: 'Choose the correct option.', max: 5, pointsLabel: '1 point each' },
  { type: 'gap', title: 'Complete the sentences with the correct form.', max: 6, pointsLabel: '1 point each' },
  { type: 'fix', title: 'Find and correct the mistake in each sentence.', max: 3, pointsLabel: '1 point each' },
  { type: 'write', title: 'Write your own sentences.', max: 2, pointsLabel: '2 points: 1 for correct form, 1 for meaning and use', prompt: 'Write two sentences:' }
];

function tstr(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 300);
}

// Returns an error message, or null when the test is well-formed.
function validateGrammarTest(d) {
  if (!d || d.kind !== 'grammarTest') return 'Not a grammar test.';
  if (!tstr(d.topic)) return 'The test needs a title.';
  if (!Array.isArray(d.parts) || d.parts.length < 1 || d.parts.length > 6) return 'The test has no parts.';
  for (const [pi, p] of d.parts.entries()) {
    const where = 'Part ' + (pi + 1) + ': ';
    if (!['choice', 'gap', 'fix', 'write'].includes(p.type)) return where + 'unknown part type.';
    if (!tstr(p.title)) return where + 'missing title.';
    if (!Number.isFinite(Number(p.max)) || Number(p.max) < 0) return where + 'missing points.';
    if (!Array.isArray(p.items) || !p.items.length) return where + 'no items.';
    for (const [ii, it] of p.items.entries()) {
      const w = where + 'item ' + (ii + 1) + ': ';
      if (p.type === 'choice') {
        if (!tstr(it.q) || (String(it.q).match(/___/g) || []).length !== 1) return w + 'the sentence needs exactly one ___ gap.';
        if (!Array.isArray(it.options) || it.options.length < 2 || it.options.length > 5 || it.options.some((o) => !tstr(o))) return w + 'needs 2 to 5 options.';
        if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.options.length) return w + 'the correct option is not set.';
      } else if (p.type === 'gap') {
        if (!tstr(it.pre) && !tstr(it.post)) return w + 'needs text around the gap.';
        if (!tstr(it.answer)) return w + 'the answer is empty.';
      } else if (p.type === 'fix') {
        if (!tstr(it.sentence) || !tstr(it.corrected)) return w + 'needs the sentence and its correction.';
        if (tstr(it.sentence) === tstr(it.corrected)) return w + 'the correction is the same as the sentence.';
      } else if (p.type === 'write') {
        if (!tstr(it.prompt)) return w + 'the prompt is empty.';
      }
    }
  }
  return null;
}

async function testBuild(req, res) {
  const { source, level, title } = req.body || {};
  const text = String(source || '').trim();
  if (text.length < 4) {
    res.status(400).json({ error: 'Paste an explanation of the grammar, or at least name the topic.' });
    return;
  }
  if (text.length > 8000) {
    res.status(400).json({ error: 'The text is too long (max about 8000 characters). Paste only the explanation.' });
    return;
  }
  const lvl = ['A1', 'A2', 'B1', 'B2', 'C1'].includes(level) ? level : 'B1';

  const prompt = `You are an experienced English teacher writing a short grammar test for ONE adult learner, level ${lvl}.

GRAMMAR TO TEST (the teacher pasted this explanation or topic):
"""
${text}
"""
${title ? 'Suggested title: ' + tstr(title, 80) + '\n' : ''}
Write a test that checks whether the learner can USE this grammar, not only recognise it. Return STRICT JSON only (no markdown fences) with exactly this shape:
{
 "topic": "short title naming the grammar, max 5 words",
 "intro": "one short line listing what the test covers",
 "choice": [ exactly 5 of {"q":"a sentence with exactly one ___","options":["...","...","..."],"answer":0,"why":"..."} ],
 "gap": [ exactly 6 of {"pre":"text before the gap","hint":"the word or verb in brackets, or empty","post":"text after the gap","answer":"the correct form","why":"..."} ],
 "fix": [ exactly 3 of {"sentence":"a sentence with exactly one mistake in the target grammar","corrected":"the same sentence corrected","why":"..."} ],
 "write": [ exactly 2 of {"prompt":"what the learner writes a sentence about","criteria":"what to accept","example":"a model sentence"} ]
}

RULES:
- Vocabulary and sentence length suit level ${lvl}. Everyday, neutral content; no current events, no names of real people.
- Every item has exactly ONE correct answer. Choice distractors are plausible forms of the same grammar, never nonsense.
- "answer" in "choice" is the index (0-2) of the correct option.
- In "gap", the answer is exactly what the learner must type in the gap; if several forms are equally right, give the most natural one.
- Cover the different points of the grammar across the items, do not repeat the same sentence pattern.
- "why": plain English, max 15 words, names the rule (for the teacher's key).
- "write" prompts must make the learner use the target grammar, e.g. "something you used to do as a child but don't do now".`;

  let out;
  try {
    out = extractJsonObject(await callSonnet(prompt, 4000));
  } catch (err) {
    res.status(502).json({ error: 'Could not generate the test: ' + err.message });
    return;
  }

  const shuffle = (a) => {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const take = (list, n) => (Array.isArray(list) ? list : []).slice(0, n);

  const choice = take(out.choice, 5).map((c) => {
    const options = (Array.isArray(c.options) ? c.options : []).map((o) => tstr(o, 80)).filter(Boolean).slice(0, 3);
    const idx = Number.isInteger(c.answer) ? c.answer : -1;
    const right = options[idx];
    const mixed = shuffle(options);
    return { q: tstr(c.q, 240), options: mixed, answer: right === undefined ? -1 : mixed.indexOf(right), why: tstr(c.why, 160) };
  });
  const gap = take(out.gap, 6).map((g) => ({ pre: tstr(g.pre, 200), hint: tstr(g.hint, 40), post: tstr(g.post, 200), answer: tstr(g.answer, 80), why: tstr(g.why, 160) }));
  const fix = take(out.fix, 3).map((f) => ({ sentence: tstr(f.sentence, 240), corrected: tstr(f.corrected, 240), why: tstr(f.why, 160) }));
  const write = take(out.write, 2).map((w) => ({ prompt: tstr(w.prompt, 160), criteria: tstr(w.criteria, 240), example: tstr(w.example, 240) }));

  const test = {
    kind: 'grammarTest',
    topic: tstr(title || out.topic, 60) || 'Grammar',
    level: lvl,
    intro: tstr(out.intro, 200),
    parts: [
      { ...TEST_PARTS[0], items: choice },
      { ...TEST_PARTS[1], items: gap },
      { ...TEST_PARTS[2], items: fix },
      { ...TEST_PARTS[3], items: write }
    ]
  };

  const wanted = [5, 6, 3, 2];
  const counts = [choice.length, gap.length, fix.length, write.length];
  const problem = counts.some((c, i) => c !== wanted[i])
    ? 'the draft came back incomplete.'
    : validateGrammarTest(test);
  if (problem) {
    res.status(502).json({ error: 'The draft did not come out right (' + problem + ') Try again.' });
    return;
  }
  res.status(200).json({ test });
}

// ---------- one picture, for the builder to shrink before saving ----------
// Only Pixabay picture links are accepted (the builder only ever offers those),
// so this cannot be used to fetch anything else.
async function imageData(req, res) {
  const raw = String((req.body && req.body.url) || '');
  let u;
  try { u = new URL(raw); } catch (e) { u = null; }
  if (!u || u.protocol !== 'https:' || !(u.hostname === 'pixabay.com' || u.hostname.endsWith('.pixabay.com'))) {
    res.status(400).json({ error: 'Only Pixabay picture links are allowed.' });
    return;
  }
  const response = await fetch(u.toString());
  if (!response.ok) {
    res.status(502).json({ error: 'Could not download the picture (' + response.status + ').' });
    return;
  }
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) {
    res.status(502).json({ error: 'The link is not a picture.' });
    return;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 3000000) {
    res.status(502).json({ error: 'The picture is too large.' });
    return;
  }
  res.status(200).json({ dataUrl: `data:${type};base64,${buffer.toString('base64')}` });
}
