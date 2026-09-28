/* ============================
   DIS·INSTA — app.js
   ============================ */

'use strict';

/* ============================================================
   STATE
   ============================================================ */
const STATE = {
  user: null,          // logged-in user object
  conversations: [],   // array of conversation objects
  contacts: [],        // all importable contacts
  activeConvId: null,  // currently open conversation id
  settings: {
    notif: true,
    sounds: true,
    readreceipts: true
  },
  unreadCount: 0
};

/* ============================================================
   MOCK DATA — simulated Instagram contacts & conversations
   ============================================================ */
const MOCK_USERS = [
  { id:'u1', name:'Aryan Kapoor',   handle:'aryan.kapoor',   avatar:'https://i.pravatar.cc/150?img=11', bio:'📍 Mumbai | Photographer', followers:'12.4K', following:'892', online:true },
  { id:'u2', name:'Priya Sharma',   handle:'priya.sharma',   avatar:'https://i.pravatar.cc/150?img=5',  bio:'Coffee & Code ☕', followers:'8.2K',  following:'340', online:false },
  { id:'u3', name:'Rohan Mehta',    handle:'rohan_mehta',    avatar:'https://i.pravatar.cc/150?img=12', bio:'Traveller 🌏 | Food lover', followers:'5.6K', following:'780', online:true },
  { id:'u4', name:'Sneha Gupta',    handle:'sneha.g',        avatar:'https://i.pravatar.cc/150?img=9',  bio:'Artist & Dreamer 🎨', followers:'3.1K', following:'210', online:false },
  { id:'u5', name:'Vikram Singh',   handle:'vikramsingh',    avatar:'https://i.pravatar.cc/150?img=15', bio:'Fitness | Nutrition 💪', followers:'21K', following:'1.2K', online:true },
  { id:'u6', name:'Ananya Joshi',   handle:'ananya.joshi',   avatar:'https://i.pravatar.cc/150?img=44', bio:'Books & Music 📚🎵', followers:'4.7K', following:'560', online:false },
  { id:'u7', name:'Karan Malhotra', handle:'karan.malhotra', avatar:'https://i.pravatar.cc/150?img=13', bio:'Startup guy 🚀', followers:'9.3K', following:'902', online:true },
  { id:'u8', name:'Ritika Bose',    handle:'ritika.b',       avatar:'https://i.pravatar.cc/150?img=48', bio:'Fashion & Lifestyle ✨', followers:'18K', following:'640', online:false },
];

function buildMockConversations(username) {
  const now = Date.now();
  return [
    {
      id: 'c1', with: MOCK_USERS[0],
      messages: [
        { id:'m1', from:'them', text:'Hey! How are you doing? 😊', time: now - 1000*60*5 },
        { id:'m2', from:'me',   text:'I\'m great! Just saw your story 🔥', time: now - 1000*60*4 },
        { id:'m3', from:'them', text:'haha yeah that was a wild sunset!', time: now - 1000*60*3 },
        { id:'m4', from:'them', text:'We should catch up soon 🙌', time: now - 1000*60*2 },
      ],
      unread: 1, lastTime: now - 1000*60*2
    },
    {
      id: 'c2', with: MOCK_USERS[1],
      messages: [
        { id:'m1', from:'me',   text:'Did you finish that project?', time: now - 1000*60*60 },
        { id:'m2', from:'them', text:'Almost! One more thing left 😅', time: now - 1000*60*55 },
        { id:'m3', from:'me',   text:'You\'ve got this!', time: now - 1000*60*50 },
      ],
      unread: 0, lastTime: now - 1000*60*50
    },
    {
      id: 'c3', with: MOCK_USERS[2],
      messages: [
        { id:'m1', from:'them', text:'Bro the food here is insane 🤤', time: now - 1000*60*60*3 },
        { id:'m2', from:'me',   text:'Where are you?!', time: now - 1000*60*60*2.9 },
        { id:'m3', from:'them', text:'Goa! You should visit 🌊', time: now - 1000*60*60*2.8 },
      ],
      unread: 2, lastTime: now - 1000*60*60*2.8
    },
    {
      id: 'c4', with: MOCK_USERS[4],
      messages: [
        { id:'m1', from:'them', text:'New workout plan dropping tomorrow 💪', time: now - 1000*60*60*8 },
        { id:'m2', from:'me',   text:'Can\'t wait! 🔥', time: now - 1000*60*60*7.5 },
      ],
      unread: 0, lastTime: now - 1000*60*60*7.5
    },
    {
      id: 'c5', with: MOCK_USERS[6],
      messages: [
        { id:'m1', from:'them', text:'Let\'s collab on that idea 🚀', time: now - 1000*60*60*24 },
        { id:'m2', from:'me',   text:'Yes! DM me the details', time: now - 1000*60*60*23 },
        { id:'m3', from:'them', text:'Sending it over now 📩', time: now - 1000*60*60*22.5 },
      ],
      unread: 1, lastTime: now - 1000*60*60*22.5
    }
  ];
}

