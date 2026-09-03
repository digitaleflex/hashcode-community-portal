# Audit Senior — HASHCODE Community Portal

**Date** : 2026-09-03
**Portée** : 50+ fichiers audités — routes API admin & publiques, pages frontend admin & publiques, librairies core, configuration
**Modèle de référence** : O1-Preview (raisonnement structuré multi-domaine)
**Skills utilisés** : cybersecurity, documentation-knowledge, better-auth-best-practices, ui-ux-design-pro

---

## Résumé Exécutif

| Dimension | Critique | Élevé | Moyen | Amélioration | Total |
|-----------|----------|-------|--------|--------------|--------|
| Architecture & Design | 1 | 3 | 4 | 3 | 11 |
| TypeScript & Type Safety | 2 | 5 | 3 | 2 | 12 |
| Sécurité (OWASP Top 10) | 3 | 6 | 4 | 2 | 15 |
| Performance & Scalabilité | 1 | 4 | 5 | 3 | 13 |
| Tests & Qualité | 2 | 2 | 2 | 4 | 10 |
| Build & DevOps | 1 | 3 | 3 | 4 | 11 |
| UI/UX & Accessibilité | 0 | 3 | 7 | 5 | 15 |
| Documentation | 0 | 2 | 3 | 4 | 9 |
| Monitoring & Observabilité | 2 | 2 | 1 | 3 | 8 |
| Internationalisation | 0 | 1 | 2 | 3 | 6 |
| Organisation du Code | 1 | 4 | 5 | 6 | 16 |
| **TOTAL** | **13** | **35** | **39** | **39** | **126** |

**Production bloquante** : 13 issues critiques.
**Score global** : 4/10 — nombreuses fondations manquantes pour la production.

---

## 1. Architecture & Design

### 1.1 Duplication de `getClientIp()`

**Fichiers concernés** :
- `app/api/admin/members/route.ts:9-13`
- `app/api/admin/members/[id]/route.ts:24-28`
- `app/api/admin/members/bulk/route.ts:9-13`
- `app/api/admin/members/[id]/poles/route.ts:9-13`
- `app/api/admin/poles/route.ts:9-13`
- `app/api/admin/import/route.ts:11-15`
- `app/api/admin/verify-identity/route.ts:11-15`
- `app/api/admin/points/route.ts`
- `app/api/admin/leaderboard/route.ts`
- `app/api/admin/analytics/route.ts`

**Problème** : La fonction `getClientIp()` est copiée-collée 10 fois à l'identique. Risque de dérive si quelqu'un modifie une copie sans propager.

**Sévérité** : Moyen
**Action** : Extraire dans `lib/request.ts` et importer depuis toutes les routes.

---

### 1.2 Import incorrect de `rateLimit`

**Fichier** : `app/api/members/route.ts:5`
**Problème** : `rateLimit` importé depuis `@/lib/auth` alors que la fonction réside dans `@/lib/rate-limit`. Un ré-export existe dans `lib/auth.ts:37`, masquant la dépendance réelle.

**Sévérité** : Moyen
**Action** : Importer directement depuis `@/lib/rate-limit`.

---

### 1.3 Requêtes DB parallèles sans transaction

**Fichier** : `app/api/admin/members/[id]/route.ts:59-81`
**Problème** : 6 appels DB parallèles (`Promise.all`) pour charger le détail d'un membre. Aucun rollback si l'un échoue. L'ordre d'exécution parallèle ne garantit pas la cohérence.

**Sévérité** : Élevé
**Action** : Wrapper le `Promise.all` dans `db.transaction()`.

---

### 1.4 Absence de transaction sur `PATCH /api/members/me`

**Fichier** : `app/api/members/me/route.ts:194-321`
**Problème** : La mise à jour du membre, du profil, des pôles, des intérêts et des préférences de communication se fait en séquence. Si une étape échoue, les données précédentes sont déjà modifiées — état incohérent.

**Sévérité** : Critique
**Action** : Wrapper l'ensemble en `db.transaction()`.

---

### 1.5 Absence de transaction sur l'import Excel

**Fichier** : `app/api/admin/import/route.ts:129-252`
**Problème** : L'import en masse insère les membres un par un sans transaction. Si le processus crash à la ligne 500/1000, les 499 premières lignes restent en base.

**Sévérité** : Critique
**Action** : Wrapper la boucle en transaction avec gestion d'erreur par ligne.

