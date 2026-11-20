# Student Portal

A responsive React and Tailwind CSS student portal backed by an Express REST API and SQLite database.

## Project history

The project’s milestones, technology decisions, implemented workflows, and current limitations are documented in [Project History](./PROJECT_HISTORY.md).

## Requirements

- Node.js 22.13 or newer (the backend uses Node's built-in `node:sqlite` module)

## Setup and run

Configure the backend first:

```bash
cd server
cp .env.example .env
npm install
npm run init-db
npm run seed
npm run dev
```

In another terminal, start the frontend:

```bash
npm install
npm run dev
```

Open the Vite URL (by default, `http://localhost:5173`). The frontend connects to `http://localhost:4000/api/v1`; set `VITE_API_URL` if the API is hosted elsewhere. Keep the backend `FRONTEND_ORIGIN` setting in sync with the frontend origin.

## Accounts and roles

- The seed command creates fake demo student and admin accounts; see [`server/README.md`](./server/README.md) for credentials.
- Admin signup is not available on the login page. The first admin is provisioned once through the protected `POST /api/v1/auth/admin/register` bootstrap endpoint using `ADMIN_SETUP_KEY`; remove that key after setup.
- Administrators create student accounts from the Student Accounts page.
- Support staff are specialist directory entries for assignment, not login accounts. Add demo specialists to an existing database with `cd server && npm run seed:staff`.

## Validation

Run backend tests with `cd server && npm test` and create a frontend production build with `npm run build`.
