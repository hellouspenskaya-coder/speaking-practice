// One-time helper: mark everyone in "Assigned to" as already having received the set ("Sent to").
// Preview:  /api/delivery?action=backfill&key=<CRON_SECRET>
// Apply:    /api/delivery?action=backfill&key=<CRON_SECRET>&apply=1
const { queryAll, fullRelation, setSentTo, IDS } = require('./notion');

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.authorization || '').replace(/^Bearer /, '') || (req.query && req.query.key);
  if (!secret || given !== secret) return res.status(401).json({ error: 'Unauthorized' });
  const apply = req.query && req.query.apply === '1';
  try {
    const pages = await queryAll(IDS.assignments(), { property: 'Assigned to', relation: { is_not_empty: true } });
    const changes = [];
    for (const p of pages) {
      const assigned = await fullRelation(p, 'Assigned to');
      const sent = await fullRelation(p, 'Sent to');
      const merged = [...new Set([...sent, ...assigned])];
      if (merged.length === sent.length) continue;
      changes.push({ id: p.id, added: merged.length - sent.length, merged });
    }
    if (apply) for (const c of changes) await setSentTo(c.id, c.merged);
    return res.status(200).json({ mode: apply ? 'applied' : 'preview', checked: pages.length, sets_to_update: changes.length,
      students_marked: changes.reduce((n, c) => n + c.added, 0) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