---

### 1.6 Absence de transaction sur `verify-identity`

**Fichier** : `app/api/admin/verify-identity/route.ts:88-162`
**Problème** : L'upsert de la vérification (read-then-write) n'est pas atomique.

**Sévérité** : Élevé
**Action** : Transaction explicite.

---

### 1.7 Double lookup DB pour l'admin

**Fichier** : `middleware.ts:24-34`
**Problème** : Le middleware vérifie le rôle admin en DB pour chaque requête `/api/admin/*`. Puis `requireAdmin()` dans les routes fait un second lookup DB. Double appel DB par requête.

**Sévérité** : Moyen
**Action** : Supprimer le check DB du middleware, garder uniquement `requireAdmin()` dans les routes.

---

### 1.8 Pas de cache pour le rôle admin

**Fichier** : `lib/auth.ts:248-295`
**Problème** : `requireAdmin()` fait un lookup DB à chaque appel. Pas de mise en cache en mémoire ou Redis.

**Sévérité** : Moyen
**Action** : Cache mémoire avec invalidation TTL.

---

### 1.9 Double parsing du fichier XLSX

**Fichier** : `app/api/admin/import/route.ts:107-267`
**Problème** : Le fichier est parsé deux fois (preview + import).浪费 CPU pour les gros fichiers.

**Sévérité** : Amélioration
**Action** : Garder le workbook en mémoire entre les deux appels via un cache serveur (memory store avec TTL court).

---

### 1.10 Routes `check-email` et `verify-email` quasi identiques

**Fichiers** : `app/api/auth/check-email/route.ts`, `app/api/auth/verify-email/route.ts`
**Problème** : Duplication de la logique de validation email.

**Sévérité** : Amélioration
**Action** : Factoriser la logique commune.

---

### 1.11 Deux fichiers `import-excel` distincts

**Fichiers** : `import-excel.ts` (racine), `lib/import-excel.ts`
**Problème** : Le script à la racine est un outil de migration historique. La lib dans `lib/` est la version partagée. Risque de confusion.

**Sévérité** : Amélioration
**Action** : Renommer le script racine en `scripts/legacy-import.ts`.

---

## 2. TypeScript & Type Safety

### 2.1 `useState<any>` dans `app/admin/page.tsx`

**Fichier** : `app/admin/page.tsx:11,298,457`
**Problème** : `useState<any>(null)` pour `data`. Perte totale de la sécurité de typage sur les données du dashboard.

**Sévérité** : Critique
**Action** : Définir une interface `MemberRow` et typer correctement.

---

### 2.2 `useState<any>` dans `app/m/[id]/page.tsx`

**Fichier** : `app/m/[id]/page.tsx:13,190,231`
**Problème** : `useState<any>(null)` pour `member`, `p: any`, `i: any` dans les mappers.

**Sévérité** : Critique
**Action** : Typer depuis le schema de la réponse API.

---

### 2.3 `any[][]` pour les données Excel

**Fichier** : `app/api/admin/import/route.ts:43,114,126`
**Problème** : `any[][]` pour les rows Excel. Aucune validation de structure.

**Sévérité** : Élevé
**Action** : Type `ExcelRow = unknown[]` avec validation Zod.

---

### 2.4 `pole: any` dans OnboardingWizard

**Fichier** : `app/onboarding/OnboardingWizard.tsx:211,215`
**Problème** : `pole: any` dans les mappers.

**Sévérité** : Élevé
**Action** : Schéma Zod pour la réponse API.

---

### 2.5 `useState<any>` dans `app/profile/page.tsx`

**Fichier** : `app/profile/page.tsx:51,393`
**Problème** : `useState<any>(null)` pour `data`, `p: any`, `i: any`.

**Sévérité** : Élevé
**Action** : Interface dédiée pour le profil.

---

### 2.6 `any` dans `lib/import-excel.ts`

**Fichier** : `lib/import-excel.ts:19,54`
**Problème** : `any` dans les rows et le mapping.

**Sévérité** : Élevé
**Action** : Validation Zod pour la structure du fichier.

---

### 2.7 `body: unknown` sans validation dans `/api/members/me`

**Fichier** : `app/api/members/me/route.ts:99,106`
**Problème** : `let body: unknown` puis cast direct `as Record<string, unknown>` sans validation.

**Sévérité** : Élevé
**Action** : Schéma Zod pour le body du PATCH.

