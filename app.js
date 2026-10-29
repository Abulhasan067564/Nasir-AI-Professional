(() => {
  'use strict';

  const STORE_KEY = 'nasir_ai_professional_conversations_v1';
  const SETTINGS_KEY = 'nasir_ai_professional_settings_v1';
  const $ = (selector) => document.querySelector(selector);
  const els = {
    sidebar: $('#sidebar'), openSidebar: $('#openSidebar'), closeSidebar: $('#closeSidebar'), mobileBackdrop: $('#mobileBackdrop'),
    newChat: $('#newChat'), historySearch: $('#historySearch'), pinnedSection: $('#pinnedSection'), pinnedList: $('#pinnedList'), historyList: $('#historyList'), historyCount: $('#historyCount'), emptyHistory: $('#emptyHistory'), clearHistory: $('#clearHistory'),
    connectionDot: $('#connectionDot'), connectionTitle: $('#connectionTitle'), connectionText: $('#connectionText'), workspaceLabel: $('#workspaceLabel'), modelName: $('#modelName'), themeToggle: $('#themeToggle'), stopSpeaking: $('#stopSpeaking'),
    contentArea: $('#contentArea'), welcomeScreen: $('#welcomeScreen'), chatArea: $('#chatArea'), messages: $('#messages'), typingRow: $('#typingRow'), chatForm: $('#chatForm'), messageInput: $('#messageInput'), sendButton: $('#sendButton'), micButton: $('#micButton'), searchToggle: $('#searchToggle'), voiceLanguage: $('#voiceLanguage'), autoSpeak: $('#autoSpeak'), charCount: $('#charCount'), voiceStatus: $('#voiceStatus'), voiceStatusText: $('#voiceStatusText'), cancelListening: $('#cancelListening'), toastRegion: $('#toastRegion'), confirmDialog: $('#confirmDialog'), dialogTitle: $('#dialogTitle'), dialogDescription: $('#dialogDescription'), dialogCancel: $('#dialogCancel'), dialogConfirm: $('#dialogConfirm'),
  };

  let conversations = loadConversations();
  let activeConversationId = null;
  let isSending = false;
  let recognition = null;
  let finalTranscript = '';
  let shouldSendVoice = false;
  let pendingVoiceResponse = false;
  let dialogAction = null;
  let currentUtterance = null;
  let healthInfo = null;

  const settings = loadSettings();
  applyTheme(settings.theme || 'dark');
  if (typeof settings.autoSpeak === 'boolean') els.autoSpeak.checked = settings.autoSpeak;
  if (settings.voiceLanguage) els.voiceLanguage.value = settings.voiceLanguage;
  if (typeof settings.useSearch === 'boolean') els.searchToggle.checked = settings.useSearch;

  function safeParse(json, fallback) { try { return JSON.parse(json); } catch { return fallback; } }
  function loadSettings() {
    try { return safeParse(localStorage.getItem(SETTINGS_KEY), {}) || {}; } catch { return {}; }
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: document.body.classList.contains('light') ? 'light' : 'dark', autoSpeak: els.autoSpeak.checked, voiceLanguage: els.voiceLanguage.value, useSearch: els.searchToggle.checked })); } catch { /* private browsing may block storage */ }
  }
  function loadConversations() {
    try {
      const value = safeParse(localStorage.getItem(STORE_KEY), []);
      return Array.isArray(value) ? value.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages)).map((c) => ({
        id: c.id, title: String(c.title || 'নতুন চ্যাট').slice(0, 100), pinned: Boolean(c.pinned), createdAt: Number(c.createdAt) || Date.now(), updatedAt: Number(c.updatedAt) || Date.now(),
        messages: c.messages.slice(-200).filter((m) => m && ['user','assistant','error'].includes(m.role) && typeof m.content === 'string').map((m) => ({ role:m.role, content:m.content.slice(0, 20000), citations:Array.isArray(m.citations) ? m.citations.slice(0,10) : [], time:Number(m.time) || Date.now() }))
      })) : [];
    } catch { return []; }
  }
  function saveConversations() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(conversations.slice(0, 100))); }
    catch { toast('চ্যাট সংরক্ষণ করা যায়নি। ব্রাউজারের storage পূর্ণ হতে পারে।', 'error'); }
  }
  function id() { return (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`); }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function shortTitle(text) {
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    return (normalized.length > 34 ? normalized.slice(0, 34).trimEnd() + '…' : normalized) || 'নতুন চ্যাট';
  }
  function nowTime(ts) { return new Date(ts || Date.now()).toLocaleTimeString('bn-BD', { hour:'2-digit', minute:'2-digit' }); }
  function activeConversation() { return conversations.find((c) => c.id === activeConversationId) || null; }
  function sortedConversations(items) { return [...items].sort((a,b) => b.updatedAt - a.updatedAt); }

  function toast(message, type = '') {
    const item = document.createElement('div');
    item.className = `toast ${type}`.trim();
    item.textContent = message;
    els.toastRegion.append(item);
    window.setTimeout(() => item.remove(), 5200);
  }

  function applyTheme(theme) {
    const light = theme === 'light';
    document.body.classList.toggle('light', light);
    els.themeToggle.textContent = light ? '☾' : '☼';
    els.themeToggle.title = light ? 'ডার্ক থিম চালু করুন' : 'লাইট থিম চালু করুন';
    els.themeToggle.setAttribute('aria-label', els.themeToggle.title);
  }

  function closeMobileSidebar() {
    els.sidebar.classList.remove('open');
    els.mobileBackdrop.hidden = true;
  }
  function openMobileSidebar() {
    els.sidebar.classList.add('open');
    els.mobileBackdrop.hidden = false;
  }

  function renderHistory() {
    const query = els.historySearch.value.trim().toLocaleLowerCase();
    const filtered = sortedConversations(conversations.filter((c) => !query || c.title.toLocaleLowerCase().includes(query) || c.messages.some((m) => m.content.toLocaleLowerCase().includes(query))));
    const pinned = filtered.filter((c) => c.pinned);
    const recent = filtered.filter((c) => !c.pinned);
    els.pinnedSection.hidden = pinned.length === 0;
    els.pinnedList.replaceChildren(...pinned.map((c) => makeConversationItem(c)));
    els.historyList.replaceChildren(...recent.map((c) => makeConversationItem(c)));
    els.historyCount.textContent = String(recent.length).replace(/[0-9]/g, (n) => '০১২৩৪৫৬৭৮৯'[Number(n)]);
    els.emptyHistory.hidden = recent.length > 0 || pinned.length > 0 || Boolean(query);
    if (query && filtered.length === 0) {
      els.emptyHistory.hidden = false;
      els.emptyHistory.textContent = 'এই নামে কোনো চ্যাট পাওয়া যায়নি।';
    } else {
      els.emptyHistory.textContent = 'আপনার চ্যাট এখানে সংরক্ষিত হবে।';
    }
  }

  function makeConversationItem(conversation) {
    const row = document.createElement('div');
    row.className = `conversation-item${conversation.id === activeConversationId ? ' active' : ''}`;
    row.dataset.conversationId = conversation.id;
    const symbol = document.createElement('span'); symbol.className = 'conversation-symbol'; symbol.textContent = conversation.pinned ? '◆' : '◌';
    const title = document.createElement('button'); title.type = 'button'; title.className = 'conversation-title'; title.textContent = conversation.title; title.title = conversation.title;
    title.addEventListener('click', () => openConversation(conversation.id));
    const actions = document.createElement('div'); actions.className = 'conversation-actions';
    const pin = document.createElement('button'); pin.type = 'button'; pin.textContent = conversation.pinned ? '◇' : '◆'; pin.title = conversation.pinned ? 'পিন সরান' : 'পিন করুন'; pin.setAttribute('aria-label', pin.title);
    pin.addEventListener('click', (event) => { event.stopPropagation(); conversation.pinned = !conversation.pinned; conversation.updatedAt = Date.now(); saveConversations(); renderHistory(); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = 'চ্যাট মুছুন'; remove.setAttribute('aria-label', remove.title);
    remove.addEventListener('click', (event) => { event.stopPropagation(); openConfirm('চ্যাটটি মুছে ফেলবেন?', 'এই চ্যাটের বার্তাগুলো এই ব্রাউজার থেকে মুছে যাবে।', 'মুছে ফেলুন', () => deleteConversation(conversation.id)); });
    actions.append(pin, remove);
    row.append(symbol, title, actions);
    return row;
  }

  function toggleSurface(showChat) {
    els.welcomeScreen.hidden = showChat;
    els.chatArea.hidden = !showChat;
    if (!showChat) els.workspaceLabel.textContent = 'নতুন কথোপকথন';
  }

  function openConversation(conversationId) {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    activeConversationId = conversationId;
    pendingVoiceResponse = false;
    closeMobileSidebar();
    els.workspaceLabel.textContent = conversation.title;
    toggleSurface(true);
    renderMessages();
    renderHistory();
    els.messageInput.focus({ preventScroll:true });
  }

  function startNewChat() {
    stopSpeaking();
    stopListening(true);
    activeConversationId = null;
    pendingVoiceResponse = false;
    toggleSurface(false);
    els.workspaceLabel.textContent = 'নতুন কথোপকথন';
    renderHistory();
    closeMobileSidebar();
    els.messageInput.value = '';
    updateComposer();
    els.messageInput.focus({ preventScroll:true });
  }

  function deleteConversation(conversationId) {
    conversations = conversations.filter((c) => c.id !== conversationId);
    if (activeConversationId === conversationId) startNewChat();
    saveConversations(); renderHistory();
    toast('চ্যাটটি মুছে ফেলা হয়েছে।', 'success');
  }

  function openConfirm(title, description, confirmText, callback) {
    els.dialogTitle.textContent = title;
    els.dialogDescription.textContent = description;
    els.dialogConfirm.textContent = confirmText;
    dialogAction = callback;
    if (typeof els.confirmDialog.showModal === 'function') els.confirmDialog.showModal();
    else if (window.confirm(`${title}\n${description}`)) { const fn = dialogAction; dialogAction = null; fn?.(); }
  }

  function inlineMarkdown(text) {
    let safe = escapeHTML(text);
    safe = safe.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/__(.+?)__/g, '<strong>$1</strong>');
    safe = safe.replace(/~~(.+?)~~/g, '<del>$1</del>');
    safe = safe.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return safe;
  }

  function markdownToHTML(text) {
    const codeBlocks = [];
    const withTokens = String(text).replace(/```([\w.+#-]*)\s*\n([\s\S]*?)```/g, (_, language, code) => {
      const label = language ? `<span class="code-language">${escapeHTML(language)}</span>` : '';
      const html = `<pre>${label}<code>${escapeHTML(code.replace(/\n$/, ''))}</code></pre>`;
      const token = `%%NASIRCODE${codeBlocks.length}%%`;
      codeBlocks.push(html);
      return token;
    });
    const lines = withTokens.split('\n');
    const output = [];
    let paragraph = [];
    let list = null;
    const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`); paragraph = []; } };
    const flushList = () => { if (list) { output.push(`</${list}>`); list = null; } };
    for (const line of lines) {
      const codeMatch = line.match(/^%%NASIRCODE(\d+)%%$/);
      if (codeMatch) { flushParagraph(); flushList(); output.push(`%%NASIRCODE${codeMatch[1]}%%`); continue; }
      if (!line.trim()) { flushParagraph(); flushList(); continue; }
      const head = line.match(/^(#{1,3})\s+(.+)$/);
      if (head) { flushParagraph(); flushList(); const level = head[1].length; output.push(`<h${level}>${inlineMarkdown(head[2])}</h${level}>`); continue; }
      const quote = line.match(/^>\s?(.*)$/);
      if (quote) { flushParagraph(); flushList(); output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
      const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (bullet || numbered) {
        flushParagraph(); const desired = bullet ? 'ul' : 'ol';
        if (list !== desired) { flushList(); list = desired; output.push(`<${list}>`); }
        output.push(`<li>${inlineMarkdown((bullet || numbered)[1])}</li>`); continue;
      }
      flushList(); paragraph.push(line);
    }
    flushParagraph(); flushList();
    let html = output.join('');
    html = html.replace(/%%NASIRCODE(\d+)%%/g, (_, index) => codeBlocks[Number(index)] || '');
    return html || `<p>${inlineMarkdown(text)}</p>`;
  }

  function renderMessages() {
    const conversation = activeConversation();
    if (!conversation) { els.messages.replaceChildren(); return; }
    els.messages.replaceChildren(...conversation.messages.map((message, index) => makeMessage(message, index)));
    window.requestAnimationFrame(() => { els.contentArea.scrollTop = els.contentArea.scrollHeight; });
  }

  function makeMessage(message, index) {
    const isUser = message.role === 'user';
    const row = document.createElement('article');
    row.className = `message-row ${isUser ? 'user' : 'assistant'}`;
    row.dataset.messageIndex = String(index);
    const avatar = document.createElement('div'); avatar.className = 'message-avatar';
    if (isUser) avatar.textContent = 'আপ';
    else { const img = document.createElement('img'); img.src = '/assets/nasir-ai-logo.svg'; img.alt = 'Nasir AI'; avatar.append(img); }
    const body = document.createElement('div'); body.className = 'message-content';
    const meta = document.createElement('div'); meta.className = 'message-meta';
    const name = document.createElement('span'); name.textContent = isUser ? 'আপনি' : 'Nasir AI';
    const time = document.createElement('time'); time.textContent = nowTime(message.time); meta.append(name,time);
    const bubble = document.createElement('div'); bubble.className = 'message-bubble';
    if (message.role === 'error') bubble.classList.add('message-error');
    bubble.innerHTML = markdownToHTML(message.content);
    body.append(meta,bubble);
    if (!isUser && message.citations?.length) {
      const section = document.createElement('div'); section.className = 'citations';
      const label = document.createElement('span'); label.className = 'citation-label'; label.textContent = 'সূত্র'; section.append(label);
      for (const citation of message.citations.slice(0,10)) {
        if (!citation || typeof citation.url !== 'string' || !/^https?:\/\//i.test(citation.url)) continue;
        const link = document.createElement('a'); link.className = 'citation-link'; link.href = citation.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const symbol = document.createElement('b'); symbol.textContent = '↗';
        const title = document.createElement('span'); title.textContent = citation.title || citation.url; title.title = title.textContent;
        link.append(symbol,title); section.append(link);
      }
      body.append(section);
    }
    if (!isUser) {
      const actions = document.createElement('div'); actions.className = 'message-actions';
      const copy = document.createElement('button'); copy.className = 'message-action'; copy.type = 'button'; copy.textContent = '▢ কপি';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(message.content); toast('উত্তর কপি করা হয়েছে।','success'); }
        catch { fallbackCopy(message.content); }
      });
      const listen = document.createElement('button'); listen.className = 'message-action'; listen.type = 'button'; listen.textContent = '♫ শুনুন';
      listen.addEventListener('click', () => speakText(message.content));
      actions.append(copy,listen); body.append(actions);
    }
    row.append(avatar,body);
    return row;
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.append(textarea); textarea.select();
    try { document.execCommand('copy'); toast('উত্তর কপি করা হয়েছে।','success'); } catch { toast('কপি করা যায়নি। উত্তরটি নির্বাচন করে কপি করুন।','error'); }
    textarea.remove();
  }

  function updateComposer() {
    els.charCount.textContent = `${String(els.messageInput.value.length).replace(/[0-9]/g, (n) => '০১২৩৪৫৬৭৮৯'[Number(n)])} / ১২,০০০`;
    els.messageInput.style.height = 'auto';
    els.messageInput.style.height = `${Math.min(els.messageInput.scrollHeight,170)}px`;
    els.sendButton.disabled = isSending || !els.messageInput.value.trim();
    els.sendButton.querySelector('span').textContent = isSending ? 'অপেক্ষা…' : 'পাঠান';
  }

  function ensureConversation(messageText) {
    let conversation = activeConversation();
    if (!conversation) {
      conversation = { id:id(), title:shortTitle(messageText), pinned:false, createdAt:Date.now(), updatedAt:Date.now(), messages:[] };
      conversations.unshift(conversation);
      activeConversationId = conversation.id;
      toggleSurface(true);
    } else if (conversation.messages.length === 0) {
      conversation.title = shortTitle(messageText);
    }
    els.workspaceLabel.textContent = conversation.title;
    return conversation;
  }

  async function sendMessage(textFromCaller, options = {}) {
    const raw = typeof textFromCaller === 'string' ? textFromCaller : els.messageInput.value;
    const message = raw.trim();
    if (!message || isSending) return;
    stopListening(true);
    stopSpeaking();
    const conversation = ensureConversation(message);
    const history = conversation.messages.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-20).map((m) => ({ role:m.role, content:m.content }));
    conversation.messages.push({ role:'user', content:message, time:Date.now(), citations:[] });
    conversation.updatedAt = Date.now();
    saveConversations(); renderHistory(); renderMessages();
    els.messageInput.value = '';
    updateComposer();
    isSending = true;
    pendingVoiceResponse = Boolean(options.fromVoice) || els.autoSpeak.checked;
    els.typingRow.hidden = false;
    updateComposer();
    els.micButton.disabled = true;
    try {
      const response = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({ message, history, useSearch:els.searchToggle.checked, language: /[\u0980-\u09FF]/.test(message) ? 'bn' : 'auto' }),
      });
      let payload;
      try { payload = await response.json(); } catch { payload = {}; }
      if (!response.ok || !payload.ok || typeof payload.text !== 'string') {
        const errorMessage = payload.error || `AI উত্তর দিতে পারেনি (HTTP ${response.status})।`;
        conversation.messages.push({ role:'error', content:`**দুঃখিত!** ${errorMessage}`, time:Date.now(), citations:[] });
        saveConversations(); renderMessages();
        if (payload.code === 'GEMINI_NOT_CONFIGURED') toast('প্রকাশের আগে Hosting-এর Environment Variables-এ GEMINI_API_KEY যোগ করতে হবে।', 'error');
        else toast(errorMessage, 'error');
        pendingVoiceResponse = false;
      } else {
        const assistantMessage = { role:'assistant', content:payload.text, time:Date.now(), citations:Array.isArray(payload.citations) ? payload.citations : [] };
        conversation.messages.push(assistantMessage);
        conversation.updatedAt = Date.now();
        saveConversations(); renderHistory(); renderMessages();
        if (options.fromVoice || els.autoSpeak.checked) speakText(assistantMessage.content);
      }
    } catch (error) {
      const errorMessage = 'সার্ভারের সঙ্গে সংযোগ করা যায়নি। ওয়েবসাইটটি HTTPS দিয়ে প্রকাশিত হয়েছে কি না এবং /api/chat চালু আছে কি না পরীক্ষা করুন।';
      conversation.messages.push({ role:'error', content:`**সংযোগ সমস্যা:** ${errorMessage}`, time:Date.now(), citations:[] });
      saveConversations(); renderMessages(); toast(errorMessage, 'error');
    } finally {
      isSending = false;
      els.typingRow.hidden = true;
      els.micButton.disabled = false;
      pendingVoiceResponse = false;
      updateComposer();
      els.messageInput.focus({ preventScroll:true });
    }
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) { toast('এই ব্রাউজারে উত্তর পড়ে শোনানোর সুবিধা নেই।','error'); return; }
    window.speechSynthesis.cancel();
    const clean = String(text).replace(/```[\s\S]*?```/g, ' কোড ').replace(/[#*_>`~-]/g, ' ').replace(/\n+/g, '. ').slice(0, 9000);
    if (!clean.trim()) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    const language = /[\u0980-\u09FF]/.test(clean) ? 'bn-BD' : els.voiceLanguage.value;
    utterance.lang = language;
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const langRoot = language.split('-')[0].toLowerCase();
    const voice = voices.find((v) => v.lang?.toLowerCase() === language.toLowerCase()) || voices.find((v) => v.lang?.toLowerCase().startsWith(langRoot));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { currentUtterance = utterance; els.stopSpeaking.hidden = false; };
    utterance.onend = () => { if (currentUtterance === utterance) currentUtterance = null; els.stopSpeaking.hidden = true; };
    utterance.onerror = () => { currentUtterance = null; els.stopSpeaking.hidden = true; toast('ভয়েস চালানো যায়নি। ব্রাউজারের speech settings পরীক্ষা করুন।','error'); };
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    currentUtterance = null;
    els.stopSpeaking.hidden = true;
  }

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      els.micButton.title = 'এই ব্রাউজারে voice input সমর্থিত নয়';
      els.micButton.setAttribute('aria-label','এই ব্রাউজারে voice input সমর্থিত নয়');
      els.micButton.addEventListener('click', () => toast('লাইভ ভয়েস ইনপুটের জন্য Windows/Android-এর Google Chrome বা speech recognition সমর্থিত ব্রাউজার ব্যবহার করুন।','error'));
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      els.micButton.classList.add('listening');
      els.micButton.setAttribute('aria-label','শোনা বন্ধ করুন');
      els.voiceStatus.hidden = false;
      els.voiceStatusText.textContent = els.voiceLanguage.value === 'bn-BD' ? 'শুনছি… আপনার প্রশ্নটি বাংলায় বলুন' : 'Listening… ask your question';
    };
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalTranscript += `${transcript} `;
        else interim += transcript;
      }
      const shown = (finalTranscript + interim).trim();
      if (shown) els.voiceStatusText.textContent = `${shown}${interim ? ' …' : ''}`;
    };
    recognition.onerror = (event) => {
      const errors = {
        'not-allowed':'মাইক্রোফোন ব্যবহারের অনুমতি দিন। Browser address bar-এর lock/settings icon থেকে Microphone → Allow করুন।',
        'service-not-allowed':'এই ব্রাউজার বা নেটওয়ার্ক speech recognition বন্ধ রেখেছে।',
        'no-speech':'কোনো কথা শোনা যায়নি। আবার মাইক্রোফোন চাপুন।',
        'audio-capture':'মাইক্রোফোন পাওয়া যায়নি। Windows sound settings পরীক্ষা করুন।',
        'network':'ভয়েস শনাক্তকরণে নেটওয়ার্ক সমস্যা হয়েছে।',
      };
      const detail = errors[event.error] || 'ভয়েস ইনপুটে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      if (event.error !== 'aborted') toast(detail,'error');
      shouldSendVoice = false;
    };
    recognition.onend = () => {
      els.micButton.classList.remove('listening');
      els.micButton.setAttribute('aria-label','মাইক্রোফোনে প্রশ্ন করুন');
      els.voiceStatus.hidden = true;
      const transcript = finalTranscript.trim();
      finalTranscript = '';
      const shouldSend = shouldSendVoice;
      shouldSendVoice = false;
      if (shouldSend && transcript) sendMessage(transcript, { fromVoice:true });
      else if (shouldSend && !transcript) toast('আপনার প্রশ্নটি বোঝা যায়নি। মাইক্রোফোনে আবার বলুন।','error');
    };
  }

  function startListening() {
    if (!recognition) return;
    if (isSending) { toast('AI উত্তর তৈরি করছে। উত্তর শেষ হলে আবার প্রশ্ন করুন।'); return; }
    if (els.micButton.classList.contains('listening')) { stopListening(false); return; }
    stopSpeaking();
    finalTranscript = '';
    shouldSendVoice = true;
    recognition.lang = els.voiceLanguage.value;
    try { recognition.start(); }
    catch { shouldSendVoice = false; toast('মাইক্রোফোন চালু করা যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।','error'); }
  }

  function stopListening(cancel) {
    if (!recognition) return;
    if (cancel) shouldSendVoice = false;
    if (els.micButton.classList.contains('listening')) {
      try { recognition.stop(); } catch { /* ignore */ }
    }
    if (cancel) {
      finalTranscript = '';
      els.voiceStatus.hidden = true;
      els.micButton.classList.remove('listening');
    }
  }

  async function checkHealth() {
    try {
      const response = await fetch('/api/health', { headers:{'Accept':'application/json'}, cache:'no-store' });
      const data = await response.json();
      healthInfo = data;
      els.modelName.textContent = data.model || 'Gemini AI';
      if (data.configured) {
        els.connectionDot.className = 'connection-dot online';
        els.connectionTitle.textContent = 'AI সংযোগ প্রস্তুত';
        els.connectionText.textContent = 'প্রশ্ন করা যাবে';
      } else {
        els.connectionDot.className = 'connection-dot offline';
        els.connectionTitle.textContent = 'API key সেট করা নেই';
        els.connectionText.textContent = 'Hosting settings-এ key যোগ করুন';
      }
    } catch {
      els.connectionDot.className = 'connection-dot offline';
      els.connectionTitle.textContent = 'সার্ভার পাওয়া যায়নি';
      els.connectionText.textContent = 'প্রকাশিত API পরীক্ষা করুন';
      els.modelName.textContent = 'AI Offline';
    }
  }

  els.newChat.addEventListener('click', startNewChat);
  els.historySearch.addEventListener('input', renderHistory);
  els.clearHistory.addEventListener('click', () => openConfirm('সব চ্যাট মুছবেন?', 'এই ব্রাউজারে সংরক্ষিত সব কথোপকথন মুছে যাবে। এটি কোনো সার্ভার বা অন্য ডিভাইসের ডেটা মুছবে না।', 'সব মুছুন', () => { conversations = []; activeConversationId = null; saveConversations(); startNewChat(); renderHistory(); toast('এই ব্রাউজারের চ্যাট হিস্টরি মুছে ফেলা হয়েছে।','success'); }));
  els.openSidebar.addEventListener('click', openMobileSidebar);
  els.closeSidebar.addEventListener('click', closeMobileSidebar);
  els.mobileBackdrop.addEventListener('click', closeMobileSidebar);
  els.themeToggle.addEventListener('click', () => { const next = document.body.classList.contains('light') ? 'dark' : 'light'; applyTheme(next); saveSettings(); });
  els.stopSpeaking.addEventListener('click', stopSpeaking);
  els.chatForm.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(); });
  els.messageInput.addEventListener('input', updateComposer);
  els.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!isSending) sendMessage(); }
  });
  els.micButton.addEventListener('click', startListening);
  els.cancelListening.addEventListener('click', () => stopListening(true));
  els.autoSpeak.addEventListener('change', saveSettings);
  els.searchToggle.addEventListener('change', saveSettings);
  els.voiceLanguage.addEventListener('change', saveSettings);
  els.dialogCancel.addEventListener('click', () => { dialogAction = null; els.confirmDialog.close(); });
  els.dialogConfirm.addEventListener('click', () => { const fn = dialogAction; dialogAction = null; els.confirmDialog.close(); fn?.(); });
  els.confirmDialog.addEventListener('click', (event) => { if (event.target === els.confirmDialog) els.confirmDialog.close(); });
  $('#suggestionGrid').addEventListener('click', (event) => { const card = event.target.closest('[data-prompt]'); if (card) sendMessage(card.dataset.prompt); });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); startNewChat(); }
    if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); els.historySearch.focus(); }
    if (event.key === 'Escape') { closeMobileSidebar(); if (els.micButton.classList.contains('listening')) stopListening(true); }
  });
  window.addEventListener('beforeunload', () => { stopListening(true); stopSpeaking(); });

  setupSpeechRecognition();
  renderHistory();
  updateComposer();
  checkHealth();
  // Show a clean landing screen; saved conversations remain available in the sidebar.
  if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => {};
})();
