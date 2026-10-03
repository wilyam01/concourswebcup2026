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
- `connexion.html` : connexion en mode navigateur ou via le backend configuré
- `inscription.html` : création de compte citoyen locale ou côté serveur
- `dashboard.html` : tableau de bord citoyen et état de la cité
- `contact/index.html` : formulaire de contact citoyen
- `agent/dashboard/index.html` : back-office agents, Kanban et messages reçus
- `presentation.html` : support visuel de présentation

## Accessibilité et repères d’urgence

Le bouton « Aa » regroupe les préférences déjà présentes : navigation clavier avec repère de saut et focus visible, mode contraste élevé, agrandissement du texte, langue et fil d’Ariane. La palette daltonisme prolonge le contraste existant; l’interface simplifiée et le petit glossaire ajoutent les fonctions D13. Le fil d’actualités, les annonces prioritaires, les alertes crue/canicule et les repères de navigation sont déjà couverts : D15, D18/F30, F29/F31, F41/F42/D20 et F44 réutilisent les composants en place au lieu d’ajouter des copies.

La section **Urgences** de l’accueil ajoute la carte filtrable des hôpitaux, postes de secours et lieux frais (F45/F46). Ses emplacements et horaires sont illustratifs, non officiels; appeler le 112 en cas d’urgence réelle. Une source cartographique municipale pourra remplacer ces exemples si elle est fournie.

## Navigation mobile et tableau adaptatif

Sous 900 px, le tableau de bord citoyen affiche le menu latéral en tiroir. Un fond cliquable (`#menuBackdrop`, bouton `dashboard-menu-backdrop`) ferme le menu par un appui hors navigation; la touche Échap referme le tiroir et restitue le focus au bouton du menu, et un passage au gabarit bureau referme le tiroir pour éviter un état figé. À l’ouverture, le focus passe au premier lien de navigation; le contenu principal devient `inert` pour rester hors de portée du clavier et des lecteurs d’écran tant que le tiroir est ouvert, puis le focus revient au bouton du menu à la fermeture (y compris après le choix d’une rubrique).

Sous 600 px, le tableau des signalements passe en disposition fixe : la colonne du secteur est masquée, la référence et le statut restent lisibles et le bouton d’ouverture conserve une cible de 32 px minimum. Les commandes flottantes de l’assistant, de la boîte de réception et des préférences « Aa » se réduisent à 44 px et s’alignent en bas à droite pour ne pas recouvrir un formulaire ou un filtre.

Les identifiants de cache de `community.css` et `app.js` ont été relevés dans les pages qui les chargent; pensez à les incrémenter à nouveau après toute modification de ces ressources.

## Éco-conception et faible débit

Le bilan F57, dans les préférences « Aa », affiche le transfert mesuré par le navigateur pour les ressources de même origine. Les entrées en cache et les ressources tierces peuvent être absentes de cette mesure : ce chiffre n'est ni un score environnemental complet ni une estimation d'énergie ou de CO₂. Les pages principales n'intègrent pas de photos/vidéos et n'appellent plus de fournisseur de polices externe.

F58/F61 réduisent le travail de rendu sur les pages longues et désactivent automatiquement animations, filtres et décors coûteux sur les appareils déclarés peu puissants. F59 détecte Save-Data et les réseaux 2G, avec un réglage manuel/automatique dans « Aa »; en mode bas débit, les vérifications périodiques des services, demandes, rendez-vous, comptes et annonces passent d'une à cinq minutes. F62 complète ces options par l'interface simplifiée existante. Les médias ajoutés à l'avenir doivent rester compressés et définir `loading="lazy"`, `decoding="async"`, des dimensions explicites et `data-critical` uniquement pour les médias indispensables au premier écran; pour les médias créés par script, appeler `NovaTerraEco.optimizeMedia(element)` avant de leur assigner une source.

F63 propose aux administrateurs un arrêt rapide par service. Le changement et le rétablissement d'un service déclaré indisponible sont contrôlés côté serveur et consignés dans le journal; un agent ne peut ni déclencher cet arrêt ni le lever. F64 publie un état par service dans le catalogue : « Statut non communiqué » n'est jamais présenté comme une disponibilité, et une erreur de vérification est signalée explicitement.

## Relier l’application au backend Nova Terra

Un backend Express/SQLite optionnel est fourni dans `backend/`. Il permet de partager les comptes, les rôles, les signalements citoyens, les messages de contact, les annonces/alertes, les états des services et les rendez-vous entre appareils. Le mode local du navigateur reste disponible pour la démonstration hors ligne.

### Démarrage local

1. Installer Node.js 20 ou plus récent.
2. Installer les dépendances : `npm run backend:install`.
3. Copier `backend/.env.example` vers `backend/.env`, puis définir un `JWT_SECRET` aléatoire d’au moins 32 caractères et vérifier `CORS_ORIGIN=http://localhost:5500`.
4. Créer le premier administrateur : ajouter temporairement `ADMIN_EMAIL` et `ADMIN_PASSWORD` (12 à 72 caractères) à `backend/.env`, lancer `npm run backend:create-admin`, puis retirer ces deux variables du fichier.
5. Démarrer le serveur avec `npm run backend:start`.
6. Dans un autre terminal, servir le site sur le port 5500, par exemple avec `npx serve . -l 5500`, puis ouvrir `http://localhost:5500/?api=backend`.

