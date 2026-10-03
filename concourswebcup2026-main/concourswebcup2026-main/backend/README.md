# Backend Terra Nova

API Express avec SQLite, hachage bcrypt, JWT et rôles `CITOYEN`, `AGENT`, `ADMIN`.

## Démarrer

1. Installer Node.js 20+.
2. Dans ce dossier : `npm install`.
3. Copier `.env.example` en `.env`, puis définir un `JWT_SECRET` aléatoire d'au moins 32 caractères.
4. Configurer `TERRA_NOVA_API_URL` avec l'URL de base communiquée par l'équipe Terra Nova. Le client appelle `GET {URL}/requests`; adaptez `src/terraNova.js` au chemin, format et mécanisme d'authentification documentés officiellement.
5. `npm start`.

La base SQLite est créée automatiquement dans `data/`. `POST /api/auth/signup` ne permet volontairement de créer que des citoyens. Pour créer le premier administrateur, définissez temporairement `ADMIN_EMAIL` et `ADMIN_PASSWORD` (12–72 caractères) dans l'environnement puis exécutez `npm run create-admin`; la commande crée le compte ou élève un compte existant au rôle admin. Retirez ensuite le mot de passe de bootstrap de l'environnement. Un administrateur attribue les rôles par `PATCH /api/admin/users/:id/role`.

## Routes

- `POST /api/auth/signup` `{ email, password, displayName }` (citoyen)
- `POST /api/auth/signin` `{ email, password }`; `GET /api/auth/me`
- `GET /api/requests` (authentifié, données en cache)
- `POST /api/requests/sync`, `GET /api/agent/requests` (agent/admin)
- `GET /api/admin/users`, `PATCH /api/admin/users/:id/role` (admin)
- `GET /api/health`

Envoyer le JWT avec `Authorization: Bearer <token>`. Les demandes mises en cache restent consultables pendant une panne amont; la réponse expose l'état `sync.degraded` et l'heure de dernière synchronisation. Les erreurs de sync manuelle renvoient HTTP 503. Le polling démarre au lancement et se répète selon `TERRA_NOVA_POLL_MS`.

## Sécurité et intégration

Les rôles ne sont jamais acceptés depuis le formulaire d'inscription. Toute route protégée vérifie le rôle côté serveur et répond `403` si le compte authentifié n'a pas l'autorisation (`401` sans session valide). Gardez les secrets dans l'environnement, utilisez HTTPS en production et ajoutez journalisation/audit des changements de rôle. Les détails de l'API Terra Nova (URL, schéma, pagination, authentification, limites) n'étaient pas fournis : le client est configurable et doit être ajusté à sa documentation officielle avant la démonstration.
