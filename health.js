// Deliberately self-contained: this health endpoint must work even if the chat
// provider is not configured. Keep this handler free of relative imports so a
// Vercel deployment can diagnose routing/runtime separately from Gemini.
export default function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ name: 'Nasir AI', status: 'method_not_allowed' });
    }
    const key = String(process.env.GEMINI_API_KEY || '').trim();
    const configured = Boolean(key && key !== 'PASTE_YOUR_GOOGLE_AI_STUDIO_API_KEY_HERE');
    return res.status(200).json({
      name: 'Nasir AI',
      status: 'ok',
      configured,
      model: String(process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim(),
      mode: 'server-side Gemini API',
      hint: configured ? 'Server is configured. Send a test question to verify Gemini access.' : 'Add GEMINI_API_KEY in the hosting environment variables, then redeploy.'
    });
  } catch (error) {
    console.error('[Nasir AI health]', error?.message || error);
    return res.status(500).json({ name: 'Nasir AI', status: 'error', error: 'Health check failed. Check the Vercel function logs.' });
  }
}
