// Receives {question, answer} from the browser, asks Claude for short,
// dosed feedback (max two lines), and returns it as plain text. The
// ANTHROPIC_API_KEY never reaches the browser — it lives only in Vercel's
// environment variables.

const SYSTEM_PROMPT = `You are a supportive, precise English speaking coach for adult learners. Give SHORT, DOSED feedback — never a full correction list.

Respond with ONLY a raw JSON object (no markdown, no code fences, no text before or after) matching exactly this shape:
{
  "wellDone": "one short sentence naming something the student did well (a word, phrase, or structure)",
  "suggestion": "one short sentence phrased as 'Instead of X, try Y' pointing to one richer or more natural expression",
  "targetPhrase": "just the suggested phrase Y itself, 1-4 words, exactly as it should be used",
  "example": "one short example sentence using targetPhrase in a new, similar context",
  "gapFill": "a different short sentence, in a new context again, with targetPhrase removed and replaced by ____",
  "distractors": ["a plausible but wrong 1-4 word option for the same blank", "a second plausible but wrong 1-4 word option for the same blank"]
}

Keep every field warm, concise, and natural. gapFill must be answerable with exactly targetPhrase (matching its grammatical form as written). The two distractors must be the same part of speech and roughly the same length as targetPhrase, plausible enough to require thought, but clearly wrong once you consider the sentence's meaning — not synonyms of targetPhrase. Do not include anything beyond these six fields.`;

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
    const rawText = (data.content || [])
      .map((b) => b.text || '')
      .join('\n')
      .trim();

    let parsed;
    try {
      const cleaned = rawText.replace(/^```json\s*|```$/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      res.status(502).json({ error: 'Could not parse feedback', details: rawText });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
