/**
 * DIS·INSTA — server.js
 * Node.js / Express backend for Instagram OAuth
 *
 * Instagram Basic Display API OAuth flow:
 * 1. User clicks "Login with Instagram" → redirected to Instagram auth page
 * 2. Instagram redirects back to /auth/callback with a `code`
 * 3. We exchange the code for an access_token (server-side, secret is safe)
 * 4. We fetch the user's profile & store token in session
 * 5. Frontend communicates with our server, never touches Instagram directly
 */

require('dotenv').config();
const express        = require('express');
const session        = require('express-session');
const axios          = require('axios');
const cors           = require('cors');
const path           = require('path');
const crypto         = require('crypto');
const fs             = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Config ────────────────────────────────────────────────
const IG_APP_ID      = process.env.IG_APP_ID      || '';
const IG_APP_SECRET  = process.env.IG_APP_SECRET  || '';
const REDIRECT_URI   = process.env.REDIRECT_URI   || `http://localhost:${PORT}/auth/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DEV_TOKEN      = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const DEV_USER_ID    = process.env.INSTAGRAM_USER_ID      || '';

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────

/**
 * GET /auth/dev-login
 * DEV ONLY: Auto-login using the token from .env
 * Fetches real profile from Instagram API using the stored token
 */
app.get('/auth/dev-login', async (req, res) => {
  if (!DEV_TOKEN || !DEV_USER_ID) {
    return res.redirect('/?error=no_dev_token');
  }
  try {
    const profileRes = await axios.get(`https://graph.instagram.com/v21.0/${DEV_USER_ID}`, {
      params: {
        fields:       'id,name,username,profile_picture_url,biography,followers_count,follows_count',
        access_token: DEV_TOKEN
      }
    });
    const p = profileRes.data;
    req.session.user = {
      id:          p.id,
      name:        p.name || p.username,
      handle:      p.username,
      avatar:      p.profile_picture_url || '',
      bio:         p.biography || '',
      followers:   p.followers_count || 0,
      following:   p.follows_count   || 0,
      accessToken: DEV_TOKEN
    };
    console.log(`✅ Dev login: @${p.username}`);
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('Dev login error:', err.response?.data || err.message);
    // Fallback: create session from env vars even if profile fetch fails
    req.session.user = {
      id:          DEV_USER_ID,
      name:        'Divyanshu',
      handle:      'divyansh.27_',
      avatar:      '',
      bio:         'Using Pingo 💬',
      followers:   0,
      following:   0,
      accessToken: DEV_TOKEN
    };
    res.redirect('/?auth=success');
  }
});

/**
 * GET /auth/instagram
 * Redirects user to Instagram's OAuth authorization page
 */
app.get('/auth/instagram', (req, res) => {
  if (!IG_APP_ID) {
    return res.status(500).json({
      error: 'Instagram App ID not configured. Please add IG_APP_ID to your .env file.'
    });
  }

  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id:     IG_APP_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         'instagram_business_basic,instagram_business_manage_messages',
    response_type: 'code',
    state:         state
  });

  const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Instagram redirects here after user authorizes the app
 */
app.get('/auth/callback', async (req, res) => {
  const { code, state, error, error_reason } = req.query;

  // Handle user denial
  if (error) {
    console.error('Instagram OAuth error:', error_reason);
    return res.redirect('/?error=access_denied');
  }

  // Validate state to prevent CSRF
  if (state !== req.session.oauthState) {
    return res.redirect('/?error=invalid_state');
  }
  delete req.session.oauthState;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Step 1: Exchange code for short-lived access token
    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id:     IG_APP_ID,
        client_secret: IG_APP_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
        code:          code
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, user_id } = tokenRes.data;

    // Step 2: Exchange for long-lived token (60 days)
    const longTokenRes = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type:        'ig_exchange_token',
        client_secret:     IG_APP_SECRET,
        access_token:      access_token
      }
    });

    const longToken = longTokenRes.data.access_token;

    // Step 3: Fetch user profile
    const profileRes = await axios.get(`https://graph.instagram.com/v21.0/${user_id}`, {
      params: {
        fields:       'id,name,username,profile_picture_url,biography,followers_count,follows_count',
        access_token: longToken
      }
    });

    const profile = profileRes.data;

    // Store in session
    req.session.user = {
      id:           profile.id,
      name:         profile.name || profile.username,
      handle:       profile.username,
      avatar:       profile.profile_picture_url || '',
      bio:          profile.biography || '',
      followers:    profile.followers_count || 0,
      following:    profile.follows_count   || 0,
      accessToken:  longToken
    };

    console.log(`✅ User logged in: @${profile.username}`);
    res.redirect('/?auth=success');

  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    res.redirect('/?error=token_exchange_failed');
  }
});

/**
 * GET /api/me
 * Returns the currently logged-in user's profile
 */
app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // Don't expose the access token to the frontend
  const { accessToken, ...safeUser } = req.session.user;
  res.json(safeUser);
});

// ─── Data Persistence ──────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, 'data');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONV_FILE)) {
    fs.writeFileSync(CONV_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getSavedConversations() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(CONV_FILE, 'utf-8');
    return JSON.parse(raw) || [];
  } catch (err) {
    return [];
  }
}

function saveConversations(convs) {
  ensureDataDir();
  fs.writeFileSync(CONV_FILE, JSON.stringify(convs, null, 2), 'utf-8');
}

/**
 * GET /api/conversations
 * Fetch user conversations (combines Instagram API and user-created threads)
 */
