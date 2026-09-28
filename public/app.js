/* ============================
   DIS·INSTA — public/app.js
   Frontend that communicates with the Express backend
   ============================ */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  user:          null,
  conversations: [],
  contacts:      [],
  activeConvId:  null,
  settings: { notif: true, sounds: true, readreceipts: true },
  pollingTimer:  null
};

/* ============================================================
   BOOT — check URL params and session on page load
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);

  // Clean URL without reloading
  if (params.has('auth') || params.has('error')) {
    window.history.replaceState({}, '', '/');
  }

  // Show error banner if OAuth failed
  if (params.get('error')) {
    const banner = document.getElementById('error-banner');
    const text   = document.getElementById('error-text');
    const msgs = {
      access_denied:         'You cancelled the Instagram login. Please try again.',
      invalid_state:         'Security check failed. Please try again.',
      token_exchange_failed: 'Failed to connect Instagram. Check your app credentials.',
      no_code:               'Instagram did not return a login code. Please retry.',
    };
    text.textContent = msgs[params.get('error')] || 'Something went wrong. Please try again.';
    banner.classList.remove('hidden');
  }

  // Wire Enter key for chat
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Check if already logged in (server session)
  await checkSession();
});

/* ============================================================
   AUTH — Check existing session
   ============================================================ */
async function checkSession() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      STATE.user = await res.json();
      await loadApp();
    }
    // else: stay on login screen
  } catch (err) {
    console.log('No active session');
  }
}

/* ============================================================
   LOGIN — Redirect to Instagram OAuth
   ============================================================ */
function loginWithInstagram() {
  const btn = document.getElementById('ig-login-btn');
  btn.disabled = true;
  btn.innerHTML = `<div class="btn-spinner-inline"></div><span>Redirecting to Instagram…</span>`;
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('connecting-overlay').classList.remove('hidden');
  document.getElementById('connecting-overlay').classList.add('active');
  setTimeout(() => { window.location.href = '/auth/instagram'; }, 600);
}

function devLogin() {
  const btn = document.getElementById('dev-login-btn');
  btn.disabled = true;
  btn.textContent = '⚡ Connecting…';
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('connecting-overlay').classList.remove('hidden');
  document.getElementById('connecting-overlay').classList.add('active');
  setTimeout(() => { window.location.href = '/auth/dev-login'; }, 400);
}

/* ============================================================
   LOAD APP
   ============================================================ */
async function loadApp() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('connecting-overlay').classList.remove('active');
  document.getElementById('connecting-overlay').classList.add('hidden');
  document.getElementById('app-screen').classList.add('active');

  populateProfile();
  await loadConversations();
  switchTab('dm');
  startPolling();
}

/* ============================================================
   PROFILE
   ============================================================ */
function populateProfile() {
  const u = STATE.user;
  document.getElementById('profile-name').textContent    = u.name    || u.handle;
  document.getElementById('profile-handle').textContent  = '@' + u.handle;
  document.getElementById('profile-bio').textContent     = u.bio     || 'Using Dis·Insta 💬';
  document.getElementById('stat-followers').textContent  = fmtNumber(u.followers || 0);
  document.getElementById('stat-following').textContent  = fmtNumber(u.following || 0);
  document.getElementById('connected-account-desc').textContent = '@' + u.handle;

  [document.getElementById('profile-avatar'), document.getElementById('nav-avatar')]
    .forEach(el => { if (el) { el.src = u.avatar || ''; el.alt = u.name; } });
}

/* ============================================================
   CONVERSATIONS — load from Instagram via backend
   ============================================================ */
