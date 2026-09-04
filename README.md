# HASHCODE Community Portal

> Portail communautaire HASHCODE — gestion des membres, pôles et événements.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-green)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🏷️ Sujets / Topics suggérés

`community` · `portal` · `members` · `nextjs` · `typescript` · `drizzle-orm` · `postgresql` · `hashcode`

## 📦 Installation

Prérequis : Node.js 22, pnpm 10+.

```bash
git clone https://github.com/<ton-user>/hashcode-community-portal.git
cd hashcode-community-portal
pnpm install
cp .env.example .env.local   # renseigner les variables ci-dessous
pnpm db:push                 # crée le schéma (ou pnpm db:migrate en prod)
pnpm db:seed                 # données initiales (optionnel)
pnpm dev                     # http://localhost:3000
```

## 🔑 Variables d'environnement

Voir `.env.example` (copier vers `.env.local`) :

| Variable | Requis | Description |
|---|---|---|
| `DATABASE_URL` | Oui | Chaîne de connexion PostgreSQL (Neon, Supabase ou local) |
| `JWT_SECRET` | Oui | Secret de signature des sessions (32 caractères min) |
| `NEXT_PUBLIC_APP_URL` | Oui | URL publique de l'app (ex. `http://localhost:3000`) |
| `RESEND_API_KEY` | Non | Clé Resend pour magic links et notifications |
| `RESEND_FROM_EMAIL` | Non | Adresse expéditrice des emails |
| `ADMIN_EMAIL` | Non | Email bootstrap admin pour l'initialisation |

## 📜 Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement Next.js |
| `pnpm build` | Build de production (`next build`) |
| `pnpm typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `pnpm test` | Tests unitaires/intégration (`vitest run`) |
| `pnpm db:push` | Synchronise le schéma Drizzle vers la DB |
| `pnpm db:migrate` | Applique les migrations Drizzle |
| `pnpm db:seed` | Peuple la DB (`tsx lib/seed.ts`) |

## 🛡️ Administration

Pages (`app/admin/*/page.tsx`) :

| Page | Description |
|---|---|
| `/admin` | Tableau de bord membres |
| `/admin/analytics` | Statistiques et agrégats |
| `/admin/import` | Import de membres via Excel |
| `/admin/leaderboard` | Classement par points |
| `/admin/points` | Gestion des points |
| `/admin/trends` | Tendances |
| `/admin/verify-identity` | Vérification d'identité |

API (`app/api/admin/*/route.ts`, accès réservé admin) :

| Route | Méthodes |
|---|---|
| `/api/admin/members` | `GET`, `POST` |
| `/api/admin/members/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/admin/members/bulk` | `POST` |
| `/api/admin/members/[id]/poles` | `GET`, `POST`, `DELETE` |
| `/api/admin/poles` | `GET` |
| `/api/admin/import` | `POST` |
| `/api/admin/verify-identity` | `GET`, `POST` |
| `/api/admin/points` | `GET`, `POST` |
| `/api/admin/leaderboard` | `GET` |
| `/api/admin/analytics` | `GET` |

## 🔄 Pipeline CI

`.github/workflows/ci.yml` — déclenché sur `push` et `pull_request` vers `master` :

1. `pnpm install --frozen-lockfile` (Node 22, pnpm 10)
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build` (avec `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` factices)

Toute PR doit avoir ces 4 étapes vertes avant merge.

## 🗂️ Structure

```
app/            → routes Next.js (App Router)
lib/            → auth, db, utils
components/     → UI réutilisable
docs/           → documentation & ADR (docs/adr/)
scripts/        → migrations & outils
```

Voir aussi : [CONTRIBUTING.md](CONTRIBUTING.md), [docs/adr/](docs/adr/).

## 📄 Licence

MIT — voir [LICENSE](LICENSE).
