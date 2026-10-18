// Pure planning logic for the daily set delivery. No network, no Notion, no email:
// it takes plain data and returns what WOULD be sent and what would be updated.
// That makes it safe to test and to run in dry-run mode.

const LOW_THRESHOLD = 2; // "Running low" when this many sets (or fewer) are left in the queue

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Queue order inside a track: sets with an Order number go first, by Order (so a set numbered 4.5
// slots in between 4 and 5, even if it was created later); sets without Order follow, oldest first.
function compareSets(a, b) {
  const oa = a.order == null ? Infinity : a.order, ob = b.order == null ? Infinity : b.order;
  if (oa !== ob) return oa < ob ? -1 : 1;
  return (a.created || '') < (b.created || '') ? -1 : (a.created || '') > (b.created || '') ? 1 : 0;
}

function planDelivery({ today, students, subscriptions, sets }) {
  const studentById = new Map(students.map(s => [s.id, s]));
  const sentTo = new Map(sets.map(s => [s.id, new Set(s.sentTo || [])]));
  const setById = new Map(sets.map(s => [s.id, s]));
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

  // 1. Personal sets: Send by email + Assigned to (one or several students). Works with or without a Track:
  // a set that sits in a track can still be sent to chosen students; they are then marked in Sent to, so a track
  // subscription will not send it to them again.
  // Each assigned student gets it at the next run, regardless of rhythm; this never moves Next send.
  for (const set of sets) {
    if (!set.sendByEmail) continue;
    for (const studentId of set.assignedTo || []) {
      if (sentTo.get(set.id).has(studentId)) continue;
      const student = studentById.get(studentId);
      const why = sendable(student);
      if (why) { skipped.push({ kind: 'personal', setId: set.id, title: set.title, student: student && student.name, reason: why }); continue; }
      addItem(student, { kind: 'personal', setId: set.id, title: set.title, url: set.url, label: set.label });
      sentTo.get(set.id).add(student.id);
    }
  }

  // 1b. "To send": sets picked on the student card, any set from the library.
  for (const student of students) {
    for (const setId of student.toSend || []) {
      const set = setById.get(setId);
      if (!set || sentTo.get(set.id).has(student.id)) continue;
      const why = sendable(student);
      if (why) { skipped.push({ kind: 'to-send', setId, title: set.title, student: student.name, reason: why }); continue; }
      addItem(student, { kind: 'personal', setId: set.id, title: set.title, url: set.url, label: set.label });
      sentTo.get(set.id).add(student.id);
    }
  }

  // A personal send of a set that belongs to the student's track counts as a track send:
  // the rhythm restarts from today and the track does not send another set today.
  const counted = new Set();
  const delivered = new Set();
  for (const e of emails.values()) for (const it of e.items) delivered.add(e.studentId + '|' + it.setId);
  for (const sub of subscriptions) {
    for (const set of sets) {
      if ((set.trackIds || []).includes(sub.trackId) && delivered.has(sub.studentId + '|' + set.id)) { counted.add(sub.id); break; }
    }
  }
  // Tie the subscription to one of its personal items so a failed email does not move the schedule.
  for (const sub of subscriptions) {
    if (!counted.has(sub.id)) continue;
    const e = emails.get(sub.studentId);
    const item = e && e.items.find(it => { const st = setById.get(it.setId); return st && (st.trackIds || []).includes(sub.trackId); });
    if (item) item.subscriptionId = sub.id;
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
    if (counted.has(sub.id)) {
      updates.push({
        subscriptionId: sub.id, lastSent: today, nextSend: addDays(today, Math.max(1, sub.rhythm || 1)),
        inQueue, status: inQueue <= LOW_THRESHOLD ? 'Running low' : 'Active'
      });
      skipped.push({ ...label, reason: 'a set of this track was sent personally today' });
      continue;
    }
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
    addItem(student, { kind: 'track', setId: set.id, title: set.title, url: set.url, label: set.label, subscriptionId: sub.id });
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

  // 3. "Next set" for every subscription (also paused ones): the first set of the track the student has neither
  // received nor been given personally. Shown on the student card.
  for (const sub of subscriptions) {
    const next = sets
      .filter(s => (s.trackIds || []).includes(sub.trackId)
        && !sentTo.get(s.id).has(sub.studentId)
        && !(s.assignedTo || []).includes(sub.studentId))
      .sort(compareSets)[0];
    const nextSetId = next ? next.id : null;
    const existing = updates.find(u => u.subscriptionId === sub.id);
    if (existing) existing.nextSetId = nextSetId;
    else updates.push({ subscriptionId: sub.id, nextSetId });
  }

  return { emails: [...emails.values()], updates, skipped };
}

module.exports = { planDelivery, compareSets, addDays, LOW_THRESHOLD };
