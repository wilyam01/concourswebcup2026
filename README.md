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

# Publier une fonctionnalite terminee
git add .
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

## Configuration et branchement API Nova Terra

Dans `config.js`, renseigner `apiBaseUrl` et, si besoin, les noms d'endpoints fournis par l'equipe API. N'ajoutez jamais de cle secrete dans ce fichier : il est public sur GitHub Pages.

```text
GET   {API_BASE_URL}/requests
PATCH {API_BASE_URL}/requests/{id}          body: { "status": "todo" | "in_progress" | "done" }
GET   {API_BASE_URL}/citizen-messages
POST  {API_BASE_URL}/citizen-messages       body: { name, email, category, subject, message }
```

`GET /requests` peut renvoyer directement un tableau ou un objet avec `requests`, `data` ou `items`. Chaque demande doit fournir :

```js
{
  id: "TN-1042",
  title: "Eclairage absent",
  district: "Quartier Horizon", // `location` ou `zone` sont aussi acceptes
  type: "Infrastructure", // `category` est aussi accepte
  priority: "high", // high | normal | low
  status: "todo", // todo | in_progress | done
  createdAt: "Il y a 12 min",
  description: "..."
}
```

En l'absence d'API, les donnees de demonstration restent actives. Les formulaires et deplacements de cartes Kanban sont alors memorises dans le navigateur avec `localStorage`. La photo de profil du tableau de bord est reduite puis conservee localement dans le navigateur; elle n'est pas envoyee au serveur.

## Deploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` publie automatiquement le site a chaque commit sur `main`. Dans GitHub, activez une seule fois `Settings` > `Pages` > `Source: GitHub Actions`.

## Securite de l'espace agent

`/agent/dashboard/` est une interface statique et ne peut pas proteger des donnees a elle seule. Avant la production, l'API doit verifier la session et les droits d'agent sur chaque endpoint, avec HTTPS, CORS limite au domaine du site et une authentification cote serveur. Aucun token prive ne doit etre ajoute au JavaScript du navigateur.
