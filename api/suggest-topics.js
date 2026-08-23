// api/suggest-topics.js
// Suggests 3 new discussion topics in the style of the existing pool.
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

  const { existing } = req.body || {};
  const existingList = Array.isArray(existing) ? existing.join('; ') : '';

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
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Suggest exactly 3 new discussion-worthy topics for an adult B1-C2 English conversation class, in the same style as this existing pool (a well-known idea/concept/study + short parenthetical on what it's about): ${existingList}. Avoid duplicating themes already covered. Respond ONLY with a JSON array of 3 strings, no markdown, no preamble.`
        }]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json({ error: data.error?.message || 'Anthropic API вернул ошибку.' });
      return;
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const topics = JSON.parse(clean);

    if (!Array.isArray(topics)) throw new Error('Unexpected response shape');
    res.status(200).json({ topics });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось получить новые темы.' });
  }
};
