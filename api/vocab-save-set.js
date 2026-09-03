// Commits a word-set JSON file to vocab-sets/<slug>.json in the repo via
// the GitHub Contents API, so it becomes a live static file at
// /vocab-sets/<slug>.json once Vercel finishes redeploying.
//
// Requires GITHUB_TOKEN in Vercel env vars: a fine-grained Personal
// Access Token, scoped to this one repo, with Contents: Read and write.
// This should be a LONG-LIVED token (e.g. 1 year) since it is used by
// the live app, unlike a short-lived token used for a one-off manual push.

const OWNER = 'hellouspenskaya-coder';
const REPO = 'speaking-practice';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const { slug, data } = req.body || {};
  if (!slug || !data) {
    res.status(400).json({ error: 'Missing slug or data' });
    return;
  }

  const cleanSlug = slug.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!cleanSlug) {
    res.status(400).json({ error: 'slug produced an empty filename' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN is not set in Vercel environment variables' });
    return;
  }

  const path = `vocab-sets/${cleanSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  try {
    // Check if the file already exists, to include its sha on update
    let sha;
    const existing = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    });
    if (existing.ok) {
      const existingData = await existing.json();
      sha = existingData.sha;
    }

    const commitResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: sha ? `Update vocab set: ${cleanSlug}` : `Add vocab set: ${cleanSlug}`,
        content,
        ...(sha ? { sha } : {})
      })
    });

    if (!commitResponse.ok) {
      const errText = await commitResponse.text();
      res.status(502).json({ error: `GitHub error ${commitResponse.status}: ${errText}` });
      return;
    }

    res.status(200).json({
      ok: true,
      path: `/vocab-sets/${cleanSlug}.json`,
      trainerLink: `/vocab-trainer.html?set=${cleanSlug}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.config = { maxDuration: 30 };
