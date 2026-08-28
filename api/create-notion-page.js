// api/create-notion-page.js
// Creates a lesson page directly in Notion via the Notion API.
// Requires two Vercel environment variables:
//   NOTION_TOKEN            — the integration's "Access token" (Developer tools → Connections)
//   NOTION_PARENT_PAGE_ID   — the id of the page new lessons should be created under

const NOTION_VERSION = '2022-06-28';
const MAX_TEXT_LEN = 1900; // stay safely under Notion's 2000-char rich_text limit

function chunkText(text) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > MAX_TEXT_LEN) {
    let cut = remaining.lastIndexOf('\n', MAX_TEXT_LEN);
    if (cut <= 0) cut = remaining.lastIndexOf(' ', MAX_TEXT_LEN);
    if (cut <= 0) cut = MAX_TEXT_LEN;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function paragraphBlocks(text) {
  if (!text) return [];
  // Split on blank lines into separate paragraphs, then chunk any long ones.
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const blocks = [];
  for (const p of paras) {
    for (const chunk of chunkText(p)) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] }
      });
    }
  }
  return blocks;
}

function calloutBlock(emoji, text) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: text ? [{ type: 'text', text: { content: text } }] : [],
      icon: { type: 'emoji', emoji: emoji || '💡' }
    }
  };
}

function todoBlock(label) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: [{ type: 'text', text: { content: label } }],
      checked: false
    }
  };
}

function bulletedList(items) {
  return items.map(item => ({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: item } }] }
  }));
}

function bookmarkBlock(url) {
  return {
    object: 'block',
    type: 'bookmark',
    bookmark: { url }
  };
}

function toolButtonBlock(emoji, label, url) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: label + ' →', link: { url } } }],
      icon: { type: 'emoji', emoji },
      color: 'blue_background'
    }
  };
}
function dividerBlock() {
  return { object: 'block', type: 'divider', divider: {} };
}

// Every checkpoint checkbox is followed by a divider to visually close off that section.
function finish(label) {
  return [todoBlock(label), dividerBlock()];
}

function labeledLinkBlock(label, url) {
  const blocks = [{
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: label }, annotations: { bold: true } }] }
  }];
  blocks.push(url ? bookmarkBlock(url) : calloutBlock('🔗', ''));
  return blocks;
}

// Notion's dedicated `video` block only recognizes YouTube links in the
// watch/embed format (https://developers.notion.com/reference/block#video) —
// Shorts URLs (youtube.com/shorts/ID) and Vimeo links are NOT supported by
// that block type and would make the whole page-create call fail. So: pull
// the video ID out of any YouTube URL shape and rewrite it as a plain watch
// URL before using the video block; for anything else (Vimeo, etc.) fall
// back to the generic `embed` block, which Notion's own docs confirm works
// for Vimeo specifically.
function videoEmbedBlock(url) {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/);
  if (ytMatch) {
    return {
      object: 'block',
      type: 'video',
      video: { type: 'external', external: { url: `https://www.youtube.com/watch?v=${ytMatch[1]}` } }
    };
  }
  return {
    object: 'block',
    type: 'embed',
    embed: { url }
  };
}

function toolLinkOrPlaceholder(emoji, label, url) {
  if (url) return [toolButtonBlock(emoji, label, url)];
  return labeledLinkBlock(label + ':', null);
}

function buildChildren({ target, warmup, introVideoLink, videoLink, videoLabel, readingLink, writingLink, speakingLink, modelAnswer, discussionQuestions, questionRounds, presentationLink, groupDocLink }) {
  const children = [];

  if (target) children.push(calloutBlock('🎯', target));

  if (presentationLink) {
    children.push(toolButtonBlock('📊', 'Presentation (slides)', presentationLink));
  }
  if (groupDocLink) {
    children.push(toolButtonBlock('📄', 'Discussion Doc — paste this in Zoom chat', groupDocLink));
  }

  if (introVideoLink || warmup) {
    if (introVideoLink) {
      children.push(videoEmbedBlock(introVideoLink));
      children.push(calloutBlock('👀', ''));
    }
    if (warmup) {
      children.push(...paragraphBlocks(warmup));
      children.push(calloutBlock('✍️', ''));
    }
    children.push(...finish('Warm-up done'));
  }

  children.push(...toolLinkOrPlaceholder('🎬', videoLabel || 'Video to work on', videoLink));
  children.push(...finish('Video done'));

  children.push(...toolLinkOrPlaceholder('📖', 'Reading', readingLink));
  children.push(...finish('Reading done'));

  if (writingLink) {
    children.push(toolButtonBlock('✍️', 'Writing Practice', writingLink));
    children.push(...finish('Writing done'));
  }

  if (speakingLink) {
    children.push(toolButtonBlock('🎤', 'Speaking Practice', speakingLink));
    if (modelAnswer) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: 'Model answer:' }, annotations: { bold: true } }] }
      });
      children.push(videoEmbedBlock(modelAnswer));
    } else {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Model answer: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: 'not added yet — paste a video link here later and use Notion\'s /video command to embed it.' }, annotations: { italic: true, color: 'gray' } }
          ]
        }
      });
    }
    children.push(...finish('Speaking done'));
  }

  if (Array.isArray(questionRounds) && questionRounds.length) {
    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ type: 'text', text: { content: 'Discussion Questions — rotate pairs between rounds' } }] }
    });
    questionRounds.forEach((round, i) => {
      children.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: `Round ${i + 1}` } }] }
      });
      children.push(...bulletedList(round));
    });
    children.push(...finish('Discussion done'));
  } else if (Array.isArray(discussionQuestions) && discussionQuestions.length) {
    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ type: 'text', text: { content: 'Discussion Questions' } }] }
    });
    children.push(...bulletedList(discussionQuestions));
    children.push(...finish('Discussion done'));
  }

  // Exit ticket is the same on every lesson — optional feedback for the
  // teacher, not per-topic reflection questions (those live at the end of
  // the discussion questions instead). No heading, no checkbox — just the
  // note and an empty box, since it's not a required task.
  children.push(...paragraphBlocks(
    '💬 A quick note (optional) — comments, questions, anything.'
  ));
  children.push(calloutBlock('✍️', ''));

  return children;
}

