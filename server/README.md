# Student Portal Backend

Node.js and Express REST API with a local SQLite database for the existing React frontend.

## Setup

```bash
cd student/server
npm install
npm run init-db
npm run seed
npm run dev
```

API base URL: `http://localhost:4000/api/v1`

Configure `.env` first. If you do not already have one, run `cp .env.example .env`. The default database path is `./data/student_portal.sqlite`; the file and parent directory are created on first database initialization. Override it with an absolute path or a path relative to the backend folder in `SQLITE_DB_PATH`.

Set two independent, high-entropy values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. The MongoDB URI is no longer used.
`ADMIN_SETUP_KEY` is a separate high-entropy bootstrap key for the first admin only. Admin self-registration is not offered on the login page. Provision the initial administrator through `POST /api/v1/auth/admin/register`; the endpoint refuses further registrations after the first admin exists. Remove `ADMIN_SETUP_KEY` from the environment after setup. Existing administrators create student accounts through `POST /api/v1/admin/students`.

The backend uses Node's built-in `node:sqlite` module (Node.js 22.13 or newer). No SQLite server process or native npm driver is needed.

The full seed creates five fake support specialists alongside the demo users and requests. For an already populated database, add the specialists without resetting student/request data:

```bash
npm run seed:staff
```

Admins can assign requests to active staff through the request detail page. Each student-visible reply records the specialist assigned at the time it was sent. Staff are directory records only; staff login accounts and a staff portal are not included.

To inspect the database with the SQLite CLI:

```bash
sqlite3 data/student_portal.sqlite
```

Useful first checks:

```sql
.tables
SELECT id, name, email, role FROM users;
SELECT reference_id, subject, status FROM requests;
SELECT name, specialization FROM staff ORDER BY specialization;
```

Swagger file: `openapi.yaml`

## Fake credentials

These credentials are intentionally fake seed data:

- Student: `alex@campus.demo` / `ChangeMe123!`
- Admin: `admin@campus.demo` / `ChangeMe123!`

Change or remove seed credentials before any deployment. The seed command only fills an empty database. To reset a disposable development database and recreate the sample records, use `npm run seed -- --reset`; this deletes all portal records in the configured SQLite file.

## Security notes

- Access tokens are short-lived JWT bearer tokens.
- Refresh tokens are stored in HttpOnly, Secure-when-configured, SameSite cookies.
- Passwords use bcrypt.
- Account lockout activates after five failed logins for 15 minutes.
- Role and ownership checks use the authenticated user and SQLite records.
- Uploads are outside the public web root and are never served as static files.
- Request bodies and query values are validated and unknown fields are stripped.
- Back up the SQLite database file and its WAL files safely; stop the API before copying a raw database file.
