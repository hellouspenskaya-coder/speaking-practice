// Receives a full session { student, topic, words, qas: [{question, answer}, ...] }
// from the teen practice page. Asks Claude for one holistic IELTS-style
// assessment across the whole session, then writes a row into the Notion
// "Speaking feedbacks teens" database. Keys (ANTHROPIC_API_KEY, NOTION_TOKEN)
// stay on the server.

const SYSTEM_PROMPT = `You are an examiner-style English speaking coach evaluating a student's full practice session for a younger learner preparing for exams. You will receive up to 5 question-answer pairs from one session, plus a list of target vocabulary the student was asked to try to use naturally across the session.

Respond with ONLY a raw JSON object (no markdown, no code fences, no text before or after) matching exactly this shape:
{
  "perQuestion": [ { "relevant": true, "note": "" } ],
  "scores": { "coherence": 0, "vocabulary": 0, "grammar": 0 },
  "keywordNote": "one short sentence on whether the target words were used naturally in context across the session, or just listed/forced in",
  "overallNote": "one short, encouraging sentence summarizing the session for the student",
  "exercise": {
    "gapFill": "a short sentence, in a new context, with a target phrase removed and replaced by ____",
    "targetPhrase": "the correct phrase for the blank, in the exact grammatical form needed",
    "distractors": ["a wrong grammatical-form variant of the same phrase", "a second wrong grammatical-form variant"]
  }
}

"perQuestion" must have exactly one entry per question, in the same order they were given. "relevant" is true unless the student clearly ignored or misunderstood the question — if false, "note" is one short sentence explaining why; otherwise "note" is an empty string.

Scoring rules:
- coherence, vocabulary, grammar are each a band from 0 to 9, in steps of 0.5, in the spirit of IELTS Speaking band descriptors: Fluency & Coherence, Lexical Resource, and Grammatical Range & Accuracy. Judge holistically across ALL answers in the session together, not per question.
- For vocabulary, take into account whether the supplied target words were used naturally in meaningful context, not simply inserted as a list — reflect that in both the score and keywordNote.

For the exercise: pick the single most useful grammar/expression issue noticed anywhere across the whole session, and build the gap-fill sentence with that phrase removed. Before finalizing, mentally insert targetPhrase into gapFill in place of ____ and confirm the result is a complete, correct English sentence — including correct pronoun/possessive agreement with the sentence's subject (e.g. "our" vs "their" must match who the sentence is about). The two distractors must be the SAME expression in different, grammatically WRONG forms for this exact blank (for phrasal verbs, a wrong particle; for idioms, one word swapped instead if that fits better) — never a different, unrelated word.

Keep all text warm, concise, and appropriate for a teenage student. Do not include anything beyond the fields above.`;

async function getFeedback(topic, words, qas) {
  const qaText = qas
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || '(no answer given)'}`)
    .join('\n\n');

  const userContent = `Topic: ${topic}\nTarget words: ${words.join(', ') || '(none supplied)'}\n\n${qaText}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error('Claude request failed: ' + details);
  }

  const data = await res.json();
  const rawText = (data.content || []).map((b) => b.text || '').join('\n').trim();
  const cleaned = rawText.replace(/^```json\s*|```$/g, '').trim();
  return JSON.parse(cleaned);
}

function toggleBlock(title, content) {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: [{ type: 'text', text: { content: title.slice(0, 2000) } }],
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: (content || '(no answer given)').slice(0, 2000) } }],
          },
        },
      ],
    },
  };
}

async function writeToNotion({ student, topic, qas, scores, notes }) {
  const dateStr = new Date().toISOString().split('T')[0];
  const title = `${student} – ${dateStr} – ${topic}`;

  const children = qas.map((qa, i) => toggleBlock(`Q${i + 1}: ${qa.question}`, qa.answer));

  const body = {
    parent: { database_id: process.env.NOTION_TEENS_DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: title } }] },
      Student: { rich_text: [{ text: { content: student } }] },
      Date: { date: { start: dateStr } },
      Topic: { rich_text: [{ text: { content: topic } }] },
      Coherence: { number: scores.coherence },
      Vocabulary: { number: scores.vocabulary },
      Grammar: { number: scores.grammar },
      Notes: { rich_text: [{ text: { content: notes.slice(0, 2000) } }] },
    },
    children,
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error('Notion write failed: ' + details);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const { student, topic, words, qas } = body;

    if (!student || !topic || !Array.isArray(qas) || qas.length === 0) {
      res.status(400).json({ error: 'Missing student, topic, or qas' });
      return;
    }

    const result = await getFeedback(topic, Array.isArray(words) ? words : [], qas);

    // Write to Notion in the background-ish, but don't fail the whole request
    // if Notion write breaks — the student should still see their score.
    let notionError = null;
    try {
      await writeToNotion({
        student,
        topic,
        qas,
        scores: result.scores,
        notes: [result.keywordNote, result.overallNote].filter(Boolean).join(' '),
      });
    } catch (e) {
      notionError = String(e);
    }

    res.status(200).json({ ...result, notionError });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
