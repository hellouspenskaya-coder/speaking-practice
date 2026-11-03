// Builds and sends the "your set is ready" email through Resend.
const FROM = process.env.SET_EMAIL_FROM || 'Anna | WeTalk <sets@mail.wetalktodevelop.com>';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A story game or a course part has a Voc Practice set made from its words: story-game.html?set=<slug>[&part=N] -> vocab-trainer.html?set=<slug>-words[-N].
// Returns '' for any other kind of link.
function wordsUrl(setUrl) {
  try {
    const u = new URL(setUrl);
    if (!/\/story-game\.html$/.test(u.pathname)) return '';
    const slug = u.searchParams.get('set'), part = u.searchParams.get('part');
    if (!slug) return '';
    return `${u.origin}/vocab-trainer.html?set=${encodeURIComponent(slug + (part ? '-words-' + part : '-words'))}`;
  } catch (e) { return ''; }
}

function buildEmail({ name, items, pageUrl, unsubscribeUrl, earlier = [] }) {
  const single = items.length === 1;
  const wordsLine = i => { const w = wordsUrl(i.url); return w ? `<p style="margin:6px 0 14px;font-size:15px;line-height:1.6;color:#5F6662">Only the words? <a href="${esc(w)}" style="color:#1F6F5B">Practise them without the game</a>.</p>` : ''; };
  const subject = single ? `Your new set is ready: ${items[0].title}` : `Your new sets are ready (${items.length})`;
  const button = (href, label) =>
    `<a href="${esc(href)}" style="display:inline-block;background:#1F6F5B;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:10px;font-size:16px">${esc(label)}</a>`;
  const body = single
    ? `<p style="font-size:16px;line-height:1.6">Your next practice set is ready: <b>${esc(items[0].title)}</b>.</p><p>${button(items[0].url, 'Open this set')}</p>${wordsLine(items[0])}`
    : `<p style="font-size:16px;line-height:1.6">Your new practice sets are ready:</p>` +
      items.map(i => `<p style="margin:10px 0">${button(i.url, i.title)}</p>${wordsLine(i)}`).join('');
  const earlierHtml = earlier.length
    ? `<p style="font-size:15px;line-height:1.6;color:#5F6662;margin:28px 0 6px">Earlier sets:</p><ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7">${earlier.map(e => `<li><a href="${esc(e.url)}" style="color:#1F6F5B">${esc(e.title)}</a></li>`).join('')}</ul>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#EFEDE6;font-family:Arial,Helvetica,sans-serif;color:#1E2321">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:16px;padding:32px">
<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px">Hi, ${esc(name || 'there')}</h1>
${body}
${earlierHtml}
<p style="margin:28px 0 8px;font-size:15px;line-height:1.6;color:#5F6662">All your sets are on one page. Bookmark it, so you can find them any time:</p>
<p style="margin:0">${button(pageUrl, 'All my sets')}</p>
</div>
<p style="font-size:13px;line-height:1.5;color:#5F6662">You get this email because you signed up for practice sets. <a href="${esc(unsubscribeUrl)}" style="color:#1F6F5B">Unsubscribe</a><br>Anna | WeTalk</p>
</div></body></html>`;
  const wText = i => { const w = wordsUrl(i.url); return w ? `Only the words? Practise them without the game: ${w}` : null; };
  const textLines = single
    ? [`Hi, ${name || 'there'}`, '', `Your next practice set is ready: ${items[0].title}`, items[0].url, ...(wText(items[0]) ? ['', wText(items[0])] : [])]
    : [`Hi, ${name || 'there'}`, '', 'Your new practice sets are ready:', ...items.flatMap(i => [`${i.title}: ${i.url}`, ...(wText(i) ? [wText(i)] : [])])];
  const earlierText = earlier.length ? ['', 'Earlier sets:', ...earlier.map(e => `- ${e.title}: ${e.url}`)] : [];
  const text = [...textLines, ...earlierText, '', `All my sets (bookmark this page): ${pageUrl}`, '', `Unsubscribe: ${unsubscribeUrl}`].join('\n');
  return { subject, html, text };
}

async function sendEmail({ to, subject, html, text, unsubscribeUrl }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM, to: [to], subject, html, text,
      ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {})
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data.id;
}

// Short note to Anna when a subscription is about to run out of sets.
function buildAlertEmail(alerts) {
  const line = a => a.empty
    ? `${a.title}: no sets left. Nothing will be sent until you add more.`
    : `${a.title}: ${a.left} set${a.left === 1 ? '' : 's'} left.`;
  const subject = alerts.some(a => a.empty) ? 'Sets have run out for a student' : 'A student is running low on sets';
  const text = ['Time to add sets to a track:', '', ...alerts.map(line)].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1E2321"><p>Time to add sets to a track:</p><ul>${alerts.map(a => `<li>${esc(line(a))}</li>`).join('')}</ul></div>`;
  return { subject, html, text };
}

module.exports = { buildEmail, buildAlertEmail, sendEmail, wordsUrl };
