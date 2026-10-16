// Builds and sends the "your set is ready" email through Resend.
const FROM = process.env.SET_EMAIL_FROM || 'Anna | WeTalk <sets@mail.wetalktodevelop.com>';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildEmail({ name, items, pageUrl, unsubscribeUrl }) {
  const single = items.length === 1;
  const subject = single ? `Your new set is ready: ${items[0].title}` : `Your new sets are ready (${items.length})`;
  const button = (href, label) =>
    `<a href="${esc(href)}" style="display:inline-block;background:#1F6F5B;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:10px;font-size:16px">${esc(label)}</a>`;
  const body = single
    ? `<p style="font-size:16px;line-height:1.6">Your next practice set is ready: <b>${esc(items[0].title)}</b>.</p><p>${button(items[0].url, "Open today's set")}</p>`
    : `<p style="font-size:16px;line-height:1.6">Your new practice sets are ready:</p>` +
      items.map(i => `<p style="margin:10px 0">${button(i.url, i.title)}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#EFEDE6;font-family:Arial,Helvetica,sans-serif;color:#1E2321">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:16px;padding:32px">
<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px">Hi, ${esc(name || 'there')}</h1>
${body}
<p style="font-size:15px;line-height:1.6;color:#5F6662;margin-top:24px">Want to repeat an earlier one? <a href="${esc(pageUrl)}" style="color:#1F6F5B">See all my sets</a></p>
</div>
<p style="font-size:13px;line-height:1.5;color:#5F6662">You get this email because you signed up for practice sets. <a href="${esc(unsubscribeUrl)}" style="color:#1F6F5B">Unsubscribe</a><br>Anna | WeTalk</p>
</div></body></html>`;
  const textLines = single
    ? [`Hi, ${name || 'there'}`, '', `Your next practice set is ready: ${items[0].title}`, items[0].url]
    : [`Hi, ${name || 'there'}`, '', 'Your new practice sets are ready:', ...items.map(i => `${i.title}: ${i.url}`)];
  const text = [...textLines, '', `See all my sets: ${pageUrl}`, '', `Unsubscribe: ${unsubscribeUrl}`].join('\n');
  return { subject, html, text };
}

async function sendEmail({ to, subject, html, text, unsubscribeUrl }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM, to: [to], subject, html, text,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data.id;
}

module.exports = { buildEmail, sendEmail };
