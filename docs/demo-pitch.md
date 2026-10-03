# Démonstration et pitch — Nova Terra

Ce guide présente le produit livré sans confondre les fonctions disponibles avec les intégrations encore en démonstration. Il met en avant le parcours citoyen, le traitement des demandes par les équipes municipales et la prise de rendez-vous.

## Ce que Nova Terra permet

- **Côté citoyen :** consulter et rechercher les signalements, filtrer par statut et urgence, déposer un signalement et suivre sa référence dans son historique.
- **Côté agents et Haut Conseil :** ouvrir la vue de suivi adaptée à leur rôle, repérer les demandes prioritaires et préparer leur traitement.
- **Rendez-vous municipaux :** consulter et gérer les rendez-vous selon son rôle. Les agents et administrateurs peuvent ajouter une note interne (jusqu’à 1 000 caractères) ; cette note n’est pas renvoyée au compte citoyen.
- **Accusé de réception :** après un dépôt, le citoyen voit une confirmation et une référence à conserver. L’enregistrement dépend de la source de données utilisée.
- **Résilience :** le mode local permet une démonstration sans service distant. La source réelle des données doit être annoncée pendant la présentation.

## Limites à annoncer clairement

- Les vues locales et les comptes de démonstration ne remplacent pas une authentification et un stockage de production.
- Les signalements ne doivent être présentés comme transmis au service municipal que si l’API est configurée et la réponse confirmée.
- La note interne de rendez-vous est réservée aux agents concernés et aux administrateurs dans le service connecté.
- Les indicateurs, cartes et autres contenus illustratifs ne sont pas des données opérationnelles à moins qu’une source réelle soit explicitement configurée.

## Déroulé de démonstration (3 à 4 minutes)

### 1. Présenter le besoin (30 secondes)

> « Nova Terra rassemble les demandes du quotidien dans un espace lisible. Les citoyens peuvent déposer et retrouver leurs signalements ; les équipes municipales disposent d’une vue de suivi pour organiser les priorités et les rendez-vous. »

### 2. Parcours citoyen (60 secondes)

1. Ouvrir le tableau citoyen et vérifier l’indication de la source des données.
2. Montrer le compteur et les filtres disponibles, puis rechercher un mot du titre, un secteur ou une description.
3. Montrer un signalement et son état. En mode de démonstration, utiliser une entrée visible dans les données locales.
4. Si le parcours de dépôt est disponible, soumettre un exemple et montrer l’accusé de réception ainsi que la référence à conserver.

### 3. Vue équipe municipale (60 secondes)

1. Se connecter avec un compte de démonstration agent ou administrateur.
2. Ouvrir la vue Haut Conseil et montrer comment les demandes prioritaires sont repérées.
3. Présenter la préparation du triage sans prétendre qu’un changement a été transmis si l’API n’est pas active.
4. Dans l’espace agent, ouvrir un rendez-vous et montrer le champ **Note interne**. Enregistrer une note courte, puis rappeler qu’elle est réservée au personnel autorisé.

### 4. Conclure sur le suivi (30 à 60 secondes)

> « Le citoyen garde une référence pour retrouver son signalement. Les équipes peuvent suivre les demandes et ajouter une note interne au rendez-vous pour assurer la continuité du service. La démonstration indique toujours si les données viennent du service connecté ou du stockage local. »

## Vérifications avant le passage

- [ ] Vérifier la source de données affichée et utiliser des exemples cohérents avec cette source.
- [ ] Préparer les comptes de démonstration et vérifier que chaque rôle voit uniquement les fonctions prévues.
- [ ] Vérifier le dépôt d’un signalement et la référence affichée si l’API est configurée.
- [ ] Vérifier l’enregistrement d’une note interne avec un compte agent autorisé.
- [ ] Parcourir les écrans sur mobile et au clavier.
- [ ] Ne jamais afficher ni copier de clé API pendant la démonstration.

## Lancer et publier

Depuis la racine du dépôt, utiliser le script de contrôle du projet et les commandes de lancement adaptées à l’environnement :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
npm test
npx serve .
```

Pour le service connecté, configurer les secrets côté serveur dans l’environnement de déploiement, jamais dans le navigateur ou dans Git. Les pages statiques GitHub Pages ne peuvent pas exécuter les routes serveur ; utiliser le déploiement backend configuré pour les fonctions connectées.