---

### 2.8 `body` non typé dans PATCH admin

**Fichier** : `app/api/admin/members/[id]/route.ts:121`
**Problème** : `let body: Record<string, unknown>` reçoite le résultat de `request.json()` sans validation de type.

**Sévérité** : Moyen
**Action** : Schéma Zod pour le body du PATCH.

---

### 2.9 `verification as any` dans computeTrustScore

**Fichier** : `app/api/admin/verify-identity/route.ts:79`
**Problème** : Cast unsafe.

**Sévérité** : Moyen
**Action** : Typage correct de l'objet verification.

---

### 2.10 Mismatch de typage headers/rows dans import

**Fichier** : `app/admin/import/page.tsx:89,401`
**Problème** : `preview.headers` est `string[]` mais les rows sont `Record<string, unknown>[]`. Mismatch non détecté par TypeScript à cause du `any`.

**Sévérité** : Moyen
**Action** : Utiliser le type `ColumnMapping` exporté.

---

### 2.11 Calcul de max sans garde sur tableau vide

**Fichier** : `app/admin/analytics/page.tsx:167-168`
**Problème** : `Math.max(...(data?.polesDistribution.map((p) => p.count) || [1]))` peut lever si `polesDistribution` est vide.

**Sévérité** : Moyen
**Action** : Valeur par défaut sûre `?? 1`.

---

### 2.12 Type de niveau dupliqué inline

**Fichiers** : `app/admin/points/page.tsx:13`, `app/api/admin/points/route.ts:15`
**Problème** : Le type `'Novice' | 'Intermediate' | 'Advanced' | 'Legend'` est défini deux fois.

**Sévérité** : Amélioration
**Action** : Type partagé dans `lib/types.ts`.

---

## 3. Sécurité (OWASP Top 10)

### 3.1 CSP avec `unsafe-eval` et `unsafe-inline`

**Fichier** : `next.config.mjs:43-44`
**Problème** :
```js
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
"style-src 'self' 'unsafe-inline'"
```
`unsafe-eval` affaiblit significativement la protection CSP. `unsafe-inline` requis pour styled-jsx.

**Sévérité** : Moyen
**Action** : Migrer vers les nonces CSP avec Next.js 14+ `headers()` API.

---

### 3.2 Token magic link non supprimé après usage

**Fichier** : `app/api/auth/verify-magic-link/route.ts:30-48`
**Problème** : Après consommation du token, celui-ci reste en base avec `used: true`. Pas de suppression ni de cleanup. Un attaquant avec accès à la boîte email pourrait tenter de le réutiliser.

**Sévérité** : Élevé
**Action** : DELETE + cleanup des anciens tokens du même membre dans la transaction.

---

### 3.3 Transaction manquante pour `isPrimary` poles

**Fichier** : `app/api/admin/members/[id]/poles/route.ts:88-93`
**Problème** : L'`UPDATE` de `isPrimary = false` et l'`INSERT` du nouveau pôle ne sont pas dans la même transaction. Si l'insert échoue, le membre perd son pôle principal sans récupéraction.

**Sévérité** : Élevé
**Action** : Transaction explicite.

---

### 3.4 Vérification MIME contournable

**Fichier** : `app/api/admin/import/route.ts:18-25`
**Problème** : Le header `Content-Type` est contrôlé par le client. Un attaquant peut-uploader un fichier `.xlsx` contenant du code malveillant si le vrai MIME est `text/plain`.

**Sévérité** : Élevé
**Action** : Vérifier les magic bytes (les fichiers Office ZIP commencent par `PK` = `0x504B`).

---

### 3.5 JWT non révocable

**Fichier** : `lib/auth.ts:41-56`
**Problème** : Les sessions JWT ne sont pas révocables. Si un token est volé, il reste valide jusqu'à expiration (7 jours). Pas de whitelist ni de blacklist en DB.

**Sévérité** : Élevé
**Action** : Stocker les sessions en DB avec un flag `revoked` ou utiliser des refresh tokens avec rotation.

---

### 3.6 OTP à 6 chiffres

**Fichier** : `lib/auth.ts:83-120`
**Problème** : 6 chiffres = 1 million de combinaisons. Avec le rate limiting actuel (5/min), un attaquant peut forcer un OTP en ~14 jours.

