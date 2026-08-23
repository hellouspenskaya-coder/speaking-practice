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
    res.status(500).json({ error: 'ANTHROPIC_API_KEY не настроен в Vercel.' });
    return;
  }

  const { topic, level } = req.body || {};
  if (!topic) {
    res.status(400).json({ error: 'Не указана тема.' });
    return;
  }

  const lvl = level || 'B2';
  const vocabRule = ['A2', 'B1', 'B2'].includes(lvl)
    ? `VOCABULARY DIFFICULTY RULE: level is ${lvl}, so choose ONLY general-register English vocabulary — common words or expressions that show up across many topics and are genuinely useful in everyday/general English. Avoid narrow academic, philosophical, or field-specific jargon tied only to this one topic, even if such a word appears in the source.`
    : `VOCABULARY DIFFICULTY RULE: level is ${lvl}, so you may include AT MOST 3 topic-specific/specialized terms per source (words tied specifically to this topic's field). All remaining words must still be general-register English vocabulary useful beyond this one topic, not a pile of niche jargon.`;

  const materialsPrompt = `You are finding authentic English-language teaching material for an adult ${lvl} English learner.
Topic: "${topic}"

Use web search to find real, currently-live, authentic English-language sources on this topic:
(a) ONE article, roughly 500-900 words, from a reputable source (news outlet, established publication, well-known site).
(b) THREE candidate videos, each roughly 3-6 minutes long, from reputable sources (official channel, news outlet, educational/media site) — give a few different options since not every video works in every downstream tool. Prefer well-known channels that reliably publish real captions/transcripts — e.g. TED / TED-Ed, BBC Learning English, VOA Learning English, official news channel explainer series (BBC News, Vox, etc.) — but any real, relevant video is fine. Just find relevant, real video URLs — you do NOT need to read their transcripts or verify captions for this step.
All URLs must be real ones you found via search. Do not invent a URL.

From the actual text content of the ARTICLE ONLY (the article body), pick 5-7 vocabulary words or expressions that genuinely appear in it. For each, give a short English definition and quote the actual short sentence (under 20 words) where it appears. Do not extract vocabulary from the video — that part is handled separately by the teacher.

${vocabRule}

Write everything in ENGLISH ONLY. No Russian, no other language, anywhere in the output values.

Respond with your FINAL message containing STRICT JSON only (no markdown fences, no commentary before or after, no trailing commas) with this exact shape:
{
  "materials": {
    "article": {"title": "real title", "url": "real URL", "type": "article", "length": "e.g. '6 min read'", "summary": "2-3 sentence English summary"},
    "video_options": [
      {"title": "real title", "url": "real URL", "type": "video", "length": "e.g. '5 min video'", "summary": "2-3 sentence English summary"}
    ]
  },
  "vocabulary": {
    "article": [{"word": "...", "definition": "...", "example_from_material": "..."}]
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
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: materialsPrompt }]
      })
    });
    const materialsData = await materialsResp.json();
    if (!materialsResp.ok) {
      res.status(materialsResp.status).json({ error: materialsData.error?.message || 'Anthropic API вернул ошибку (поиск материалов).' });
      return;
    }
    const materialsText = (materialsData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const materialsPlan = JSON.parse(sanitizeJson(extractJson(materialsText)));

    // Second, simpler call — no web search, just synthesis from what was found.
    // Smaller JSON, far less likely to come back malformed.
    const introPrompt = `You are preparing an adult ${lvl} English lesson on the topic "${topic}".
Here is the authentic material already found for this lesson:
${JSON.stringify(materialsPlan.materials)}

Propose, in ENGLISH ONLY:
- "icon": ONE emoji that best represents this topic.
- "title": a short lesson title (5-8 words), suitable as a Notion page title.
- "target": ONE short sentence (under 15 words) describing what the student will be able to do by the end of the lesson, starting with "By the end of this lesson, you'll be able to...".
- "warmup_question": one standalone opening discussion question about the general topic (not about a specific source) to ask before the material is introduced.
- "discussion_questions": 6-8 open-ended discussion questions connecting to the material and the student's own life/views. Avoid yes/no questions. Make the LAST 1-2 questions in the list reflective/wrap-up ones about the lesson itself (e.g. what they'll remember, what stood out, how their view changed) rather than about the source material directly.

Respond with STRICT JSON only (no markdown fences, no commentary, no trailing commas):
{
  "icon": "...",
  "title": "...",
  "target": "...",
  "warmup_question": "...",
  "discussion_questions": ["...", "...", "...", "...", "...", "..."]
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
      res.status(introResp.status).json({ error: introData.error?.message || 'Anthropic API вернул ошибку (сборка заголовка/вопросов).' });
      return;
    }
    const introText = (introData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const introPlan = JSON.parse(sanitizeJson(extractJson(introText)));

    res.status(200).json({ ...materialsPlan, ...introPlan });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось найти материал: ' + (err.message || 'неизвестная ошибка') + '. Попробуйте другую тему или ещё раз — иногда помогает просто повторить запрос.' });
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

module.exports.config = { maxDuration: 60 };
