# Connexion sécurisée et exports citoyens

Nova Terra ajoute cinq fonctions aux comptes citoyens : D02, F53, F54, F55 et F56.

## Configuration du serveur

Les fonctions D02, F53 et l’envoi d’alertes e-mail F54 s’appuient sur le backend Express. Copie `backend/.env.example` vers `backend/.env`, puis définis les valeurs suivantes dans l’environnement du serveur :

- `RESEND_API_KEY` et `RESEND_FROM` activent les codes de connexion par e-mail et les avis de nouvel appareil. L’adresse d’expédition doit être validée chez le fournisseur. Le backend utilise l’API transactionnelle [Resend](https://resend.com/features/email-api).
- `TOTP_ENCRYPTION_KEY` active le double facteur. Génère une clé privée avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Garde la même clé après les redémarrages et protège-la comme un secret de production.

Ne place aucune de ces valeurs dans le JavaScript du navigateur ni dans Git. Si l’envoi d’e-mails n’est pas configuré, l’interface affiche que D02 est indisponible. Les comptes locaux du navigateur ne prennent pas en charge le code e-mail ou le double facteur.

## Fonctions et limites

- **D02 — Connexion sans mot de passe :** le citoyen demande un code à 8 chiffres par e-mail. Il expire après 10 minutes, ne peut servir qu’une fois et ses essais sont limités. Le serveur répond de la même façon qu’un compte existe ou non.
- **F53 — Double facteur :** l’espace profil peut activer une application TOTP compatible. Le secret est chiffré avec AES-256-GCM au repos. Dix codes de secours à usage unique sont présentés lors de l’activation; le serveur ne conserve que leurs empreintes et ne les affiche plus ensuite. Une connexion par mot de passe ou code e-mail exige aussi le second facteur quand il est actif.
- **F54 — Nouvel appareil :** le navigateur conserve un identifiant aléatoire local; seul son HMAC est stocké sur le serveur. Un appareil inconnu produit une notification dans le centre d’alertes et, si l’envoi transactionnel est configuré, un e-mail. Effacer les données du navigateur ou utiliser un autre navigateur peut générer un nouvel avis.
- **F55 — Export des données personnelles :** le profil télécharge un fichier JSON lisible depuis le backend. `GET /api/auth/me/export` ne renvoie que les données du citoyen connecté et exclut les mots de passe, empreintes d’identifiants et secrets TOTP. En mode navigateur, l’export comprend seulement les informations présentes localement et le précise dans le fichier.
- **F56 — Récapitulatif des démarches :** l’historique citoyen se télécharge en CSV UTF-8 avec séparateur point-virgule, les colonnes utiles et les valeurs échappées pour les tableurs.

## Routes ajoutées

- `POST /api/auth/passwordless/request` et `POST /api/auth/passwordless/verify`
- `POST /api/auth/2fa/login`, `GET /api/auth/2fa/status`, `POST /api/auth/2fa/setup`, `POST /api/auth/2fa/confirm`, `DELETE /api/auth/2fa`
- `GET /api/security-notifications` et `POST /api/security-notifications/read`
- `GET /api/auth/me/export`

Toutes les routes de compte protégées vérifient la session et le rôle côté serveur. Les clés de chiffrement et d’e-mail doivent être définies dans l’hébergement du backend, avec HTTPS en production.