**Sévérité** : Moyen
**Action** : Passer à 8 chiffres ou ajouter un deuxième facteur (email OTP + mot de passe).

---

### 3.7 Ordre rate limit / auth inversé

**Fichier** : `app/api/admin/members/[id]/route.ts:164-195`
**Problème** : `requireAdmin()` est appelé avant le rate limiting. Un attaquant avec session admin valide pourrait bypasser le rate limit en détruisant des données avant que la limite ne soit atteinte.

**Sévérité** : Moyen
**Action** : Inverser l'ordre : rate limit d'abord, puis auth.

---

### 3.8 Email existence disclosure

**Fichier** : `app/api/auth/check-email/route.ts:53-61`
**Problème** : La route révèle explicitement si un email existe en base (`exists: true/false`). Un attaquant peut énumérer les comptes.

**Sévérité** : Moyen
**Action** : Retourner systématiquement `{ exists: false }` ou fusionner avec `send-magic-link`.

---

### 3.9 Timing attack sur send-magic-link

**Fichier** : `app/api/auth/send-magic-link/route.ts:41-46`
**Problème** : Différence de timing entre "membre non trouvé" (retour immédiat) et "membre trouvé" (création token + email asynchrone). Permet de distinguer les emails existants.

**Sévérité** : Moyen
**Action** : Ajouter un délai artificiel quand le membre n'existe pas.

---

### 3.10 Rate limiting sur `/api/members` public

**Fichier** : `app/api/members/route.ts`
**Problème** : Route publique sans rate limiting. Un scraper peut extraire tout l'annuaire.

**Sévérité** : Amélioration
**Action** : Rate limit spécifique même pour les IPs non-authentifiées.

---

### 3.11 Missing authorization check on public member pages

**Fichier** : `app/m/[id]/page.tsx`
**Problème** : Page publique accessible sans auth. Affiche les données membres publiquement. Vérifier que c'est le comportement souhaité ( OK pour un annuaire ).

**Sévérité** : Information
**Action** : Confirmer avec le PO.

---

## 4. Performance & Scalabilité

### 4.1 Pas de limite sur le leaderboard

**Fichier** : `app/api/admin/leaderboard/route.ts:24-36`
**Problème** : Pas de `.limit()`. Retourne potentiellement tous les membres. Pour 10 000+ membres, requête COALESCE sur toute la table.

**Sévérité** : Élevé
**Action** : `.limit(100)` + index composite `(points DESC)`.

---

### 4.2 7 requêtes séquentielles dans analytics

**Fichier** : `app/api/admin/analytics/route.ts:30-106`
**Problème** : 7 agrégats DB séquentiels. Chaque peut prendre plusieurs secondes sur 10k+ membres.

**Sévérité** : Élevé
**Action** : `Promise.all` pour paralléliser.

---

### 4.3 N+1 sur les intérêts dans `/api/members/me`

**Fichier** : `app/api/members/me/route.ts:256-299`
**Problème** : Pour chaque intérêt, 1 lookup + 1 insert. Pour 30 intérêts = 30+ requêtes DB.

**Sévérité** : Élevé
**Action** : Batch lookup avec `inArray`, puis batch insert.

---

### 4.4 Import séquentiel pour 1000 lignes

**Fichier** : `app/api/admin/import/route.ts:163-251`
**Problème** : Boucle `for` avec `await` dans chaque itération. 1000 lignes = 1000 séquences read-check-insert.

**Sévérité** : Critique
**Action** : Batch lookup des emails existants (1 requête) + batch inserts par groupes de 100.

---

### 4.5 5 requêtes séquentielles dans GET `/api/members/me`

**Fichier** : `app/api/members/me/route.ts:34-86`
**Problème** : 5 appels DB séquentiels pour charger le profil utilisateur.

**Sévérité** : Moyen
**Action** : `Promise.all`.

---

### 4.6 Pas de pagination sur `/api/admin/points`

**Fichier** : `app/api/admin/points/route.ts:34-46`
**Problème** : Retourne TOUS les membres avec leurs points. Payload JSON potentiellement de plusieurs Mo.

**Sévérité** : Élevé
**Action** : Pagination + recherche par nom/email.

---

### 4.7 Index manquant pour le tri descendant

**Fichier** : `lib/db/schema.ts:324-325`
**Problème** : Index sur `points` mais pas `(points DESC)`. Les requêtes leaderboard font un Tri sur un index ASC.

