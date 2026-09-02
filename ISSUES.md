# HASHCODE Community Portal - Issues & Roadmap

## Score Actuel : 8/10 ✅

---

## Phase 2 : Engagement & Social (8 → 9/10)

### Issue #1 : Badges & Achievements
**Description** : Système de badges visuels affichés sur les profils membres
**Fichiers impactés** :
- `lib/db/schema.ts` (ajouter table badges)
- `app/m/[id]/page.tsx` (affichage badges)
- `app/profile/page.tsx` (affichage badges)
**Effort** : 3-4h
**Tags** : `feature` `badges` `gamification`

**Badges à implémenter** :
- [ ] `security_expert` - Membre pole Security niveau "advanced"
- [ ] `ai_master` - Membre pole AI niveau "advanced"  
- [ ] `cloud_pioneer` - Membre pole Cloud niveau "advanced"
- [ ] `early_adopter` - Membre inscrit avant 2020
- [ ] `contributor` - Membre avec profil 100% complété
- [ ] `verified` - Email vérifié
- [ ] `multi_pole` - Membre inscrit à 2+ pôles

---

### Issue #2 : Timeline Communautaire
**Description** : Section "HASHCODE depuis 2019" avec événements marquants
**Fichiers impactés** :
- `app/page.tsx` (landing page)
- `app/about/page.tsx` (nouvelle page)
**Effort** : 2h
**Tags** : `feature` `content` `history`

**Contenu** :
- [ ] Timeline avec milestones (2019, 2020, 2021...)
- [ ] Stats évolution communauté
- [ ] Événements marquants (workshops, hackathons)
- [ ] Témoignages fondateurs

---

### Issue #3 : Témoignages Membres
**Description** : Section avec citations/vidéos de membres existants
**Fichiers impactés** :
- `app/page.tsx` (landing page)
- `lib/db/schema.ts` (table témoignages)
- `app/api/testimonials/route.ts` (nouvelle API)
**Effort** : 3-4h
**Tags** : `feature` `social-proof` `testimonials`

**Fonctionnalités** :
- [ ] Carrousel témoignages sur landing
- [ ] Page `/testimonials` dédiée
- [ ] Système de votes/engagement
- [ ] Import témoignages depuis BDD

---

## Phase 3 : Fonctionnalités Avancées (9 → 10/10)

### Issue #4 : Calendrier Événements
**Description** : Système de planification workshops, meetups, formations
**Fichiers impactés** :
- `lib/db/schema.ts` (table events)
- `app/events/page.tsx` (nouvelle page)
- `app/api/events/route.ts` (API)
**Effort** : 4-6h
**Tags** : `feature` `events` `calendar`

**Fonctionnalités** :
- [ ] Calendrier interactif (filtres par pôle)
- [ ] Page détail événement
- [ ] Inscription aux événements
- [ ] Notifications rappel

---

### Issue #5 : Système de Points & Gamification
**Description** : Points, niveaux, barre de progression
**Fichiers impactés** :
- `lib/db/schema.ts` (tables points/badges)
- `app/profile/page.tsx` (affichage progression)
- `app/leaderboard/page.tsx` (classement)
**Effort** : 4-6h
**Tags** : `feature` `gamification` `engagement`

**Système** :
- [ ] Points pour : inscription, profil complété, events participés
- [ ] Barre progression "Complète ton profil HASHCODE"
- [ ] Page `/leaderboard` avec classement
- [ ] Niveau membre : Novice → Expert → Legend

---

### Issue #6 : Notifications & Updates
**Description** : Système de notifications temps réel
**Fichiers impactés** :
- `app/components/Toast.tsx` (composant toast)
- `lib/notifications.ts` (logique notifications)
- `app/api/notifications/route.ts` (API)
**Effort** : 2-3h
**Tags** : `feature` `notifications` `real-time`

**Notifications** :
- [ ] Toast sur actions importantes
- [ ] Badge sur icône "notifications"
- [ ] Centre de notifications `/notifications`
- [ ] Préférences notifications par email

---

### Issue #7 : Recherche Avancée Membres
**Description** : Filtres pousse-par-pôle pour trouver des connections
**Fichiers impactés** :
- `app/members/page.tsx` (mise à jour)
- `app/api/members/discover/route.ts` (nouvelle API)
**Effort** : 2h
**Tags** : `feature` `discovery` `social`

**Filtres** :
- [ ] Recherche par compétences exactes
- [ ] Filtre par timezone/pays
- [ ] Filtre par niveau d'expérience
- [ ] "Membres similaires à toi"
- [ ] Suggestion de connections

---

### Issue #8 : Trust Signals & Vérification
**Description** : Badges de confiance et vérification d'identité
**Fichiers impactés** :
- `lib/db/schema.ts` (tables vérification)
- `app/m/[id]/page.tsx` (affichage badges)
- `app/api/verify-identity/route.ts` (API)
**Effort** : 2-3h
**Tags** : `feature` `trust` `verification`

**Signaux** :
- [ ] Badge "Email vérifié"
- [ ] Badge "Identité confirmée" (via LinkedIn/GitHub)
- [ ] Badge "Contributeur" (PRs mergés)
- [ ] Score de confiance sur profil

---

## Bugs & Optimisations

### Bug #9 : Rate Limiting Mémoire
**Description** : Rate limiting non persistant au restart serveur
**Fichiers impactés** : `lib/rate-limit.ts`
**Effort** : 2h
**Tags** : `bug` `security`

**Solution** : Utiliser Redis ou KV store Vercel

---

### Bug #10 : Middleware Deprecated ✅ FIXED
**Description** : Next.js 16+ recommande "proxy" au lieu de "middleware"
**Fichiers impactés** : `middleware.ts` → `proxy.ts`
**Effort** : 5min
**Tags** : `bug` `nextjs` `deprecation`

**Solution** : Migration manuelle vers `proxy.ts` - Build sans warning ✅

---

## Roadmap Priorisée

| Priorité | Issue | Score Impact | Effort Total |
|----------|-------|--------------|--------------|
| 1 | #4 Calendrier Events | +0.5 | 4-6h |
| 2 | #5 Gamification | +0.5 | 4-6h |
| 3 | #6 Notifications | +0.25 | 2-3h |
| 4 | #1 Badges | +0.25 | 3-4h |
| 5 | #7 Recherche avancée | +0.25 | 2h |
| 6 | #8 Trust signals | +0.25 | 2-3h |
| 7 | #2 Timeline | +0.1 | 2h |
| 8 | #3 Témoignages | +0.1 | 3-4h |

---

## Notes

- **Score actuel** : 8/10
- **Score cible** : 10/10
- **Effort total estimé** : 25-35h
- **Stack actuel** : Next.js 16, Drizzle ORM, Vercel, Postgres
