# Nasir AI — প্রফেশনাল চ্যাট ও ভয়েস ওয়েবসাইট

এই প্রজেক্টে আছে:

- Gemini API দিয়ে বাস্তব AI প্রশ্ন–উত্তর (শুধু demo/mock response নয়)
- বাংলা ও ইংরেজি মাইক্রোফোন ইনপুট; বলা শেষ হলে প্রশ্ন স্বয়ংক্রিয়ভাবে পাঠানো
- AI-এর উত্তর browser voice দিয়ে পড়ে শোনানো এবং যেকোনো উত্তরে “শুনুন” বোতাম
- ঐচ্ছিক Google Search grounding ও প্রাপ্ত সূত্রের লিংক
- স্থানীয় chat history, pin/unpin, search, delete, new chat
- responsive desktop/mobile interface এবং light/dark theme
- নিরাপদ server-side API key handling; key frontend-এ রাখা হয় না
- Vercel serverless route এবং Node.js standalone server—দুইটি deployment option

> **গুরুত্বপূর্ণ:** কোড/ওয়েবসাইট তৈরি করা হয়েছে, কিন্তু আপনার নিজের Gemini API key ও hosting-এ environment variable সেট না করা পর্যন্ত live AI উত্তর আসবে না। আমি আপনার Google AI Studio বা hosting account-এ লগইন করে publish করতে পারি না।

## 1. কম্পিউটারে চালানো

1. ZIP extract করুন এবং `Nasir-AI-Professional` ফোল্ডার খুলুন।
2. Node.js 20 বা তার পরের সংস্করণ ইনস্টল করুন।
3. ফোল্ডারে Terminal/PowerShell খুলুন।
4. `.env.example` কপি করে `.env` নাম দিন।
5. `.env` ফাইলে `GEMINI_API_KEY=`-এর পরে Google AI Studio থেকে নেওয়া API key বসান। কোনো quote দরকার নেই।
6. চালান:

```bash
npm start
```

7. Chrome-এ `http://localhost:3000` খুলুন। API health দেখতে `http://localhost:3000/api/health` খুলুন।

এই project runtime-এ আলাদা npm dependency লাগে না; Node.js 20+ এবং network access দরকার। Local server `.env` ফাইল নিজে পড়ে।

## 2. Vercel-এ publish

1. ZIP extract করুন। পুরো project GitHub repository-তে upload করুন; `.env` বা API key কোনো অবস্থায় upload করবেন না।
2. Vercel-এ **Add New → Project** থেকে repository import করুন।
3. Framework Preset: **Other**; Build Command ফাঁকা/none; Output Directory: `public`। `vercel.json`-ও output directory নির্ধারণ করে।
4. Project → **Settings → Environment Variables**-এ যোগ করুন:
   - `GEMINI_API_KEY` = Google AI Studio-তে তৈরি করা secret API key
   - `GEMINI_MODEL` = `gemini-3.8-flash` (ঐচ্ছিক; না দিলেও এই default ব্যবহৃত হবে)
5. Environment variable save করে **Redeploy** করুন। শুধু variable save করলেই পুরোনো deployment বদলায় না; নতুন deployment করতে হবে।
6. প্রকাশিত URL খুলে একটি সাধারণ প্রশ্ন লিখুন এবং মাইক্রোফোন দিয়ে আরেকটি প্রশ্ন করে পরীক্ষা করুন।

Vercel deployment-এ static website `public/` থেকে এবং API `/api/chat`, `/api/health` থেকে চলবে।

## 3. Render-এ publish (Node server)

1. GitHub-এ project upload করুন, `.env` বাদ দিয়ে।
2. Render-এ **New → Web Service** থেকে repository import করুন। `render.yaml`-এ build/start settings রাখা হয়েছে।
3. Render Dashboard → Environment-এ `GEMINI_API_KEY` যোগ করুন এবং value হিসেবে আপনার Google AI Studio API key দিন। `GEMINI_MODEL` সাধারণত `gemini-3.8-flash` থাকবে।
4. Deploy শেষ হলে Render-এর দেওয়া HTTPS URL খুলুন।
5. `/api/health`-এ `configured: true` আছে কি না দেখুন। `configured: false` হলে key environment variable ভুল/অনুপস্থিত।

## 4. API key কোথা থেকে নেবেন

Google AI Studio খুলুন: https://aistudio.google.com/app/apikey

নিজের Google account-এ API key তৈরি করুন। API key-টি private রাখুন—এই চ্যাটে, GitHub-এ, frontend JavaScript-এ বা public screenshot-এ দেবেন না। Key-টি শুধু `.env` (local) অথবা hosting-এর Environment Variables (published site)-এ দিন। Google account-এর API availability, quota, billing policy এবং model access অনুযায়ী ব্যবহার সীমিত বা খরচযুক্ত হতে পারে।

## 5. ভয়েস ব্যবহারের নিয়ম

