# Plan d'exécution — ADMIN_ISSUES

## Modèle recommandé

- **Sous-agent principal / architecte :** modèle fort en raisonnement.
- **Sous-agents spécialisés :** frontend, backend, base de données, import Excel, QA.
- **Règle importante :** chaque sous-agent ne touche qu'à son périmètre. Aucun commit sans validation finale.

---

# 0. Sous-agent Lead / Architecte

## Mission

Lire le projet, comprendre l'état actuel, découper les tâches et valider chaque phase.

## Fichiers à analyser

- `ADMIN_ISSUES.md`
- `ISSUES.md`
- `app/admin/page.tsx`
- `lib/db/schema.ts`
- `app/api/admin/members/route.ts`
- `app/api/admin/members/[id]/route.ts`
- `lib/auth.ts`
- `lib/server-validation.ts`
- `package.json`

## Livrable

Produire :

1. État actuel réel du projet.
2. Issues déjà partiellement résolues.
3. Ordre exact d'exécution.
4. Risques techniques.
5. Critères d'acceptation par issue.

## État déjà observé

- `PATCH /api/admin/members/[id]` existe déjà.
- `DELETE /api/admin/members/[id]` existe déjà.
- `POST /api/admin/members` existe déjà.
- La page `/admin/edit-member/[id]` manque encore.
- La suppression ne demande pas encore l'email admin.
- `memberPoles` existe déjà dans le schema.
- Le rate limiting est déjà partiellement sécurisé avec Upstash Redis.
- Le dashboard admin a déjà des filtres et une sélection multiple, mais pas de vraies actions groupées.

---

# 1. Sous-agent Database / Schema

## Mission

Préparer les changements de base de données nécessaires.

## Priorité

Traiter seulement les tables réellement manquantes.

## Tâches

### A3 — Pôles

Vérifier que ces tables existent déjà :

- `poles`
- `member_poles`

Actuellement elles existent déjà.

Ajouter si nécessaire :

- index unique sur `member_poles(member_id, pole_id)` pour éviter les doublons.

### A6 — Vérification / Trust

Créer si manquante :

- `member_verifications`

Champs possibles :

- `id`
- `memberId`
- `emailVerified`
- `linkedinVerified`
- `identityVerified`
- `contributor`
- `trustScore`
- `verifiedBy`
- `verifiedAt`
- `createdAt`
- `updatedAt`

### A7 — Points / Gamification

Créer si manquante :

- `member_points`
- `point_events`

Champs possibles :

- `memberId`
- `points`
- `level`
- `reason`
- `createdAt`
- `updatedAt`

## Livrable

- Schema Drizzle propre.
- Migration générée.
- Aucun endpoint frontend touché.

---

# 2. Sous-agent Backend API — CRUD membres

## Mission

Résoudre principalement **#A1**.

## Tâches

### Endpoint `PATCH /api/admin/members/[id]`

Ajouter la modification de :

- `firstName`
- `lastName`
- `country`
- `city`
- `phone`
- `age`
- `status`
- `bio`
- `linkedinUrl`
- `occupation`

Pour `bio`, `linkedinUrl`, `occupation`, utiliser :

- `memberProfiles`

### Endpoint `DELETE /api/admin/members/[id]`

Ajouter :

- vérification de l'email admin dans le body
- confirmation explicite
- suppression sécurisée
- retour JSON clair

### Endpoint `POST /api/admin/members`

Vérifier :

- email valide
- email unique
- champs obligatoires
- statut par défaut `imported`

## Critères d'acceptation

- Modifier un membre fonctionne.
- Supprimer un membre demande confirmation admin.
- Ajouter un membre fonctionne.
- Les erreurs sont compréhensibles.
- `pnpm typecheck` passe.

---

# 3. Sous-agent Frontend Admin — CRUD UI

## Mission

Créer l'interface admin manquante pour **#A1**.

## Tâches

### Page `/admin/edit-member/[id]`

Créer :

- `app/admin/edit-member/[id]/page.tsx`

Champs à modifier :

- prénom
- nom
- pays
- ville
- téléphone
- âge
- statut
- bio
- LinkedIn
- occupation

### Dashboard `app/admin/page.tsx`

Ajouter dans le tableau :

- bouton **Modifier**
- bouton **Supprimer**
- confirmation avant suppression
- demande de l'email admin avant suppression
- rafraîchissement après modification/suppression

## Critères d'acceptation

- Depuis le dashboard, on peut modifier un membre.
- Depuis le dashboard, on peut supprimer un membre.
- Après action, le tableau se rafraîchit.
- Aucun crash si les données sont absentes.

---

# 4. Sous-agent Backend API — Bulk actions

## Mission

Résoudre **#A5**.

## Endpoint à créer

`app/api/admin/members/bulk/route.ts`

## Actions supportées