// Creates one lesson page in Notion. Returns { url, id }.
async function createLessonPage({ token, parentPageId, icon, title, children }) {
  const payload = {
    parent: { page_id: parentPageId },
    properties: {
      title: { title: [{ type: 'text', text: { content: title } }] }
    },
    children: children.slice(0, 100) // Notion allows max 100 children per create-page call
  };

  if (icon) {
    payload.icon = { type: 'emoji', emoji: icon };
  }

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await notionRes.json();
  if (!notionRes.ok) {
    throw new Error(data.message || 'Notion API returned an error.');
  }
  return { url: data.url, id: data.id };
}

// Adds one row to the Assignments database, linking back to the lesson page.
// Non-fatal: if it fails, the caller should keep going and just report a warning —
// the lesson page itself is the important part.
async function createAssignmentRow({ token, level, format, title, lessonUrl }) {
  const assignmentsDbId = process.env.NOTION_ASSIGNMENTS_DATABASE_ID;
  if (!assignmentsDbId) {
    throw new Error('NOTION_ASSIGNMENTS_DATABASE_ID is not set in Vercel — the lesson page was created, but nothing was written to Assignments.');
  }

  const properties = {
    'Assignment Title': { title: [{ type: 'text', text: { content: title } }] },
    'Platform': { select: { name: 'notion' } },
    'URL': { url: lessonUrl },
    // Notion doesn't auto-fill custom Date properties from page creation time —
    // only its own built-in "Created time" metadata does that. This property is
    // a real column the teacher can see/sort/filter on, so it's set explicitly.
    'created': { date: { start: new Date().toISOString().slice(0, 10) } }
  };
  if (level) properties['Level'] = { multi_select: [{ name: level }] };
  // The select options in the live database are capitalized ("Individual"/"Group"),
  // not the lowercase values used internally (format === 'group' etc.) — sending
  // the lowercase value verbatim would silently create a duplicate option instead
  // of matching the existing one.
  if (format) properties['Format'] = { select: { name: format === 'group' ? 'Group' : 'Individual' } };

  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ parent: { database_id: assignmentsDbId }, properties })
  });

  const data = await notionRes.json();
  if (!notionRes.ok) {
    throw new Error(data.message || 'Notion API returned an error while writing to Assignments.');
  }
  return { skipped: false };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    res.status(500).json({ error: 'Notion is not configured: check NOTION_TOKEN and NOTION_PARENT_PAGE_ID in Vercel.' });
    return;
  }

  const {
    icon, title, level, target, warmup, introVideoLink, videoLink, readingLink,
    discussionQuestions, speakingLink, modelAnswer,
    writingLink, groupQuestionRounds, groupPracticeLink, presentationLink, groupDocLink
  } = req.body || {};

  if (!title) {
    res.status(400).json({ error: 'No lesson title specified.' });
    return;
  }

  // Backward compatible: if the form didn't send `formats` (older cached page),
  // default to a single individual page — same behavior as before.
  const requestedFormats = Array.isArray(req.body.formats) && req.body.formats.length
    ? req.body.formats
    : ['individual'];

  const pages = [];
  const warnings = [];

  for (const format of requestedFormats) {
    const isGroup = format === 'group';
    const pageTitle = isGroup ? `${title} — Group` : title;

    const children = buildChildren({
      target, warmup, introVideoLink, readingLink, writingLink, speakingLink, modelAnswer,
      videoLink: isGroup ? groupPracticeLink : videoLink,
      videoLabel: isGroup ? 'Practice' : 'Video to work on',
      discussionQuestions: isGroup ? null : discussionQuestions,
      questionRounds: isGroup ? groupQuestionRounds : null,
      presentationLink: isGroup ? presentationLink : null,
      groupDocLink: isGroup ? groupDocLink : null
    });

    try {
      const page = await createLessonPage({ token, parentPageId, icon, title: pageTitle, children });
      pages.push({ format, url: page.url, id: page.id });

      try {
        await createAssignmentRow({ token, level, format, title: pageTitle, lessonUrl: page.url });
      } catch (assignErr) {
        warnings.push(`Page for "${format}" was created, but adding it to Assignments failed: ${assignErr.message}`);
      }
    } catch (pageErr) {
      res.status(500).json({ error: `Failed to create the "${format}" page: ${pageErr.message}`, pages, warnings });
      return;
    }
  }

  res.status(200).json({
    pages,
    warnings,
    // kept for backward compatibility with anything still reading a single url/id
    url: pages[0] && pages[0].url,
    id: pages[0] && pages[0].id
  });
};
