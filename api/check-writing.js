module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { answer, words, topic } = req.body || {};

    if (!answer || !String(answer).trim()) {
      res.status(400).json({ error: 'Missing answer' });
      return;
    }

    const wordList = Array.isArray(words) ? words.join(', ') : (words || '');

    const prompt = `You are marking a student's written sentences for errors.

Target vocabulary the student was asked to use: ${wordList || '(not specified)'}
Topic: ${topic || '(not specified)'}

Student's sentences:
"""
${answer}
"""

Go sentence by sentence. For EVERY sentence the student wrote, produce one item:
- If it's grammatically correct and natural: {"status": "correct", "text": "the sentence exactly as written"}
- Only if it has a genuine error (wrong grammar, wrong word choice, spelling, unnatural phrasing): {"status": "error", "text": "that sentence with the specific wrong word or phrase wrapped like §ERR§wrong bit§/ERR§ (wrap only the problem part, not the whole sentence)", "corrected": "that same sentence fully fixed"}

Important: do NOT mark a sentence as "error" just because it uses one of the target vocabulary words, or because you want to comment on it — using a target word correctly is success, not an error. Only use "error" when the corrected version would actually be different from the original. If you can't produce a corrected version that differs from the original, the sentence is correct — mark it "correct".

Return ONLY a JSON object: {"items": [...]}, one item per sentence, in the original order. No markdown fences, no extra text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(502).json({ error: 'Claude API error', details: data });
      return;
    }

    let text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      res.status(502).json({ error: 'Could not parse model output' });
      return;
    }

    // Safety check: if the model marked something as an error but the
    // "corrected" text is identical to the original, treat it as correct.
    const items = (result.items || []).map(item => {
      if (item.status === 'error') {
        const plain = (item.text || '').split('§ERR§').join('').split('§/ERR§').join('').trim().toLowerCase();
        const corrected = (item.corrected || '').trim().toLowerCase();
        if (plain === corrected) {
          return { status: 'correct', text: plain };
        }
      }
      return item;
    });

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
