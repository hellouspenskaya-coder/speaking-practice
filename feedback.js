// Receives {question, answer} from the browser, asks Claude for short,
// dosed feedback (max two lines), and returns it as plain text. The
// ANTHROPIC_API_KEY never reaches the browser — it lives only in Vercel's
// environment variables.

const SYSTEM_PROMPT = `You are a supportive, precise English speaking coach for adult learners. Give SHORT, DOSED feedback — never a full correction list.

Respond with ONLY a raw JSON object (no markdown, no code fences, no text before or after) matching exactly this shape:
{
  "wellDone": "one short sentence naming something the student did well (a word, phrase, or structure)",
  "suggestion": "one short sentence phrased as 'Instead of X, try Y' pointing to one richer or more natural expression",
  "targetPhrase": "just the suggested phrase Y itself, exactly as it should be used, in the exact grammatical form the gapFill sentence requires (correct verb form, correct preposition, etc.)",
  "example": "one short example sentence using the same core expression as targetPhrase, but in a NOTICEABLY DIFFERENT grammatical form/tense than the one targetPhrase uses (different tense, different aspect, singular vs plural subject, etc.) — the student must not be able to just copy this sentence's wording to answer gapFill correctly",
  "gapFill": "a different short sentence, in a new context again, with targetPhrase removed and replaced by ____ — write the surrounding sentence so that only ONE grammatical form is correct there",
  "distractors": ["a wrong option for this exact blank, built using the rule below", "a second wrong option for this exact blank, built using the rule below"]
}

How to build the two distractors — first decide what kind of expression targetPhrase is, then apply the matching rule:
- Phrasal verb (verb + particle/preposition, e.g. "look after", "give up", "come across"): keep the same verb but swap in a different, wrong particle/preposition for this context (e.g. "look for" or "look into" when the correct one is "look after"). Use a wrong grammatical form for the second distractor if a second wrong preposition isn't natural.
- Multi-word idiom or fixed collocation (e.g. "kill two birds with one stone", "a piece of cake"): swap ONE word inside the idiom for a plausible but wrong word (e.g. "kill two birds with one rock") for at least one distractor.
- Single word or simple phrase with no fixed preposition/particle: use the same expression in two different, grammatically WRONG forms for this exact blank (wrong tense, missing "-ing", wrong number, etc.).

Keep every field warm, concise, and natural. Each distractor must sound clearly wrong once inserted into gapFill, for a specific, sayable reason — not just "different" from targetPhrase.

Before finalizing your answer, mentally insert targetPhrase into gapFill in place of ____ and check that the result is a complete, correct English sentence — targetPhrase must include every word the blank needs (articles, prepositions, "-ing" endings, etc.), not just be correct in isolation. Pay special attention to any pronoun or possessive inside targetPhrase (their/our/his/her/its/your) — it must agree with the subject of gapFill's sentence (e.g. if gapFill's subject is "we", a possessive inside targetPhrase must be "our", not "their"); rewrite gapFill's subject or targetPhrase's pronoun until they agree. If it doesn't fit perfectly, revise gapFill or targetPhrase until it does. Do the same check for each distractor: inserting it must sound clearly wrong for a specific, sayable reason, not just "different". Also double-check that example does NOT use targetPhrase in the same form gapFill requires — if it does, rewrite example in a different tense/form.

Do not include anything beyond these six fields.`;

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
