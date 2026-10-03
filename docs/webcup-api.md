# API Terra Nova / WebCup

## Decouverte et contrat constate

La documentation auto-publiee par WordPress se trouve a [`https://24h.webcup.fr/wp-json/`](https://24h.webcup.fr/wp-json/). L'index REST permet de decouvrir les routes et les verbes HTTP annonces par chaque route, selon le guide officiel WordPress : [Routes et endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/routes-and-endpoints/).

Verification effectuee le 3 octobre 2026 :

| Requete | Resultat | Observation |
| --- | --- | --- |
| `GET /wp-json/` | `200` | Namespace `webcup/v1` et route des demandes visibles |
| `GET /wp-json/webcup/v1/requests` | `403` sans cle | JSON; l'acces demande des identifiants |
| `GET /wp-json/webcup/v1/requests` avec une cle valide | Non execute | Aucune cle WebCup n'est configuree dans cet espace de travail |

L'index declare uniquement `GET` pour `/webcup/v1/requests` et ne publie aucun argument pour cette route. Il ne documente donc ni un endpoint d'ecriture, ni WebSocket, ni le nom ou l'emplacement du parametre de cle. Le proxy deja utilise par le projet envoie `api_key` en parametre de requete, mais ce detail doit etre confirme par l'equipe WebCup avec une requete authentifiee. Aucun statut n'est ecrit vers l'API tant que cette documentation n'existe pas.

## Collection Postman

Importer `postman/terra-nova-api.postman_collection.json` et le modele d'environnement `postman/terra-nova.postman_environment.template.json`. La collection couvre la decouverte, le refus sans identifiants, la lecture authentifiee, la reponse filtree du proxy applicatif et le refus des ecritures `POST`.

Definir `apiKey` comme valeur locale/secrete dans l'environnement Postman; ne pas mettre la vraie cle dans la collection partagee, Git ou le JavaScript du navigateur. Enregistrer toute copie locale exportee sous `postman/terra-nova.local.postman_environment.json`, fichier ignore par Git. Pour les deux requetes du proxy, definir `proxyBaseUrl` sur le deploiement Vercel ou sur `http://localhost:3000` avec Vercel CLI et `WEBCUP_API_KEY` configure dans l'environnement serveur.

Sans la cle, les deux premiers tests sont reproductibles; le test authentifie doit echouer jusqu'a ce que l'environnement local possede la cle. Le resultat `403` anonyme a ete verifie depuis cet espace de travail; une reponse `200` authentifiee reste a valider.

## Architecture dans l'application

- Le navigateur n'appelle jamais directement WebCup avec une cle. `api/requests.js` ajoute `WEBCUP_API_KEY` cote serveur et ne transmet que `id`, `title`, `district`, `type`, `priority`, `status`, `updatedAt` et `description`.
- Le proxy accepte `GET`, renvoie `405` pour les autres verbes, limite l'attente amont a 8 secondes et renvoie `503`, `502` ou `504` sans exposer la cle.
- Les demandes sont normalisees. Les enregistrements invalides sont ignores; si toute une collection est invalide, le proxy renvoie une erreur de format.
- Le client limite ses requetes a 12 secondes et conserve le dernier instantane valide dans `localStorage`. Il le garde affiche pendant une panne, puis retente au retour en ligne, au retour dans l'onglet et toutes les 60 secondes.
- Le tableau agent et le tableau public actualisent les demandes. La source actuelle est en lecture seule; les messages citoyens restent en demonstration sans endpoint configure.
- La carte, la meteo et les indicateurs planetaires restent illustratifs. L'instantane `localStorage` est une reprise locale pour la demonstration, pas une base partagee entre appareils.

Pour un proxy local, lancer Vercel CLI depuis la racine du projet (`npx vercel dev`) et configurer `WEBCUP_API_KEY` dans l'environnement local non versionne. Sur le deploiement, ajouter cette variable dans les parametres Vercel.
