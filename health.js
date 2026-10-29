import { isAiConfigured } from '../lib/gemini.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ name: 'Nasir AI', status: 'ok', configured: isAiConfigured(), model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', mode: 'server-side Gemini API' });
}