/* ============================================================
   LOGIN
   ============================================================ */
function handleLogin() {
  const input = document.getElementById('username-input');
  const username = input.value.trim().replace(/^@/, '');

  if (!username) {
    shakeElement(input.parentElement);
    showToast('Please enter your Instagram username');
    return;
  }
  if (username.length < 2) {
    shakeElement(input.parentElement);
    showToast('Username must be at least 2 characters');
    return;
  }

  // Show loading state
  const btn = document.getElementById('connect-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Connecting…';
  btn.querySelector('.btn-spinner').classList.remove('hidden');

  setTimeout(() => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('login-connecting').classList.remove('hidden');
  }, 800);

  setTimeout(() => {
    // Build user profile from username
    const avatarSeed = Math.floor(Math.random() * 70) + 1;
    STATE.user = {
      name: toTitleCase(username.replace(/[._]/g, ' ')),
      handle: username,
      avatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
      bio: 'Using Dis·Insta 💬',
      followers: fmtNumber(Math.floor(Math.random() * 15000) + 500),
      following: fmtNumber(Math.floor(Math.random() * 800) + 50),
    };
    STATE.conversations = buildMockConversations(username);
    STATE.contacts = MOCK_USERS;
    STATE.unreadCount = STATE.conversations.reduce((s, c) => s + c.unread, 0);

    // Save to localStorage
    localStorage.setItem('dis_insta_user', JSON.stringify(STATE.user));

    loadApp();
  }, 3000);
}

/* ============================================================
   LOAD APP
   ============================================================ */
function loadApp() {
  // Switch screens
  document.getElementById('login-screen').classList.remove('active');
  const appScreen = document.getElementById('app-screen');
  appScreen.classList.add('active');

  populateProfile();
  renderDMList();
  switchTab('dm');
  startRealTimeSimulation();
}

/* ============================================================
   PROFILE
   ============================================================ */
