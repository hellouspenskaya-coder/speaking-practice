// Student page data: /api/delivery?action=page&s=<student id>&c=<access code>
// Returns ONLY that student's own deliveries. Nothing else from Notion is exposed.
const { studentPageData } = require('./notion');

module.exports = async (req, res) => {
  const { s, c } = req.query || {};
  res.setHeader('Cache-Control', 'no-store');
  if (!s || !c) return res.status(400).json({ error: 'Invalid link' });
  try {
    const data = await studentPageData(s, c);
    if (!data) return res.status(403).json({ error: 'Invalid link' });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(404).json({ error: 'Invalid link' });
  }
};
