# Restoration Quote Tool - Complete Setup Guide

A full quote management system for Restoration Pressure Washing LLC. Customers fill out a form on your Hostinger site, you get instant email notifications, and you manage everything through a private admin dashboard.

**What you're building:**
- **Customer form** (embedded in your Hostinger site): multi-service calculator with property auto-lookup
- **Admin dashboard** (private, password-protected): see all quotes, change status, add notes
- **Settings page**: adjust pricing, behavior, and business info anytime without touching code
- **Email alerts** (instant): get notified the moment someone submits
- **Database** (Supabase): all quotes saved permanently, accessible from anywhere
- **One-click updates**: future improvements deploy via GitHub Sync button

**Cost: $0/month** for everything until you outgrow the free tiers.

---

## Before You Start

To deploy, you'll need the **template repo URL** - I'll give this to you when you're ready to deploy. It looks like:

`https://github.com/your-template-repo/restoration-quote-tool`

Have it ready before starting Part 4.

---

## Setup Order (do these in order, ~45 minutes total)

1. ☐ Sign up for Supabase (database)
2. ☐ Sign up for RentCast (property lookup)
3. ☐ Sign up for Resend (email alerts)
4. ☐ Create GitHub repo + upload files
5. ☐ Deploy on Vercel
6. ☐ Configure environment variables
7. ☐ Create your admin login
8. ☐ Embed in Hostinger
9. ☐ Test end-to-end

---

## Part 1: Set Up Supabase Database (10 minutes)

Supabase is your database, login system, and admin storage. Free tier covers thousands of quotes/month.

### Step 1: Create account
1. Go to **supabase.com**
2. Click "Start your project"
3. Sign up with GitHub (easiest) or email

### Step 2: Create a project
1. Click "New Project"
2. Name: `restoration-quotes`
3. Database Password: generate a strong one and SAVE it somewhere
4. Region: pick the closest to Michigan (US East 1 or US East 2)
5. Plan: Free
6. Click "Create new project" - takes ~2 minutes

### Step 3: Set up the database schema
1. Once your project is ready, click **SQL Editor** in the left sidebar
2. Click "New query"
3. Open the file `supabase-schema.sql` from this project
4. Copy ALL of its contents
5. Paste into the SQL editor
6. Click "Run" (bottom right)
7. You should see "Success. No rows returned"

### Step 4: Get your API keys
1. Go to **Project Settings** (gear icon, bottom left) → **API**
2. You'll see two important things:
   - **Project URL**: looks like `https://xyz123.supabase.co`
   - **Project API keys**: there are two
     - `anon` `public` key (safe for frontend)
     - `service_role` key (KEEP SECRET, server-only)
3. Copy both keys and the URL into a notes file - you'll paste them into Vercel later

### Step 5: Create your admin user
1. Go to **Authentication** → **Users** in the sidebar
2. Click "Add user" → "Create new user"
3. Email: your email address
4. Password: pick a strong one (not the database password)
5. Auto Confirm User: ✓ check this
6. Click "Create user"
7. Save these credentials - you'll use them to log into the admin dashboard

---

## Part 2: Set Up RentCast (5 minutes)

For property data lookups (sq ft, stories, year built).

1. Go to **rentcast.io/api**
2. Sign up with email (no credit card)
3. Confirm email and log in
4. Go to **API Dashboard** → **API Keys**
5. Create a key, copy it, save to your notes
6. Free tier: 50 lookups/month

---

## Part 3: Set Up Resend (5 minutes)

For instant email alerts when customers submit quotes.

1. Go to **resend.com**
2. Sign up with email
3. Verify your email
4. Once logged in, go to **API Keys** → **Create API Key**
5. Name: `restoration-quotes`
6. Permission: "Sending access"
7. Click Add → copy the key (starts with `re_`)
8. Save to your notes
9. Free tier: 3,000 emails/month, 100/day

**Note about sender email:** By default Resend sends from `quotes@resend.dev` which works fine. To send from your own domain (`quotes@restorationpw.com`), you'd verify your domain in Resend (10-min DNS setup). Skip this for now and do it later.

---

## Part 4: GitHub Setup (3 minutes)

You'll fork a template repo so future updates take one click instead of manual file uploads.

### Step 1: Create account (if you don't have one)
1. Go to **github.com**
2. Sign up - free
3. Verify email

### Step 2: Fork the template repo
1. Go to the template repo URL (I'll give you this when you're ready to deploy)
2. Click the **"Fork"** button in the top right
3. Repository name: `restoration-quote-tool` (or whatever you want)
4. Make sure "Copy the main branch only" is checked
5. Click "Create fork"

