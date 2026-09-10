// api/generate-intro.js
// For when Anna already has her own material (found earlier, or a video she
// made herself) and doesn't need the full search — just wants the title,
// icon, target, warm-up, discussion questions, and group question rounds
// generated from a topic + level. No web search, no material lookup —
// just one fast Haiku call, so it's near-instant and very cheap.
// Requires ANTHROPIC_API_KEY in Vercel environment variables (already set up).

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' });
    return;
  }

  const { topic, level } = req.body || {};
  if (!topic) {
    res.status(400).json({ error: 'No topic specified.' });
    return;
  }

  const lvl = level || 'B2';

  const prompt = `You are preparing an adult ${lvl} English lesson on the topic "${topic}". The teacher already has her own material for this lesson (found separately, or her own video) — you are NOT finding or referencing any material, just building the lesson framing from the topic itself.

Propose, in ENGLISH ONLY:
- "icon": ONE emoji that best represents this topic.
- "title": a short lesson title (5-8 words), suitable as a Notion page title.
- "target": a SHORT phrase in the exact format "You will speak about [specific topic phrase]." — just that, nothing longer. Example: "You will speak about market economy and market society."
- "warmup_question": one standalone opening discussion question about the general topic to ask before the lesson's material is introduced.
- "discussion_questions": 6-8 open-ended discussion questions about the topic and the student's own life/views. Avoid yes/no questions. Make the LAST 1-2 questions in the list reflective/wrap-up ones about the lesson itself (e.g. what they'll remember, what stood out, how their view changed).
- "group_discussion_question_sets": an array of exactly 3 rounds, each round an array of exactly 5 questions, for a group class where pairs rotate partners between rounds (so each round needs its own fresh mini-arc). Rules that apply to EVERY question in every round:
  (a) Each question must be fully SELF-CONTAINED — no "this", "it", "that pattern", or any reference to a previous question. Someone reading only that one question, out of order, must understand it completely on its own.
  (b) NEVER use the specific name of a study/theory/person/technical term — ask about the underlying everyday idea in plain words instead, so someone who joined late isn't lost.
  (c) Personal and reflective, not formal debate — "have you ever...", "what's your experience with...", "do you agree that..." rather than "argue for/against...".
  (d) Across the 5 questions in a round, cover genuinely DIFFERENT angles/facets of the topic (not five variations of the same question) — and the 3 rounds should also differ from each other, not just reshuffle the same 15 ideas.
Within each round of 5:
  - Question 1: a simple, easy icebreaker — quick to answer, gets the pair talking, no deep thought required.
  - Questions 2-4: varied personal-reflection questions, each a distinct angle.
  - Question 5: a deeper question built around a short 1-2 sentence everyday case or dilemma (plain language, no jargon) that the pair discusses together.

Respond with STRICT JSON only (no markdown fences, no commentary, no trailing commas):
{
  "icon": "...",
  "title": "...",
  "target": "...",
  "warmup_question": "...",
  "discussion_questions": ["...", "...", "...", "...", "...", "..."],
  "group_discussion_question_sets": [
    ["...", "...", "...", "...", "..."],
    ["...", "...", "...", "...", "..."],
    ["...", "...", "...", "...", "..."]
  ]
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json({ error: data.error?.message || 'Anthropic API returned an error.' });
      return;
    }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const plan = JSON.parse(sanitizeJson(extractJson(text)));
    res.status(200).json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Could not generate: ' + (err.message || 'unknown error') + '. Try again.' });
  }
};

function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error('JSON object in response was not properly closed');
}

function sanitizeJson(jsonStr) {
  return jsonStr.replace(/,(\s*[}\]])/g, '$1');
}
