# Nova Terra - Vitrine publique et poste de coordination

MVP statique pour les citoyens et les agents municipaux de Terra Nova.

## Lancer localement

Ouvrir `index.html` dans un navigateur, ou utiliser un serveur statique :

```powershell
# Necessite Node.js LTS : https://nodejs.org/
npx serve .
```

## Commandes utiles

```powershell
# Verifier les fichiers indispensables avant de livrer
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1

# Equivalent lorsque Node.js est installe
npm test

# Recuperer le travail publie par les autres avant de modifier
git pull --rebase origin main

# Voir les fichiers modifies
git status

# Ajouter uniquement les fichiers de cette fonctionnalite apres revue de git status
git add .gitignore README.md api/requests.js agent/dashboard/agent.css agent/dashboard/agent.js agent/dashboard/index.html app.js config.js dashboard.html nova-terra.js scripts/check.ps1
git commit -m "feat: decrire la fonctionnalite"
git push origin main
```

## Pages disponibles

- `index.html` : vitrine publique avec catalogue des services et actualités
- `connexion.html` : maquette de connexion (authentification non activée)
- `inscription.html` : maquette de préinscription citoyenne (aucune donnée envoyée)
- `dashboard.html` : tableau de bord citoyen et état de la cité
- `contact/index.html` : formulaire de contact citoyen
- `agent/dashboard/index.html` : back-office agents, Kanban et messages reçus
- `presentation.html` : support visuel de présentation

`npm test` execute le controle de structure du projet. Il ne remplace pas encore des tests de navigateur complets.

## API des signalements WebCup

Sur un domaine Vercel en `*.vercel.app`, le tableau public et l'espace agent chargent les signalements via `/api/requests`. Le proxy `api/requests.js` ajoute côté serveur la clé `WEBCUP_API_KEY` avant d'appeler l'API WebCup. La clé n'est jamais envoyée au navigateur ni enregistrée dans Git.

```text
GET   /api/requests                         proxy serveur vers l'API WebCup
GET   {API_BASE_URL}/citizen-messages
POST  {API_BASE_URL}/citizen-messages       body: { name, email, category, subject, message }
```

L'API WebCup fournie expose actuellement la lecture des demandes. Le proxy n'envoie au navigateur qu'une liste de champs autorisés et ne relaie pas les autres propriétés reçues. Le changement de statut est désactivé pour ces données jusqu'à ce que l'équipe API fournisse et documente un endpoint d'écriture. Les messages citoyens restent en mode démonstration tant qu'un endpoint de messages n'est pas configuré. Les tableaux actualisent les demandes à l'ouverture, toutes les minutes et sur demande. Les autres intégrations Nova Terra peuvent toujours utiliser `apiBaseUrl`.

La réponse des demandes doit être un tableau JSON, directement ou sous une propriété `requests`, `data` ou `items`. Les champs actuellement reconnus sont :

```js
{
  id: "TN-1042", // `reference` est aussi accepte
  title: "Eclairage absent", // `subject` ou `name` sont aussi acceptes
  district: "Quartier Horizon", // `location` ou `zone` sont aussi acceptes
  type: "Infrastructure", // `category` est aussi accepte
  priority: "high", // high | normal | low
  status: "todo", // todo | in_progress | done
  createdAt: "Il y a 12 min"
}
```

En l'absence d'API, les donnees de demonstration restent actives. Les formulaires et deplacements de cartes Kanban sont alors memorises dans le navigateur avec `localStorage`. La photo de profil du tableau de bord est reduite puis conservee localement dans le navigateur; elle n'est pas envoyee au serveur.

### Déployer sur Vercel

1. Importer le dépôt GitHub dans Vercel et déployer la branche `main`. Vercel sert les pages statiques et la fonction `api/requests.js`.
2. Dans les paramètres du projet Vercel, ajouter la variable d'environnement **`WEBCUP_API_KEY`** pour l'environnement Production. Utiliser une clé renouvelée si une clé a déjà été partagée dans un message. Ne jamais écrire sa valeur dans `config.js`, dans Git, ou dans une commande copiée dans un terminal.
3. Relancer le déploiement de production après avoir ajouté la variable.
4. Vérifier `https://<ton-projet>.vercel.app/api/requests`, puis `https://<ton-projet>.vercel.app/agent/dashboard/`.

Alternative en ligne de commande, depuis la racine du dépôt (Node.js requis) :

```powershell
# Lier ce dépôt à un projet Vercel
npx vercel

# Déployer en production après avoir configuré WEBCUP_API_KEY dans le tableau de bord Vercel
npx vercel --prod
```

Le domaine Vercel par défaut active automatiquement le proxy. Si un domaine personnalisé est utilisé, renseigner `requestsApiUrl: "/api/requests"` dans `config.js` pour ce déploiement. Sur GitHub Pages, l'application conserve le mode démonstration : Pages ne peut pas exécuter la fonction serveur.

Les exemples locaux restent disponibles avec `localStorage` quand aucune API n'est configurée. Pour lancer le proxy localement, utiliser Vercel CLI (`npx vercel dev`), configurer `WEBCUP_API_KEY` dans les variables d'environnement de développement Vercel, puis ouvrir `http://localhost:3000/dashboard.html?api=webcup`. Ne pas créer ni committer un fichier contenant la clé.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` peut toujours publier la version statique à chaque commit sur `main`. Dans GitHub, activez `Settings` > `Pages` > `Source: GitHub Actions`. Cette version reste en mode démonstration ; utilisez Vercel pour la connexion au proxy API.

## Securite de l'espace agent

`/agent/dashboard/` est une interface statique et ne peut pas proteger des donnees a elle seule. Avant la production, l'API doit verifier la session et les droits d'agent sur chaque endpoint, avec HTTPS, CORS limite au domaine du site et une authentification cote serveur. Aucun token prive ne doit etre ajoute au JavaScript du navigateur.