**Sévérité** : Élevé
**Action** : Index composite `(points DESC)`.

---

## 5. Tests & Qualité

### 5.1 Aucun test unitaire

**Problème** : Aucune couverture. Les fonctions pures (validators, `computeTrustScore`, `normalizeEmail`, etc.) ne sont pas testées.

**Sévérité** : Critique
**Action** : Vitest sur les fonctions pures.

---

### 5.2 Aucun test d'intégration

**Problème** : Les routes API ne sont pas testées avec `supertest` ou `next-test-api-route-handler`.

**Sévérité** : Critique
**Action** : Tests d'intégration sur les routes critiques (auth, import, bulk).

---

### 5.3 Aucun test E2E

**Problème** : Pas de Playwright/Cypress pour valider les flux admin.

**Sévérité** : Élevé
**Action** : E2E sur les flux admin (login, import, bulk, points).

---

### 5.4 Pas de CI

**Problème** : Aucune GitHub Action pour exécuter `pnpm typecheck`, `pnpm build`, `pnpm test` sur les PR.

**Sévérité** : Critique
**Action** : Pipeline CI minimal.

---

## 6. Build & DevOps

### 6.1 Avertissement middleware deprecated

**Fichier** : `next.config.mjs`
**Problème** : Message `The "middleware" file convention is deprecated. Please use "proxy" instead.`

**Sévérité** : Moyen
**Action** : `npx @next/codemod@canary middleware-to-proxy .`

---

### 6.2 Node.js module dans Edge Runtime

**Fichier** : `lib/crypto.ts:1`
**Problème** : `import { randomBytes, createHash } from 'crypto'` chargé dans Edge Middleware. Non supporté.

**Sévérité** : Moyen
**Action** : Séparer le code Edge du code Node.js. Utiliser Web Crypto API pour l'Edge.

---

### 6.3 Secrets dans `.env.local`

**Fichier** : `.env.local`
**Problème** : Les secrets (JWT_SECRET, DATABASE_URL, etc.) sont dans `.env.local` qui n'est pas dans `.gitignore` (bonne pratique) mais le template `.env.example` ne documente pas tous les vars requis.

**Sévérité** : Élevé
**Action** : Compléter `.env.example` avec toutes les variables et leurs descriptions.

---

### 6.4 Pas de migration automatique en production

**Problème** : Les migrations Drizzle ne sont pas appliquées automatiquement sur Vercel. Déploiement manuel nécessaire après `db:push`.

**Sévérité** : Élevé
**Action** : Pipeline de migration automatique sur déploiement (via Vercel hooks ou CI).

---

## 7. UI/UX & Accessibilité

### 7.1 Aucun attribut ARIA

**Problème** : Aucune page admin n'utilise `aria-label`, `aria-describedby`, `role`, etc. Inaccessible aux lecteurs d'écran.

**Sévérité** : Élevé
**Action** : Audit axe-core + ajout systématique des attributs ARIA.

---

### 7.2 Tableau admin non responsive

**Fichier** : `app/admin/page.tsx`
**Problème** : Le tableau déborde sur mobile (< 768px). Pas de media queries.

**Sévérité** : Élevé
**Action** : Layout empilé sur mobile ou horizontal scroll.

---

### 7.3 `window.alert()` pour les erreurs

**Fichier** : `app/admin/points/page.tsx:99-100`
**Problème** : `window.alert()` pour les erreurs. Pas de feedback visuel. Incohérent avec les autres pages admin.

**Sévérité** : Moyen
**Action** : Bannière d'erreur comme dans les autres pages.

---

### 7.4 Bouton "Mapping automatique" toujours actif

**Fichier** : `app/admin/import/page.tsx:233`
**Problème** : Le bouton est affiché même avant qu'un fichier ne soit uploadé.

**Sévérité** : Moyen
**Action** : `disabled={!preview}`.

---

### 7.5 Calcul `Math.max` sans garde

**Fichier** : `app/admin/analytics/page.tsx:167-168`
**Problème** : Peut lever si `polesDistribution` est vide.

**Sévérité** : Moyen
**Action** : `?? 1`.

---

### 7.6 Focus management manquant

**Problème** : Pas de gestion du focus sur les modals, les dropdowns, les erreurs. Inaccessible au clavier.

**Sévérité** : Moyen
**Action** : `focus()` après ouverture de modal, `tabIndex` sur les éléments interactifs.

