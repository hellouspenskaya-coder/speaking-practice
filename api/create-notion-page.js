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

function dividerBlock() {
  return { object: 'block', type: 'divider', divider: {} };
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    res.status(500).json({ error: 'Notion не настроен: проверьте NOTION_TOKEN и NOTION_PARENT_PAGE_ID в Vercel.' });
    return;
  }

  const {
    icon, title, level, target, warmup, videoLink,
    materials, vocabulary, discussionQuestions, speakingLink, modelAnswer,
    writingLink, exitTicket
  } = req.body || {};

  if (!title) {
    res.status(400).json({ error: 'Не указан заголовок урока.' });
    return;
  }

  const children = [];

  if (target) children.push(calloutBlock('🎯', target));

  if (warmup) {
    children.push(...paragraphBlocks(warmup));
    children.push(calloutBlock('✍️', ''));
    children.push(todoBlock('Warm-up done'));
  }

  children.push(...labeledLinkBlock('Video task (Twee):', videoLink));
  children.push(todoBlock('Video task done'));

  const art = materials && materials.article;
  const vid = materials && materials.video;
  const artVocab = (vocabulary && vocabulary.article) || [];
  const vidVocab = (vocabulary && vocabulary.video) || [];

  if (art) {
    children.push(bookmarkBlock(art.url));
    if (art.summary) children.push(...paragraphBlocks(art.summary));
    if (artVocab.length) {
      children.push(...bulletedList(artVocab.map(v => `${v.word} — ${v.definition} ("${v.example_from_material}")`)));
    }
    children.push(todoBlock('Reading done'));
  }

  if (vid) {
    children.push(bookmarkBlock(vid.url));
    if (vid.summary) children.push(...paragraphBlocks(vid.summary));
    if (vidVocab.length) {
      children.push(...bulletedList(vidVocab.map(v => `${v.word} — ${v.definition} ("${v.example_from_material}")`)));
    }
    children.push(todoBlock('Video done'));
  }

  const allWords = [...new Set([...artVocab, ...vidVocab].map(v => v.word).filter(Boolean))];
  if (allWords.length) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'For Twee: ' }, annotations: { italic: true } },
          { type: 'text', text: { content: allWords.join(', ') } }
        ]
      }
    });
  }

  if (writingLink) {
    children.push(bookmarkBlock(writingLink));
    children.push(todoBlock('Writing done'));
  }

  if (speakingLink || (Array.isArray(discussionQuestions) && discussionQuestions.length)) {
    if (speakingLink) children.push(bookmarkBlock(speakingLink));
    if (Array.isArray(discussionQuestions) && discussionQuestions.length) {
      children.push(...bulletedList(discussionQuestions));
    }
    children.push(todoBlock('Discussion done'));
  }

  children.push(...labeledLinkBlock('Model answer (video):', modelAnswer));

  if (Array.isArray(exitTicket) && exitTicket.length) {
    children.push(dividerBlock());
    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ type: 'text', text: { content: 'Exit ticket' } }] }
    });
    for (const q of exitTicket) {
      children.push(...paragraphBlocks(q));
      children.push(calloutBlock('✍️', ''));
    }
    children.push(todoBlock('Exit ticket done'));
  }

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
      res.status(notionRes.status).json({ error: data.message || 'Notion API вернул ошибку.' });
      return;
    }

    res.status(200).json({ url: data.url, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось связаться с Notion API.' });
  }
};
