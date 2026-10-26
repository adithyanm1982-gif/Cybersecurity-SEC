# Tech Society · Cybersecurity Domain

React + Vite frontend and FastAPI backend for the Cybersecurity domain of The Tech Society, Saveetha Engineering College.

```
tech-society/
├── frontend/                 React + Vite website (static site)
│   ├── public/logos/         college.png, aifirst.png, 25years.png, techsociety.png  <- put your HD logos here
│   ├── src/                  pages (Home, About, Events, Resources, Join, Terminal, Contacts, Login, AdminPanel)
│   ├── local-terminal/       OPTIONAL real Command Prompt helper (local PC only, not deployed)
│   └── .env.example          frontend variables
├── backend/                  FastAPI API
│   ├── app/                  main.py, models.py, csvstore.py, routers/ (auth, applications, events, admin)
│   ├── tests/test_api.py     automated tests
│   ├── requirements.txt
│   └── .env.example          backend variables
└── render.yaml               one-click Render deployment
```

## How it works

| What | How |
|---|---|
| **Sign in AND sign up** | one "Continue with Google" button. The account is created on the first sign-in. There are no passwords anywhere. |
| **Join form → CSV** | a signed-in student fills the JOIN form. One new line is added to **one CSV file that lives inside the database** (table `csv_files`, file `applications.csv`). The e-mail comes from the verified Google account. |
| **Getting your CSV** | sign in with a Google e-mail listed in `ADMIN_EMAILS` → **ADMIN** in the menu → **Download the CSV file**. It opens in Excel / Google Sheets. |
| **Event photos** | only the `ADMIN_EMAILS` accounts see upload / delete / rename buttons on the EVENTS page, and the server enforces it. Photos are stored in the database too. |

CSV columns: `submitted_at, name, register_no, department, year, email, phone, reason`.
Two students submitting at the same moment is safe: each line is added with one atomic database update.

## Database

Use Postgres. On Render the blueprint creates one for you and connects it automatically.
To use another provider (Neon, Supabase, AWS RDS ...), delete the `databases:` block and the `DATABASE_URL` entry in `render.yaml` and add `DATABASE_URL` yourself in the Render dashboard.
With `DATABASE_URL` empty the backend uses a local SQLite file: fine for testing, but **erased on every Render deploy**.

## Google sign-in setup (needed once)

1. console.cloud.google.com → create a project.
2. **APIs & Services → OAuth consent screen**: fill the app name and your e-mail (choose *External*).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
4. Under **Authorized JavaScript origins** add your website URL (for example `https://techsociety-web.onrender.com`) and `http://localhost:5173` for testing.
5. Copy the **Client ID** and put the same value in `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend).

While the consent screen is in "Testing" mode, only e-mails added under **Test users** can sign in. Click **Publish app** so every student can.

## Run locally

```bash
# 1) backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env     # fill GOOGLE_CLIENT_ID, ADMIN_EMAILS (your Google e-mail), SECRET_KEY
uvicorn app.main:app --reload --port 8000                # API docs: http://localhost:8000/docs
pytest -q                                                # optional: run the tests

# 2) frontend (second terminal)
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:8000  and  VITE_GOOGLE_CLIENT_ID=...
npm install
npm run dev              # http://localhost:5173
```

## Deploy on Render

1. Push the folder to a GitHub repo.
2. Render → **New → Blueprint** → choose the repo → it creates the database, API and website.
3. Fill the values it asks for: `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `VITE_GOOGLE_CLIENT_ID`. Put `x` in `FRONTEND_ORIGIN` and `VITE_API_URL` for now.
4. After the first build, copy the two real URLs from the Render dashboard, then set `FRONTEND_ORIGIN` (API) = website URL and `VITE_API_URL` (website) = API URL. No trailing slashes.
5. **Manual Deploy → Deploy latest commit** on both services (the website must be rebuilt after changing its variables).
6. Add the website URL to Google's **Authorized JavaScript origins** (step 4 above).

## Variables

| Variable | Where | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | backend | verifies Google sign-in |
| `ADMIN_EMAILS` | backend | Google e-mails (max 8) allowed to download the CSV and upload photos |
| `DATABASE_URL` | backend | database (Render fills it in) |
| `SECRET_KEY` | backend | signs login tokens (Render generates it) |
| `FRONTEND_ORIGIN` | backend | website URL, allowed to call the API (CORS) |
| `VITE_API_URL` | frontend | API URL |
| `VITE_GOOGLE_CLIENT_ID` | frontend | shows the Google button |

## Things to know

- **Free Render servers sleep** when idle: the first request after a pause can take about a minute.
- **Upload limits:** JPG, PNG, WEBP or GIF, 5 MB each, 10 per request. The type is checked from the file content; SVG is refused on purpose.
- **Spreadsheet safety:** cells that begin with `= + - @` are prefixed with `'` so Excel never runs them as formulas. Phone numbers such as `+91 98765 43210` are left as they are.
- **Rate limiting** is in memory per server process: 5 forms per hour per account, and limits on sign-in attempts.
- **Login token** lives in the browser's localStorage and lasts 12 hours.
- **Terminal page:** a live shell cannot run on a public website, so it works only locally (`cd frontend/local-terminal && npm install`, then `npm run term`).
- **Upgrading from the earlier password-based version:** it used tables named `users` and `applications`. This version uses new tables (`google_users`, `csv_files`), so nothing clashes. The old tables are simply unused and can be dropped.
- Tables are created automatically on first start. A later change to the table layout would need a migration tool such as Alembic.
