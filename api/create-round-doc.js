const { google } = require('googleapis');

// Creates a Google Doc with one heading per round (Round 1 / Round 2 / Round 3)
// and the questions listed under each. Headings mean the doc gets an
// automatic outline in the sidebar, so students can jump straight to their
// round without scrolling. Meant to be pasted as one link into Zoom chat.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const shareWith = process.env.GOOGLE_SHARE_WITH_EMAIL;

  if (!keyJson) {
    res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY is not configured in Vercel.' });
    return;
  }
  if (!shareWith) {
    res.status(500).json({ error: 'GOOGLE_SHARE_WITH_EMAIL is not configured in Vercel — without it the doc would be created but you would never see it.' });
    return;
  }

  const { title, rounds } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'No lesson title specified.' });
    return;
  }
  if (!Array.isArray(rounds) || !rounds.length) {
    res.status(400).json({ error: 'No question rounds to put in the doc.' });
    return;
  }

  let credentials;
  try {
    credentials = JSON.parse(keyJson);
  } catch (e) {
    res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON — check what was pasted into Vercel.' });
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
    const authClient = await auth.getClient();
    const docs = google.docs({ version: 'v1', auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    const doc = await docs.documents.create({ requestBody: { title: `${title} — Discussion Rounds` } });
    const documentId = doc.data.documentId;

    // Build the whole doc as one batch: for each round, a HEADING_1 line
    // followed by the questions as separate paragraphs. Inserting text at
    // index 1 repeatedly and reversing the round order at the end gives the
    // simplest correct result without tracking running offsets by hand.
    const requests = [];
    [...rounds].reverse().forEach((round, ri) => {
      const roundNumber = rounds.length - ri;
      const questionsText = round.map(q => `${q}\n`).join('');
      const headingText = `Round ${roundNumber}\n`;
      const blockText = headingText + questionsText + '\n';

      requests.push({ insertText: { location: { index: 1 }, text: blockText } });
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: 1, endIndex: 1 + headingText.length },
          paragraphStyle: { namedStyleType: 'HEADING_1' },
          fields: 'namedStyleType'
        }
      });
    });

    if (requests.length) {
      await docs.documents.batchUpdate({ documentId, requestBody: { requests } });
    }

    await drive.permissions.create({
      fileId: documentId,
      sendNotificationEmail: false,
      requestBody: { type: 'user', role: 'writer', emailAddress: shareWith }
    });
    // Anyone with the link can view — this doc is meant to be pasted into
    // Zoom chat for the whole group, not shared person-by-person.
    await drive.permissions.create({
      fileId: documentId,
      sendNotificationEmail: false,
      requestBody: { type: 'anyone', role: 'reader' }
    });

    res.status(200).json({ url: `https://docs.google.com/document/d/${documentId}/edit` });
  } catch (err) {
    res.status(500).json({ error: 'Could not create the doc: ' + (err.message || 'unknown error') });
  }
};