That's it. You now have your own copy of the project that's linked to the template. When the template updates, you'll get a "Sync fork" button to pull in the changes.

### Step 3 (later, only when there's an update):
When I tell you there's an update available:
1. Open your repo on GitHub
2. You'll see a banner that says "This branch is X commits behind"
3. Click **"Sync fork"** → **"Update branch"**
4. Vercel auto-redeploys in 60 seconds
5. Done

No file uploads. No copy-paste. Just one button.

---

## Part 5: Deploy on Vercel (5 minutes)

### Step 1: Sign up
1. Go to **vercel.com**
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel

### Step 2: Import the project
1. Click "Add New..." → "Project"
2. Find your forked `restoration-quote-tool` in the list, click "Import"
3. Don't change any settings yet
4. **CRITICAL:** Before deploying, expand "Environment Variables"

### Step 3: Add environment variables
Add these one at a time. Use the names exactly as shown:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `RENTCAST_API_KEY` | Your RentCast API key |
| `RESEND_API_KEY` | Your Resend API key (starts with re_) |
| `ADMIN_EMAIL` | Email where you want quote notifications sent |

### Step 4: Deploy
1. Click "Deploy"
2. Wait 30-60 seconds
3. When it says "Congratulations" - click "Continue to Dashboard"
4. Note your URL at the top - looks like `restoration-quote-tool-abc.vercel.app`

---

## Part 6: Update Admin Dashboard with Supabase Keys

