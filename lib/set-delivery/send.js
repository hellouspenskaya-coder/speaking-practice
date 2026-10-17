// Daily set delivery. Called by Vercel Cron once a day (or by hand).
//
//   Dry run (default): reads Notion, shows who WOULD get what. Sends nothing, writes nothing.
//   Live: only when the env var SET_DELIVERY_LIVE is exactly "true".
//
// Env: NOTION_TOKEN, NOTION_ASSIGNMENTS_DATABASE_ID, RESEND_API_KEY, CRON_SECRET,
//      SITE_URL (e.g. https://speaking-practice-ruby.vercel.app), SET_DELIVERY_LIVE (optional)
// Manual run in a browser: /api/delivery?action=send&key=<CRON_SECRET>

const crypto = require('crypto');
const { planDelivery } = require('./plan');
const { firstName, loadData, setSentTo, logDelivery, updateSubscription, setAccessCode, notion, fullRelation } = require('./notion');
const { buildEmail, buildAlertEmail, sendEmail } = require('./email');

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
      // Guard against two runs at the same time (e.g. a button opened twice): read "Sent to" again just before
      // sending and claim each set for this student first. A second run then finds it already claimed.
      const claimed = [];
      for (const item of email.items) {
        const page = await notion(`/pages/${item.setId}`);
        const fresh = await fullRelation(page, 'Sent to');
        if (fresh.includes(student.id)) continue; // another run already took it
        await setSentTo(item.setId, [...new Set([...fresh, student.id])]);
        claimed.push(item);
      }
      if (!claimed.length) continue;
      email.items = claimed;
      let emailWentOut = false;
      try {
        const isNewCode = !student.accessCode;
        const code = student.accessCode || crypto.randomBytes(9).toString('base64url');
        const q = `s=${encodeURIComponent(student.id)}&c=${encodeURIComponent(code)}`;
        const pageUrl = `${site}/my-sets.html?${q}`;
        if (isNewCode) await setAccessCode(student.id, code, pageUrl); // also saves the link in Notion for Anna
        const unsubscribeUrl = `${site}/api/delivery?action=unsubscribe&${q}`;
        const msg = buildEmail({ name: firstName(student.name), items: email.items, pageUrl, unsubscribeUrl });
        await sendEmail({ to: email.to, ...msg, unsubscribeUrl });
        emailWentOut = true;
        // "Sent to" was already written when the set was claimed above; now log each delivery.
        for (const item of email.items) {
          const set = setById.get(item.setId);
          try { await logDelivery({ studentId: student.id, set: { ...set, label: item.label }, today: today() }); } catch (e) { /* the email already went out; the log is secondary */ }
        }
        sent.push(email.to);
      } catch (e) {
        failed.push({ to: email.to, error: e.message });
        if (!emailWentOut) { // nothing was sent: give the sets back so tomorrow's run can try again
          for (const item of claimed) {
            try {
              const fresh = await fullRelation(await notion(`/pages/${item.setId}`), 'Sent to');
              await setSentTo(item.setId, fresh.filter(id => id !== student.id));
            } catch (e2) { /* best effort */ }
          }
        }
      }
    }

    const failedStudents = new Set(failed.map(f => f.to));
    const okSubs = new Set(plan.emails.filter(e => !failedStudents.has(e.to)).flatMap(e => e.items.map(i => i.subscriptionId)).filter(Boolean));
    const subById = new Map(data.subscriptions.map(x => [x.id, x]));
    const alerts = [];
    for (const u of plan.updates) {
      const isSend = !!u.lastSent;
      if (isSend && !okSubs.has(u.subscriptionId)) continue; // don't advance the schedule if the email failed
      await updateSubscription(u);
      // Tell Anna once when a queue becomes short, and once when it is empty.
      const before = subById.get(u.subscriptionId);
      if (before && u.status === 'Running low') {
        const empty = u.inQueue === 0 && before.inQueue !== 0;
        const low = u.inQueue > 0 && before.status !== 'Running low';
        if (empty || low) alerts.push({ title: before.title || 'A subscription', left: u.inQueue, empty });
      }
    }
    let alerted = false;
    if (alerts.length && process.env.NOTIFY_EMAIL) {
      try { await sendEmail({ to: process.env.NOTIFY_EMAIL, ...buildAlertEmail(alerts) }); alerted = true; } catch (e) { /* the alert is secondary */ }
    }
    return res.status(200).json({ mode: 'live', sent, failed, alerts: alerts.length, alertEmailSent: alerted });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
