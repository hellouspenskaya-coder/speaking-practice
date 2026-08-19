// Generates discussion/reflection questions for speaking practice, given a
// CEFR level, a topic, and a list of target vocabulary to weave in. The
// ANTHROPIC_API_KEY stays on the server, same pattern as feedback.js.

const SYSTEM_PROMPT = `You write English speaking-practice questions for language learners. Given a topic, a CEFR level, and a list of target vocabulary words, write open-ended, reflective, discussion-style questions — never simple yes/no or fact-recall questions. Each question should invite the student to reason, share an opinion, or reflect on personal experience.

Naturally work the given target words into the questions across the set (not necessarily one word per question, and not forced if it would sound unnatural) so the student gets speaking practice using that vocabulary. Match sentence complexity and vocabulary difficulty to the given CEFR level — simpler, shorter questions for A1/A2, more nuanced and abstract questions for C1/C2.

Output ONLY the questions, one per line, no numbering, no bullet symbols, no headings, no extra commentary before or after.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const { topic, level, words, count } = body;

    if (!topic) {
      res.status(400).json({ error: 'Missing topic' });
      return;
    }

    const userContent = [
      `Topic: ${topic}`,
      level ? `CEFR level: ${level}` : null,
      words ? `Target vocabulary to work in: ${words}` : null,
      `Number of questions: ${count || 6}`,
    ]
      .filter(Boolean)
      .join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!claudeRes.ok) {
      const details = await claudeRes.text();
      res.status(502).json({ error: 'Question generation failed', details });
      return;
    }

    const data = await claudeRes.json();
    const text = (data.content || [])
      .map((b) => b.text || '')
      .join('\n')
      .trim();

    res.status(200).json({ questions: text });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