The admin dashboard needs Supabase credentials embedded in it (it's safe - the anon key is public).

### Easy way:
1. Go to your GitHub repo → click `admin.html`
2. Click the pencil icon (Edit)
3. Find these two lines (around line 470):
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```
4. Replace with your actual values:
```js
const SUPABASE_URL = 'https://xyz123.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...your-actual-key';
```
5. Scroll down, click "Commit changes"
6. Vercel will auto-redeploy in ~30 seconds

---

## Part 7: Test Everything

### Test 1: Customer form (no login needed)
1. Open your Vercel URL: `https://your-app.vercel.app`
2. Type your home address: `14815 Chippewa Dr, Warren, MI 48088`
3. Click "Look Up" - sq ft should auto-fill
4. Select 2-3 services, fill in details
5. Fill in YOUR contact info (your real phone/email since this will email you)
6. Check the marketing consent box
7. Click "Submit Quote Request"
8. You should see a success screen
9. Within seconds, check your `ADMIN_EMAIL` inbox - you should have a notification

### Test 2: Admin dashboard
1. Go to `https://your-app.vercel.app/admin`
2. Log in with the admin email + password from Part 1, Step 5
3. You should see the quote you just submitted in the dashboard
4. Click on it to open the detail
5. Try changing status from Pending to Quoted
6. Add a note
7. Click "Save Changes"
8. Refresh - your changes should be saved

If both tests pass, you're live.

---

## Part 8: Embed in Hostinger Website

### Step 1: Update the embed snippet
1. Open `EMBED-SNIPPET.html` from this project
2. Replace `YOUR-VERCEL-URL` with your actual Vercel URL
3. Choose `?embed=light` (white look) or `?embed=dark`
4. Copy the entire updated snippet

### Step 2: Add to Hostinger
1. Log into Hostinger Website Builder
2. Open the page where you want the form (or create a "Get a Quote" page)
3. Find the **Embed** or **HTML** element in the sidebar
4. Drag onto your page
5. Click on it, choose Edit Embed Code
6. Paste your full snippet (iframe + script tag)
7. Save and publish

### Step 3: Bookmark the admin
On your phone, open `your-app.vercel.app/admin`, log in, then:
- iPhone: Share → Add to Home Screen
- Android: Menu → Add to Home Screen

You now have a one-tap admin app.

---

## Updating Later (One-Click Updates)

When I add new features or improvements, here's how to update your app:

1. I'll let you know an update is available and what's in it
2. Open your fork on GitHub (any device works)
3. You'll see "This branch is X commits behind" at the top
4. Tap **Sync fork** → **Update branch**
5. Vercel auto-deploys in 60 seconds
6. Done

**A few things worth knowing:**

- Your data, settings, and customer quotes are stored in Supabase, not in the code. Updates never touch your data.
- Your environment variables (API keys) stay set on Vercel. Updates don't change them.
- If an update needs a new API key or database change, I'll tell you exactly what to do (usually a 30-second additional step)
- You can review what's in an update before applying. GitHub shows you every change.
- If something ever breaks after an update, Vercel keeps a history of every deployment. You can roll back to any previous version with one click in the Vercel dashboard.

---

## Troubleshooting

**Customer form: "Look Up" fails or shows error**
- Check Vercel environment variables - make sure `RENTCAST_API_KEY` is set exactly right
- Check RentCast dashboard - did you exceed 50 lookups this month?

**Customer form: Submit fails with "Failed to save"**
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars in Vercel
- Open Vercel dashboard → Deployments → click latest → Functions → check logs

**No email notifications**
- Check `RESEND_API_KEY` and `ADMIN_EMAIL` env vars in Vercel
- Check spam folder
- Resend dashboard shows all emails sent - check there

**Admin dashboard: "Invalid token" error**
- The `SUPABASE_URL` and `SUPABASE_ANON_KEY` in admin.html don't match the env vars in Vercel
- Update them and redeploy

**Admin dashboard: Login fails**
- Make sure you "auto-confirmed" the user in Supabase (Part 1, Step 5)
- Use the Supabase Auth → Users page to reset password if needed

---

## Part 9: Using the Settings Page

After everything is live, log into your admin dashboard and click the **Settings** tab at the top.

This is where you tune your business without ever asking me to change code:

**Service Pricing**
- Adjust rates for each service level (Basic/Standard/Premium for house wash, Light/Standard/Heavy for driveway and roof, etc.)
- Set minimum job prices per service
- Toggle services on/off (turn off junk removal if you stop offering it)
- Customize junk removal price tiers ($75-150 single item, etc.)

**Quote Behavior**
- Show instant quote to customers OR hide it (they submit a request, you quote later)
- Show single price OR price range
- Adjust price range spread (default: 10% below, 15% above your calc)
- Bundle discount % and threshold (default: 10% off when 3+ services selected)
- Require marketing consent checkbox to submit (default off)

**Business Info**
- Company name, phone, email
- Booking link, reviews link, Facebook link
- Service area description

**Internal Defaults**
- Labor rate, fuel cost, chemical cost defaults (used for cost tracking)
- Home address for future mileage calc

**How saving works:**
- Make changes - the bottom save bar lights up yellow showing "Unsaved changes"
- Hit "Save All Changes" - turns green showing "✓ Saved"
- Customer form updates immediately (no redeploy needed)
- Hit "Reset" if you want to discard changes before saving

**Pro tip:** If you raise your rates, the change takes effect the second you hit Save. The customer form pulls fresh settings on every page load. Watch your conversion rate after price changes - if it drops more than 10%, you may have gone too aggressive.

---

Things I can add when you're ready:

1. **PDF quote generator** - generate a professional PDF the customer receives via email
2. **SMS notifications** - text alerts when quotes come in (Twilio, ~$0.01/text)
3. **Customer self-service portal** - they can check status of their quote
4. **Recurring quote system** - automated 6-month follow-ups for past customers
5. **Photo upload** - customers attach photos of their property
6. **Calendar integration** - book service directly from the dashboard
7. **Multi-user logins** - add employee accounts when you scale up
8. **Mileage auto-calculation** - automatic fuel cost based on distance from your home
9. **Reporting dashboard** - revenue, conversion rate, average ticket size, etc.
10. **Stripe integration** - take deposits and payments directly

Any of these is a 30-minute to 2-hour add-on once the core is live.

---

## What This Costs You

| Service | Plan | Limit | Cost |
|---------|------|-------|------|
| Supabase | Free | 500MB database, 50k monthly users | $0 |
| Vercel | Hobby | 100GB bandwidth | $0 |
| RentCast | Free | 50 lookups/month | $0 |
| Resend | Free | 3,000 emails/month | $0 |
| GitHub | Free | Unlimited public repos | $0 |
| **Total** | | | **$0/month** |

**When you'd upgrade:**
- RentCast: if you hit 50 lookups/month consistently → $50/mo for 1,000
- Resend: only if you do mass marketing emails → $20/mo for 50k
- Everything else: realistically you'll never outgrow the free tiers

---

## Summary

When everything's set up:

1. Customer visits your Hostinger site, sees the embedded quote form
2. They type their address, services auto-fill, they pick what they want
3. They enter contact info, agree to marketing, submit
4. You get an email instantly with all their info and the price range
5. You log into the admin dashboard from your phone
6. You see all quotes, filter by status, click for details
7. You can call/text/email/map them with one tap
8. You move them through the pipeline: pending → quoted → won → completed
9. Notes and final prices are saved forever

That's a real CRM. Let me know when you start setup and I'll help with anything that gets weird.