- changer statut
- assigner pôles
- supprimer membres

## Body attendu

```ts
{
  ids: string[],
  action: "changeStatus" | "assignPoles" | "delete",
  status?: string,
  poles?: Array<{
    poleId: string
    level: "beginner" | "intermediate" | "advanced" | "expert"
    isPrimary?: boolean
  }>,
  adminEmail?: string
}
```

## Règles

- Refuser si `ids` est vide.
- Refuser si l'action est invalide.
- Suppression uniquement avec `adminEmail`.
- Utiliser une transaction DB.
- Retourner le nombre de membres traités.

## Critères d'acceptation

- Changer le statut de plusieurs membres fonctionne.
- Assigner des pôles à plusieurs membres fonctionne.
- Supprimer plusieurs membres nécessite confirmation.
- Les erreurs sont claires.

---

# 5. Sous-agent Frontend Admin — Bulk actions

## Mission

Ajouter la barre d'actions groupées dans `app/admin/page.tsx`.

## Tâches

Afficher une barre quand `selectedMembers.length > 1`.

Actions :

- Changer le statut
- Assigner des pôles
- Supprimer

## UI minimale

- select action
- select statut
- select pôle
- select niveau
- bouton exécuter
- confirmation pour suppression

## Critères d'acceptation

- La barre apparaît seulement si plusieurs membres sont sélectionnés.
- Les actions fonctionnent.
- Le tableau se rafraîchit après action.
- La suppression demande confirmation.

---

# 6. Sous-agent Backend API — Workflow statut

## Mission

Résoudre **#A2**.

## Tâches

Ajouter une validation stricte du workflow.

Ordre autorisé :

```ts
imported -> claimed -> verified -> updated -> active
active -> inactive
inactive -> active
```

Interdire :

```ts
imported -> active
claimed -> inactive
```

## Endpoint

Utiliser :

`PATCH /api/admin/members/[id]`

avec :

```ts
{
  status: "claimed"
}
```

## Critères d'acceptation

- Impossible de passer directement de `imported` à `active`.
- Les transitions valides fonctionnent.
- Le statut actuel est lu avant transition.
- Erreur `400` si transition invalide.

---

# 7. Sous-agent Frontend Admin — Statut

## Mission

Améliorer l'UI des statuts.

## Tâches

Créer :

- `app/admin/components/StatusBadge.tsx`

Statuts :

- `imported` : gris
- `claimed` : orange
- `verified` : bleu
- `updated` : violet
- `active` : vert
- `inactive` : gris foncé

Ajouter dans le dashboard :

- badge coloré
- bouton rapide pour changer statut
- menu déroulant de statut

## Critères d'acceptation

- Les statuts sont visuellement différenciés.
- Le changement de statut fonctionne.
- Les transitions invalides affichent une erreur.

---

# 8. Sous-agent Backend API — Pôles

## Mission

Résoudre **#A3**.

## Endpoints à créer

### `GET /api/admin/poles`

Retourne tous les pôles.

### `POST /api/admin/members/[id]/poles`

Ajoute un pôle à un membre.

### `PATCH /api/admin/members/[id]/poles`

Met à jour niveau ou pôle principal.

### `DELETE /api/admin/members/[id]/poles`

Supprime un pôle d'un membre.

## Règles

- Vérifier que le pôle existe.
- Vérifier que le niveau est valide.
- Un seul `isPrimary: true` par membre.
- Éviter les doublons `memberId + poleId`.

## Critères d'acceptation

- Ajouter un pôle fonctionne.
- Modifier niveau fonctionne.
- Définir un pôle principal fonctionne.
- Supprimer un pôle fonctionne.

---

# 9. Sous-agent Frontend Admin — Pôles

## Mission

Créer l'interface d'affectation des pôles.

## Route

`/admin/members/[id]/poles`

## Fichier

`app/admin/members/[id]/poles/page.tsx`

## UI

Pour chaque pôle :

- toggle actif/inactif
- niveau : débutant / intermédiaire / avancé / expert
- radio pôle principal

## Critères d'acceptation

- On peut assigner un pôle.
- On peut changer le niveau.
- On peut choisir un pôle principal.
- On peut retirer un pôle.
- Les changements sont sauvegardés.

---

# 10. Sous-agent Import Excel / CSV

## Mission

Résoudre **#A4**.

## Fichiers

- `app/admin/import/page.tsx`
- `app/api/admin/import/route.ts`
- `lib/import-excel.ts`
- `app/admin/components/ImportProgress.tsx`

## Tâches

### API

Créer :

- `POST /api/admin/import`

Fonctionnalités :

- lire fichier Excel ou CSV
- prévisualiser 20 lignes
- mapper colonnes
- détecter doublons par email
- créer ou mettre à jour les membres
- retourner succès / erreurs détaillées

### Frontend

Créer page d'import avec :

