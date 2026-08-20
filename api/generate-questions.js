// Generates discussion/reflection questions for speaking practice, given a
// CEFR level, a topic, and a list of target vocabulary to weave in. The
// ANTHROPIC_API_KEY stays on the server, same pattern as feedback.js.

const SYSTEM_PROMPT = `You write English speaking-practice questions for language learners, and you also select the target vocabulary for the lesson.

Respond with ONLY a raw JSON object (no markdown, no code fences, no text before or after) matching exactly this shape:
{
  "questions": ["question 1", "question 2", "..."],
  "words": ["word or short phrase 1", "word or short phrase 2", "..."]
}

For "words": if the user supplies target words, the words array must contain exactly those words PLUS 3 additional related words or short phrases you choose yourself that fit the topic and level. If the user supplies no target words, choose 5 words or short phrases yourself that fit the topic and level. Never explain or introduce the words — the array must contain only the words/phrases themselves.

For "questions": write open-ended, reflective, discussion-style questions — never simple yes/no or fact-recall questions. Each question should invite the student to reason, share an opinion, or reflect on personal experience. Naturally work the words from the "words" array into the questions across the set (not necessarily one word per question, and not forced if it would sound unnatural) so the student gets speaking practice using that vocabulary. Match sentence complexity and vocabulary difficulty to the given CEFR level — simpler, shorter questions for A1/A2, more nuanced and abstract questions for C1/C2.

The "questions" array must contain ONLY the questions themselves — never a heading, introduction, or any sentence about the vocabulary list.`;

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
    const rawText = (data.content || [])
      .map((b) => b.text || '')
      .join('\n')
      .trim();

    let parsed;
    try {
      const cleaned = rawText.replace(/^```json\s*|```$/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      res.status(502).json({ error: 'Could not parse questions', details: rawText });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
