# BudgetOS

Rodinná aplikácia na plánovanie rozpočtu — mobile-first PWA s podporou webu.

## Funkcie (MVP)

- Prihlásenie cez Clerk
- Zdieľané workspaces + pozvánky e-mailom
- Predvolené kategórie (Domácnosť, Deti, Auto, Investície, …)
- Výdavky / príjmy (skutočné aj plánované)
- Opakované platby (týždenne / mesačne / ročne)
- Mesačné rozpočty podľa kategórií
- Prehľady a reporty

## Stack

- Next.js (App Router) + Tailwind + shadcn/ui
- Clerk Auth
- Neon Postgres + Drizzle ORM
- Vercel (deploy + denný cron na expand recurring)

## Setup

1. Skopírujte env súbor:

```bash
cp .env.example .env.local
```

2. Doplňte hodnoty:
   - `DATABASE_URL` z Neon (alebo `vercel integration add neon`)
   - Clerk kľúče (alebo `vercel integration add clerk`)
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

Aplikácia obsahuje `manifest.webmanifest` a service worker (`/sw.js`). Na telefóne ju môžete pridať na plochu z prehliadača.

## Cron

Endpoint `GET /api/cron/expand-recurring` denne generuje plánované transakcie z aktívnych opakovaných platieb. Autorizácia cez `Authorization: Bearer $CRON_SECRET`.