app.get('/api/conversations', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { accessToken, id } = req.session.user;
  const localConvs = getSavedConversations();

  let igConvs = [];
  try {
    // Attempt to query real Instagram Graph API conversations
    const response = await axios.get(
      `https://graph.instagram.com/v21.0/${id}/conversations`,
      {
        params: {
          platform:     'instagram',
          fields:       'id,updated_time,participants{id,username,name,profile_pic},messages{id,message,from,created_time}',
          access_token: accessToken
        },
        timeout: 5000
      }
    );

    igConvs = (response.data.data || []).map(conv => ({
      id:           conv.id,
      updated_time: conv.updated_time,
      participants: conv.participants?.data || [],
      messages:     (conv.messages?.data || []).reverse()
    }));
  } catch (err) {
    console.log('IG API convs notice:', err.response?.data?.error?.message || err.message);
  }

  // Merge IG conversations into local ones
  const combined = [...localConvs];
  for (const ig of igConvs) {
    const idx = combined.findIndex(c => c.id === ig.id);
    if (idx >= 0) {
      combined[idx] = ig;
    } else {
      combined.unshift(ig);
    }
  }

  res.json({ data: combined });
});

/**
 * POST /api/conversations/new
 * Start a conversation with an Instagram friend by their username
 */
app.post('/api/conversations/new', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  let { username, name } = req.body;
  if (!username) return res.status(400).json({ error: 'Instagram username is required' });

  username = username.replace(/^@/, '').trim().toLowerCase();
  const convs = getSavedConversations();

  // Check if thread already exists with this username
  let existing = convs.find(c =>
    (c.participants || []).some(p => p.username?.toLowerCase() === username || p.id === username)
  );

  if (existing) {
    return res.json({ data: existing });
  }

  const newConv = {
    id:           'conv_' + username + '_' + Date.now(),
    updated_time: new Date().toISOString(),
    participants: [{
      id:          username,
      username:    username,
      name:        name || username,
      profile_pic: `https://unavatar.io/instagram/${username}`
    }],
    messages: []
  };

  convs.unshift(newConv);
  saveConversations(convs);

  console.log(`💬 Created new conversation with @${username}`);
  res.json({ data: newConv });
});

/**
 * GET /api/messages/:conversationId
 * Fetch messages for a specific conversation
 */
app.get('/api/messages/:conversationId', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { conversationId } = req.params;
  const convs = getSavedConversations();
  const conv = convs.find(c => c.id === conversationId);

  if (conv) {
    return res.json({ data: conv.messages });
  }

  // If numeric IG conversation ID, query Graph API
  try {
    const { accessToken } = req.session.user;
    const response = await axios.get(
      `https://graph.instagram.com/v21.0/${conversationId}`,
      {
        params: {
          fields:       'id,messages{id,message,from,created_time}',
          access_token: accessToken
        },
        timeout: 5000
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

/**
 * POST /api/send
 * Send an Instagram DM (persists in Dis·Insta and pushes to Instagram API)
 */
app.post('/api/send', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  const { accessToken, id } = req.session.user;
  const { conversationId, recipient_id, message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const newMsg = {
    id:           'msg_' + Date.now(),
    message:      message.trim(),
    from:         { id: id },
    created_time: new Date().toISOString()
  };

  // 1. Persist to local conversation store
  const convs = getSavedConversations();
  let conv = convs.find(c =>
    c.id === conversationId ||
    (c.participants || []).some(p => p.id === recipient_id || p.username === recipient_id)
  );

  if (conv) {
    conv.messages = conv.messages || [];
    conv.messages.push(newMsg);
    conv.updated_time = new Date().toISOString();
    saveConversations(convs);
  }

  // 2. If recipient is a numeric IGSID, send via Meta Graph API
  const isNumeric = recipient_id && /^\d+$/.test(recipient_id);

  if (isNumeric) {
    try {
      const response = await axios.post(
        `https://graph.instagram.com/v21.0/${id}/messages`,
        {
          recipient: { id: recipient_id },
          message:   { text: message.trim() }
        },
        {
          params:  { access_token: accessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 6000
        }
      );
      console.log(`✉️  Sent message to ${recipient_id} via Instagram API`);
      return res.json({ success: true, delivered: true, message: newMsg, message_id: response.data?.message_id });
    } catch (err) {
      const igErr = err.response?.data?.error;
      console.log('IG API direct delivery notice:', igErr?.message || err.message);
      return res.json({
        success: true,
        delivered: false,
        message: newMsg,
        dev_note: 'Message saved in Dis·Insta. In Meta Dev Mode, add your friend as an Instagram Tester in Meta Developer Console to enable live DM push.'
      });
    }
  }

  // Recipient was given by @handle
  console.log(`✉️  Saved message for @${recipient_id}:`, message.substring(0, 30));
  res.json({
    success: true,
    delivered: false,
    message: newMsg,
    dev_note: `Message saved in Dis·Insta. In Meta Dev Mode, add @${recipient_id} as an Instagram Tester in Meta Developer Console to enable live DM push.`
  });
});

/**
 * POST /api/logout
 * Clear session
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ─── Legal & Compliance Pages (Required for Meta App Review) ─
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/data-deletion', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data-deletion.html'));
});

// Catch-all → serve frontend (Express 5 compatible wildcard)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Dis·Insta server running at http://localhost:${PORT}`);
  console.log(`📷 Instagram OAuth callback: ${REDIRECT_URI}`);
  if (!IG_APP_ID) {
    console.warn('\n⚠️  WARNING: IG_APP_ID is not set in .env');
    console.warn('   Follow SETUP.md to create your Meta Developer app\n');
  }
});
