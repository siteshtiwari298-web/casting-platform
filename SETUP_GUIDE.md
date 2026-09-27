# Setup Guide (No Coding Required for These Steps)

This covers the parts only you can do, since they need your own free
account logins. Everything else (all the code) is already written.

---

## Step 1 — Create a free Supabase account

1. Go to https://supabase.com and click "Start your project."
2. Sign up with your email (or Google/GitHub).
3. Click "New Project."
   - Name: `casting-platform` (or anything you like)
   - Database Password: choose a strong password and **save it somewhere safe**
   - Region: pick the one closest to Nepal (e.g. Singapore)
4. Wait ~2 minutes for the project to finish setting up.

## Step 2 — Run the database schema

1. In your new Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open the `schema.sql` file (I'll give you the updated version) and paste
   its entire contents into the editor.
4. Click **Run**. You should see "Success. No rows returned."

This creates every table, rule, and permission the platform needs.

## Step 3 — Create the storage buckets (for photos/videos)

1. Click **Storage** in the left sidebar.
2. Click **New Bucket**, name it `actor-photos`, and:
   - Set it to **Public** (so approved photos can be viewed)
   - Under "File size limit," enter `4194304` (this is 4 MB in bytes)
   - Under "Allowed MIME types," enter `image/*`
3. Repeat for a second bucket named `actor-videos`:
   - Public: yes
   - File size limit: `52428800` (50 MB) — for intro videos only, no showreel yet
   - Allowed MIME types: `video/*`
4. Repeat for a third bucket named `location-photos` (same settings as actor-photos).

## Step 4 — Get your project's API keys

1. Click the gear icon (Project Settings) → **API**.
2. You'll see two values you need:
   - **Project URL**
   - **anon public** key
3. Send me both of these (or paste them somewhere safe) — I'll put them into
   the app's configuration for you.

## Step 5 — Make yourself the admin

Once you've signed up on the actual site (Step 6 below), come back to
Supabase:
1. Click **Table Editor** → `profiles` table.
2. Find the row with your email/user ID.
3. Change its `role` column from `production` to `admin`.
4. Save. You can now access the `/admin` page on the site.

## Step 6 — Deploy the website (Vercel)

I'll guide you through this once Steps 1-4 are done — it's a similar
"create a free account, click a few buttons" process, and I'll write out
the exact clicks when we get there.

---

**What you need to send back to me:** the Project URL and anon public key
from Step 4. Once I have those, I'll wire up the rest and we'll move to
deployment.
