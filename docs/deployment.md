# Déploiement — Nova Terra

Guide de mise en ligne pour la Personne 3 (Phase 3). Il complète la section « Déployer sur Vercel » du [README](../README.md) et le [runbook](personne-3-runbook.md).

## Vue d’ensemble

| Composant | Cible recommandée | Rôle |
| --- | --- | --- |
| Vitrine + proxy WebCup | **Vercel** | Sert les pages statiques et la fonction `api/requests.js`. |
| Variante statique sans proxy | **Netlify** ou **GitHub Pages** | Démonstration hors ligne (proxy serveur indisponible). |
| Backend Express/SQLite | **Render** ou tout hôte Node persistant | Comptes partagés, messages, annonces, rendez-vous, audit. |

Règle permanente : **aucun secret ne quitte le serveur**. La clé WebCup vit dans `WEBCUP_API_KEY` (Vercel) et les secrets backend dans les variables d’environnement de l’hôte (jamais dans `config.js`, Git ou une commande partagée).

## Pré-vol commun

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
npm.cmd test
```

Le dépôt fournit déjà :

- `vercel.json` — durée de la fonction `api/requests.js`, en-têtes de sécurité, indexation de l’espace agent désactivée.
- `.nvmrc` — version Node 20 attendue par la fonction proxy (le backend exige `>=20`).

## A. Vercel (recommandé)

1. Importer le dépôt GitHub, branche `main`.
2. Ajouter la variable d’environnement **`WEBCUP_API_KEY`** (Production). Utiliser une clé renouvelée si elle a déjà circulé.
3. Redéployer la production.
4. Vérifier la route puis l’espace agent.

```powershell
npx vercel
npx vercel env add WEBCUP_API_KEY production
npx vercel --prod
Invoke-RestMethod -Uri "https://<projet>.vercel.app/api/requests" -Method Get
```

Points clés :

- `config.js` active `/api/requests` automatiquement sur un domaine `*.vercel.app`. Pour un domaine personnalisé, renseigner `requestsApiUrl: "/api/requests"`.
- L’espace agent est renvoyé avec `X-Robots-Tag: noindex`.
- `vercel.json` ne définit ni build ni install : le site est statique + une fonction. Ne pas ajouter de clé dans ce fichier.

## B. Netlify (variante statique)

Netlify sert la vitrine en **mode démonstration** (aucune fonction Node équivalente au proxy WebCup). Pour brancher le flux officiel, viser plutôt Vercel, ou pointer `DEPLOYED_API_BASE_URL` vers le backend Render.

```powershell
npm.cmd i -g netlify-cli
netlify deploy --dir . --prod
```

## C. Render (backend Node)

1. Créer un **Web Service** Node relié au dépôt.
2. Build command : `npm run backend:install`
3. Start command : `npm run backend:start`
4. Variables : `JWT_SECRET` (≥ 32 caractères), `CORS_ORIGIN` (domaine public), `DATABASE_PATH`, et selon besoin `RESEND_API_KEY`, `RESEND_FROM`, `TOTP_ENCRYPTION_KEY`.
5. Renseigner `DEPLOYED_API_BASE_URL` dans `config.js` avec l’URL publique terminant par `/api`.

Pour plusieurs instances en production, remplacer SQLite par une base gérée persistante.

## D. GitHub Pages (démo)

Le workflow `.github/workflows/deploy-pages.yml` publie la version statique. Dans GitHub : `Settings > Pages > Source: GitHub Actions`. Cette cible reste en **mode démonstration** : Pages n’exécute pas `api/requests.js`.

## Après déploiement — vérifications

- [ ] `GET /api/requests` renvoie une collection valide, ou une erreur claire si aucune clé n’est configurée (503).
- [ ] Ouvrir vitrine, connexion/inscription, tableau citoyen, Haut Conseil, espace agent, contact.
- [ ] Vérifier la recherche, les filtres, le bouton « Voir les urgences » et le tiroir mobile.
- [ ] Confirmer que la clé n’apparaît nulle part : vue source, onglet réseau, historique Git.
- [ ] Vérifier que l’espace agent renvoie bien `X-Robots-Tag: noindex` (repli si un robot l’indexe).

## Retour arrière

- Vercel : onglet **Deployments** → promouvoir le déploiement précédent en Production.
- Render / Netlify : redéployer le commit précédent.
- Le dépôt Git reste la source de vérité ; ne jamais pousser un état non vérifié.
