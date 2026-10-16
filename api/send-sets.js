// Daily set delivery. Called by Vercel Cron once a day (or by hand).
//
//   Dry run (default): reads Notion, shows who WOULD get what. Sends nothing, writes nothing.
//   Live: only when the env var SET_DELIVERY_LIVE is exactly "true".
//
// Env: NOTION_TOKEN, NOTION_ASSIGNMENTS_DATABASE_ID, RESEND_API_KEY, CRON_SECRET,
//      SITE_URL (e.g. https://speaking-practice-ruby.vercel.app), SET_DELIVERY_LIVE (optional)
// Manual run in a browser: /api/send-sets?key=<CRON_SECRET>

const crypto = require('crypto');
const { planDelivery } = require('../lib/set-delivery/plan');
const { loadData, setSentTo, logDelivery, updateSubscription, setAccessCode } = require('../lib/set-delivery/notion');
const { buildEmail, sendEmail } = require('../lib/set-delivery/email');

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius' }).format(new Date()); // YYYY-MM-DD

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.authorization || '').replace(/^Bearer /, '') || (req.query && req.query.key);
  if (!secret || given !== secret) return res.status(401).json({ error: 'Unauthorized' });

  const live = process.env.SET_DELIVERY_LIVE === 'true';
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  try {
    const data = await loadData();
    const plan = planDelivery({ today: today(), ...data });

    if (!live) {
      return res.status(200).json({
        mode: 'dry-run (nothing sent, nothing written)',
        today: today(),
        wouldSend: plan.emails.map(e => ({ to: e.to, name: e.name, sets: e.items.map(i => `${i.title} [${i.kind}]`) })),
        subscriptionUpdates: plan.updates,
        skipped: plan.skipped
      });
    }

    const studentById = new Map(data.students.map(s => [s.id, s]));
    const setById = new Map(data.sets.map(s => [s.id, s]));
    const sent = [], failed = [];

    for (const email of plan.emails) {
      const student = studentById.get(email.studentId);
      try {
        let code = student.accessCode;
        if (!code) { code = crypto.randomBytes(9).toString('base64url'); await setAccessCode(student.id, code); }
        const q = `s=${encodeURIComponent(student.id)}&c=${encodeURIComponent(code)}`;
        const pageUrl = `${site}/my-sets.html?${q}`;
        const unsubscribeUrl = `${site}/api/unsubscribe?${q}`;
        const msg = buildEmail({ name: student.name, items: email.items, pageUrl, unsubscribeUrl });
        await sendEmail({ to: email.to, ...msg, unsubscribeUrl });
        // Record immediately, so a later error can never cause a second email for the same set.
        for (const item of email.items) {
          const set = setById.get(item.setId);
          const ids = [...new Set([...(set.sentTo || []), student.id])];
          set.sentTo = ids;
          await setSentTo(item.setId, ids);
          try { await logDelivery({ studentId: student.id, set: { ...set, label: item.label }, today: today() }); } catch (e) { /* the email already went out; the log is secondary */ }
        }
        sent.push(email.to);
      } catch (e) {
        failed.push({ to: email.to, error: e.message });
      }
    }

    const failedStudents = new Set(failed.map(f => f.to));
    const okSubs = new Set(plan.emails.filter(e => !failedStudents.has(e.to)).flatMap(e => e.items.map(i => i.subscriptionId)).filter(Boolean));
    for (const u of plan.updates) {
      const isSend = !!u.lastSent;
      if (isSend && !okSubs.has(u.subscriptionId)) continue; // don't advance the schedule if the email failed
      await updateSubscription(u);
    }
    return res.status(200).json({ mode: 'live', sent, failed });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
module.exports.config = { maxDuration: 60 };
