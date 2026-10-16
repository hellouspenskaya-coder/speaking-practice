// Thin Notion reader/writer for the set delivery (Notion API 2022-06-28).
const NOTION = 'https://api.notion.com/v1';

const IDS = {
  assignments: () => process.env.NOTION_ASSIGNMENTS_DATABASE_ID,
  subscriptions: () => process.env.NOTION_SUBSCRIPTIONS_DATABASE_ID || '58adf5894cc548ec99fc09207ca11f27',
  students: () => process.env.NOTION_STUDENTS_DATABASE_ID || 'b012840e32fa47d9b159a5b823c5a256',
  deliveries: () => process.env.NOTION_DELIVERIES_DATABASE_ID || '2de06825f6f4477689586fcd1bc8d3cc'
};

async function notion(path, options = {}) {
  const res = await fetch(NOTION + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status} on ${path}: ${data.message || JSON.stringify(data)}`);
  return data;
}

async function queryAll(databaseId, filter) {
  const pages = [];
  let cursor;
  do {
    const body = { page_size: 100, ...(filter ? { filter } : {}), ...(cursor ? { start_cursor: cursor } : {}) };
    const data = await notion(`/databases/${databaseId}/query`, { method: 'POST', body: JSON.stringify(body) });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return pages;
}

// Relations longer than 25 items come back truncated in a page object; fetch the full list.
async function fullRelation(page, propName) {
  const prop = page.properties[propName];
  if (!prop) return [];
  const ids = (prop.relation || []).map(r => r.id);
  if (!prop.has_more) return ids;
  const all = [];
  let cursor;
  do {
    const q = cursor ? `?start_cursor=${cursor}` : '';
    const data = await notion(`/pages/${page.id}/properties/${prop.id}${q}`);
    all.push(...data.results.map(r => r.relation.id));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return all;
}

const text = p => (p && (p.title || p.rich_text) || []).map(t => t.plain_text).join('');
const date = p => (p && p.date && p.date.start ? p.date.start.slice(0, 10) : null);

function labelFor(types) {
  if (types.includes('text set')) return 'Reading';
  if (types.includes('vocpractice')) return 'Words';
  return 'Set';
}

async function loadData() {
  const [studentPages, subPages, setPages] = await Promise.all([
    queryAll(IDS.students()),
    queryAll(IDS.subscriptions()),
    // only sets that can ever be sent: they have a Track, or are flagged as personal
    queryAll(IDS.assignments(), { or: [
      { property: 'Track', relation: { is_not_empty: true } },
      { property: 'Send by email', checkbox: { equals: true } }
    ] })
  ]);

  const students = studentPages.map(p => ({
    id: p.id,
    name: text(p.properties['Name']),
    email: (p.properties['Email'] || {}).email || '',
    unsubscribed: !!(p.properties['Unsubscribed'] || {}).checkbox,
    archived: !!(p.properties['Archived'] || {}).checkbox,
    accessCode: text(p.properties['Access code'])
  }));

  const subscriptions = subPages.map(p => ({
    id: p.id,
    studentId: ((p.properties['Student'] || {}).relation || [])[0]?.id,
    trackId: ((p.properties['Track'] || {}).relation || [])[0]?.id,
    rhythm: (p.properties['Rhythm'] || {}).number || 1,
    start: date(p.properties['Start']),
    pause: !!(p.properties['Pause'] || {}).checkbox,
    lastSent: date(p.properties['Last sent']),
    nextSend: date(p.properties['Next send']),
    status: ((p.properties['Status'] || {}).select || {}).name || null
  })).filter(s => s.studentId && s.trackId);

  const sets = [];
  for (const p of setPages) {
    sets.push({
      id: p.id,
      title: text(p.properties['Assignment Title']) || 'Untitled set',
      url: (p.properties['URL'] || {}).url || '',
      label: labelFor(((p.properties['Type'] || {}).multi_select || []).map(t => t.name)),
      created: p.created_time,
      order: (p.properties['Order'] || {}).number ?? null,
      trackIds: ((p.properties['Track'] || {}).relation || []).map(r => r.id),
      sendByEmail: !!(p.properties['Send by email'] || {}).checkbox,
      assignedTo: await fullRelation(p, 'Assigned to'),
      sentTo: await fullRelation(p, 'Sent to')
    });
  }
  return { students, subscriptions, sets };
}

async function setSentTo(setId, studentIds) {
  await notion(`/pages/${setId}`, { method: 'PATCH', body: JSON.stringify({
    properties: { 'Sent to': { relation: studentIds.map(id => ({ id })) } }
  }) });
}

async function updateSubscription(u) {
  const props = {};
  if (u.inQueue != null) props['In queue'] = { number: u.inQueue };
  if (u.status) props['Status'] = { select: { name: u.status } };
  if (u.lastSent) props['Last sent'] = { date: { start: u.lastSent } };
  if (u.nextSend) props['Next send'] = { date: { start: u.nextSend } };
  await notion(`/pages/${u.subscriptionId}`, { method: 'PATCH', body: JSON.stringify({ properties: props }) });
}

async function setAccessCode(studentId, code) {
  await notion(`/pages/${studentId}`, { method: 'PATCH', body: JSON.stringify({
    properties: { 'Access code': { rich_text: [{ text: { content: code } }] } }
  }) });
}

// One row per set emailed to a student: feeds the student page and gives Anna a readable history.
async function logDelivery({ studentId, set, today }) {
  await notion('/pages', { method: 'POST', body: JSON.stringify({
    parent: { database_id: IDS.deliveries() },
    properties: {
      Title: { title: [{ text: { content: set.title } }] },
      Student: { relation: [{ id: studentId }] },
      Set: { relation: [{ id: set.id }] },
      Sent: { date: { start: today } },
      URL: { url: set.url || null },
      Label: { select: { name: set.label || 'Set' } }
    }
  }) });
}

// Everything the student page needs. Returns null when the code does not match.
async function studentPageData(studentId, code) {
  const page = await notion(`/pages/${studentId}`);
  const saved = text(page.properties['Access code']);
  if (!saved || saved !== code) return null;
  const rows = await queryAll(IDS.deliveries(), { property: 'Student', relation: { contains: studentId } });
  const deliveries = rows.map(r => ({
    title: text(r.properties['Title']),
    url: (r.properties['URL'] || {}).url || '',
    label: ((r.properties['Label'] || {}).select || {}).name || 'Set',
    sent: date(r.properties['Sent'])
  })).filter(d => d.url).sort((a, b) => (a.sent < b.sent ? 1 : a.sent > b.sent ? -1 : 0));
  return { name: text(page.properties['Name']), deliveries };
}

module.exports = { logDelivery, studentPageData, IDS, notion, queryAll, loadData, setSentTo, updateSubscription, setAccessCode };
