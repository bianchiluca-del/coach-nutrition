# Coach Nutrition — Luca & Émilie

App de suivi nutritionnel multi-profils avec analyse IA via Claude API.

- ✅ 2 profils (Luca / Émilie) avec plans préconfigurés
- ✅ Suivi macros temps réel (kcal, protéines, glucides, lipides)
- ✅ Persistance locale (localStorage)
- ✅ Reset auto à minuit
- ✅ Analyse IA contextuelle (Claude Sonnet 4 via tool_use)
- ✅ Chat libre pour signaler écarts / poser questions

## 🚀 Lancer en local

```bash
npm install
npm run dev
```

L'app s'ouvre sur `http://localhost:5173`.

## ⚠️ Pour que l'analyse IA fonctionne

L'app appelle l'API Anthropic. **Tu NE PEUX PAS** appeler `api.anthropic.com` directement depuis le navigateur (CORS + clé API exposée = compte volé). Il te faut **un proxy backend**.

### Option A — Cloudflare Worker (recommandé, gratuit, 5 min)

1. Va sur [dash.cloudflare.com](https://dash.cloudflare.com/) → Workers & Pages → Create Worker
2. Colle le contenu de `proxy-cloudflare-worker/worker.js`
3. Settings → Variables → ajoute un **Secret** nommé `ANTHROPIC_API_KEY`
   (récupère ta clé sur [console.anthropic.com](https://console.anthropic.com/settings/keys))
4. Déploie. Tu récupères une URL `https://ton-worker.workers.dev`
5. Crée un fichier `.env` à la racine du projet :

```env
VITE_API_ENDPOINT=https://ton-worker.workers.dev/v1/messages
```

6. Relance `npm run dev`

### Option B — Sans IA

Si tu ne configures pas de proxy, tout le reste de l'app marche (cochage repas, calcul macros, persistance) — seul le bouton "Analyser" et le chat échoueront.

## 📦 Build & Déploiement

### Build local

```bash
npm run build
# génère le dossier dist/
npm run preview
```

### Déploiement GitHub Pages

1. Dans `vite.config.js`, décommente et adapte la ligne `base: '/coach-nutrition/'` avec le nom de ton repo
2. Push sur GitHub
3. `npm run deploy` (utilise gh-pages)

**Attention** : si tu déploies sur GitHub Pages, l'URL du worker Cloudflare devra autoriser ton origine.
Dans `proxy-cloudflare-worker/worker.js`, remplace `ALLOWED_ORIGIN = '*'` par `'https://ton-user.github.io'`.

### Déploiement Netlify / Vercel

```bash
npm run build
```

Drop le dossier `dist/` sur Netlify, ou link le repo sur Vercel. Pense à ajouter la variable `VITE_API_ENDPOINT` dans leurs settings.

## 🗂 Structure

```
coach-nutrition/
├── src/
│   ├── App.jsx              ← composant principal (toute la logique)
│   ├── main.jsx             ← entry point
│   ├── index.css            ← Tailwind directives
│   └── storage-shim.js      ← shim window.storage → localStorage
├── proxy-cloudflare-worker/
│   └── worker.js            ← proxy Anthropic API
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env.example
```

## 🛠 Personnaliser

Les plans alimentaires sont des constantes en haut de `src/App.jsx` :
- `PLAN_LUCA` — 7 repas
- `PLAN_EMILIE` — 5 repas (dont Meal 3 conditionnel)

Tu peux ajouter / retirer / modifier des items, leurs quantités et macros. La cible journalière se recalcule automatiquement.

Pour ajouter un troisième profil, duplique un bloc `PLAN_*`, ajoute une entrée dans `USERS` et étends `usersData` dans le state initial du composant `App`.

## 🔐 Notes sécurité

- La clé API Anthropic **ne doit jamais** être commitée dans le code frontend
- Le proxy CF Worker la stocke comme secret côté serveur
- Pense à restreindre `ALLOWED_ORIGIN` au domaine de prod
- Le localStorage est public au navigateur → ne stocke pas de données médicales sensibles

## 🏋️ Crédits

App développée par Luca Bianchi pour son suivi HYROX (et celui d'Émilie).
Plan nutritionnel basé sur le programme "The Genius" du coach Andy.