- প্রকাশিত সাইট অবশ্যই HTTPS-এ খুলুন; `localhost`-এও পরীক্ষা করা যায়।
- Chrome/Edge-এর সাম্প্রতিক desktop browser-এ মাইক্রোফোন permission **Allow** করুন।
- ভয়েস ভাষা থেকে বাংলা বা English বেছে নিন, মাইক্রোফোন চাপুন, প্রশ্ন বলুন। শনাক্ত করা কথা শেষ হলে নিজে থেকেই AI-তে পাঠানো হবে।
- “উত্তর শুনুন” চালু থাকলে ভয়েসে করা প্রশ্নের উত্তর পড়ে শোনানো হবে। যেকোনো উত্তরের নিচে **শুনুন** বোতামও আছে।
- voice recognition-এর সমর্থন/ভয়েস-ভাষা browser ও device অনুসারে ভিন্ন হতে পারে। কিছু browser speech recognition-এর জন্য network service ব্যবহার করে; তাই এটি সম্পূর্ণ offline live speech system নয়।
- এই সংস্করণে voice Q&A হলো **মাইক্রোফোনে কথা → speech recognition → Gemini উত্তর → browser speech synthesis**। এটি native full-duplex Gemini Live audio/video session নয়।

## 6. Logo বদলানো

বর্তমানে `public/assets/nasir-ai-logo.svg`-এ replaceable sample mark আছে, কারণ মূল Nasir AI logo ফাইলটি এই কাজের accessible uploads-এর মধ্যে পাওয়া যায়নি। আপনার সঠিক logo ব্যবহার করতে:

1. আপনার logo-টি `public/assets/nasir-ai-logo.png` নামে রাখুন (অথবা `.webp`/`.jpg`)।
2. `public/index.html` ও `public/app.js`-এ `/assets/nasir-ai-logo.svg` path-গুলোকে `/assets/nasir-ai-logo.png` দিয়ে বদলান।
3. `public/index.html`-এর favicon-এর `type="image/svg+xml"`-ও PNG favicon link অনুযায়ী পরিবর্তন করুন অথবা SVG favicon রেখে দিন।
4. আবার deploy করুন।

আপনি logo image এখানে upload করলে, সেটি website-এ সঠিক crop/size সহ বসিয়ে দেওয়া যাবে।

## 7. সমস্যা হলে দ্রুত যাচাই

- **AI উত্তর আসে না:** `https://আপনার-সাইট/api/health` খুলুন; `configured` true হওয়া চাই।
- **API key error:** Environment Variables-এ key ঠিক আছে কি না দেখুন, তারপর redeploy করুন।
- **Quota/429:** Google AI Studio-তে quota ও model access পরীক্ষা করুন।
- **ভয়েস কাজ করে না:** HTTPS, Chrome/Edge, microphone permission, Windows microphone input এবং `bn-BD` speech recognition support পরীক্ষা করুন।
- **পরিবর্তন দেখা যাচ্ছে না:** Vercel/Render redeploy করুন এবং browser hard refresh করুন (`Ctrl+F5`)।
- **চ্যাট হিস্টরি:** এই সংস্করণে browser-এর `localStorage`-এ থাকে; এটি cloud-synced বা cross-device history নয়। browser data clear করলে history মুছে যাবে।

## 8. নিরাপত্তা ও সীমাবদ্ধতা

- Gemini key শুধু backend/serverless function-এ ব্যবহার হয়; frontend source-এ নেই।
- API-তে basic per-IP in-memory rate limit আছে। বড়/public deployment-এ Redis বা persistent rate limiting, user authentication, quota alerts, abuse monitoring এবং CAPTCHA যোগ করা উচিত; serverless instance-এর memory limit-কে পূর্ণ নিরাপত্তা হিসেবে ধরা যাবে না।
- এই deliverable-এ আপনার পূর্ববর্তী Firebase login/sign-in ও cloud Firestore history-র সঙ্গে merge করা হয়নি, কারণ আসল Google AI Studio frontend source/config এখানে ছিল না। Local browser history/pinning আছে। Existing login ও cloud history অক্ষত রেখে একই project-এ integration করতে source project export/ZIP এবং আসল logo ফাইল দিতে হবে।
- Google Search grounding চালু করলে results/citations API/model support ও account quota-এর ওপর নির্ভর করবে। Citation দেখানো মানেই প্রতিটি উত্তর নির্ভুল—এমন নয়।

## Smoke test checklist

- [ ] `/api/health` returns `status: ok` and `configured: true`
- [ ] বাংলায় text question করলে AI answer আসে
- [ ] English question করলে English response আসে
- [ ] মাইক্রোফোনে বাংলা প্রশ্ন বলে final transcript পাঠানো যায়
- [ ] voice question-এর AI answer শোনা যায়
- [ ] “শুনুন” বোতাম থেকে আগের answer শোনা যায়
- [ ] pinned chat এবং history refresh-এর পর থাকে
- [ ] Google Search toggle চালু করলে available source links দেখায়
- [ ] মোবাইল layout-এ sidebar/composer ব্যবহার করা যায়
