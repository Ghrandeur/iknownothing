# Nigeria Legacy Queen International

NLQI is a plain HTML, CSS and JavaScript website served by an Express application. The server also provides applicant accounts, SQLite-backed application drafts and submissions, private document uploads, notifications, administrator review, CSV export, SMTP email, and optional Paystack payments.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and adjust values as needed. Do not commit `.env`.
3. Start the website and API with `npm start`.
4. Open [http://localhost:8080](http://localhost:8080).

For automatic server restarts while editing, run `npm run dev`.

The local database is created automatically at `data/nlqi.sqlite`; private uploads are stored in `uploads/`. Both locations are ignored by Git. Set `DATABASE_FILE` and `UPLOAD_DIR` to use other locations.

## Deploy the full site to Vercel with Supabase

The Vercel deployment uses `api/index.js` to run the Express API as a Node.js Function, serves `public/` as static assets, stores application data in Supabase PostgreSQL, and stores applicant documents in the private Supabase Storage bucket. Local development continues to use SQLite and local uploads.

In Vercel **Project → Settings → General**, set **Root Directory** to the project root—the folder containing `vercel.json`, `package.json`, `server.js`, `api/`, `backend/`, and `public/`. Do not set it to `public/`. If deploying from a local folder with the Vercel CLI, run the command from this project root. `.vercelignore` excludes local secrets, SQLite data, uploads, and development-only files from the deployment upload.

1. In Supabase, open **SQL Editor**, paste and run [`supabase/schema.sql`](./supabase/schema.sql). This creates the application tables with row-level security enabled and creates/configures the private `nlqi-applicant-documents` bucket with a 5 MB limit and allowed PDF/JPG/PNG MIME types.
2. In Supabase **Project Settings → Database**, copy the PostgreSQL connection string intended for serverless/pooler use. In **Project Settings → API**, copy the project URL and the server-only `service_role` secret. Never expose the service-role secret in browser code or commit it.
3. In Vercel **Project → Settings → Environment Variables**, configure:
   - `SUPABASE_DB_URL` — pooled PostgreSQL connection string
   - `SUPABASE_URL` — Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only service-role secret
   - `SUPABASE_STORAGE_BUCKET` — `nlqi-applicant-documents`
   - `APP_URL` — the Production HTTPS origin, with no trailing path. Preview deployments use Vercel's deployment URL automatically when this variable is not set for the Preview environment.
   - `NODE_ENV` — `production`
   - `APPLICATION_FEE` — whole-number fee in naira
   - `PAYSTACK_SECRET_KEY` and `PAYSTACK_CURRENCY=NGN` — for live payment checkout and webhook verification
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `CONTACT_EMAIL` — for verification, password-reset, status, and contact emails
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` — for provisioning the first admin. Use an email that is not already registered and a password of 16–128 characters.
4. Redeploy from Vercel after setting the variables. On the first API request, the service creates the admin account if that email is not already registered; it never promotes or overwrites an existing account. Check `/api/health`; it should report Supabase Postgres. Register a test applicant and exercise verification, draft save, private upload/download, application submission, and admin review before opening the site publicly.

Vercel serverless instances are stateless: do not set `DATABASE_FILE` or rely on local `uploads/` in production. To stay within Vercel's function request-body limit, application uploads are limited to 1 MiB per file (three files maximum) on Vercel; local development retains the 5 MiB per-file limit. The bucket's 5 MiB setting is an upper bound, not the Vercel request limit. Never use the Supabase service-role key in a `NEXT_PUBLIC_*` variable. Keep the storage bucket private and do not add a public read policy. Paystack and SMTP require their own valid provider credentials; they are not activated merely by the Supabase configuration.

## Applicant and admin flows

- Applicants create an account at `/register`, verify their email, sign in, and complete `/apply`. Drafts are saved as they proceed through the form.
- Applicant status and notifications are available at `/track`.
- Admins sign in at `/login`; the role-based review console is at `/admin`.
- Administrators can invite judges, assign submitted applications, review scoring summaries, manage applicant/judge account access, and view state, age, approval, shortlist, payment, and submission-month analytics.
- Judges set their password using the time-limited invitation link, sign in, and score only assigned applications at `/judge`. The six criteria are rated 1–10: advocacy, communication, confidence, leadership, purpose, and presentation.
- Administrators manage gallery items, journal articles, sponsors, and partners from the dashboard. Published articles appear at `/blog`; gallery items appear at `/gallery`; active sponsor logos are shown on the homepage.
- Admin finance tools show payment status/revenue, search payment records, and export the payment ledger to CSV. Audit logs are searchable from the admin console. The settings view reports whether integrations are configured but never reveals secret values; configuration is managed in the server environment.
- Visitors can contact NLQI at `/contact`; the contact form sends to `CONTACT_EMAIL` using the configured email transport. The homepage footer now links to the form.
- Applicants can review the current operational disclosure at `/privacy`. It explicitly notes that retention and deletion workflows still need to be defined and that NLQI must complete privacy/legal review before production use.
- For local SQLite development, create the first administrator by setting a unique `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (at least 16 characters) in `.env`, then running `npm run db:seed-admin`. On Vercel, the first admin is provisioned automatically on the first API request from the corresponding environment variables. Both paths refuse to promote an existing applicant account.
- Local development without SMTP prints verification and password-reset links to the server console, and the UI identifies this as development-only. Production email delivery requires valid SMTP settings.

The application form collects 48 answer fields. The API accepts at most 48 named answer fields, validates required submission answers, and separately stores account identity, declaration, and uploaded documents.

## Optional integrations

### Email

For Gmail, enable 2-Step Verification and create an App Password. Configure `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_SMTP_HOST=smtp.gmail.com`, `EMAIL_SMTP_PORT=465`, `EMAIL_SMTP_SECURE=true`, and `EMAIL_SMTP_AUTH_METHOD=PLAIN`. Set `CONTACT_EMAIL` to receive messages from the website contact form. Add these values to local `.env` for development and to Vercel's environment variables for production; never commit credentials or use your normal Google password. The legacy `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` variables remain supported when corresponding `EMAIL_*` settings are absent. Production account registration requires working SMTP so verification links can be delivered.

### Paystack

Set `PAYSTACK_SECRET_KEY`, `PAYSTACK_CURRENCY`, and `APPLICATION_FEE` to enable checkout. The fee is entered in naira and converted to the minor currency unit for Paystack. The API verifies transactions with Paystack and validates webhook signatures; it does not trust browser payment claims. Configure the Paystack webhook URL as `https://your-domain/api/payments/webhook`.

Without the Paystack secret key, payment initialization responds with a clear not-configured error and does not mark applications paid.

## API overview

- `GET /api/health` — API/database health
- `GET /api/csrf` — CSRF cookie/token for mutating browser requests
- `/api/auth/*` — registration, email verification, sessions and password recovery
- `/api/applications/me` — applicant draft, submission and private documents
- `/api/notifications` — applicant notification centre
- `/api/admin/*` — metrics, review, status updates, private documents and CSV export
- `/api/admin/judges/*` and `/api/judge/*` — judge invites, assignments and rubric scoring
- `/api/admin/users` — account status and applicant/judge role management
- `/api/admin/content/*` and `/api/content/*` — CMS management and published public content
- `/api/admin/analytics` — application distribution, submission trends and ratios
- `/api/admin/finance` — payment ledger, filters and CSV export
- `/api/admin/audit-logs` — searchable administrative activity
- `/api/admin/settings` — non-secret integration and runtime configuration status
- `POST /api/contact` — rate-limited public contact form; requires `CONTACT_EMAIL` and email delivery configuration
- `/api/payments/*` — Paystack initialization, verification and signed webhooks

Applicant routes use HTTP-only, same-site session cookies. Mutating requests require the CSRF token returned by `/api/csrf`. Passwords are hashed, API requests are rate limited, uploads are limited to 5 MB each and checked against their file signatures, and uploaded files are not served from the public static directory.

## Production checklist

- Set `NODE_ENV=production` and `APP_URL` to the HTTPS origin. Sessions use cryptographically random opaque tokens stored only as hashes in SQLite; no shared session secret is required.
- Use HTTPS, deploy behind a trusted reverse proxy, configure SMTP and Paystack credentials, and protect the `.env`, SQLite file, and uploads directory with restrictive filesystem permissions and backups.
- Set an appropriate data retention/privacy policy and obtain legal review before accepting real applicant data. Configure database and upload backups, monitoring, and operational access controls.
- Vercel production uses Supabase Postgres and private Supabase Storage. Local development uses SQLite and local disk uploads.

## Project files

- `public/` — NLQI site and applicant/admin pages
- `backend/database.js` — SQLite schema and initialization
- `backend/applications.js` — application, admin, file and payment routes
- `backend/admin.js` — judge workflows, scoring, user management, analytics and site CMS
- `backend/email.js` — SMTP and explicit local-development email behavior
- `server.js` — Express server, authentication, security middleware and static hosting
- `src/` — former Next.js/PostgreSQL implementation retained for reference; it is not part of the active runtime

The current public homepage still uses its existing local and Unsplash imagery. Replace any externally hosted imagery with approved NLQI assets before production.
