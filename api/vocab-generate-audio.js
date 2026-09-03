// Converts a sentence to speech via Groq's Orpheus TTS and returns it
// as a base64 data URL, so the builder can embed it straight into the
// word-set JSON without needing separate file storage.
// Requires GROQ_API_KEY (already set for Whisper transcription).
// Note: the orpheus-v1-english model terms must be accepted once on
// console.groq.com/playground before this will work.

const VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const { text, voice } = req.body || {};
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  const chosenVoice = VOICES.includes(voice) ? voice : 'hannah';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'canopylabs/orpheus-v1-english',
        voice: chosenVoice,
        input: text,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Groq TTS error ${response.status}: ${errText}` });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64}`;

    res.status(200).json({ audio: dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.config = { maxDuration: 30 };