- upload fichier
- prévisualisation
- bouton confirmer
- barre de progression
- résumé des erreurs

## Critères d'acceptation

- Import Excel fonctionne.
- Import CSV fonctionne.
- Les doublons sont détectés.
- Les erreurs sont affichées ligne par ligne.
- Le dashboard se rafraîchit après import.

---

# 11. Sous-agent Trust / Vérification

## Mission

Résoudre **#A6**.

## Backend

Créer :

`app/api/admin/verify-identity/route.ts`

Actions :

- vérifier email
- vérifier LinkedIn
- vérifier identité
- marquer contributeur
- recalculer `trustScore`

## Frontend

Créer :

`app/admin/verify-identity/page.tsx`

UI :

- recherche membre
- badges :
  - Email vérifié
  - LinkedIn vérifié
  - Identité confirmée
  - Contributeur
- score de confiance

## Critères d'acceptation

- Un admin peut vérifier manuellement un membre.
- Les badges apparaissent dans le dashboard.
- Le score de confiance est calculé.

---

# 12. Sous-agent Analytics

## Mission

Résoudre **#A8**.

## Backend

Créer :

`app/api/admin/analytics/route.ts`

Données à retourner :

- membres par mois
- répartition par pôles
- taux d'engagement
- nouveaux vs actifs
- sources d'importation
- évolution mensuelle

## Frontend

Créer :

- `app/admin/analytics/page.tsx`
- `app/admin/trends/page.tsx`

UI :

- cartes statistiques
- graphiques simples
- export CSV

## Critères d'acceptation

- Les statistiques sont correctes.
- Les graphiques affichent les données.
- L'export CSV fonctionne.
- Pas de chargement complet inutile de toute la table.

---

# 13. Sous-agent Gamification

## Mission

Résoudre **#A7**.

## Backend

Créer :

`app/api/admin/points/route.ts`

Actions :

- attribuer points
- retirer points
- changer niveau
- consulter leaderboard

## Frontend

Créer :

- `app/admin/points/page.tsx`
- `app/admin/leaderboard/page.tsx`

## Règles

Niveaux :

```ts
Novice -> Expert -> Legend
```

Points possibles :

- inscription
- profil complété
- événement participé
- contribution
- vérification identité

## Critères d'acceptation

- Admin peut ajouter ou retirer des points.
- Le leaderboard affiche le classement.
- Les niveaux sont cohérents.

---

# 14. Sous-agent Sécurité / Rate limiting

## Mission

Vérifier **#A9**.

## État actuel

`lib/rate-limit.ts` utilise déjà :

- Upstash Redis
- fallback in-memory si Redis non configuré

## Tâches

Vérifier que les routes sensibles utilisent bien `rateLimit`.

Routes à contrôler :

- `/api/auth/*`
- `/api/admin/*`
- `/api/admin/import`
- `/api/admin/verify-identity`

## Critères d'acceptation

- Redis est utilisé si configuré.
- Fallback propre si Redis absent.
- Pas de contournement évident.
- Aucun secret exposé.

---

# 15. Sous-agent QA / Validation finale

## Mission

Valider chaque phase avant de passer à la suivante.

## Commandes obligatoires

Après chaque phase :

```bash
pnpm typecheck
```

Après les grosses phases :

```bash
pnpm build
pnpm test
```

Si migration DB nécessaire :

```bash
pnpm db:push
```

ou selon environnement :

```bash
pnpm db:migrate
```

## Checklist QA

Pour chaque issue :

- API testée.
- UI testée.
- Erreurs affichées proprement.
- Aucun crash console.
- Rechargement des données après mutation.
- Permissions admin vérifiées.
- Typecheck propre.
- Build propre.

---

# Ordre strict recommandé

1. **Lead audit**
2. **A1 CRUD membres**
3. **A5 Bulk actions**
4. **A2 Workflow statut**
5. **A3 Pôles**
6. **A4 Import Excel/CSV**
7. **A6 Trust / vérification**
8. **A8 Analytics**
9. **A7 Gamification**
10. **A9 Sécurité / vérification finale**

---

# Règles de développement imposées

- Un sous-agent ne travaille que sur sa phase.
- Ne jamais modifier plusieurs issues en même temps.
- Ne jamais faire de migration sans lire `schema.ts`.
- Ne jamais supprimer un membre sans confirmation admin.
- Ne jamais faire d'action bulk sans transaction DB.
- Ne jamais passer à la phase suivante sans `pnpm typecheck`.
- Ne jamais committer sans review du diff.
- Préférer les petites modifications validées progressivement.

---

# Définition de fini

Une issue est considérée terminée seulement si :

- le code compile,
- le build passe,
- les tests passent,
- l'UI fonctionne manuellement,
- les erreurs sont propres,
- les permissions admin sont respectées,
- aucune donnée n'est perdue accidentellement.
