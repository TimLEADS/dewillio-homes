# Deploying Dewilio Homes to Vercel

The app stores everything in Postgres (Neon). There is no local database file
any more — Vercel's filesystem is read-only and its containers are discarded
between requests, so a file-based database would lose every signup.

You need three things, all free to start: a GitHub account, a Vercel account,
and a Neon database. Do them in this order.

## 1. Push the code to GitHub

The repository is already initialised and committed locally.

```bash
gh repo create dewillio-homes --private --source=. --push
```

No `gh` CLI? Create an empty **private** repo at github.com/new (no README),
then:

```bash
git remote add origin https://github.com/<your-username>/dewillio-homes.git
git branch -M main
git push -u origin main
```

`.gitignore` keeps `/data` and `.env*` out of the repo. Leave it that way —
`/data` holds password hashes and cardholder data.

## 2. Create the Vercel project and its database

1. Go to vercel.com/new and import the GitHub repo. Vercel detects Next.js;
   accept the defaults and deploy. **The first deploy will fail to load pages** —
   there is no database yet. That is expected.
2. In the project, open **Storage → Create Database → Neon** and attach it.
   Vercel injects `DATABASE_URL` into the project automatically.
3. Open **Deployments**, and redeploy the latest one so it picks up the variable.

On the first request the app creates its own tables and seeds the demo data.

If you would rather create the database at neon.tech directly, copy the
**pooled** connection string (the host ends in `-pooler`) and add it under
**Settings → Environment Variables** as `DATABASE_URL` for all environments.

## 3. Point local development at the same database

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
npm run verify-db     # checks schema, seed, placeholders, transactions
npm run dev
```

Without the Vercel CLI, copy `.env.example` to `.env.local` and paste the
connection string in yourself.

## 4. Optional: carry over your old local data

`data/sqlite-backup.json` is a snapshot of the old SQLite database (7 users,
5 leads, 3 payments, 151 audit rows). Import it **before** first opening the
app, because the demo seed only runs while `users` is empty:

```bash
npm run import-backup
```

Skipping this is fine — you get the demo seed instead.

## Default logins

Created by the seed. **Change these passwords immediately on a public site.**

| Email                | Password   | Role        |
|----------------------|------------|-------------|
| super@dewillio.com   | admin123   | super_admin |
| admin@dewillio.com   | admin123   | admin       |
| alex@example.com     | agent123   | agent       |
| maria@example.com    | agent123   | agent       |

## Before real users arrive

- **Change the seeded passwords.** They are public knowledge in this file.
- **The checkout stores full card numbers and CVCs in plaintext.** No payment
  is actually taken — nothing is charged and no processor is connected. Keep
  the form on test cards until Stripe is wired up; storing real card data this
  way breaches PCI-DSS and card-network rules, and the admin CSV export copies
  it out of the database in the clear.
- Set a custom domain under **Settings → Domains** if you have one.
