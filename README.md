# Hashcode Community Registry V1

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git-import?repository-url=https://github.com/digitaleflex/hashcode-community-portal)

> **HASHCODE revient.** Depuis 2019, des milliers de personnes ont fait partie de notre communauté. Aujourd'hui, nous reconstruisons HASHCODE autour d'une nouvelle génération de membres, de compétences et d'opportunités.

## Objectif

Identifier → Vérifier → Mettre à jour → Segmenter les membres historiques de HASHCODE.

---

## Tech Stack

| Composant | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Neon |
| ORM | Drizzle ORM |
| Auth | Passwordless (OTP + Magic Link) |
| Email | Resend |
| Session | JWT HttpOnly cookies (jose) |
| Hébergement | Vercel |

---

## Installation

```bash
# Clone
git clone https://github.com/digitaleflex/hashcode-community-portal.git
cd hashcode-community-portal

# Install deps
pnpm install

# Setup .env
cp .env.example .env.local
# Edit .env.local with your values

# Push to DB
pnpm db:push
pnpm db:seed

# Dev
pnpm dev
```

---

## Database Schema

### Tables

```
┌─ members ───────────────────────────────┐
│ id (UUID) PK    │ email (unique)       │
│ firstName       │ lastName             │
│ age             │ phone                │
│ city            │ country              │
│ status          │ createdAt/updatedAt  │
└─────────────────────────────────────────┘

┌─ member_profiles ────────────────────────┐
│ id│ member_id (FK) │ occupation │ bio  │
│ linkedinUrl │ timeAvailable │ workPreference │
└─────────────────────────────────────────┘

┌─ poles ──────────────────────────────────┐
│ id (UUID) PK    │ slug (unique)        │
│ name            │ description          │
└─────────────────────────────────────────┘

┌─ member_poles (junction) ──────────────┐
│ memberId (FK) │ poleId (FK)            │
│ isPrimary     │ level                  │
└─────────────────────────────────────────┘

┌─ interests ────────────────────────────┐
│ id (UUID) PK    │ slug (unique)        │
│ name            │                        │
└─────────────────────────────────────────┘

┌─ member_interests (junction) ──────────┐
│ memberId (FK) │ interestId (FK)        │
└─────────────────────────────────────────┘

┌─ communication_preferences ────────────┐
│ memberId (FK)                                │
│ community, security, ai, cloud               │
│ training, workshops, opportunities, projects │
└─────────────────────────────────────────┘

┌─ community_history ────────────────────┐
│ id│ memberId (FK) │ source │ oldGroup │
│ oldActivity │ score │ languages │
└─────────────────────────────────────────┘

┌─ auth_tokens ──────────────────────────┐
│ token │ memberId (FK) │ type         │
│ used │ expiresAt                     │
└─────────────────────────────────────────┘
```

### Enums

```sql
member_status: 'imported' | 'claimed' | 'verified' | 'updated' | 'active' | 'inactive'
level: 'beginner' | 'intermediate' | 'advanced'
occupation: 'student' | 'professional' | 'entrepreneur' | 'freelancer' | 'seeking_opportunities' | 'other'
```

---

## Pôles HASHCODE

| Pôle | Slug | Description |
|---|---|---|
| Security | `security` | Cybersécurité, pentesting, SOC, forensics |
| AI | `ai` | Intelligence artificielle, ML, NLP |
| Cloud | `cloud` | Cloud, DevOps, infrastructure |

---

## Flux d'Authentification

```
     Email Input
         ↓
   [Check if email exists?]
         ↓
    ┌────┴────┐
    │         │
 Existing   New
    │         │
  Update    Create
    │         │
    └────┬────┘
         ↓
   [Send OTP / Magic Link]
         ↓
    ┌────┴────┐
    │         │
    OTP      Magic Link
    ↓          ↓
  Verify    Verify → Login
    ↓
   Login
```

---

## API Endpoints

### Auth

| Méthode | URL | Description |
|---|---|---|
| POST | `/api/auth/verify-email` | Send OTP ou magic link |
| POST | `/api/auth/verify-otp` | Vérifie le code OTP |
| GET | `/api/auth/verify-magic-link` | Vérifie le lien magique |
| GET | `/api/auth/session` | Vérifie la session |
| DELETE | `/api/auth/session` | Déconnexion |

### Members

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/members/me` | Profil membre connecté |
| PATCH | `/api/members/me` | Met à jour le profil |

### Admin

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/admin/members` | Liste avec filtres |
| GET | `/api/admin/members/:id` | Détails membre |
| PATCH | `/api/admin/members/:id` | Edit admin |

---

## Pages Client

| Route | Description |
|---|---|
| `/` | Landing page |
| `/auth/verify` | Email input |
| `/auth/verify-otp` | Code OTP |
| `/auth/magic-link` | Redirection magic link |
| `/onboarding` | Wizard 8 étapes |
| `/profile` | Vue profil / Édition |
| `/admin` | Dashboard admin |

---

## Middleware

Le middleware protège `/onboarding`, `/profile`, `/admin` et redirige vers `/auth/verify` si non authentifié.

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."  # Poolé (runtime)
DATABASE_URL_UNPOOLED="postgresql://..."  # Pour migrations

# Resend Email
RESEND_API_KEY="re_xxx"
RESEND_FROM_EMAIL="noreply@joinhashcode.com"
RESEND_FROM_NAME="HASHCODE Community"

# JWT Secret
JWT_SECRET="your-super-secret-key-change-in-production"

# App URL (dev/prod)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Import des Données Historiques

Le script `import-excel.ts` parse 3 fichiers Excel :
- Formulaire HashCode Informatique (.xlsx)
- Préinscription HashCode Connect (.xlsx)
- Rejoignez innoveCode! (.xlsx)

```bash
npx tsx import-excel.ts          # Dry run + preview
npx tsx import-excel.ts --execute  # Import réel
```

---

## Scripts

```bash
pnpm dev                    # Development
pnpm build                  # Build
pnpm start                  # Production start
pnpm db:push               # Push schema to DB
pnpm db:migrate            # Run migrations
pnpm db:seed              # Seed poles + interests
```

---

## Déploiement Vercel

1. Connectez le repo GitHub à Vercel
2. Configurez les Variables d'Environnement dans le dashboard Vercel
3. Déploiement automatique sur push → main

---

## Structure du Projet

```
app/                      # Pages et API routes (Next.js App Router)
├── page.tsx              # Landing page
├── onboarding/page.tsx   # Wizard onboarding
├── profile/page.tsx      # Profil membre
├── admin/page.tsx        # Dashboard admin
├── auth/verify/page.tsx
├── auth/verify-otp/page.tsx
├── auth/magic-link/page.tsx
├── api/
│   ├── auth/
│   ├── members/me/route.ts
│   └── admin/
├── middleware.ts
lib/
├── db.ts                 # Drizzle connection
├── db/schema.ts          # Schéma Z
├── auth.ts               # JWT + OTP + Email utils
└── email.ts              # Resend helpers
components/
└── ui/                   # shadcn/ui components
```

---

## License

MIT