function populateProfile() {
  const u = STATE.user;
  document.getElementById('profile-name').textContent = u.name;
  document.getElementById('profile-handle').textContent = '@' + u.handle;
  document.getElementById('profile-bio').textContent = u.bio;
  document.getElementById('stat-followers').textContent = u.followers;
  document.getElementById('stat-following').textContent = u.following;
  document.getElementById('stat-messages').textContent = STATE.conversations.length;
  document.getElementById('connected-account-desc').textContent = '@' + u.handle;

  const avatarEls = [
    document.getElementById('profile-avatar'),
    document.getElementById('nav-avatar')
  ];
  avatarEls.forEach(el => {
    if (el) { el.src = u.avatar; el.alt = u.name; }
  });
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(tab) {
  // Update content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${tab}`).classList.add('active');

  // Update header
  const headerCenter = document.getElementById('header-center');
  const newIcon    = document.getElementById('header-icon-new');
  const settingsIcon = document.getElementById('header-icon-settings');

  if (tab === 'dm') {
    headerCenter.innerHTML = '<span class="header-title">Messages</span>';
    newIcon.classList.remove('hidden');
    settingsIcon.classList.add('hidden');
  } else {
    headerCenter.innerHTML = '<span class="header-title">Profile</span>';
    newIcon.classList.add('hidden');
    settingsIcon.classList.remove('hidden');
  }
}

function handleHeaderAction() {
  const activeTab = document.querySelector('.tab-content.active').id;
  if (activeTab === 'tab-dm') {
    openNewMessage();
  } else {
    showToast('Settings updated');
  }
}

/* ============================================================
   DM LIST
   ============================================================ */
function renderDMList() {
  const list = document.getElementById('dm-list');
  list.innerHTML = '';

  const sorted = [...STATE.conversations].sort((a,b) => b.lastTime - a.lastTime);

  if (sorted.length === 0) {
    document.getElementById('dm-empty').classList.remove('hidden');
    return;
  }

  sorted.forEach(conv => {
    const last = conv.messages[conv.messages.length - 1];
    const item = document.createElement('div');
    item.className = 'dm-item';
    item.id = `conv-${conv.id}`;
    item.onclick = () => openChat(conv.id);

    const isOnline = conv.with.online;
    const hasUnread = conv.unread > 0;

    item.innerHTML = `
      <div class="dm-avatar-wrap">
        ${hasUnread ? '<div class="dm-avatar-story"></div>' : ''}
        <img class="dm-avatar" src="${conv.with.avatar}" alt="${conv.with.name}" />
        ${isOnline ? '<div class="dm-avatar-online"></div>' : ''}
      </div>
      <div class="dm-body">
        <div class="dm-row1">
          <span class="dm-name">${conv.with.name}</span>
          <span class="dm-time">${timeAgo(conv.lastTime)}</span>
        </div>
        <div class="dm-row2">
          <span class="dm-preview ${hasUnread ? 'unread' : ''}">
            ${last.from === 'me' ? 'You: ' : ''}${last.text}
          </span>
          ${hasUnread ? `<div class="dm-unread-dot"></div>` : ''}
        </div>
      </div>
    `;
    list.appendChild(item);
  });

  updateBadge();
}

function updateBadge() {
  const total = STATE.conversations.reduce((s, c) => s + c.unread, 0);
  const badge = document.getElementById('dm-badge');
  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : total;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/* ============================================================
   CHAT
   ============================================================ */
function openChat(convId) {
  const conv = STATE.conversations.find(c => c.id === convId);
  if (!conv) return;

  STATE.activeConvId = convId;

  // Mark read
  conv.unread = 0;
  renderDMList();

  // Populate header
  document.getElementById('chat-avatar').src = conv.with.avatar;
  document.getElementById('chat-name').textContent = conv.with.name;
  document.getElementById('chat-status').textContent = conv.with.online ? 'Active now' : 'Active recently';

  // Render messages
  renderMessages(conv);

  // Open screen
  const chatScreen = document.getElementById('chat-screen');
  chatScreen.classList.add('open');

  // Focus input
  setTimeout(() => document.getElementById('chat-input').focus(), 350);
}

function closeChat() {
  document.getElementById('chat-screen').classList.remove('open');
  STATE.activeConvId = null;
  // hide emoji bar
  document.getElementById('emoji-bar').classList.add('hidden');
}

function renderMessages(conv) {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';

  let lastDate = null;

  conv.messages.forEach((msg, i) => {
    const dateStr = formatDate(msg.time);
    if (dateStr !== lastDate) {
      const divider = document.createElement('div');
      divider.className = 'msg-time';
      divider.textContent = dateStr;
      container.appendChild(divider);
      lastDate = dateStr;
    }

    const isMe = msg.from === 'me';
    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${isMe ? 'mine' : 'theirs'}`;

    wrap.innerHTML = `
      ${!isMe ? `<img class="msg-avatar-sm" src="${conv.with.avatar}" alt="" />` : ''}
      <div class="bubble ${isMe ? 'mine' : 'theirs'}">${escHtml(msg.text)}</div>
    `;
    container.appendChild(wrap);
  });

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !STATE.activeConvId) return;

  const conv = STATE.conversations.find(c => c.id === STATE.activeConvId);
  if (!conv) return;

  const msg = {
    id: 'msg_' + Date.now(),
    from: 'me',
    text: text,
    time: Date.now()
  };

  conv.messages.push(msg);
  conv.lastTime = msg.time;
  input.value = '';

  renderMessages(conv);
  renderDMList();

  // Hide emoji bar
  document.getElementById('emoji-bar').classList.add('hidden');

  // Simulate reply after 1.5-4s
  simulateReply(conv);
}

// Allow Enter key to send
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  const usernameInput = document.getElementById('username-input');
  if (usernameInput) {
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  // Check saved session
  const saved = localStorage.getItem('dis_insta_user');
  if (saved) {
    try {
      STATE.user = JSON.parse(saved);
      STATE.conversations = buildMockConversations(STATE.user.handle);
      STATE.contacts = MOCK_USERS;
      STATE.unreadCount = STATE.conversations.reduce((s, c) => s + c.unread, 0);
      loadApp();
    } catch(e) {
      localStorage.removeItem('dis_insta_user');
    }
  }
});

/* ============================================================
   REAL-TIME SIMULATION
   ============================================================ */
const REPLY_TEMPLATES = [
  'That sounds amazing! 🤩',
  'haha yes exactly 😂',
  'No way!! 😱',
  'I was thinking the same thing!',
  'okay okay I see you 👀',
  'let\'s do it!!',
  '❤️',
  'omg yes please 🙏',
  'lol okay fine 😭',
  'you\'re so right about that',
  'miss you!! let\'s meet up soon 🥺',
  'wait what really?? 😮',
  '🔥🔥🔥',
  'absolutely!! 💯',
  'hahaha I can\'t 😂',
];

function simulateReply(conv) {
  const delay = 1500 + Math.random() * 2500;
  setTimeout(() => {
    if (!conv) return;

    const text = REPLY_TEMPLATES[Math.floor(Math.random() * REPLY_TEMPLATES.length)];
    const msg = {
      id: 'msg_' + Date.now(),
      from: 'them',
      text: text,
      time: Date.now()
    };

    conv.messages.push(msg);
    conv.lastTime = msg.time;

    if (STATE.activeConvId === conv.id) {
      // Chat is open → render immediately
      renderMessages(conv);
    } else {
      // Chat is closed → show unread
      conv.unread += 1;
    }
    renderDMList();

    if (STATE.settings.sounds && STATE.activeConvId !== conv.id) {
      playNotifSound();
    }
  }, delay);
}

function startRealTimeSimulation() {
  // Randomly ping with a new message every 20-60s
  const ping = () => {
    const open = STATE.conversations.filter(c => c.id !== STATE.activeConvId);
    if (open.length > 0) {
      const conv = open[Math.floor(Math.random() * open.length)];
      simulateReply(conv);
    }
    setTimeout(ping, 20000 + Math.random() * 40000);
  };
  setTimeout(ping, 10000 + Math.random() * 15000);
}

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

/* ============================================================
   EMOJI
   ============================================================ */
function toggleEmoji() {
  const bar = document.getElementById('emoji-bar');
  bar.classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const input = document.getElementById('chat-input');
  input.value += emoji;
  input.focus();
}

/* ============================================================
   NEW MESSAGE MODAL
   ============================================================ */
function openNewMessage() {
  document.getElementById('new-msg-modal').classList.remove('hidden');
  renderContactsList(STATE.contacts);
  setTimeout(() => document.getElementById('contact-search').focus(), 300);
}

function closeNewMessage(e) {
  document.getElementById('new-msg-modal').classList.add('hidden');
  document.getElementById('contact-search').value = '';
}

function renderContactsList(contacts) {
  const list = document.getElementById('contacts-list');
  list.innerHTML = '';
  contacts.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.onclick = () => startConversation(contact);
    item.innerHTML = `
      <img class="contact-avatar" src="${contact.avatar}" alt="${contact.name}" />
      <div>
        <p class="contact-name">${contact.name}</p>
        <p class="contact-handle">@${contact.handle}</p>
      </div>
    `;
    list.appendChild(item);
  });
}

function filterContacts(query) {
  const q = query.toLowerCase();
  const filtered = STATE.contacts.filter(c =>
    c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
  );
  renderContactsList(filtered);
}

function startConversation(contact) {
  closeNewMessage();

  // Check if conv already exists
  let conv = STATE.conversations.find(c => c.with.id === contact.id);
  if (!conv) {
    conv = {
      id: 'c_' + Date.now(),
      with: contact,
      messages: [],
      unread: 0,
      lastTime: Date.now()
    };
    STATE.conversations.unshift(conv);
  }

  renderDMList();
  openChat(conv.id);
}

/* ============================================================
   PROFILE SETTINGS
   ============================================================ */
function toggleSetting(key) {
  STATE.settings[key] = !STATE.settings[key];
  const toggle = document.getElementById(`toggle-${key}`);
  toggle.dataset.on = STATE.settings[key].toString();
  showToast(STATE.settings[key] ? '✅ Enabled' : '🔕 Disabled');
}

function syncContacts() {
  showToast('🔄 Syncing contacts…');
  setTimeout(() => showToast('✅ Contacts synced!'), 2000);
}

function openConnectedAccount() {
  showToast(`Connected as @${STATE.user.handle}`);
}

function handleLogout() {
  if (confirm('Disconnect your Instagram account from Dis·Insta?')) {
    localStorage.removeItem('dis_insta_user');
    STATE.user = null;
    STATE.conversations = [];
    STATE.activeConvId = null;

    document.getElementById('app-screen').classList.remove('active');
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('active');

    // Reset form
    document.getElementById('username-input').value = '';
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('login-connecting').classList.add('hidden');
    const btn = document.getElementById('connect-btn');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Connect Instagram Account';
    btn.querySelector('.btn-spinner').classList.add('hidden');

    showToast('Logged out successfully');
  }
}

function voiceCall() {
  const name = document.getElementById('chat-name').textContent;
  showToast(`📞 Calling ${name}… (feature coming soon)`);
}

/* ============================================================
   TOAST
   ============================================================ */
let _toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function fmtNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.4s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

// Add shake animation to CSS dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}`;
document.head.appendChild(shakeStyle);