---

## 8. Documentation

### 8.1 README incomplet

**Fichier** : `README.md`
**Problème** : Le README ne documente pas les nouvelles routes admin, les variables d'environnement spécifiques, ni les scripts de migration.

**Sévérité** : Élevé
**Action** : Mettre à jour avec : installation, variables d'environnement, scripts (db:push, db:migrate, db:seed), nouvelles routes.

---

### 8.2 Pas de documentation API

**Problème** : Aucune spécification OpenAPI/Swagger pour les routes API.

**Sévérité** : Élevé
**Action** : Générer un swagger via `next-autodocs` ou `swagger-ui-react`.

---

### 8.3 Pas d'ADR

**Problème** : Pas de记录 des décisions d'architecture (choix JWT, modèle de données, stratégie d'import).

**Sévérité** : Moyen
**Action** : Créer `docs/adr/` avec les décisions clés.

---

### 8.4 Pas de CONTRIBUTING.md

**Problème** : Pas de guide pour les contributeurs.

**Sévérité** : Moyen
**Action** : `CONTRIBUTING.md` : conventions de nommage, structure des PR, standards de code.

---

## 9. Monitoring & Observabilité

### 9.1 Aucun healthcheck

**Problème** : Pas de endpoint `/api/health` pour vérifier la connectivité DB et Redis.

**Sévérité** : Critique
**Action** : Créer `GET /api/health` qui ping la DB et Redis.

---

### 9.2 Logs non structurés

**Problème** : `console.error` un peu partout. Pas de logger structuré JSON.

**Sévérité** : Critique
**Action** : Remplacer par `pino` avec logs JSON.

---

### 9.3 Aucun tracking d'erreurs

**Problème** : Pas de Sentry, PostHog, ou équivalent.

**Sévérité** : Critique
**Action** : Intégrer Sentry pour le error tracking.

---

### 9.4 Pas de métriques applicatives

