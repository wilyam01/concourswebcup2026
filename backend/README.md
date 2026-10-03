# Backend Nova Terra

Express API with SQLite, bcrypt password hashing, JWT sessions, role checks, and rate-limited sign-in. See the project root README for the local setup and frontend connection steps.

## Routes

- `POST /api/auth/signup`, `POST /api/auth/signin`, `GET/PATCH/DELETE /api/auth/me`
- `GET /api/requests`, `POST /api/requests/sync` for the read-only official request feed
- `GET/POST/PATCH /api/citizen-requests` for personal reports and agent status updates
- `GET/POST /api/citizen-messages` for contact form submissions and agent inbox
- `GET/POST /api/announcements`, `PATCH /api/announcements/:id/close`, `POST /api/announcements/read`
- `GET /api/service-statuses`
- `GET /api/appointments`, `POST /api/appointments`, `PATCH /api/appointments/:id`, `POST /api/appointments/:id/reminder`
- `GET /api/appointments/agents`
- `GET /api/accounts`, `PATCH /api/accounts/:id/access`, `PATCH /api/accounts/:id/role` (role changes are admin-only)
- `GET/PATCH /api/auth/me/avatar` for the signed-in user's resized profile photo

Use `Authorization: Bearer <token>` on protected routes. Citizen signup never accepts a role. Bootstrap the first administrator using temporary `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, then remove them. SQLite storage is suitable for local development or one persistent server instance; use a managed persistent database for multi-instance production.
