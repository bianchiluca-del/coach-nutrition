# Coach Nutrition

Application privée de suivi nutritionnel : plans personnalisés, journal quotidien, suivi des macros, mensurations et analyse IA facultative.

## Développement

```bash
npm install
npm run dev
```

Vérifications avant publication :

```bash
npm test
npm run build
```

## Architecture et confidentialité

- Authentification, données et synchronisation : Supabase.
- Les profils, questionnaires et plans personnels sont chargés après authentification ; ils ne sont pas intégrés au bundle public.
- Chaque client ne peut lire et modifier que ses propres données grâce aux politiques RLS.
- L'accès coach exige une attribution et un consentement explicite, révocable par le client.
- L'analyse IA est facultative et passe par un proxy authentifié. Aucun secret fournisseur n'est livré au navigateur.
- La suppression du compte efface les données applicatives puis l'utilisateur d'authentification.

## Déploiement

Le workflow GitHub Actions construit `dist/` avec `VITE_API_ENDPOINT` puis publie le résultat sur GitHub Pages.

Les anciens bundles compilés ne doivent jamais être versionnés dans la branche source.
