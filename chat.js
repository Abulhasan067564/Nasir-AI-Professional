import { answerWithGemini } from '../lib/gemini.js';
import { clientKey, rateLimit } from '../lib/rate-limit.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'শুধু POST request গ্রহণ করা হয়।', code: 'METHOD_NOT_ALLOWED' });
  }
  const limit = rateLimit(`vercel:${clientKey(req)}`);
  res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
    return res.status(429).json({ error: 'অনেকগুলো প্রশ্ন করা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।', code: 'RATE_LIMITED' });
  }
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await answerWithGemini(body);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) console.error('[Nasir AI API]', error?.code || 'SERVER_ERROR', error?.message || 'Unknown error');
    return res.status(status).json({ error: error?.message || 'একটি অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করুন।', code: error?.code || 'SERVER_ERROR' });
  }
}