async function loadConversations() {
  try {
    const res = await fetch('/api/conversations');
    const data = await res.json();

    if (data.data && data.data.length > 0) {
      STATE.conversations = data.data.map(conv => {
        const rawMsgs = Array.isArray(conv.messages) ? conv.messages : (conv.messages?.data || []);
        return {
          id:       conv.id,
          with:     extractParticipant(conv.participants, STATE.user?.id),
          messages: rawMsgs.map(m => {
            const isMe = (m.from?.id === STATE.user?.id) || (m.from === STATE.user?.id) || (m.from === 'me');
            return {
              id:   m.id || ('m_' + Date.now()),
              from: isMe ? 'me' : 'them',
              text: m.message || m.text || '',
              time: new Date(m.created_time || m.time || Date.now()).getTime()
            };
          }),
          unread:   0,
          lastTime: new Date(conv.updated_time || Date.now()).getTime()
        };
      });
    } else {
      // Real Instagram user has no active chats yet
      STATE.conversations = [];
    }

    document.getElementById('stat-messages').textContent = STATE.conversations.length;
    renderDMList();
  } catch (err) {
    console.error('Failed to load conversations:', err);
    STATE.conversations = [];
    renderDMList();
  }
}

function extractParticipant(participants, myId) {
  const list = Array.isArray(participants) ? participants : (participants?.data || []);
  if (!list.length) return { id: 'user', name: 'Instagram User', handle: 'user', avatar: '', online: false };
  const other = list.find(p => p.id !== myId && p.username !== STATE.user?.handle) || list[0];
  const uname = other.username || other.name || other.id;
  return {
    id:     other.id || uname,
    name:   other.name || ('@' + uname),
    handle: uname,
    avatar: other.profile_pic || other.profile_picture || `https://unavatar.io/instagram/${uname}`,
    online: false
  };
}

/* ============================================================
   DEMO DATA (shown when Instagram Business API not yet active)
   ============================================================ */
function buildDemoConversations() {
  const MOCK = [
    { id:'u1', name:'Aryan Kapoor',   handle:'aryan.kapoor',   avatar:'https://i.pravatar.cc/150?img=11', online:true },
    { id:'u2', name:'Priya Sharma',   handle:'priya.sharma',   avatar:'https://i.pravatar.cc/150?img=5',  online:false },
    { id:'u3', name:'Rohan Mehta',    handle:'rohan_mehta',    avatar:'https://i.pravatar.cc/150?img=12', online:true },
    { id:'u4', name:'Sneha Gupta',    handle:'sneha.g',        avatar:'https://i.pravatar.cc/150?img=9',  online:false },
    { id:'u5', name:'Vikram Singh',   handle:'vikramsingh',    avatar:'https://i.pravatar.cc/150?img=15', online:true },
  ];
  const now = Date.now();
  return [
    { id:'c1', with: MOCK[0], messages:[
      { id:'m1', from:'them', text:'Hey! Welcome to Dis·Insta 👋', time: now-300000 },
      { id:'m2', from:'me',   text:'Thanks! Love the no-feed vibe 🙌', time: now-240000 },
      { id:'m3', from:'them', text:'Right?? No distractions here 🔕', time: now-60000 },
    ], unread:1, lastTime: now-60000 },
    { id:'c2', with: MOCK[1], messages:[
      { id:'m1', from:'me',   text:'Did you finish that project?', time: now-3600000 },
      { id:'m2', from:'them', text:'Almost! One more thing left 😅', time: now-3300000 },
    ], unread:0, lastTime: now-3300000 },
    { id:'c3', with: MOCK[2], messages:[
      { id:'m1', from:'them', text:'Goa trip next month? 🌊', time: now-10800000 },
      { id:'m2', from:'me',   text:'YES count me in!!', time: now-10200000 },
      { id:'m3', from:'them', text:'🔥🔥🔥', time: now-9000000 },
    ], unread:2, lastTime: now-9000000 },
  ];
}

/* ============================================================
   DM LIST RENDER
   ============================================================ */
