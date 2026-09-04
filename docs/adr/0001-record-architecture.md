# ADR 0001 — Architecture applicative initiale

- Statut : accepté
- Date : 2026-09-04

## Contexte

Le portail doit authentifier des membres sans mot de passe, persister des données
relationnelles sur PostgreSQL serverless, protéger les routes publiques et admin
contre l'abus, et valider les entrées côté client et serveur.

## Décisions

### 1. Sessions JWT (`jose`, 7 jours) + OTP / magic-link

- Sessions signées HS256 via `jose` (`lib/auth.ts` : `createSessionToken` /
  `verifySessionToken`), cookie `hashcode_session` httpOnly (`SESSION_DURATION`
  = 7 jours).
- `JWT_SECRET` (32 caractères min) validé paresseusement pour ne pas casser le build.
- Auth sans mot de passe : OTP (`createOTPToken`, 10 min) et magic-link
  (`createMagicLinkToken`, 15 min), stockés **hachés** (SHA-256, `lib/crypto.ts`)
  en table `authTokens`, consommation atomique anti-rejeu.
- Emails via Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

### 2. Drizzle + Neon (`@neondatabase/serverless`)

- Accès DB via `Pool` Neon + `drizzle-orm/neon-serverless` (`lib/db.ts`),
  schéma partagé (`lib/db/schema.ts`), proxy d'initialisation paresseuse
  (pas de crash build sans `DATABASE_URL`).
- Écritures multi-tables enveloppées en `db.transaction()` (ex.
  `app/api/members/me/route.ts`, `app/api/admin/import/route.ts`,
  `app/api/admin/verify-identity/route.ts`).

### 3. Rate-limit Upstash avec fallback mémoire

- `lib/rate-limit.ts` : `@upstash/ratelimit` (sliding window) + `@upstash/redis`
  en production (`UPSTASH_REDIS_REST_URL/TOKEN` ou `KV_REST_API_URL/TOKEN`).
- Fallback mémoire (Map + purge paresseuse) hors production ; erreur explicite
  si Redis absent en production.

### 4. Validation Zod + validateurs maison

- Schémas Zod (`lib/types.ts` : `CreateMemberSchema`, `UpdateMemberSchema`)
  pour le typage et la validation des payloads.
- Validateurs maison purs et testables : `lib/validation.ts` (`validators`,
  `validateFields`, messages en français, côté client) et
  `lib/server-validation.ts` (`validateEmail`, `validateUUID`, enums, pôles,
  intérêts, côté serveur).

## Conséquences

- Pas de mots de passe à stocker ; révocation des sessions limitée à
  l'expiration (7 j) — pas de blacklist.
- Transactions requises sur toute écriture multi-étapes sous peine
  d'incohérence.
- Redis obligatoire en production pour un rate-limit distribué.
- Toute entrée API doit passer par Zod ou `server-validation` ; toute entrée
  formulaire par `validators`.
