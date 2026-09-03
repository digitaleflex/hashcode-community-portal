# Issues Admin Locales - Gestion de la Section Admin

## Score actuel : 0/10 ❌

---

## Issue #A1 : Gestion CRUD de base des membres

**Description** : Le dashboard admin affiche les membres mais ne permet pas de les modifier, les supprimer ou en ajouter de nouveaux.

**Fichiers impactés** :
- `app/admin/page.tsx` (ajouter boutons modifier/supprimer)
- `app/api/admin/members/[id]/route.ts` (ajouter les endpoints PATCH/DELETE)
- `app/admin/edit-member/page.tsx` (nouvelle page d'édition)

**Effort** : 4-6h
**Tags** : `bug` `admin` `crud`

**Impact** : Sans les opérations CRUD de base, l'interface admin est inutilisable - on peut voir les données mais pas agir dessus.

**Fonctionnalités à implémenter** :
- [ ] Colonne actions avec boutons ✏️ **Modifier** et 🗑️ **Supprimer** dans le tableau des membres
- [ ] Page `/admin/edit-member/[id]` pour éditer les champs :
  - firstName, lastName, country, city, phone, age, status
  - Champs supplémentaires : bio, linkedinUrl, occupation
- [ ] Confirmation de suppression avec demande d'email admin
- [ ] Formulaire `POST /api/admin/members` pour ajouter manuellement un nouveau membre

---

## Issue #A2 : Gestion du flux de statut des membres

**Description** : Impossible de faire progresser les membres à travers les statuts : importé → réclamé → vérifié → actif → inactif.

**Fichiers impactés** :
- `app/admin/page.tsx` (ajouter contrôles de statut rapides)
- `app/api/admin/members/[id]/route.ts` (ajouter PATCH pour le statut)
- `app/admin/components/StatusBadge.tsx` (nouveau composant pour les badges de statut)

**Effort** : 3-4h
**Tags** : `bug` `admin` `workflow`

**Impact** : L'importation est une étape sans sortie - les membres restent bloqués au statut "importé".

**Fonctionnalités à implémenter** :
- [ ] Badges de statut colorés dans le tableau admin (imported/décoloré, claimed/orangé, verified/bleu, active/vert, inactive/gris)
- [ ] Boutons rapides en ligne pour changer de statut (bouton unique pour chaque ligne)
- [ ] Menu déroulant de statut pour les actions groupées
- [ ] Toast de confirmation après chaque changement de statut
- [ ] Validation du workflow (ex: ne peut pas passer directement de imported à active)

---

## Issue #A3 : Système d'affectation des pôles

**Description** : Les pôles sont affichés mais pas de la possibilité de les gérer (ajouter/supprimer/assigner niveaux).

**Fichiers impactés** :
- `app/admin/page.tsx` (ajouter colonne poules éditable)
- `app/admin/members/pole-assignment/page.tsx` (nouvelle page d'affectation)
- `app/api/admin/members/[id]/poles/route.ts` (API pour gérer l'affectation)
- `lib/db/schema.ts` (ajouter table memberPoles si manquante)

**Effort** : 5-6h
**Tags** : `bug` `admin` `poles`

**Impact** : Les pôles affichés sont en lecture seule, pas de contrôle réel sur quel membre appartient à quel pôle.

**Fonctionnalités à implémenter** :
- [ ] Colonne poules interactive dans le tableau (liste de badges cliquables)
- [ ] Page d'affectation des pôles (`/admin/members/[id]/poles`) avec :
  - Toggle pour chaque pôle (Security, AI, Cloud)
  - Sélecteur de niveau (débutant/intermediate/avancé/expert)
  - Radio pour définir le pôle principal
- [ ] API `POST /api/admin/members/[id]/poles` pour ajouter
- [ ] API `PATCH /api/admin/members/[id]/poles` pour mettre à jour
- [ ] API `DELETE /api/admin/members/[id]/poles` pour supprimer

---

## Issue #A4 : Interface d'importation d'Excel/CSV

**Description** : Le dashboard mentionne "Gérer l'importation" mais il n'y a pas de véritable importation CSV/Excel.

**Fichiers impactés** :
- `app/admin/import/page.tsx` (nouvelle page d'importation)
- `app/api/admin/import/route.ts` (API pour l'importation)
- `lib/import-excel.ts` (utilitaire d'importation)
- `app/admin/components/ImportProgress.tsx` (nouveau composant)

**Effort** : 8-10h
**Tags** : `feature` `admin` `import`

**Impact** : L'intégration principale est incomplète - pas de moyen d'importer des données d'Excel.

**Fonctionnalités à implémenter** :
- [ ] Page d'importation avec glisser-déposer et sélection de fichier
- [ ] Prévisualisation des lignes importées (20 lignes avant confirmation)
- [ ] Mapping de colonnes (joindre automatiquement firstName, lastName depuis email)
- [ ] Barre de progression avec succès/échecs détaillés
- [ ] Gestion des doublons (joindre aux membres existants)
- [ ] API `POST /api/admin/import` pour traiter les fichiers

---

## Issue #A5 : Actions groupées (bulk actions)

**Description** : La sélection par case à cocher est présente mais les boutons d'action groupés sont manquants.

**Fichiers impactés** :
- `app/admin/page.tsx` (ajouter barre d'action groupée)
- `app/api/admin/members/bulk/route.ts` (nouvelle API pour les actions groupées)

**Effort** : 3-4h
**Tags** : `bug` `admin` `bulk`

**Impact** : Sélectionner plusieurs membres est inutile sans action possible.

**Fonctionnalités à implémenter** :
- [ ] Barre d'action groupée affichée quand >1 membre sélectionné
- [ ] Menu déroulant d'action groupée : **Changer le statut**, **Assigner les pôles**, **Supprimer**
- [ ] Confirmation avant les actions destructrices (supprimer)
- [ ] API `POST /api/admin/members/bulk` pour les changements groupés

---

## Issue #A6 : Badge de confiance et vérification

**Description** : Pas de badges de confiance (email vérifié, LinkedIn vérifié, identité confirmée).

**Fichiers impactés** :
- `app/admin/page.tsx` (ajouter colonne badges de confiance)
- `app/admin/verify-identity/page.tsx` (nouvelle page de vérification)
- `app/api/admin/verify-identity/route.ts` (API pour la vérification)
- `lib/db/schema.ts` (ajouter table memberVerification si manquante)

**Effort** : 4-5h
**Tags** : `feature` `admin` `trust`

**Impact** : Pas de moyens visuels pour indiquer si un membre est vérifié.

**Fonctionnalités à implémenter** :
- [ ] Colonne badges dans le tableau admin :
  - 🟢 **Email vérifié** (icône ✅)
  - 💼 **LinkedIn vérifié** (icône LinkedIn)
  - 🔐 **Identité confirmée** (icône bouclier)
  - ⭐ **Contributeur** (icône étoile pour les membres avec PRs mergés)
- [ ] Page `/admin/verify-identity` pour gérer les vérifications manuelles
- [ ] API pour vérifier/ajouter des liens externes (LinkedIn, GitHub)
- [ ] Score de confiance calculé basé sur les vérifications

---

## Issue #A7 : Points et gamification

**Description** : Pas de système de points, de niveaux ou de leaderboard.

**Fichiers impactés** :
- `app/admin/leaderboard/page.tsx` (nouveau leaderboard)
- `app/admin/points/page.tsx` (suivi des points)
- `app/api/admin/points/route.ts` (API pour la gestion des points)
- `lib/db/schema.ts` (ajouter table memberPoints si manquante)

**Effort** : 6-8h
**Tags** : `feature` `admin` `gamification`

**Impact** : Pas de motivation pour l'engagement de la communauté.

**Fonctionnalités à implémenter** :
- [ ] Page `/admin/leaderboard` avec classement des membres
- [ ] Système de points pour : inscription, profil complété, events participés
- [ ] Page `/admin/points` pour gérer les points manuellement
- [ ] Niveaux de membre : Novice → Expert → Légende
- [ ] Barre de progression "Complète ton profil HASHCODE"
- [ ] API pour attribuer des points et gérer les niveaux

---

## Issue #A8 : Analytics et reporting avancés

**Description** : Seulement des stats de base, pas d'analyse de tendance réelle.

**Fichiers impactés** :
- `app/admin/analytics/page.tsx` (nouvelle page d'analytics)
- `app/admin/trends/page.tsx` (page de tendances)
- `app/api/admin/analytics/route.ts` (API d'analytics)

**Effort** : 4-6h
**Tags** : `feature` `admin` `analytics`

**Impact** : Pas de vue sur la croissance, l'engagement ou les insights de la communauté.

**Fonctionnalités à implémenter** :
- [ ] Page `/admin/analytics` avec graphiques :
  - Members par mois (courbe de croissance)
  - Répartition par pôles (camembert)
  - Taux d'engagement (nouveaux vs actifs)
  - Sources d'importation (Excel vs formulaire)
- [ ] Page `/admin/trends` pour le mois en cours et périodes antérieures
- [ ] Export CSV des données d'analyse

---

## Problèmes de sécurité

### Issue #A9 : Rate limiting non sécurisé pour l'admin

**Description** : Le rate limiting admin utilise l'in-memory (se réinitialise au redémarrage serveur).

**Fichiers impactés** : `lib/rate-limit.ts`

**Effort** : 2h
**Tags** : `bug` `security`

**Solution** : Mettre en place Upstash Redis pour le rate limiting persistant.

---

## Roadmap Priorisée

| Priorité | Issue | Impact | Effort Total |
|----------|-------|--------|--------------|
| 1 | #A1 CRUD de base | 10/10 | 4-6h |
| 2 | #A5 Actions groupées | 7/10 | 3-4h |
| 3 | #A2 Workflow de statut | 9/10 | 3-4h |
| 4 | #A3 Affectation des pôles | 8/10 | 5-6h |
| 5 | #A4 Importation | 8/10 | 8-10h |
| 6 | #A6 Badges de confiance | 6/10 | 4-5h |
| 7 | #A8 Analytics | 5/10 | 4-6h |
| 8 | #A7 Gamification | 4/10 | 6-8h |

**Effort total estimé : 45-50h**
**Score admin cible : 8/10**