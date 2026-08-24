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
    writingLink
  } = req.body || {};

  if (!title) {
    res.status(400).json({ error: 'No lesson title specified.' });
    return;
  }

  const children = [];

  if (target) children.push(calloutBlock('🎯', target));

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

  children.push(...toolLinkOrPlaceholder('🎬', 'Video to work on', videoLink));
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

  if (Array.isArray(discussionQuestions) && discussionQuestions.length) {
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

  try {
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
      res.status(notionRes.status).json({ error: data.message || 'Notion API returned an error.' });
      return;
    }

    res.status(200).json({ url: data.url, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Could not connect to the Notion API.' });
  }
};
