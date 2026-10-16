// Pure planning logic for the daily set delivery. No network, no Notion, no email:
// it takes plain data and returns what WOULD be sent and what would be updated.
// That makes it safe to test and to run in dry-run mode.

const LOW_THRESHOLD = 2; // "Running low" when this many sets (or fewer) are left in the queue

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Oldest created day first; inside the same day (a batch) by Order, empty Order last;
// then by exact creation time.
function compareSets(a, b) {
  const da = (a.created || '').slice(0, 10), db = (b.created || '').slice(0, 10);
  if (da !== db) return da < db ? -1 : 1;
  const oa = a.order == null ? Infinity : a.order, ob = b.order == null ? Infinity : b.order;
  if (oa !== ob) return oa - ob;
  return (a.created || '') < (b.created || '') ? -1 : (a.created || '') > (b.created || '') ? 1 : 0;
}

function planDelivery({ today, students, subscriptions, sets }) {
  const studentById = new Map(students.map(s => [s.id, s]));
  const sentTo = new Map(sets.map(s => [s.id, new Set(s.sentTo || [])]));
  const emails = new Map(); // studentId -> email plan
  const updates = [];
  const skipped = [];

  function addItem(student, item) {
    if (!emails.has(student.id)) {
      emails.set(student.id, { studentId: student.id, name: student.name, to: student.email, items: [] });
    }
    emails.get(student.id).items.push(item);
  }

  function sendable(student) {
    if (!student) return 'student not found';
    if (student.archived) return 'student archived';
    if (student.unsubscribed) return 'student unsubscribed';
    if (!student.email) return 'no email';
    return null;
  }

  // 1. Personal sets: go out at the next run, regardless of rhythm; they don't move Next send.
  for (const set of sets) {
    if (!set.sendByEmail || (set.trackIds || []).length) continue;
    if ((set.assignedTo || []).length !== 1) continue;
    const student = studentById.get(set.assignedTo[0]);
    if (sentTo.get(set.id).has(set.assignedTo[0])) continue;
    const why = sendable(student);
    if (why) { skipped.push({ kind: 'personal', setId: set.id, title: set.title, reason: why }); continue; }
    addItem(student, { kind: 'personal', setId: set.id, title: set.title, url: set.url });
    sentTo.get(set.id).add(student.id);
  }

  // 2. Track subscriptions.
  for (const sub of subscriptions) {
    const student = studentById.get(sub.studentId);
    const label = { subscriptionId: sub.id, student: student && student.name };
    const queue = sets
      .filter(s => (s.trackIds || []).includes(sub.trackId) && !sentTo.get(s.id).has(sub.studentId))
      .sort(compareSets);
    const inQueue = queue.length;

    let reason = null;
    if (sub.pause) reason = 'paused';
    else if (sub.status === 'Unsubscribed' || sub.status === 'Email bounced') reason = sub.status;
    else reason = sendable(student);
    if (reason) {
      const status = sub.pause ? 'Paused' : sub.status;
      updates.push({ subscriptionId: sub.id, inQueue, ...(status ? { status } : {}) });
      skipped.push({ ...label, reason });
      continue;
    }
    if (sub.start && sub.start > today) { skipped.push({ ...label, reason: 'not started yet' }); continue; }
    if (sub.nextSend && sub.nextSend > today) {
      updates.push({ subscriptionId: sub.id, inQueue, status: inQueue <= LOW_THRESHOLD ? 'Running low' : 'Active' });
      skipped.push({ ...label, reason: 'not due until ' + sub.nextSend });
      continue;
    }
    if (!inQueue) {
      updates.push({ subscriptionId: sub.id, inQueue: 0, status: 'Running low' });
      skipped.push({ ...label, reason: 'queue empty' });
      continue;
    }

    const set = queue[0];
    addItem(student, { kind: 'track', setId: set.id, title: set.title, url: set.url, subscriptionId: sub.id });
    sentTo.get(set.id).add(student.id);
    const left = inQueue - 1;
    updates.push({
      subscriptionId: sub.id,
      lastSent: today,
      nextSend: addDays(today, Math.max(1, sub.rhythm || 1)),
      inQueue: left,
      status: left <= LOW_THRESHOLD ? 'Running low' : 'Active'
    });
  }

  return { emails: [...emails.values()], updates, skipped };
}

module.exports = { planDelivery, compareSets, addDays, LOW_THRESHOLD };
