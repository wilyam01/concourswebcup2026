# Runbook Personne 3 — Fullstack, logique métier et présentation

Ce guide organise l’intégration Nova Terra sans remplacer le travail visuel de la Personne 1 ni le contrat API de la Personne 2.

## MVP à préserver

| Priorité | Parcours | Source | Règle métier |
| --- | --- | --- | --- |
| P0 | Consulter les signalements | `GET /api/requests` via proxy Vercel | Afficher uniquement les champs normalisés et indiquer la source. |
| P0 | Recherche et filtres | Collection chargée en mémoire | Recherche sans accent : référence, titre, secteur, catégorie, description. |
| P0 | Haut Conseil | Même collection que le tableau | Faire ressortir les demandes ouvertes urgentes, sans vote ni écriture simulés. |
| P0 | Continuité | Cache local du dernier flux valide | Distinguer clairement API, instantané local et données de démonstration. |
| P1 | Espace agent | API Nova Terra ou mode local | Filtres supplémentaires, Kanban et messages ; droits contrôlés côté serveur en production. |
| P1 | Contact | `POST /citizen-messages` | Mode démo explicite ou transmission confirmée par le backend. |

L’API WebCup documentée est en lecture seule. Aucun changement de statut, vote ou modération ne doit être présenté comme enregistré sans endpoint d’écriture documenté, protégé et testé.

## Contrat entre les membres

- **Personne 1 — interface :** HTML, CSS, textes et composants visibles. Prévenir avant de renommer une classe, un identifiant ou une structure utilisée par l’intégration.
- **Personne 2 — API :** URL, schéma, authentification, limites et données réelles. Les secrets ne sortent jamais du serveur.
- **Personne 3 — intégration :** normalisation, états chargement/erreur/vide/cache, interactions, tests, déploiement et présentation.

Avant toute modification partagée :

```powershell
git pull --rebase origin main
git status --short
git diff
```

Avant le commit, ajouter uniquement les fichiers de sa tâche et les revoir :

```powershell
git add -p
git diff --cached --check
git diff --cached
```

## Flux d’intégration

1. Le navigateur appelle `/api/requests` sur Vercel, ou le backend Nova Terra configuré.
2. Le proxy serveur ajoute `WEBCUP_API_KEY` et filtre la réponse à `id`, `title`, `district`, `type`, `priority`, `status`, `updatedAt`, `description`.
3. Le client normalise les statuts (`todo`, `in_progress`, `done`) et priorités (`high`, `normal`, `low`), ignore un enregistrement invalide isolé et conserve la collection valide.
4. Les états chargement, vide, erreur, cache et démonstration sont visuellement distincts.
5. Les tableaux actualisent le flux à l’ouverture, au retour dans l’onglet et régulièrement.

Après une évolution du schéma par la Personne 2, mettre à jour ensemble le normaliseur, les tests, `docs/webcup-api.md` et les exemples de démonstration :

```powershell
npm.cmd test
node .\tests\api-requests.test.js
node .\tests\api-client.test.js
```

Un champ non validé ne doit jamais être injecté dans le DOM ni présenté comme fiable.

## Lancement local

### Démonstration hors ligne

```powershell
cd C:\Users\eleve\Documents\Developpement\concourswebcup2026
npm.cmd test
npx serve . -l 5500
```

Ouvrir `http://localhost:5500/`. Ce mode reste autonome : comptes, demandes et messages ne quittent pas le navigateur.

### Backend Nova Terra optionnel

Dans un premier terminal :

```powershell
cd C:\Users\eleve\Documents\Developpement\concourswebcup2026
npm.cmd run backend:install
Copy-Item backend\.env.example backend\.env
npm.cmd run backend:start
```

Dans un second terminal :

```powershell
cd C:\Users\eleve\Documents\Developpement\concourswebcup2026
npx serve . -l 5500
```

Définir un `JWT_SECRET` unique d’au moins 32 caractères et `CORS_ORIGIN=http://localhost:5500` dans `backend/.env`. Ne jamais committer ce fichier. Ouvrir `http://localhost:5500/?api=backend`, ou `?api=local` pour revenir au mode démo.

## Déploiement recommandé

| Élément | Choix | Raison |
| --- | --- | --- |
| Vitrine et proxy WebCup | Vercel | Héberge les pages statiques et `api/requests.js` dans le même projet. |
| Backend Express/SQLite | Render ou hôte Node persistant | Nécessaire aux comptes partagés, messages et rôles. |
| Démo sans serveur | GitHub Pages | Le workflow existe, mais les pages restent en mode démo sans fonction proxy. |

### Vercel

1. Importer le dépôt Git dans Vercel, ou lier le projet avec la CLI.
2. Ajouter `WEBCUP_API_KEY` dans **Project Settings → Environment Variables**, pour Production (et Preview si utile). Utiliser une clé renouvelée.
3. Déployer et vérifier la route avant la démo.

```powershell
npx vercel
npx vercel --prod
Invoke-RestMethod -Uri "https://<projet>.vercel.app/api/requests" -Method Get
```

Pour le proxy local, ajouter le secret de façon interactive puis démarrer Vercel :

```powershell
npx vercel env add WEBCUP_API_KEY development
npx vercel dev
```

Ouvrir `http://localhost:3000/dashboard.html?api=webcup`. La clé ne doit jamais apparaître dans une URL, `config.js`, Git ou une commande non interactive.

### Exigences du backend public

- HTTPS, URL API terminant par `/api`, `JWT_SECRET` aléatoire et `CORS_ORIGIN` limité au domaine public.
- Stockage persistant (`DATABASE_PATH` sur volume persistant si SQLite est conservé).
- `DEPLOYED_API_BASE_URL` ne contient que l’URL publique du backend, jamais un secret.
- Vérifier `GET /api/health`, inscription, connexion, session, droits agent/admin et contact après livraison.

## Pré-vol avant démo ou livraison

```powershell
git status --short
git diff --check
npm.cmd test
```

- Ouvrir vitrine, connexion/inscription, tableau citoyen, Haut Conseil, agent et contact.
- Tester recherche avec et sans accent, filtre urgent, **Voir les urgences** et détail d’un signalement.
- Vérifier chargement, vide, erreur et cache ; la source doit toujours être annoncée.
- Vérifier clavier (lien d’évitement, Tab, Entrée, Échap, focus visible) et mobile.
- Garder un onglet de secours déjà chargé en mode démo ; ne pas masquer une panne du flux officiel.

## Pitch jury — 3 à 4 minutes

1. **Problème (30 s) :** les incidents du quotidien sont dispersés ; Nova Terra les rend visibles aux citoyens et au triage municipal.
2. **Citoyen (60 s) :** montrer source, compteurs, recherche (`éclairage` ou `Horizon`) et filtres.
3. **Haut Conseil (60 s) :** montrer l’urgence issue du même flux, cliquer sur **Voir les urgences**, expliquer la lecture seule.
4. **Résilience (30–60 s) :** expliquer le cache local, distinct des données fictives, et l’absence d’écriture inventée.
5. **Conclusion (20 s) :** présentation, intégration et secrets sont séparés ; une future route d’écriture sécurisée pourra compléter la modération.

Prévoir un onglet démo et une capture récente de production. Si l’API officielle est indisponible, annoncer le mode de secours plutôt que de simuler un résultat.