function renderDMList() {
  const list = document.getElementById('dm-list');
  list.innerHTML = '';

  const sorted = [...STATE.conversations].sort((a,b) => b.lastTime - a.lastTime);

  if (!sorted.length) {
    document.getElementById('dm-empty').classList.remove('hidden');
    return;
  }
  document.getElementById('dm-empty').classList.add('hidden');

  sorted.forEach(conv => {
    const last = conv.messages[conv.messages.length - 1];
    if (!last) return;
    const item = document.createElement('div');
    item.className = 'dm-item';
    item.id = `conv-${conv.id}`;
    item.onclick = () => openChat(conv.id);
    const hasUnread = conv.unread > 0;
    const isOnline  = conv.with?.online;

    item.innerHTML = `
      <div class="dm-avatar-wrap">
        ${hasUnread ? '<div class="dm-avatar-story"></div>' : ''}
        <img class="dm-avatar" src="${conv.with?.avatar || ''}" alt="${conv.with?.name || ''}" onerror="this.src='https://i.pravatar.cc/150?u=${conv.id}'" />
        ${isOnline ? '<div class="dm-avatar-online"></div>' : ''}
      </div>
      <div class="dm-body">
        <div class="dm-row1">
          <span class="dm-name">${escHtml(conv.with?.name || 'Unknown')}</span>
          <span class="dm-time">${timeAgo(conv.lastTime)}</span>
        </div>
        <div class="dm-row2">
          <span class="dm-preview ${hasUnread ? 'unread' : ''}">
            ${last.from === 'me' ? 'You: ' : ''}${escHtml(last.text || '')}
          </span>
          ${hasUnread ? '<div class="dm-unread-dot"></div>' : ''}
        </div>
      </div>`;
    list.appendChild(item);
  });

  updateBadge();
}

