# Démonstration et pitch — Nova Terra

Ce guide suit le MVP réellement livré : lecture des signalements, recherche et filtres, triage du Haut Conseil, reprise sur cache local et présentation des limites de l’API. Il évite de présenter une maquette comme une fonctionnalité déjà connectée.

## Ce que le MVP fait (et ne fait pas)

- **Priorité API :** `GET /requests` via le proxy serveur Vercel. La clé WebCup reste côté serveur.
- **Parcours citoyen :** consulter, rechercher et filtrer les demandes par statut, urgence, secteur, catégorie, référence et description.
- **Parcours Haut Conseil :** repérer les demandes ouvertes haute priorité et ouvrir directement le filtre des urgences.
- **Tolérance aux pannes :** garder le dernier instantané valide dans le navigateur et afficher clairement si la source est l’API, le cache ou les données de démonstration.
- **Limite assumée :** l’API WebCup documentée est en lecture seule. Le tableau ne prétend donc pas enregistrer un vote ni modifier le statut d’une demande.
- **À ne pas présenter comme réel :** météo, carte, indicateurs planétaires et comptes locaux. L’authentification locale est une démonstration, pas une protection de production.

## Déroulé de démonstration (3 à 4 minutes)

### 1. Présenter le besoin (30 secondes)

> « Dans une cité, les petits problèmes du quotidien sont faciles à perdre de vue. Nova Terra rassemble les signalements au même endroit pour que les citoyens puissent les retrouver et que le Haut Conseil voie ce qui demande une attention prioritaire. »

### 2. Montrer le flux de demandes (60 secondes)

1. Ouvrir le tableau citoyen et lire l’indicateur de source en haut de page.
2. Montrer le compteur des demandes, puis les filtres **Tous**, **Urgents**, **En cours** et **Résolus**.
3. Rechercher un mot du titre, un secteur ou une description. La recherche ignore les accents.
4. En mode démonstration, utiliser par exemple `éclairage` ou `Horizon`. Avec l’API, choisir une demande présente dans la réponse du jour.
5. Actualiser et montrer que les compteurs suivent les données chargées.

### 3. Passer au Haut Conseil (60 secondes)

1. Ouvrir **Haut Conseil** depuis la navigation ou le sélecteur de vue.
2. Montrer la demande haute priorité remontée depuis le même jeu de données que le tableau citoyen.
3. Cliquer sur **Voir les urgences** : la liste des signalements est filtrée et la recherche reçoit le focus.
4. Préciser que cette vue prépare le triage mais ne modifie pas les demandes : l’API exposée ne documente pas d’écriture.

### 4. Expliquer la résilience et conclure (30 à 60 secondes)

> « Une réponse valide est normalisée, mise en cache dans ce navigateur et réutilisée si le réseau tombe. La source reste indiquée pour distinguer API, instantané local et données fictives. Pour un vrai changement de statut ou un vrai vote, il faut d’abord un endpoint d’écriture et une vérification des droits côté serveur. »

Si le tableau possède déjà un instantané, une panne API peut être montrée en coupant temporairement le réseau depuis les outils du navigateur puis en réactualisant. Rétablir le réseau à la fin. Ne pas effectuer ce test si la connexion de démonstration ne peut pas être restaurée facilement.

## Vérifications avant le passage

- [ ] Vérifier le statut Git et ne pas embarquer le travail d’un autre membre :

  ```powershell
  git status --short
  ```

- [ ] Lancer le contrôle du dépôt :

  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
  npm test
  ```

- [ ] Sur le déploiement, vérifier la route et les champs reçus sans afficher ni copier la clé :

  ```powershell
  Invoke-RestMethod -Uri "https://<ton-projet>.vercel.app/api/requests" -Method Get
  ```

- [ ] Ouvrir la vitrine, l’inscription/connexion, le tableau citoyen, le Haut Conseil et l’espace agent.
- [ ] Tester une recherche avec et sans accent, un filtre urgent et le bouton **Voir les urgences**.
- [ ] Vérifier le rendu mobile et le menu au clavier (Entrée, puis Échap).
- [ ] Garder une fenêtre de démonstration déjà authentifiée : les comptes locaux ne sont pas partagés entre appareils.
- [ ] Garder cette version en mode démonstration si la clé ou le service amont n’est pas prêt. Ne jamais improviser une clé dans le code, le navigateur ou Git.

`npm test` requiert Node.js LTS et `npm`. Si PowerShell ne trouve pas `npm`, installer Node.js LTS, ouvrir un nouveau terminal, puis vérifier `node --version` et `npm --version`.

## Lancer et publier

Depuis la racine du dépôt :

```powershell
# Contrôles locaux (PowerShell est nécessaire pour le script du projet)
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
npm test

# Vitrine et données locales de démonstration
npx serve .

# Déploiement Vercel : lier le dépôt au projet si nécessaire
npx vercel
npx vercel --prod
```

Pour connecter les demandes sur Vercel, ajouter `WEBCUP_API_KEY` dans **Project Settings > Environment Variables**, pour l’environnement Production, puis relancer le déploiement. Pour tester le proxy localement, configurer la variable dans l’environnement Development Vercel (sans la committer), puis lancer `npx vercel dev`. Les pages GitHub Pages sont statiques et restent en mode démonstration ; elles n’exécutent pas `api/requests.js`.

Avant un commit, inspecter le résultat et n’ajouter que les fichiers prévus :

```powershell
git status --short
git diff --check
git diff
git add -p app.js dashboard.html index.html public.js scripts/check.ps1 README.md docs/demo-pitch.md
git diff --cached --check
git diff --cached
```

Ne lancer `git commit` et `git push` qu’après revue et accord de l’équipe. Garder les changements des autres membres en dehors du commit.
