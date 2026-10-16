// One-click unsubscribe. Link in every email: /api/unsubscribe?s=<student page id>&c=<access code>
const { notion, queryAll, IDS, updateSubscription } = require('../lib/set-delivery/notion');

const page = msg => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anna | WeTalk</title>
<body style="margin:0;background:#F7F5F0;font-family:Arial,sans-serif;color:#1E2321"><div style="max-width:480px;margin:15vh auto;padding:24px"><h1 style="font-family:Georgia,serif">${msg}</h1></div></body>`;

module.exports = async (req, res) => {
  const { s, c } = req.query || {};
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    if (!s || !c) return res.status(400).send(page('This link is not valid.'));
    const student = await notion(`/pages/${s}`);
    const code = ((student.properties['Access code'] || {}).rich_text || []).map(t => t.plain_text).join('');
    if (!code || code !== c) return res.status(403).send(page('This link is not valid.'));
    await notion(`/pages/${s}`, { method: 'PATCH', body: JSON.stringify({ properties: { Unsubscribed: { checkbox: true } } }) });
    const subs = await queryAll(IDS.subscriptions(), { property: 'Student', relation: { contains: s } });
    for (const sub of subs) await updateSubscription({ subscriptionId: sub.id, status: 'Unsubscribed' });
    return res.status(200).send(page('You are unsubscribed. No more emails.'));
  } catch (e) {
    return res.status(500).send(page('Something went wrong. Please message Anna.'));
  }
};