Le mode API est mémorisé dans l’onglet pendant sa session. Ouvre `http://localhost:5500/?api=local` pour revenir au mode navigateur. Les inscriptions serveur créent uniquement des citoyens; connecte-toi avec le premier administrateur, puis attribue le rôle **Agent** depuis « Gestion de la cité ».

Le backend vérifie les rôles côté serveur, chiffre les mots de passe avec bcrypt, verrouille temporairement une adresse après cinq échecs de connexion et conserve ses données dans `backend/data/` (ignoré par Git). Les rappels de rendez-vous sont déclenchés lorsque le tableau de bord est ouvert; les notifications système nécessitent aussi l’autorisation du navigateur.

### Déploiement

Le backend ne peut pas tourner sur GitHub Pages. Héberge-le sur un service Node.js avec une base de données persistante, active HTTPS et configure `CORS_ORIGIN` avec le domaine de la vitrine. Configure ensuite `DEPLOYED_API_BASE_URL` dans `config.js` avec l’URL publique du backend terminant par `/api`. Les secrets restent dans l’environnement du serveur. Le fichier SQLite local convient au développement; pour plusieurs instances de production, remplace-le par une base gérée persistante.

Pour synchroniser les demandes officielles, configure aussi `TERRA_NOVA_API_URL`, `TERRA_NOVA_API_KEY` et `TERRA_NOVA_POLL_MS` dans l’environnement du backend. L’API officielle WebCup actuelle reste en lecture seule; ces demandes sont donc consultables mais leur statut ne peut pas être modifié depuis Nova Terra.

`npm test` execute le controle de structure et les tests du proxy WebCup avec le runner integre a Node.js ; aucune dependance npm n'est necessaire pour ces tests. Sous Windows PowerShell, si la politique d'execution bloque `npm.ps1`, utiliser `npm.cmd test`. Ces tests ne remplacent pas encore une suite de tests navigateur automatisee.

Le rôle Fullstack / logique métier / présentation, le MVP, les responsabilités d’intégration, les commandes de vérification et le déploiement sont détaillés dans [docs/personne-3-runbook.md](docs/personne-3-runbook.md). Le déroulé de démonstration, le pitch et les scénarios de secours sont dans [docs/demo-pitch.md](docs/demo-pitch.md).

## Connexion sécurisée et exports personnels

Les fonctions D02 (connexion par code e-mail), F53 (double facteur), F54 (avis de nouvel appareil), F55 (export JSON RGPD) et F56 (récapitulatif CSV des démarches) sont décrites dans le [guide de sécurité et d’exports](docs/security-and-exports.md). D02 et F53 nécessitent le backend; l’envoi des codes et des alertes par e-mail demande un fournisseur transactionnel configuré côté serveur. Les exports F55 et F56 restent disponibles en mode navigateur pour les données locales.

L’inscription et la connexion par mot de passe sont actives en mode local : le compte et son hash PBKDF2 sont enregistrés dans le navigateur, sans envoi au serveur. Avec un backend configuré, les comptes citoyens sont partagés entre appareils; les comptes agent et administrateur doivent être attribués par un administrateur. La réinitialisation du mot de passe n’a pas encore de route sécurisée; l’interface l’indique séparément du mode local. Les fonctions par e-mail ne sont pas simulées quand leurs services ne sont pas configurés. Les textes des pages indiquent le mode de stockage réellement utilisé. Les demandes de l’API WebCup restent en lecture seule jusqu’à la publication de routes officielles d’écriture.

## API des signalements WebCup

Le contrat, les reponses HTTP verifiees et l'import de tests Postman sont decrits dans [docs/webcup-api.md](docs/webcup-api.md). La collection partagee est `postman/terra-nova-api.postman_collection.json`; la cle doit rester dans une variable locale/secrete.

Sur un domaine Vercel en `*.vercel.app`, le tableau public et l'espace agent chargent les signalements via `/api/requests`. Le proxy `api/requests.js` ajoute côté serveur la clé `WEBCUP_API_KEY` avant d'appeler l'API WebCup. La clé n'est jamais envoyée au navigateur ni enregistrée dans Git.

```text
GET   /api/requests                         proxy serveur vers l'API WebCup
GET   {API_BASE_URL}/citizen-messages
POST  {API_BASE_URL}/citizen-messages       body: { name, email, category, subject, message }
```

