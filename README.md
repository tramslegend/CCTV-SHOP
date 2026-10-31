# CCTV Spania shop

Online shop built with Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS v4 and MongoDB, with an admin panel
at `/admin`. Saved on 2026-10-31 with all products (2,500, including the 500 `SAMPLE-` products), categories, settings
and the admin account.

## What's inside

| Folder / file | What it is |
|---|---|
| `src/` | The shop and the admin panel |
| `public/` | Logo (`brand/`), product images (`sites/`), uploaded images (`uploads/`) |
| `database/shop.ejson.gz` | Full copy of the shop's database (login sessions left out) |
| `scripts/` | Local MongoDB, database restore, admin account, build steps |
| `docs/GO-LIVE.md` | Notes for running the shop live |
| `.env.example` | The settings the shop needs; copy it to `.env.local` |

## Run it on a computer

You need Node.js 24 or newer.

```bash
npm ci                                  # install packages
cp .env.example .env.local              # then fill in BETTER_AUTH_SECRET (a long random string)
npm run db:local                        # local MongoDB on port 27017 (leave it running in its own terminal)
npm run db:restore -- --replace         # load database/shop.ejson.gz
npm run dev                             # http://localhost:3000
```

Admin panel: http://localhost:3000/admin/login with the shop's admin account (`cctvspania@shop.local`). If you need a new
password: `npm run admin:create -- --email cctvspania@shop.local --password "new-password-here"`.

## Put it online (Vercel)

Set these in the Vercel project: `MONGODB_URI` and `MONGODB_DB` (a MongoDB Atlas database), `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` and `SITE_URL` (the site's address), and `BLOB_READ_WRITE_TOKEN` (Vercel Blob, for admin image
uploads). To load the products into an empty Atlas database, run the restore command once on your computer with
`MONGODB_URI` set to the Atlas connection string, in a terminal you close afterwards.

## Useful commands

| Command | Does |
|---|---|
| `npm run dev` | Start the shop locally |
| `npm run build` | Production build |
| `npm run check` | Lint, type check and build |
| `npm run db:setup` | Create the database indexes |
| `npm run admin:create -- --email … --password …` | Create the admin account or reset its password |
