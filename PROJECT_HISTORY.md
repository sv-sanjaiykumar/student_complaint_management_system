# Student Portal — Project History

This document records the project’s development milestones, major implementation decisions, and current scope.

## Milestones

### 1. Student and admin portal UI

- Built a responsive React application using React Router, Tailwind CSS, and reusable page and layout components.
- Added student dashboards, request submission and history, request details, status timelines, and admin request-management screens.
- Added role-aware navigation, protected routes, loading and error states, form validation, and toast notifications.

### 2. REST API and database

- Added a layered Node.js and Express API under `/api/v1` for authentication, student requests, admin workflows, uploads, replies, notes, and audit history.
- Replaced the original MongoDB direction with SQLite after MongoDB was unavailable in the development environment.
- Uses Node’s built-in `node:sqlite` module and a local SQLite database. The database includes users, requests, attachments, replies, internal notes, timeline events, audit records, and staff.
- Added input validation, role and request-ownership checks, password hashing, rate limits, and file type and size validation.

### 3. Account creation and frontend/API integration

- Connected the React login and portal workflows to the Express API.
- Students sign in with accounts created by an administrator; student self-registration is not offered.
- Admin registration uses a private environment-configured key. Administrators can create student accounts from the portal.
- Access tokens are held in frontend memory; refresh tokens are handled with an HttpOnly cookie.

### 4. Specialist assignment and student-visible replies

- Added a staff directory with fake specialists for academic, fee, certificate, hostel, and other requests.
- Admins can assign a request to a specialist from the request detail page.
- Each admin reply records the specialist assigned when the reply was sent. Students see that specialist’s name and area alongside the reply.
- Staff directory entries are not login accounts; there is no staff portal in the current scope.

## Current project structure

- `src/` — React frontend, pages, shared components, authentication context, and API client.
- `server/src/` — Express routes, controllers, services, SQLite models, middleware, and validators.
- `server/seed/` — fake development seed data, including the specialist directory.
- `server/tests/` — authentication, authorization, request, and assignment workflow tests.
- `server/openapi.yaml` — OpenAPI description of the REST API.

## Development and safety notes

- Configure the backend from `server/.env.example`; do not commit the local `.env`, SQLite database, uploaded files, or credentials.
- The root `.gitignore` and backend `.gitignore` exclude local secrets, database files, uploads, dependencies, and generated build output.
- Admin registration should be disabled by removing or rotating `ADMIN_SETUP_KEY` when it is no longer needed.
- Local file storage is intended for development. Production deployment should configure HTTPS, secure cookies, an appropriate file-storage service, backups, secrets, and the allowed frontend origin.
- Backend tests run with `cd server && npm test`; the frontend production build runs with `npm run build`.
