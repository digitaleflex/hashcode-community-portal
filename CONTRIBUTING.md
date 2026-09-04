# Contribuer à HASHCODE Community Portal

## Conventions de commits

- **Conventional Commits** obligatoires : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- **1 commit par item d'audit** (ex. `fix: audit 3.3 — transaction isPrimary poles`).
- Messages en français ou anglais, forme impérative, périmètre précis.

## Branches

- `refactor/<sujet>` pour les refontes et réorganisations.
- `fix/<sujet>` pour les corrections (audit, bugs, sécurité).
- 1 branche = 1 item d'audit ou 1 fonctionnalité. Rebase sur `master` avant PR.

## Standards avant merge

- `pnpm typecheck`, `pnpm test` et `pnpm build` **verts** (mêmes étapes que la CI).
- **Pas de `any`** : typer explicitement (interfaces, schémas Zod, types partagés dans `lib/types.ts`).
- **Français pour l'UI et les messages** utilisateurs et d'erreur (cohérent avec le code existant : `lib/validation.ts`, `lib/server-validation.ts`).
- Pas de secrets en dur ; toute nouvelle variable va dans `.env.example` + README.

## Structure des PR

1. **Titre** : `<type>: audit X.Y — <résumé>` ou `<type>: <résumé>`.
2. **Description** : problème, fichiers touchés, comment tester.
3. **Checklist** : typecheck / test / build verts, pas de `any`, docs mises à jour si besoin.
4. **Revue** : 1 approbation requise ; pas de merge si la CI est rouge.
