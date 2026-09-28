# 📖 Dis·Insta — Meta Developer Setup Guide

Follow these steps to connect your **real** Instagram account.
Takes about **10 minutes**.

---

## Step 1 — Create a Meta Developer Account

1. Go to **https://developers.facebook.com/**
2. Click **"Get Started"** and log in with your Facebook account
3. Accept the developer terms

---

## Step 2 — Create a New App

1. Click **"Create App"**
2. Choose **"Other"** → click Next
3. Select **"Business"** as app type → Next
4. Fill in:
   - **App Name**: `Dis Insta`
   - **App Contact Email**: your email
5. Click **"Create App"**

---

## Step 3 — Add Instagram Product

1. On your app dashboard, scroll to **"Add a Product"**
2. Find **"Instagram"** → click **"Set up"**
3. On the Instagram page, go to **"API setup with Instagram login"**

---

## Step 4 — Add Your Instagram Account as a Test User

1. Go to **App Roles → Roles** in the left sidebar
2. Click **"Add People"** → **"Instagram Testers"**
3. Enter your Instagram username and send the invite
4. On Instagram:
   - Go to **Settings → Apps and Websites → Tester Invites**
   - Accept the invite

---

## Step 5 — Configure OAuth Redirect URI

1. In your app, go to **Instagram → API setup with Instagram login**
2. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   http://localhost:3000/auth/callback
   ```
3. Click **Save**

---

## Step 6 — Get Your Credentials

1. Go to **App Settings → Basic**
2. Copy your **App ID** and **App Secret**

---

## Step 7 — Create Your .env File

In the `dis-insta` project folder, create a file named `.env`:

```
IG_APP_ID=YOUR_APP_ID_HERE
IG_APP_SECRET=YOUR_APP_SECRET_HERE
REDIRECT_URI=http://localhost:3000/auth/callback
PORT=3000
SESSION_SECRET=any_random_long_string_here
```

Replace the values with your actual credentials.

---

## Step 8 — Run the App

```powershell
cd "c:\Users\divya\Documents\New folder\dis-insta"
npm start
```

Then open your browser and go to: **http://localhost:3000**

Click **"Continue with Instagram"** — you'll be redirected to Instagram's login page!

---

## ⚠️ Important Notes

- **Never commit your `.env` file** — it's already in `.gitignore`
- The app uses **Instagram Business API** for DMs, which requires your account to be a **Professional (Business or Creator) account**
- To convert: Instagram → Settings → Account → Switch to Professional Account (it's free)
- While in **Development Mode**, only Test Users you added in Step 4 can log in

---

## 🚀 Going Live (Optional)

To let other people use the app:
1. In Meta Developer Console → App Review
2. Request the `instagram_business_manage_messages` permission
3. Meta reviews and approves (~1-2 weeks)
4. Switch app to **Live mode**
