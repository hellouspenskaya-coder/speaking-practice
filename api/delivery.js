// Single entry point for the set delivery (Vercel Hobby allows only 12 serverless functions).
//   /api/delivery?action=send          daily delivery (cron or manual, needs CRON_SECRET)
//   /api/delivery?action=page          student page data
//   /api/delivery?action=unsubscribe   one-click unsubscribe
const send = require('../lib/set-delivery/send');
const page = require('../lib/set-delivery/page');
const unsubscribe = require('../lib/set-delivery/unsubscribe');
const backfill = require('../lib/set-delivery/backfill');

module.exports = async (req, res) => {
  const action = (req.query && req.query.action) || '';
  if (action === 'send') return send(req, res);
  if (action === 'page') return page(req, res);
  if (action === 'unsubscribe') return unsubscribe(req, res);
  if (action === 'backfill') return backfill(req, res);
  return res.status(404).json({ error: 'Not found' });
};
module.exports.config = { maxDuration: 60 };
