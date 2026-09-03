// Given the full list of words in a set, asks Haiku which of them form
// genuine antonym pairs. Only pairs where BOTH words are already in the
// set are returned — the trainer never invents an opposite the student
// hasn't been taught.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const { words } = req.body || {};
  if (!Array.isArray(words) || words.length < 2) {
    res.status(400).json({ error: 'words must be an array of at least 2 items' });
    return;
  }

  const prompt = `Here is a list of English vocabulary items: ${JSON.stringify(words)}

Find which of them are opposites (antonyms) of each other. Only pair items that are BOTH in the list above. Only include clear, everyday opposites that a beginner would recognise (like big/small, hot/cold, open/closed). Do not invent words that are not in the list. If there are no clear pairs, return an empty array.

Respond with ONLY a JSON array of pairs, no preamble, no markdown fences:
[["big","small"],["clean","dirty"]]`;

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
        max_tokens: 800,
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

    let cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('Could not find JSON array in model output');
    const pairs = JSON.parse(cleaned.slice(start, end + 1));

    // Safety net: drop anything that references a word not in the set.
    const lower = words.map((w) => w.toLowerCase());
    const valid = pairs.filter(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        lower.includes(String(p[0]).toLowerCase()) &&
        lower.includes(String(p[1]).toLowerCase()) &&
        String(p[0]).toLowerCase() !== String(p[1]).toLowerCase()
    );

    res.status(200).json({ pairs: valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.config = { maxDuration: 30 };
