// api/find-resources.js
// Finds one authentic English-language source (video or article) on a topic via
// web search, then extracts vocabulary with real example sentences from it.
// Requires ANTHROPIC_API_KEY in Vercel environment variables (already set up).
//
// IMPORTANT LIMITATION (be upfront about this with Anna): the "video must have
// subtitles" rule is enforced by instructing the model to only choose videos it
// can find a real transcript/caption text for, and to quote actual subtitle
// lines as proof — not by a separate YouTube captions-API check. It's a strong
// instruction, not a hard technical guarantee.

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

  const { topic, level, sourceType } = req.body || {};
  if (!topic) {
    res.status(400).json({ error: 'Не указана тема.' });
    return;
  }

  const typeInstruction = sourceType === 'video'
    ? 'It MUST be a video (not an article).'
    : sourceType === 'article'
      ? 'It MUST be an article (not a video).'
      : 'It can be either a video or an article — pick whichever gives a better, more reliably-sourced result for this topic and level.';

  const prompt = `You are finding authentic English-language teaching material for an adult ${level || 'B2'} English learner.
Topic: "${topic}"

STEP 1 — Use web search to find ONE real, currently-live, authentic English-language source on this topic: a video roughly 3-6 minutes long, or an article roughly 500-900 words. ${typeInstruction} It must be a real URL you found via search, from a reputable source (official channel, news outlet, established publication, well-known educational/media site). Do not invent a URL.

CRITICAL RULE FOR VIDEOS: only pick a video if you can actually find and read its transcript or subtitle/caption text via search (e.g. a transcript page, a captions file, or a site that publishes the video's script). If you cannot find real transcript text for a video candidate, reject it and either try another video or switch to an article instead. Never guess or reconstruct what a video "probably" says — every vocabulary example below must be a real quoted line you actually found in text form.

STEP 2 — From the actual text content you found (the article body, or the video's real transcript/captions), pick 5-7 vocabulary words or expressions that genuinely appear in it and are useful/challenging at level ${level || 'B2'}. For each, give a short English definition and quote the actual short sentence (under 20 words) where it appears, so the teacher can show the word in its real context.

STEP 3 — Also propose, in English:
- "title": a short lesson title (5-8 words) for this topic, suitable as a Notion page title.
- "target": one sentence describing what the student will be able to do by the end of the lesson, starting with "By the end of this lesson, you'll be able to...".
- "warmup_question": one standalone opening discussion question about the general topic (not about the specific source) to ask before the material is introduced.

Respond with your FINAL message containing STRICT JSON only (no markdown fences, no commentary before or after) with this exact shape:
{
  "material": {"title": "real title of the source", "url": "real URL", "type": "video or article", "length": "e.g. '5 min video' or '6 min read'", "summary": "2-3 sentence English summary of what it covers"},
  "vocabulary": [{"word": "...", "definition": "...", "example_from_material": "the actual short sentence containing this word"}],
  "title": "...",
  "target": "...",
  "warmup_question": "..."
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
        max_tokens: 3000,
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
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON in response');

    const plan = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    res.status(200).json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось найти материал — попробуйте другую тему.' });
  }
};
