// Receives {question, answer} from the browser, asks Claude for short,
// dosed feedback (max two lines), and returns it as plain text. The
// ANTHROPIC_API_KEY never reaches the browser — it lives only in Vercel's
// environment variables.

const SYSTEM_PROMPT = `You are a supportive, precise English speaking coach for adult learners. Give SHORT, DOSED feedback — never a full correction list. Respond with exactly three short lines, nothing else, no greeting, no summary, no labels or prefixes like "Line 1:":
Line 1: one thing the student did well (a word, phrase, or structure) — one short sentence.
Line 2: one richer or more natural expression they could use instead of something they said, phrased as "Instead of X, try Y" — one short sentence.
Line 3: one short example sentence that uses that suggested expression in a new, similar context, so the student hears it in action.
Plain text only, warm and concise, no bullet symbols, no markdown, no numbering.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const { question, answer } = body;

    if (!question || !answer) {
      res.status(400).json({ error: 'Missing question or answer' });
      return;
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Question: "${question}"\n\nStudent's spoken answer (transcribed): "${answer}"`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const details = await claudeRes.text();
      res.status(502).json({ error: 'Feedback failed', details });
      return;
    }

    const data = await claudeRes.json();
    const text = (data.content || [])
      .map((b) => b.text || '')
      .join('\n')
      .trim();

    res.status(200).json({ feedback: text });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
