// api/find-resources.js
// Finds TWO authentic English-language sources on a topic — one article and one
// video — via web search, then extracts vocabulary separately from each.
// Requires ANTHROPIC_API_KEY in Vercel environment variables (already set up).
//
// IMPORTANT LIMITATION (be upfront about this with Anna): the "video must have
// subtitles" rule is enforced by instructing the model to only choose videos it
// can find a real transcript/caption text for, and to quote actual subtitle
// lines as proof — not by a separate YouTube captions-API check. It's a strong
// instruction, not a hard technical guarantee. If no video with a real,
// findable transcript exists for the topic, the model is told to return
// materials.video as null rather than invent one.

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

  const prompt = `You are finding authentic English-language teaching material for an adult ${lvl} English learner.
Topic: "${topic}"

STEP 1 — Use web search to find TWO real, currently-live, authentic English-language sources on this topic:
(a) ONE article, roughly 500-900 words, from a reputable source (news outlet, established publication, well-known site).
(b) ONE video, roughly 3-6 minutes long, from a reputable source (official channel, news outlet, educational/media site).
Both must be real URLs you found via search. Do not invent a URL.

CRITICAL RULE FOR THE VIDEO: only pick it if you can actually find and read its transcript or subtitle/caption text via search (a transcript page, a captions file, or a site publishing the script). If, after real effort, you cannot find any video with genuine transcript text, set "video" to null in the material section below rather than guessing or inventing content — never reconstruct what a video "probably" says.

STEP 2 — From the actual text content of EACH source separately (the article body; the video's real transcript), pick 5-7 vocabulary words or expressions that genuinely appear in THAT source. For each, give a short English definition and quote the actual short sentence (under 20 words) where it appears. Keep the article's vocabulary and the video's vocabulary as two separate lists — do not merge them.

${vocabRule}

STEP 3 — Also propose, in English:
- "icon": ONE emoji that best represents this topic (just the emoji character, nothing else).
- "title": a short lesson title (5-8 words) for this topic, suitable as a Notion page title.
- "target": ONE short sentence (under 15 words) describing what the student will be able to do by the end of the lesson, starting with "By the end of this lesson, you'll be able to...".
- "warmup_question": one standalone opening discussion question about the general topic (not about a specific source) to ask before the material is introduced.
- "discussion_questions": 6-8 open-ended discussion questions connecting to the material and the student's own life/views. Avoid yes/no questions.
- "exit_ticket": exactly 3 short self-reflection prompts for the end of the lesson, tied to this specific topic and material (not generic).

STEP 4 — Write everything in ENGLISH ONLY. No Russian, no other language, anywhere in the output values.

Respond with your FINAL message containing STRICT JSON only (no markdown fences, no commentary before or after) with this exact shape:
{
  "materials": {
    "article": {"title": "real title", "url": "real URL", "type": "article", "length": "e.g. '6 min read'", "summary": "2-3 sentence English summary"},
    "video": {"title": "real title", "url": "real URL", "type": "video", "length": "e.g. '5 min video'", "summary": "2-3 sentence English summary"} or null
  },
  "vocabulary": {
    "article": [{"word": "...", "definition": "...", "example_from_material": "..."}],
    "video": [{"word": "...", "definition": "...", "example_from_material": "..."}]
  },
  "title": "...",
  "icon": "🎯",
  "target": "...",
  "warmup_question": "...",
  "discussion_questions": ["...", "...", "...", "...", "...", "..."],
  "exit_ticket": ["...", "...", "..."]
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json({ error: data.error?.message || 'Anthropic API вернул ошибку.' });
      return;
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const plan = JSON.parse(extractJson(text));
    res.status(200).json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось найти материал: ' + (err.message || 'неизвестная ошибка') + '. Попробуйте другую тему или ещё раз — иногда помогает просто повторить запрос.' });
  }
};

// Finds the first top-level {...} object in text by tracking brace depth,
// instead of naively using the last "}" in the whole string — the model
// sometimes adds a stray brace in trailing commentary despite instructions
// not to, which broke the old indexOf/lastIndexOf approach.
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

module.exports.config = { maxDuration: 60 };
