// api/find-resources.js
// Finds two authentic English-language sources on a topic — one article and one
// video — via web search. Vocabulary with real example sentences is extracted
// from the ARTICLE ONLY (fast, no transcript needed). The video is just found
// by topic/duration relevance — Anna pulls video vocabulary manually via Twee,
// so there's no need to verify captions or read the video's transcript here,
// which used to be the main cost/time driver (repeated search-and-reject
// cycles hunting for a video with a real, findable transcript).
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

  const lowLevel = /^(A1|A2)/i.test(String(lvl).trim());
  const videoRules = lowLevel
    ? `VIDEO STYLE: clear, slow-to-moderate speech and visual support are welcome. Learner-friendly videos are acceptable, but prefer real, engaging content over classroom lessons.`
    : `VIDEO STYLE (IMPORTANT — the learner is ${lvl}, so this is NOT an English lesson): every video must be AUTHENTIC content made for native English speakers about the topic itself, and it must be SHORT-FORM: a news or magazine segment, a short explainer, a short interview clip, a short essay video, a short first-person story or a day-in-the-life style video, typically 3-8 minutes. The video must be ABOUT the topic's real-world subject (people, culture, food, industry, trends, stories, ideas), not about how to say things in English.
HOW TO SEARCH FOR SHORT VIDEOS: put short-format words in your YouTube searches, such as "explained", "in 5 minutes", "short", "segment", "mini", "why", "how", and look at producers known for short videos (e.g. Vox, CNBC Make It, Insider, BBC Reel, TED-Ed, NowThis, Eater, Johnny Harris, Wendover-style explainers). Do NOT choose feature-length documentaries, films, TV episodes, full lectures, panel discussions, podcasts, livestreams or "full episode" / "full documentary" / compilation videos — those are always far too long.
STRICTLY EXCLUDE: English-teaching or ESL channels and teachers, "learn English" / "English lesson" / "English conversation" / "useful phrases" / "vocabulary" / IELTS / TOEFL videos, role-play dialogues, and any video that drills expressions for the topic (for example "phrases to use in a restaurant"). If a video's purpose is teaching English, do not include it.`;

  const materialsPrompt = `You are finding authentic English-language teaching material for an adult ${lvl} English learner.
Topic: "${topic}"

Use web search to find real, currently-live, authentic English-language sources on this topic:

(a) TEN candidate videos (the best few will be kept), each SHORT: between 3 and 10 minutes long. HARD LIMIT: never longer than 10 minutes — no full-length films, documentaries, lectures, podcasts, livestreams or compilations; if a video's length is 10+ minutes or unclear, skip it. Prefer videos around 4-8 minutes. (The real length is re-checked automatically afterwards, so do not write the duration in your output.) Videos MUST be hosted on YouTube or Vimeo ONLY (a youtube.com/youtu.be or vimeo.com URL) — no other platform. Give DIFFERENT video URLs — never return the same video twice.
${videoRules}

(b) TWO candidate articles, each readable in UNDER 10 MINUTES (roughly 400-1100 words). Give two DIFFERENT article URLs — never return the same article twice. For "length", give an honest estimated reading time based on the actual word count (roughly 200 words/minute), e.g. "4 min read".

Both articles and videos must clearly and directly address this specific topic — not just tangentially related content.

All URLs must be real ones you found via search. Do not invent a URL.

Do NOT write a summary, description, or vocabulary/quotes for either the articles or the videos — just the bare title, URL, and (for articles only) the estimated reading time. Skip all explanatory text entirely to keep this fast.

Write everything in ENGLISH ONLY. No Russian, no other language, anywhere in the output values.

Respond with your FINAL message containing STRICT JSON only (no markdown fences, no commentary before or after, no trailing commas) with this exact shape:
{
  "materials": {
    "video_options": [
      {"title": "real title", "url": "real URL", "type": "video"}
    ],
    "article_options": [
      {"title": "real title", "url": "real URL", "type": "article", "length": "e.g. '4 min read'"}
    ]
  }
}`;

  try {
    const materialsResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3500,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: materialsPrompt }]
      })
    });
    const materialsData = await materialsResp.json();
    if (!materialsResp.ok) {
      res.status(materialsResp.status).json({ error: materialsData.error?.message || 'Anthropic API returned an error (finding materials).' });
      return;
    }
    const materialsText = (materialsData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const materialsPlan = JSON.parse(sanitizeJson(extractJson(materialsText)));

    // Safety net: drop any video candidate that isn't actually YouTube/Vimeo,
    // in case the model didn't follow the platform restriction.
    let videoStats = null;
    if (materialsPlan.materials && Array.isArray(materialsPlan.materials.video_options)) {
      videoStats = { asked: materialsPlan.materials.video_options.length };
      materialsPlan.materials.video_options = materialsPlan.materials.video_options.filter(v => {
        try {
          const host = new URL(v.url).hostname.replace(/^www\./, '');
          return host === 'youtube.com' || host === 'youtu.be' || host === 'vimeo.com' || host === 'm.youtube.com';
        } catch (e) {
          return false;
        }
      });

      videoStats.platformOk = materialsPlan.materials.video_options.length;

      // Real existence check via the platforms' own oEmbed endpoints (free,
      // no API key needed). Drops dead/invented links and replaces the
      // model's guessed title with the real one straight from the source.
      const verified = await Promise.all(
        materialsPlan.materials.video_options.map(async (v) => {
          const real = await verifyVideoExists(v.url);
          if (!real) return null;
          return { ...v, title: real.title || v.title, _author: real.author || '', _seconds: real.seconds, _why: real.why };
        })
      );
      let vids = verified.filter(Boolean);
      videoStats.exist = vids.length;

      // For B1+ drop English-teaching content even if the model slipped one in.
      if (!lowLevel) {
        const eslTitle = /\b(learn english|english lesson|english conversation|english class|esl|ielts|toefl|vocabulary|useful phrases|useful expressions|phrases (for|to use)|speak english|english speaking|english with|role[- ]?play|dialogue|grammar)\b/i;
        const eslAuthor = /english|esl\b|ielts|toefl|vocabulary|fluency|speakenglish/i;
        vids = vids.filter(v => !eslTitle.test(v.title || '') && !eslAuthor.test(v._author || ''));
      }
      videoStats.afterEsl = vids.length;
      // Duration: if the server could read it, keep only 2-10 minute videos.
      // YouTube often blocks server-side lookups (LOGIN_REQUIRED), so when the
      // length is unknown the video is flagged `measure: true` and the browser
      // (lesson-assembler.html) checks it with the YouTube player instead.
      const MAX_SEC = 10 * 60, MIN_SEC = 2 * 60;
      vids = vids.filter(v => v._seconds == null || (v._seconds >= MIN_SEC && v._seconds <= MAX_SEC));
      videoStats.afterLength = vids.length;
      vids.sort((a, b) => (a._seconds == null) - (b._seconds == null));
      materialsPlan.materials.video_options = vids.map(({ _author, _seconds, _why, ...rest }) =>
        _seconds == null
          ? { ...rest, measure: true }
          : { ...rest, length: Math.max(1, Math.round(_seconds / 60)) + ' min', seconds: _seconds });
    }

    // Safety net: drop duplicate URLs in either list, in case the model
    // returned the same source twice despite being told not to.
    function dedupeByUrl(list) {
      if (!Array.isArray(list)) return list;
      const seen = new Set();
      return list.filter(item => {
        try {
          const key = new URL(item.url).href.replace(/\/$/, '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        } catch (e) {
          return true;
        }
      });
    }
    if (materialsPlan.materials) {
      materialsPlan.materials.video_options = (dedupeByUrl(materialsPlan.materials.video_options) || []).slice(0, 6);
      materialsPlan.materials.article_options = dedupeByUrl(materialsPlan.materials.article_options);
    }

    // Second, simpler call — no web search, just synthesis from what was found.
    // Smaller JSON, far less likely to come back malformed.
    const introPrompt = `You are preparing an adult ${lvl} English lesson on the topic "${topic}".
Here is the authentic material already found for this lesson:
${JSON.stringify(materialsPlan.materials)}

Propose, in ENGLISH ONLY:
- "icon": ONE emoji that best represents this topic.
- "title": a short lesson title (5-8 words), suitable as a Notion page title.
- "target": a SHORT phrase in the exact format "You will speak about [specific topic phrase]." — just that, nothing longer. Example: "You will speak about market economy and market society."
- "warmup_question": one standalone opening discussion question about the general topic (not about a specific source) to ask before the material is introduced.
- "discussion_questions": 6-8 open-ended discussion questions connecting to the material and the student's own life/views. Avoid yes/no questions. Make the LAST 1-2 questions in the list reflective/wrap-up ones about the lesson itself (e.g. what they'll remember, what stood out, how their view changed) rather than about the source material directly.
- "group_discussion_question_sets": an array of exactly 3 rounds, each round an array of exactly 5 questions, for a group class where pairs rotate partners between rounds (so each round needs its own fresh mini-arc). Rules that apply to EVERY question in every round:
  (a) Each question must be fully SELF-CONTAINED — no "this", "it", "that pattern", or any reference to a previous question. Someone reading only that one question, out of order, must understand it completely on its own.
  (b) NEVER use the specific name of the study/theory/person/technical term from the material — ask about the underlying everyday idea in plain words instead, so someone who joined late or skipped the material isn't lost.
  (c) Personal and reflective, not formal debate — "have you ever...", "what's your experience with...", "do you agree that..." rather than "argue for/against...".
  (d) Across the 5 questions in a round, cover genuinely DIFFERENT angles/facets of the topic (not five variations of the same question) — and the 3 rounds should also differ from each other, not just reshuffle the same 15 ideas.
Within each round of 5:
  - Question 1: a simple, easy icebreaker — quick to answer, gets the pair talking, no deep thought required.
  - Questions 2-4: varied personal-reflection questions, each a distinct angle.
  - Question 5: a deeper question built around a short 1-2 sentence everyday case or dilemma (pitched at the student's level, plain language, no jargon) that the pair discusses together — this is the meatiest question of the round.

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

    const introResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3500,
        messages: [{ role: 'user', content: introPrompt }]
      })
    });
    const introData = await introResp.json();
    if (!introResp.ok) {
      res.status(introResp.status).json({ error: introData.error?.message || 'Anthropic API returned an error (building title/questions).' });
      return;
    }
    const introText = (introData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const introPlan = JSON.parse(sanitizeJson(extractJson(introText)));

    res.status(200).json({ ...materialsPlan, ...introPlan, video_stats: videoStats });
  } catch (err) {
    res.status(500).json({ error: 'Could not find material: ' + (err.message || 'unknown error') + '. Try a different topic or try again — sometimes just retrying helps.' });
  }
};

// Finds the first top-level {...} object in text by tracking brace depth,
// instead of naively using the last "}" in the whole string.
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

// Cheap repair pass for the single most common LLM JSON mistake: a trailing
// comma right before a closing } or ] — technically invalid JSON, but easy
// and safe to strip before parsing.
function sanitizeJson(jsonStr) {
  return jsonStr.replace(/,(\s*[}\]])/g, '$1');
}

// Confirms a video URL is real using the platform's own oEmbed endpoint —
// public, free, no API key. Returns { title } on success or null if the
// video doesn't exist / oEmbed rejects it (private, deleted, wrong URL).
async function verifyVideoExists(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const isYouTube = host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
    const oembedUrl = isYouTube
      ? 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json'
      : 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(url);
    const r = await fetch(oembedUrl);
    if (!r.ok) return null;
    const data = await r.json();
    let seconds = null, why = '';
    if (isYouTube) {
      const d = await youtubeDuration(url);
      seconds = d.seconds; why = d.why;
    } else if (typeof data.duration === 'number') {
      seconds = data.duration; // Vimeo oEmbed includes duration in seconds
    } else why = 'vimeo: no duration';
    return { title: data.title, author: data.author_name || '', seconds, why };
  } catch (e) {
    return null;
  }
}


// YouTube's oEmbed has no duration, so we try several sources in order:
//  1. YouTube Data API (only if YOUTUBE_API_KEY is set in Vercel) — most reliable
//  2. YouTube's internal player endpoint (no key needed)
//  3. the watch page's embedded lengthSeconds
// Returns { seconds, why } — seconds is null if every source failed, and
// `why` says what happened so it can be shown next to the video.
function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, '') === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
    return u.searchParams.get('v');
  } catch (e) { return null; }
}

function parseIsoDuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return null;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

async function youtubeDuration(url) {
  const id = youtubeId(url);
  if (!id) return { seconds: null, why: 'no video id' };
  const why = [];

  if (process.env.YOUTUBE_API_KEY) {
    try {
      const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=' +
        encodeURIComponent(id) + '&key=' + encodeURIComponent(process.env.YOUTUBE_API_KEY));
      if (r.ok) {
        const d = await r.json();
        const sec = parseIsoDuration(d.items && d.items[0] && d.items[0].contentDetails && d.items[0].contentDetails.duration);
        if (sec != null) return { seconds: sec, why: '' };
        why.push('api: no data');
      } else why.push('api ' + r.status);
    } catch (e) { why.push('api error'); }
  }

  try {
    const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '20.10.38'
      },
      body: JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'en', gl: 'US' } },
        videoId: id,
        contentCheckOk: true,
        racyCheckOk: true
      })
    });
    if (r.ok) {
      const d = await r.json();
      const sec = parseInt(d.videoDetails && d.videoDetails.lengthSeconds, 10);
      if (!isNaN(sec)) return { seconds: sec, why: '' };
      why.push('player: ' + ((d.playabilityStatus && d.playabilityStatus.status) || 'no data'));
    } else why.push('player ' + r.status);
  } catch (e) { why.push('player error'); }

  try {
    const r = await fetch('https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '&hl=en', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+1; SOCS=CAI'
      }
    });
    if (r.ok) {
      const html = await r.text();
      const m = html.match(/"lengthSeconds":"(\d+)"/);
      if (m) return { seconds: parseInt(m[1], 10), why: '' };
      why.push('page: no length');
    } else why.push('page ' + r.status);
  } catch (e) { why.push('page error'); }

  return { seconds: null, why: why.join('; ') };
}

module.exports.config = { maxDuration: 60 };