function updateBadge() {
  const total = STATE.conversations.reduce((s, c) => s + c.unread, 0);
  const badge = document.getElementById('dm-badge');
  if (total > 0) { badge.textContent = total > 99 ? '99+' : total; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

/* ============================================================
   CHAT
   ============================================================ */
function openChat(convId) {
  const conv = STATE.conversations.find(c => c.id === convId);
  if (!conv) return;
  STATE.activeConvId = convId;
  conv.unread = 0;
  renderDMList();

  document.getElementById('chat-avatar').src = conv.with?.avatar || '';
  document.getElementById('chat-name').textContent   = conv.with?.name || 'Unknown';
  document.getElementById('chat-status').textContent = conv.with?.online ? 'Active now' : 'Active recently';

  renderMessages(conv);
  document.getElementById('chat-screen').classList.add('open');
  setTimeout(() => document.getElementById('chat-input').focus(), 350);
}

function closeChat() {
  document.getElementById('chat-screen').classList.remove('open');
  STATE.activeConvId = null;
  document.getElementById('emoji-bar').classList.add('hidden');
}

function renderMessages(conv) {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  let lastDate = null;

  conv.messages.forEach(msg => {
    const dateStr = formatDate(msg.time);
    if (dateStr !== lastDate) {
      const d = document.createElement('div');
      d.className = 'msg-time';
      d.textContent = dateStr;
      container.appendChild(d);
      lastDate = dateStr;
    }
    const isMe = msg.from === 'me';
    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${isMe ? 'mine' : 'theirs'}`;
    wrap.innerHTML = `
      ${!isMe ? `<img class="msg-avatar-sm" src="${conv.with?.avatar || ''}" alt="" onerror="this.src='https://i.pravatar.cc/60'" />` : ''}
      <div class="bubble ${isMe ? 'mine' : 'theirs'}">${escHtml(msg.text || '')}</div>`;
    container.appendChild(wrap);
  });

  container.scrollTop = container.scrollHeight;
}

/* ============================================================
   SEND MESSAGE
   ============================================================ */
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || !STATE.activeConvId) return;

  const conv = STATE.conversations.find(c => c.id === STATE.activeConvId);
  if (!conv) return;

  // Optimistic update
  const msg = { id: 'tmp_' + Date.now(), from: 'me', text, time: Date.now() };
  conv.messages.push(msg);
  conv.lastTime = msg.time;
  input.value = '';
  renderMessages(conv);
  renderDMList();
  document.getElementById('emoji-bar').classList.add('hidden');

  // Send via backend
  try {
    const res = await fetch('/api/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        conversationId: conv.id,
        recipient_id:   conv.with?.id || conv.with?.handle,
        message:        text
      })
    });
    const result = await res.json();
    if (result.dev_note) {
      showToast(result.dev_note);
    }
  } catch (err) {
    console.error('Send error:', err);
  }
}

/* ============================================================
   POLLING — Check for new messages every 5s
   ============================================================ */
function startPolling() {
  STATE.pollingTimer = setInterval(async () => {
    try {
      const res  = await fetch('/api/conversations');
      const data = await res.json();
      if (data.data?.length > 0) {
        // Merge new messages
        data.data.forEach(serverConv => {
          const local = STATE.conversations.find(c => c.id === serverConv.id);
          const rawMsgs = Array.isArray(serverConv.messages) ? serverConv.messages : (serverConv.messages?.data || []);
          const newMsgs = rawMsgs.map(m => {
            const isMe = (m.from?.id === STATE.user?.id) || (m.from === STATE.user?.id) || (m.from === 'me');
            return {
              id:   m.id || ('m_' + Date.now()),
              from: isMe ? 'me' : 'them',
              text: m.message || m.text || '',
              time: new Date(m.created_time || m.time || Date.now()).getTime()
            };
          });

          if (local) {
            const existingIds = new Set(local.messages.map(m => m.id));
            const incoming    = newMsgs.filter(m => !existingIds.has(m.id) && m.from !== 'me');
            if (incoming.length > 0) {
              local.messages.push(...incoming);
              local.lastTime = incoming[incoming.length - 1].time;
              if (STATE.activeConvId === local.id) {
                renderMessages(local);
              } else {
                local.unread += incoming.length;
                if (STATE.settings.sounds) playNotifSound();
              }
            }
          } else {
            // New conversation arrived
            STATE.conversations.unshift({
              id:       serverConv.id,
              with:     extractParticipant(serverConv.participants, STATE.user?.id),
              messages: newMsgs,
              unread:   newMsgs.length,
              lastTime: new Date(serverConv.updated_time || Date.now()).getTime()
            });
          }
        });
        renderDMList();
      }
    } catch { /* network error, skip */ }
  }, 5000);
}

/* ============================================================
   EMOJI
   ============================================================ */
function toggleEmoji() { document.getElementById('emoji-bar').classList.toggle('hidden'); }
function insertEmoji(e) { const i = document.getElementById('chat-input'); i.value += e; i.focus(); }

/* ============================================================
   NEW MESSAGE MODAL & DIRECT FRIEND CHAT
   ============================================================ */
function openNewMessage() {
  document.getElementById('new-msg-modal').classList.remove('hidden');
  const input = document.getElementById('friend-username-input');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 250);
  }
  const all = STATE.conversations.map(c => c.with).filter(Boolean);
  renderContactsList(all);
}

function closeNewMessage(e) {
  document.getElementById('new-msg-modal').classList.add('hidden');
  const input = document.getElementById('friend-username-input');
  if (input) input.value = '';
}

async function handleStartChat(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('friend-username-input');
  const raw = input?.value.trim() || '';
  const username = raw.replace(/^@/, '');
  if (!username) return;

  const btn = document.getElementById('btn-start-chat');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/conversations/new', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username })
    });
    const result = await res.json();
    if (result.data) {
      const serverConv = result.data;
      let conv = STATE.conversations.find(c => c.id === serverConv.id);
      if (!conv) {
        conv = {
          id:       serverConv.id,
          with:     extractParticipant(serverConv.participants, STATE.user?.id),
          messages: (serverConv.messages || []).map(m => ({
            id:   m.id,
            from: (m.from?.id === STATE.user?.id || m.from === 'me') ? 'me' : 'them',
            text: m.message || m.text || '',
            time: new Date(m.created_time || Date.now()).getTime()
          })),
          unread:   0,
          lastTime: new Date(serverConv.updated_time || Date.now()).getTime()
        };
        STATE.conversations.unshift(conv);
      }
      closeNewMessage();
      renderDMList();
      openChat(conv.id);
    }
  } catch (err) {
    console.error('Failed to create chat:', err);
    showToast('Failed to start chat with @' + username);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderContactsList(contacts) {
  const list = document.getElementById('contacts-list');
  list.innerHTML = '';
  contacts.forEach(c => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.onclick = () => startConversation(c);
    item.innerHTML = `
      <img class="contact-avatar" src="${c.avatar || ''}" alt="${c.name}" onerror="this.src='https://unavatar.io/instagram/${c.handle}'" />
      <div><p class="contact-name">${escHtml(c.name)}</p><p class="contact-handle">@${escHtml(c.handle)}</p></div>`;
    list.appendChild(item);
  });
  if (!contacts.length) {
    list.innerHTML = '<p style="color:var(--text-3);font-size:13px;padding:12px;text-align:center;">No recent contacts yet. Enter any @handle above to start!</p>';
  }
}

function startConversation(contact) {
  closeNewMessage();
  let conv = STATE.conversations.find(c => c.with?.id === contact.id || c.with?.handle === contact.handle);
  if (!conv) {
    conv = { id:'conv_'+contact.handle+'_'+Date.now(), with:contact, messages:[], unread:0, lastTime:Date.now() };
    STATE.conversations.unshift(conv);
  }
  renderDMList();
  openChat(conv.id);
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${tab}`).classList.add('active');

  const hc = document.getElementById('header-center');
  const ni = document.getElementById('header-icon-new');
  const si = document.getElementById('header-icon-settings');

  if (tab === 'dm') {
    hc.innerHTML = '<span class="header-title">Messages</span>';
    ni.classList.remove('hidden'); si.classList.add('hidden');
  } else {
    hc.innerHTML = '<span class="header-title">Profile</span>';
    ni.classList.add('hidden'); si.classList.remove('hidden');
  }
}
function handleHeaderAction() {
  const active = document.querySelector('.tab-content.active')?.id;
  if (active === 'tab-dm') openNewMessage();
  else showToast('Settings saved');
}

/* ============================================================
   SETTINGS
   ============================================================ */
function toggleSetting(key) {
  STATE.settings[key] = !STATE.settings[key];
  document.getElementById(`toggle-${key}`).dataset.on = STATE.settings[key].toString();
  showToast(STATE.settings[key] ? '✅ Enabled' : '🔕 Disabled');
}
function syncConversations() {
  showToast('🔄 Syncing messages…');
  loadConversations().then(() => showToast('✅ Messages synced!'));
}
async function handleLogout() {
  if (!confirm('Disconnect your Instagram account from Dis·Insta?')) return;
  try { await fetch('/api/logout', { method: 'POST' }); } catch {}
  clearInterval(STATE.pollingTimer);
  STATE.user = null;
  STATE.conversations = [];
  STATE.activeConvId = null;
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
  const btn = document.getElementById('ig-login-btn');
  btn.disabled = false;
  btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 36 36" fill="none"><rect x="2" y="2" width="32" height="32" rx="10" stroke="white" stroke-width="2.5"/><circle cx="18" cy="18" r="7" stroke="white" stroke-width="2.5"/><circle cx="26.5" cy="9.5" r="2" fill="white"/></svg><span>Continue with Instagram</span>`;
  showToast('Logged out successfully');
}
function voiceCall() { showToast(`📞 Calling ${document.getElementById('chat-name').textContent}… (coming soon)`); }

/* ============================================================
   NOTIFICATION SOUND
   ============================================================ */
function playNotifSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

/* ============================================================
   TOAST
   ============================================================ */
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
}

/* ============================================================
   UTILS
   ============================================================ */
function timeAgo(ts) {
  const d = Date.now() - ts, m = Math.floor(d/60000), h = Math.floor(d/3600000), day = Math.floor(d/86400000);
  if (m < 1) return 'now'; if (m < 60) return `${m}m`; if (h < 24) return `${h}h`; return `${day}d`;
}
function formatDate(ts) {
  const d = new Date(ts), n = new Date();
  const t = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  if (d.toDateString() === n.toDateString()) return 'Today · ' + t;
  return d.toLocaleDateString([], { month:'short', day:'numeric' }) + ' · ' + t;
}
function fmtNumber(n) { return n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n); }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Shake animation
const ss = document.createElement('style');
ss.textContent = `
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
  .btn-spinner-inline { width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(ss);
