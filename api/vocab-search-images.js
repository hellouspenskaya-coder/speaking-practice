// Returns up to 4 candidate images for a query, via Pexels.
// Requires PEXELS_API_KEY in Vercel env vars (free tier: pexels.com/api).

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Use GET' });
    return;
  }

  const query = (req.query.query || '').toString().trim();
  if (!query) {
    res.status(400).json({ error: 'Missing query parameter' });
    return;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'PEXELS_API_KEY is not set in Vercel environment variables' });
    return;
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=4&orientation=square`;
    const response = await fetch(url, {
      headers: { Authorization: apiKey }
    });

    if (!response.ok) {
      res.status(502).json({ error: `Pexels error ${response.status}` });
      return;
    }

    const data = await response.json();
    const images = (data.photos || []).map((p) => ({
      thumb: p.src.medium,
      full: p.src.large,
      alt: p.alt || query,
      photographer: p.photographer,
      pexelsUrl: p.url
    }));

    res.status(200).json({ images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
