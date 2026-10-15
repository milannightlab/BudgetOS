# Family OS

Rodinný OS — modularná aplikácia na správu diania v rodine (termíny, dokumenty, financie) — mobile-first PWA.

## Moduly (základ)

- **Prehľad** — fixný dashboard (plánované platby 30 dní, termíny, dokumenty)
- **Domácnosť, Rodina, Doprava, Predplatné, Úvery, Investície** — shell stránky so zdieľanými termínmi a dokumentmi (detail modulov neskôr)

Rozširovanie: pridajte záznam do `src/modules/registry.ts` a voliteľne `src/modules/<slug>/`.

## Stack

- Next.js (App Router) + Tailwind + shadcn/ui
- Clerk Auth
- Neon Postgres + Drizzle ORM
- Vercel Blob (dokumenty)
- Vercel (deploy + cron na expand recurring)

## Setup

1. Skopírujte env súbor:

```bash
cp .env.example .env.local
```

2. Doplňte hodnoty:
   - `DATABASE_URL` z Neon
   - Clerk kľúče (Development `pk_test_` / `sk_test_`)
   - `BLOB_READ_WRITE_TOKEN` z Vercel Blob (`vercel integration add blob` alebo Storage v dashboarde)
   - voliteľne `CRON_SECRET`

3. Nainštalujte závislosti a vytvorte schému:

```bash
npm install
npm run db:push
```

4. Spustite vývojový server:

```bash
npm run dev
```

5. V Clerk dashboarde nastavte:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in/up: `/`

## Skripty

| Príkaz | Popis |
|--------|--------|
| `npm run dev` | lokálny server |
| `npm run build` | produkčný build |
| `npm run db:push` | sync schémy do Neon |
| `npm run db:studio` | Drizzle Studio |

## PWA

Aplikácia obsahuje `manifest.webmanifest` a service worker (`/sw.js`).

## Cron

Endpoint `GET /api/cron/expand-recurring` denne generuje plánované transakcie z aktívnych opakovaných platieb.