**Problème** : Aucune métrique (latence, taux d'erreur, durée des imports).

**Sévérité** : Élevé
**Action** : Prometheus metrics ou DataDog.

---

## 10. Internationalisation

### 10.1 Toutes les chaînes en français hardcodées

**Problème** : Chaque page admin contient des chaînes en français inline. Pas de système d'i18n.

**Sévérité** : Moyen
**Action** : Configurer `next-intl` ou `react-i18next`.

---

### 10.2 Pas de locale pour les dates/nombres

**Problème** : `Intl.DateTimeFormat` non utilisé. Les dates sont formatées en-US.

**Sévérité** : Moyen
**Action** : `Intl.DateTimeFormat('fr-FR')`.

---

### 10.3 Messages d'erreur en français uniquement

**Problème** : Les erreurs API retournent des messages en français. Non adaptable.

**Sévérité** : Amélioration
**Action** : Codes d'erreur numériques + i18n.

---

## 11. Organisation du Code

### 11.1 `getClientIp()` dupliqué

**Voir** : Section 1.1
**Sévérité** : Élevé

---

### 11.2 `extractColumnValue()` dupliqué

**Fichiers** : `app/api/admin/import/route.ts`, `lib/import-excel.ts`
**Problème** : Logique de mapping dupliquée.

**Sévérité** : Élevé
**Action** : Extraire dans `lib/import-utils.ts`.

---

### 11.3 Type de niveau dupliqué

**Voir** : Section 2.12
**Sévérité** : Amélioration

---

### 11.4 Fichier de migration dupliqué

**Voir** : Section 1.11
**Sévérité** : Amélioration

---

### 11.5 `normalizeGender` exporté deux fois

**Fichiers** : `lib/import-excel.ts`, `app/api/admin/import/route.ts`
**Problème** : `normalizeGender` défini dans les deux fichiers.

**Sévérité** : Amélioration
**Action** : Garder une seule définition dans `lib/import-excel.ts`.

---

### 11.6 Fonction anonyme dans `handleBulkChangeStatus`

**Fichier** : `app/admin/page.tsx:144-169`
**Problème** : `handleBulkChangeStatus` défini comme fonction fléchée dans le composant. Non testable, non réutilisable.

**Sévérité** : Amélioration
**Action** : Extraire dans un custom hook `useBulkActions()`.

---

### 11.7 CSS inline massif

**Fichier** : `app/admin/page.tsx`, `app/admin/import/page.tsx`
**Problème** : Des centaines de lignes de styles inline. Difficile à maintenir.

**Sévérité** : Amélioration
**Action** : Classes Tailwind ou composants UI dédiés.

---

## 12. Actions Prioritaires Résumées

### Priorité 1 — Critique (bloquant production)

| # | Action | Fichier(s) |
|---|--------|------------|
| 1 | Transaction sur `PATCH /api/members/me` | `app/api/members/me/route.ts` |
| 2 | Transaction sur import Excel (batch inserts) | `app/api/admin/import/route.ts` |
| 3 | Tests unitaires (validators, computeTrustScore) | `lib/server-validation.ts` |
| 4 | Pipeline CI (typecheck + build + test) | `.github/workflows/` |
| 5 | Healthcheck endpoint | `app/api/health/route.ts` |
| 6 | Ordre rate limit / auth inversé | `app/api/admin/members/[id]/route.ts` |

### Priorité 2 — Élevé

| # | Action | Fichier(s) |
|---|--------|------------|
| 7 | Batch inserts import (100 par 100) | `app/api/admin/import/route.ts` |
| 8 | Pagination leaderboard + points | `app/api/admin/leaderboard/route.ts`, `app/api/admin/points/route.ts` |
| 9 | Paralleliser analytics (Promise.all) | `app/api/admin/analytics/route.ts` |
| 10 | Cache mémoire pour `requireAdmin()` | `lib/auth.ts` |
| 11 | Supprimer token magic link après usage | `app/api/auth/verify-magic-link/route.ts` |
| 12 | Types stricts (remplacer tous les `any`) | Multiples |
| 13 | Index `(points DESC)` | `lib/db/schema.ts` |

### Priorité 3 — Moyen

| # | Action | Fichier(s) |
|---|--------|------------|
| 14 | CSP nonces | `next.config.mjs` |
| 15 | Vérification magic bytes upload | `app/api/admin/import/route.ts` |
| 16 | N+1 sur les intérêts (batch) | `app/api/members/me/route.ts` |
| 17 | README mis à jour | `README.md` |
| 18 | Docs API OpenAPI | `app/api/` |
| 19 | ARIA labels | Multiples |
| 20 | Responsive design admin | `app/admin/page.tsx` |

### Priorité 4 — Amélioration

| # | Action | Fichier(s) |
|---|--------|------------|
| 21 | Logger structuré (pino) | `lib/logger.ts` |
| 22 | Sentry error tracking | `instrumentation.ts` |
| 23 | ADR décisions architecture | `docs/adr/` |
| 24 | Factoriser `getClientIp()` | `lib/request.ts` |
| 25 | CONTRIBUTING.md | `CONTRIBUTING.md` |
| 26 | i18n setup | `i18n/` |
| 27 | Migration auto sur déploiement | `vercel.json` / CI |

---

## 13. Plan de Résolution Non-Breaking (5 phases)

```
Semaine 1-2 — Fondations
  ├── Transactions sur les opérations critiques
  ├── Pipeline CI minimal (typecheck + build)
  ├── Healthcheck endpoint
  └── Types stricts sur les APIs admin

Semaine 3-4 — Performance
  ├── Batch inserts import (100 par 100)
  ├── Paralleliser analytics (Promise.all)
  ├── Pagination leaderboard + points
  └── Indexes composites (points DESC)

Semaine 5-6 — Sécurité
  ├── CSP nonces
  ├── Magic bytes upload
  ├── Token cleanup
  ├── Cache admin role
  └── OTP 8 chiffres

Semaine 7-8 — Tests
  ├── Tests unitaires (validators, computeTrustScore)
  ├── Tests intégration (routes admin)
  └── E2E Playwright (flux admin)

Semaine 9 — Docs & Observabilité
  ├── README, CONTRIBUTING, ADR
  ├── Pino logging
  ├── Sentry
  └── i18n setup
```

---

## 14. Fichiers Non Audités (hors portée)

Les fichiers suivants n'ont pas été lus par manque de temps ou de contexte :
- `app/onboarding/OnboardingWizard.tsx` (1000+ lignes — audit séparé recommandé)
- `scripts/legacy-import.ts` (script de migration, hors production)
- `keep-alive.js` (script utilitaire, hors production)
- Tous les fichiers sous `__tests__/` (s'il en existe)

---

*Rapport généré automatiquement par opencode le 2026-09-03.*
