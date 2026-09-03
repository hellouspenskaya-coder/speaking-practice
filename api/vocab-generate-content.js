// Given a list of words/phrases + CEFR level, asks Haiku to generate
// A1-friendly definitions, short example sentences, phonetics, and
// phonetic distractors (for words) or word-order chunks (for phrases).
// Requires ANTHROPIC_API_KEY (already set for the other tools).

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const { items, level } = req.body || {};
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
- "distractors": for "word" items only — exactly 2 other real English words that sound similar (rhyme or near-minimal pairs, for listening practice). Omit for phrases.
- "chunks": for "phrase" items only — the phrase split into its individual words in correct order, as an array of strings. Omit for words.

Items: ${JSON.stringify(items)}

Respond with ONLY a JSON array, one object per item, in the same order as the input, in this exact shape:
[{"text":"...","type":"word|phrase","definition":"...","example":"...","phonetic":"...","distractors":["...","..."],"chunks":["...","..."]}]
No preamble, no markdown fences, no explanation — JSON only.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Anthropic error ${response.status}: ${errText}` });
      return;
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const parsed = sanitizeAndParse(text);
    res.status(200).json({ items: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function sanitizeAndParse(raw) {
  let cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Could not find JSON array in model output');
  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

module.exports.config = { maxDuration: 60 };
