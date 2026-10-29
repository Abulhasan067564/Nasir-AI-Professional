import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerWithGemini, isAiConfigured } from './lib/gemini.js';
import { clientKey, rateLimit } from './lib/rate-limit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'public');

// Load a local .env file without adding a runtime dependency. Hosting providers
// supply environment variables directly, so existing values are never replaced.
try {
  const envText = await readFile(path.join(__dirname, '.env'), 'utf8');
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
} catch { /* A .env file is optional on hosted deployments. */ }

const port = Number(process.env.PORT || 3000);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon', '.json':'application/json; charset=utf-8' };

function json(res, status, payload, extra = {}) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...extra });
  res.end(JSON.stringify(payload));
}
async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString('utf8');
    if (body.length > 100_000) throw Object.assign(new Error('Request body is too large.'), { statusCode:413, code:'BODY_TOO_LARGE' });
  }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { statusCode:400, code:'INVALID_JSON' }); }
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { name:'Nasir AI', status:'ok', configured:isAiConfigured(), model:process.env.GEMINI_MODEL || 'gemini-3.8-flash', mode:'server-side Gemini API' });
    }
    if (url.pathname === '/api/chat') {
      if (req.method !== 'POST') return json(res, 405, { error:'শুধু POST request গ্রহণ করা হয়।', code:'METHOD_NOT_ALLOWED' }, { Allow:'POST' });
      const limit = rateLimit(`node:${clientKey(req)}`);
      if (!limit.allowed) return json(res, 429, { error:'অনেকগুলো প্রশ্ন করা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।', code:'RATE_LIMITED' }, { 'Retry-After':String(Math.ceil(limit.retryAfterMs/1000)) });
      const body = await readBody(req);
      const result = await answerWithGemini(body);
      return json(res, 200, { ok:true, ...result });
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error:'API route পাওয়া যায়নি।', code:'NOT_FOUND' });
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.resolve(root, `.${requested}`);
    if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root,'index.html')) return json(res, 403, { error:'Forbidden' });
    let content;
    try { content = await readFile(filePath); }
    catch {
      if (!path.extname(requested)) content = await readFile(path.join(root,'index.html'));
      else return json(res, 404, { error:'File not found' });
    }
    const ext = path.extname(path.resolve(filePath));
    res.writeHead(200, { 'Content-Type':mime[ext] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(content);
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) console.error('[Nasir AI server]', error?.code || 'SERVER_ERROR', error?.message || 'Unknown error');
    json(res, status, { error:error?.message || 'একটি অপ্রত্যাশিত সমস্যা হয়েছে।', code:error?.code || 'SERVER_ERROR' });
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Nasir AI listening on port ${port} — Gemini configured: ${isAiConfigured()}`));
