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
- `connexion.html` : connexion avec vérification des comptes locaux de démonstration
- `inscription.html` : création de compte locale avec mot de passe et confirmation
- `dashboard.html` : tableau de bord citoyen et état de la cité
- `contact/index.html` : formulaire de contact citoyen
- `agent/dashboard/index.html` : back-office agents, Kanban et messages reçus
- `presentation.html` : support visuel de présentation

`npm test` execute le controle de structure et de presence des filtres de signalements. Il ne remplace pas encore une suite de tests navigateur automatisee.

## API des signalements WebCup

Le contrat, les reponses HTTP verifiees et l'import de tests Postman sont decrits dans [docs/webcup-api.md](docs/webcup-api.md). La collection partagee est `postman/terra-nova-api.postman_collection.json`; la cle doit rester dans une variable locale/secrete.

Sur un domaine Vercel en `*.vercel.app`, le tableau public et l'espace agent chargent les signalements via `/api/requests`. Le proxy `api/requests.js` ajoute côté serveur la clé `WEBCUP_API_KEY` avant d'appeler l'API WebCup. La clé n'est jamais envoyée au navigateur ni enregistrée dans Git.

```text
GET   /api/requests                         proxy serveur vers l'API WebCup
GET   {API_BASE_URL}/citizen-messages
POST  {API_BASE_URL}/citizen-messages       body: { name, email, category, subject, message }
```

L'API WebCup fournie expose actuellement la lecture des demandes. Le proxy n'envoie au navigateur qu'une liste de champs autorisés et ne relaie pas les autres propriétés reçues. Le changement de statut est désactivé pour ces données jusqu'à ce que l'équipe API fournisse et documente un endpoint d'écriture. Les messages citoyens restent en mode démonstration tant qu'un endpoint de messages n'est pas configuré ; dans ce mode, le formulaire précise que les messages sont seulement conservés dans le navigateur et ne sont pas transmis aux services. Les tableaux actualisent les demandes à l'ouverture, toutes les minutes et sur demande. La recherche publique et celle de l'espace agent acceptent le titre, la référence, le secteur, la catégorie et la description, sans tenir compte des accents ; les espaces agents offrent aussi des filtres par statut, priorité et catégorie. Les autres intégrations Nova Terra peuvent toujours utiliser `apiBaseUrl`.

Les ressources CSS et JavaScript de la page de contact utilisent un identifiant de cache dans `contact/index.html`. Incrémentez-le lorsque vous modifiez ces ressources pour que les navigateurs récupèrent bien la version publiée.

Les indicateurs de population, de bien-être et de ressources, la carte et la météo sont des éléments illustratifs et ne sont pas alimentés par l'API WebCup. L'interface le signale pour éviter de confondre les données de démonstration avec les signalements réels. Les compteurs de signalements, eux, sont calculés depuis la réponse active ; pendant le chargement ils affichent un tiret ou zéro plutôt qu'une valeur inventée.

La réponse des demandes doit être un tableau JSON, directement ou sous une propriété `requests`, `data` ou `items`. Les champs actuellement reconnus sont :

```js
{
  id: "TN-1042", // `reference` est aussi accepte
  title: "Eclairage absent", // `subject` ou `name` sont aussi acceptes
  district: "Quartier Horizon", // `location` ou `zone` sont aussi acceptes
  type: "Infrastructure", // `category` est aussi accepte
  priority: "high", // high | normal | low
  status: "todo", // todo | in_progress | done
  createdAt: "Il y a 12 min",
  description: "Une description facultative de la demande."
}
```

En l'absence d'API, les donnees de demonstration restent actives. Les formulaires et deplacements de cartes Kanban sont alors memorises dans le navigateur avec `localStorage`. La photo de profil du tableau de bord est reduite puis conservee localement dans le navigateur; elle n'est pas envoyee au serveur.

L'inscription conserve le compte dans le navigateur et le mot de passe sous forme de hash PBKDF2 sale (pas en clair). La connexion verifie ce hash. Les comptes ne sont pas partages entre appareils et ne constituent pas une authentification de production: sans serveur, les donnees et les controles du navigateur ne protegent pas un vrai service. Utilisez HTTPS ou localhost pour Web Crypto.

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