L'API WebCup fournie expose actuellement la lecture des demandes. Le proxy n'envoie au navigateur qu'une liste de champs autorisés et ne relaie pas les autres propriétés reçues. Le changement de statut et les votes sont désactivés pour ces données jusqu'à ce que l'équipe API fournisse et documente les endpoints correspondants. Le Haut Conseil exploite les demandes officielles pour faire ressortir les urgences ouvertes et les renvoie vers le filtre correspondant. F52 s'applique aux signalements Nova Terra enregistrés dans le backend : chaque citoyen peut soutenir une fois une demande ouverte, sans voir l'identité ni la description de son auteur. Le formulaire de contact utilise `/citizen-messages` quand le backend Nova Terra est configuré; sinon il précise que les messages sont seulement conservés dans le navigateur et ne sont pas transmis aux services. Les tableaux actualisent les demandes à l'ouverture, toutes les minutes et sur demande. La recherche publique et celle de l'espace agent acceptent le titre, la référence, le secteur, la catégorie et la description, sans tenir compte des accents ; les espaces agents offrent aussi des filtres par statut, priorité et catégorie.

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

En mode navigateur (sans `apiBaseUrl`), les formulaires et deplacements de cartes Kanban sont memorises localement avec `localStorage`. La photo de profil est réduite à 512 px; elle reste locale en mode navigateur et se synchronise avec le compte en mode backend.

En mode navigateur, l'inscription conserve le compte dans cet appareil et le mot de passe sous forme de hash PBKDF2 sale (pas en clair). En mode backend, le serveur vérifie l'identité, stocke les comptes en SQLite et utilise bcrypt; les données de demandes, messages, alertes et rendez-vous suivent le compte entre appareils.

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

Les exemples locaux restent disponibles avec `localStorage` quand aucune API n'est configurée. Pour lancer le proxy WebCup localement, utiliser Vercel CLI (`npx vercel dev`), configurer `WEBCUP_API_KEY` dans les variables d'environnement de développement Vercel, puis ouvrir `http://localhost:3000/dashboard.html?api=webcup`. Ne pas créer ni committer un fichier contenant la clé.

Le détail des cibles Vercel, Netlify, Render et GitHub Pages, avec les variables d'environnement et les vérifications, est regroupé dans [docs/deployment.md](docs/deployment.md). Le dépôt fournit déjà `vercel.json` (durée de la fonction `api/requests.js`, en-têtes de sécurité, indexation de l'espace agent désactivée) et `.nvmrc` (Node 20).

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` publie la version statique à chaque commit sur `main`, en excluant la copie historique `concourswebcup2026-main/` qui n’est plus reliée aux pages courantes. Dans GitHub, activez `Settings` > `Pages` > `Source: GitHub Actions`. Cette version reste en mode démonstration tant que `DEPLOYED_API_BASE_URL` ne pointe pas vers un backend Node.js externe hébergé en HTTPS.

## Couverture backend et audit

Le backend couvrait déjà D01/D03 (inscription et session), D08/D09 (rôles et contrôles RBAC), F33/F34 (suppression autonome et gestion des comptes) et F38 (états des services). F37 réutilise le verrouillage après cinq échecs et la limitation des requêtes; les blocages sont maintenant consultables dans l'audit admin. Ces fonctions gardent leurs endpoints existants.

Les nouvelles routes sont `GET /api/audit-logs` (admin uniquement, pagination et filtres) pour F47/F48, et `GET /api/transit/schedules` pour F36. L'audit enregistre les actions de compte, demandes, annonces, services, rendez-vous et changements du flux officiel; les logs HTTP et d'erreur sortent en JSON vers les logs de l'hébergeur. Les horaires inclus sont des exemples bilingues en base SQLite, pas un flux municipal en temps réel.

F51 ajoute un registre serveur des demandes de confidentialité : le citoyen dépose et suit ses demandes depuis son profil, tandis que seuls les administrateurs peuvent consulter le registre complet et répondre. Les réponses et changements d'état sont audités sans copier le contenu des demandes dans les logs. La suppression directe du compte reste le parcours F33 distinct.

F49 ajoute une notification dans le centre d’alertes à chaque changement de statut d’un signalement Nova Terra; le citoyen voit son état précédent et son nouvel état, et peut marquer la notification comme lue. F50 ajoute `GET /api/activity-summary`, réservé aux administrateurs, avec des totaux globaux de comptes, demandes, rendez-vous, messages, annonces, confidentialité et actions auditées. F52 ajoute un soutien idempotent (un par citoyen et demande) aux signalements ouverts partagés. L’API de participation n’expose ni le nom, ni l’adresse e-mail, ni la description du demandeur; ces données et les votes sur le flux officiel WebCup ne sont pas concernés.

Les fonctions D04, D11/F26, D12/F35, D14/F27, D16, F25, D17, D19 et F22 étaient déjà présentes dans les pages citoyennes et le back-office. F28 existait en mode local; `GET /api/service-popularity` le relie maintenant aux demandes du backend et ne renvoie que les totaux par service, sans détail de dossier ni identité.

## Securite de l'espace agent

`/agent/dashboard/` est une interface statique et ne peut pas proteger des donnees a elle seule. Avant la production, l'API doit verifier la session et les droits d'agent sur chaque endpoint, avec HTTPS, CORS limite au domaine du site et une authentification cote serveur. Aucun token prive ne doit etre ajoute au JavaScript du navigateur.
