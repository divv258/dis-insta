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

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Config ────────────────────────────────────────────────
const IG_APP_ID      = process.env.IG_APP_ID      || '';
const IG_APP_SECRET  = process.env.IG_APP_SECRET  || '';
const REDIRECT_URI   = process.env.REDIRECT_URI   || `http://localhost:${PORT}/auth/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

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

/**
 * GET /api/conversations
 * Fetch user's Instagram DM conversations
 * Uses Instagram Business Messaging API
 */
app.get('/api/conversations', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { accessToken, id } = req.session.user;

    const response = await axios.get(
      `https://graph.instagram.com/v21.0/${id}/conversations`,
      {
        params: {
          fields:       'id,updated_time,participants,messages{id,message,from,created_time}',
          access_token: accessToken
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Conversations error:', err.response?.data || err.message);
    // Return mock data in development if API not available
    res.json({ data: [], error: err.response?.data?.error?.message });
  }
});

/**
 * GET /api/messages/:conversationId
 * Fetch messages in a specific conversation
 */
app.get('/api/messages/:conversationId', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { accessToken } = req.session.user;
    const { conversationId } = req.params;

    const response = await axios.get(
      `https://graph.instagram.com/v21.0/${conversationId}`,
      {
        params: {
          fields:       'id,messages{id,message,from,created_time,attachments}',
          access_token: accessToken
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Messages error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'Failed to fetch messages' });
  }
});

/**
 * POST /api/send
 * Send a message to a user
 */
app.post('/api/send', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { accessToken, id } = req.session.user;
    const { recipient_id, message } = req.body;

    if (!recipient_id || !message) {
      return res.status(400).json({ error: 'recipient_id and message are required' });
    }

    const response = await axios.post(
      `https://graph.instagram.com/v21.0/${id}/messages`,
      {
        recipient: { id: recipient_id },
        message:   { text: message }
      },
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    res.json({ success: true, message_id: response.data.message_id });
  } catch (err) {
    console.error('Send error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || 'Failed to send message' });
  }
});

/**
 * POST /api/logout
 * Clear session
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
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
