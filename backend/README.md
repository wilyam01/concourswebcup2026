# Backend Nova Terra

Express API with SQLite, bcrypt password hashing, JWT sessions, role checks, and rate-limited sign-in. See the project root README for the local setup and frontend connection steps.

## Routes

- `POST /api/auth/signup`, `POST /api/auth/signin`, `GET/PATCH/DELETE /api/auth/me`
- `GET /api/requests`, `POST /api/requests/sync` for the read-only official request feed
- `GET/POST /api/citizen-requests`, `PATCH /api/citizen-requests/:id` for personal reports and agent status updates
- `GET /api/citizen-requests/community`, `PUT/DELETE /api/citizen-requests/:id/support` for privacy-filtered community reports and one support per citizen
- `GET /api/notifications`, `POST /api/notifications/read` for the signed-in citizen's request status updates
- `GET /api/activity-summary` (admin-only) for aggregate citywide activity indicators
- `POST /api/citizen-ideas` for public project proposals (five submissions per IP per hour); `GET /api/citizen-ideas` for signed-in residents and municipal staff
- `GET /api/consultation-votes` for shared totals and the signed-in citizen's votes; `PUT /api/consultation-votes/:consultationId` to submit or update a vote
- `GET/POST /api/citizen-messages` for contact form submissions and agent inbox
- `GET/POST /api/announcements`, `PATCH /api/announcements/:id/close`, `POST /api/announcements/read`
- `GET /api/service-statuses`
- `GET /api/service-popularity` for anonymous service totals only (no citizen or report details)
- `GET /api/appointments`, `POST /api/appointments`, `PATCH /api/appointments/:id`, `POST /api/appointments/:id/reminder`
- `GET /api/appointments/agents`
- `GET /api/accounts`, `PATCH /api/accounts/:id/access`, `PATCH /api/accounts/:id/role` (role changes are admin-only)
- `GET/PATCH /api/auth/me/avatar` for the signed-in user's resized profile photo
- `GET /api/transit/schedules` for the current bilingual timetable catalog
- `GET /api/audit-logs` (admin-only, paginated, category filter) for account, sign-in, request, announcement, service, appointment, and official-feed history
- `GET/POST /api/privacy-requests`, `PATCH /api/privacy-requests/:id` for citizen privacy requests and admin-only processing
- `POST /api/auth/passwordless/request`, `POST /api/auth/passwordless/verify` for email-code citizen sign-in; requires Resend configuration
- `GET /api/auth/2fa/status`, `POST /api/auth/2fa/setup`, `POST /api/auth/2fa/confirm`, `POST /api/auth/2fa/login`, `DELETE /api/auth/2fa` for citizen TOTP and recovery-code management
- `GET /api/security-notifications`, `POST /api/security-notifications/read` for the signed-in citizen's new-device alerts
- `GET /api/auth/me/export` for a citizen-only JSON export of personal account data

Use `Authorization: Bearer <token>` on protected routes. Citizen signup never accepts a role. Bootstrap the first administrator using temporary `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, then remove them. SQLite storage is suitable for local development or one persistent server instance; use a managed persistent database for multi-instance production.

## Security and data notes

Citizen security and data export setup for D02/F53/F54/F55/F56 is documented in [the project security guide](../docs/security-and-exports.md). Passwordless email and new-device email require `RESEND_API_KEY` plus a verified `RESEND_FROM`; TOTP requires a persistent, private `TOTP_ENCRYPTION_KEY`.

The public `POST /api/citizen-ideas` endpoint accepts a project title (3–100 characters) and description (10–1,000 characters) without authentication. Submissions are stored in the `citizen_ideas` SQLite table and are limited to five per IP per hour. The endpoint returns a reference for the receipt. Signed-in residents, agents, and administrators can list submissions; the agent dashboard includes a refreshable proposal list. `GET/PUT /api/consultation-votes` routes share consultation totals and store one replaceable vote per signed-in citizen and consultation. Configure the frontend API URL to enable server sharing. In local-only mode, proposals and votes stay in the browser and the interface identifies them as local.

The server applies role checks on protected endpoints, rate-limits authentication, contact, and privacy requests, and temporarily locks an email after five failed sign-ins. Citizens can view only their own privacy requests; only administrators can list and process the register. Lockout events, privacy-request state changes, and successful sign-ins are recorded in the admin audit feed; routine failures and HTTP request outcomes are emitted as structured JSON to stdout/stderr for the hosting platform's log collector. Audit records keep actor snapshots so they remain attributable after account deletion. Audit metadata omits credentials, request details, response notes, and message bodies.

Transit schedules are served by the API and stored in SQLite, but the included line times are demonstration records. Replace or update them from a verified municipal transit feed before presenting them as live information.
