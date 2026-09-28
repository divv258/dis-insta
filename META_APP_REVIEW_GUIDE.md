# 🚀 Complete Meta App Review & Publishing Guide (Option B)

This guide takes you step-by-step through publishing **Dis·Insta** to the public so **any Instagram user** can log in and message without being added as a tester.

---

## Phase 1: Deploy to the Web (Free on Render)

Meta strictly requires a live **HTTPS** website. We recommend **Render** (free, connects to GitHub, free SSL).

### Steps:
1. Go to [Render.com](https://render.com) and sign up with your GitHub account.
2. Click **New +** → **Web Service**.
3. Select your repository: `divv258/dis-insta`.
4. Configure the settings:
   - **Name:** `dis-insta` (or any name you like)
   - **Region:** Closest to you (e.g., Singapore or Frankfurt)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and add the following:
   | Key | Value |
   |---|---|
   | `IG_APP_ID` | `2607844902963089` |
   | `IG_APP_SECRET` | `3569cf78ccf9f93eb56557a90a8bdee2` |
   | `REDIRECT_URI` | `https://dis-insta.onrender.com/auth/callback` *(replace with your actual Render URL)* |
   | `SESSION_SECRET` | *(any long random string)* |
   | `PORT` | `3000` |
6. Click **Deploy Web Service**.
7. Once deployed, copy your live URL (e.g. `https://dis-insta.onrender.com`).

---

## Phase 2: Update Meta Developer App Settings

1. Open your [Meta Developer Dashboard](https://developers.facebook.com/apps/2607844902963089/settings/basic/).
2. In the left sidebar, click **App settings** → **Basic**:
   - **App Domains:** `dis-insta.onrender.com` *(without https://)*
   - **Privacy Policy URL:** `https://dis-insta.onrender.com/privacy`
   - **Terms of Service URL:** `https://dis-insta.onrender.com/terms`
   - **User Data Deletion:** Choose **Data Deletion Instructions URL** and enter:
     `https://dis-insta.onrender.com/data-deletion`
   - **Category:** Select **Communication** or **Messaging**
   - Click **Save changes** at the bottom.
3. In the left sidebar, go to **Instagram** (or Products) → **API Setup with Instagram**:
   - Under **Valid OAuth Redirect URIs**, add:
     `https://dis-insta.onrender.com/auth/callback`
   - Click **Save changes**.

---

## Phase 3: Submit for Meta App Review

Meta requires you to request approval for the permissions used by your app:
1. `instagram_business_basic`
2. `instagram_business_manage_messages`

### How to submit:
1. In your Meta Dashboard sidebar, click **App Review** → **Permissions and Features**.
2. Search for **`instagram_business_manage_messages`** and click **Request**.
3. Search for **`instagram_business_basic`** and click **Request**.
4. Click **Continue** (or **Edit Details**).

---

## Phase 4: What to Write in the Review Form (Copy & Paste)

Meta will ask: *"How will your app use this permission?"*

### For `instagram_business_basic`:
> *"Dis·Insta is a focused web messaging client for Instagram. We use instagram_business_basic to authenticate the user and display their username, profile photo, and follower metrics in their profile tab."*

### For `instagram_business_manage_messages`:
> *"Dis·Insta provides a distraction-free direct messaging interface without reels or algorithmic feeds. We use instagram_business_manage_messages to fetch the user's active DM conversations and deliver user-composed direct messages to their contacts via the official Instagram Graph API."*

---

## Phase 5: Screen Recording Video (Required by Meta)

Meta requires a **1–2 minute screen recording (video)** showing how the app works. You can record your screen using Windows Game Bar (`Win + G`) or OBS Studio:

### In the video, record these 4 steps:
1. **Show Login:** Open `https://dis-insta.onrender.com` and click **Continue with Instagram**.
2. **Show Instagram OAuth:** Show the official Instagram permission consent screen approving the app.
3. **Show Messages Screen:** Show the redirected app with your profile loaded and the Messages screen.
4. **Show Sending a Message:** Open or start a chat with a contact, type a message, and click **Send**. Show that the message appears in the chat thread.

Save the recording (MP4) and upload it directly into the Meta App Review form.

---

## Phase 6: Switch App from "Development" to "Live"

1. In the top navbar of your Meta Developer Dashboard, look for the **App Mode** toggle (currently shows **In development**).
2. Once your App Review is submitted and approved by Meta (typically **2 to 4 business days**), flip the toggle to **Live**.
3. 🎉 **Your app is now fully public!** Any person anywhere on Instagram can visit your URL, log in, and use Dis·Insta.
