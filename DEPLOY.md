# Deploying PAT Inspector — Cloudflare Pages + Cloudflare KV

This turns the app into a real multi-user tool: anyone with the link can use
it, and all inspection data is stored in a Cloudflare KV namespace — no other
company or cloud provider involved, everything lives in your Cloudflare
account.

This is the simplest of the backend options — no credentials to generate, no
external API, no organizational approvals. Budget about 5 minutes.

---

## Step 1 — Create a Cloudflare account (if you don't have one)
https://dash.cloudflare.com/sign-up — free plan is enough.

## Step 2 — Deploy the app
1. In the Cloudflare dashboard: **Workers & Pages** → **Create** → **Pages**
   → **Upload assets**
2. Project name: e.g. `pat-inspector`
3. You should have a folder called `deploy/` containing:
   ```
   deploy/
     index.html
     functions/
       api/
         kv-list.js
         kv/
           [key].js
   ```
   Drag the entire `deploy` folder in (or select it) and upload. Cloudflare
   automatically detects the `functions/` folder and wires it up.
4. Deploy. You'll get a URL like `https://pat-inspector.pages.dev`.

## Step 3 — Create a KV namespace
1. In the Cloudflare dashboard left sidebar: **Storage & Databases** → **KV**
2. Click **Create a namespace**
3. Name it e.g. `pat_inspector_data` → **Add**

## Step 4 — Bind the namespace to your Pages project
1. Go to your Pages project → **Settings** → **Bindings** (or **Functions**
   → **KV namespace bindings**, depending on the current dashboard layout)
2. Click **Add binding**
3. Variable name: **must be exactly** `PAT_KV` (the code looks for this
   exact name)
4. KV namespace: select the one you just created (`pat_inspector_data`)
5. Save
6. Cloudflare requires a new deployment for bindings to take effect — go to
   **Deployments** → click the three dots on the latest one → **Retry
   deployment** (or just re-upload the same folder again)

## Step 5 — Test it
1. Visit your `*.pages.dev` URL
2. Field Inspection → New Inspection → create a test site, fill in a
   checklist item, wait a couple seconds
3. In the Cloudflare dashboard, go to **Storage & Databases** → **KV** →
   your namespace → you should see `pat_index` and
   `pat_site_<yourtestID>` appear as keys
4. Open the Admin Dashboard (password is `Edotco@PAT2026` — **change this**,
   see below) and confirm your test site shows up

If a save fails, check your browser's dev tools → Network tab for the
failed `/api/kv/...` request's response body — it'll say exactly what's
wrong (almost always: binding name isn't exactly `PAT_KV`, or you need to
redeploy after adding the binding).

---

## Before sharing the link with your team

- **Change the admin password.** It's currently hardcoded in `index.html` as
  `Edotco@PAT2026` — search for `ADMIN_PASSWORD` near the top of the
  `<script>` section and change it before re-uploading. This is a simple
  client-side gate, not real authentication — don't put anything you
  wouldn't be comfortable with a determined person eventually seeing.
- Anyone with the URL can create/edit field inspections (by design, so
  engineers don't need accounts). If you want to restrict that too, the
  simplest option is Cloudflare Access (Zero Trust) in front of the whole
  site — ask me if you want that set up.
- Custom domain: **Pages project → Custom domains** to use e.g.
  `pat.edotco.com` instead of the `.pages.dev` address.
- Cloudflare's free plan KV limits: 1 GB total storage, 100,000 reads/day,
  1,000 writes/day. Fine for a small internal team; let me know if you ever
  need to plan around growing past that.

## How the data storage works, if you're curious
Each inspection is stored as one KV entry under the key
`pat_site_<SiteID>`, plus one `pat_index` entry that lists all sites for the
dashboard. The app itself never changed across all the backend options we
tried — it always talks to a generic `/api/kv/...` endpoint; only what's
*behind* that endpoint changed (Google Drive, then Google Cloud Storage, now
Cloudflare KV directly).
