// Receives recorded audio from the browser, sends it to Groq's Whisper API
// for transcription, and returns plain text. The GROQ_API_KEY never reaches
// the browser — it lives only in Vercel's environment variables.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.SITE_ACCESS_KEY && req.headers['x-access-key'] !== process.env.SITE_ACCESS_KEY) {
    res.status(401).json({ error: 'Invalid or missing access key' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);

    if (!audioBuffer.length) {
      res.status(400).json({ error: 'No audio received' });
      return;
    }

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'answer.webm');
    formData.append('model', 'whisper-large-v3-turbo');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const details = await groqRes.text();
      res.status(502).json({ error: 'Transcription failed', details });
      return;
    }

    const data = await groqRes.json();
    res.status(200).json({ text: (data.text || '').trim() });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
};
