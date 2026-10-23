# SpendiFy — Vercel Production Deployment Guide

> **Single-Project, Full-Stack FinTech Architecture on Vercel**  
> SpendiFy combines a React 18 / Vite 5 client with high-performance Vercel Serverless Functions (`/api/*`), secured Google Gemini GenAI advisory, and an XGBoost/SHAP machine learning credit scoring pipeline.

---

## 1. Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │         https://spendify.vercel.app          │
                      │               (Single Domain)                │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────┴───────────────────────┐
                      │                Vercel Edge                   │
                      └──────────────┬───────────────────────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
  ┌───────────────────────┐                       ┌─────────────────────┐
  │   React 18 / Vite 5   │                       │  Vercel Functions   │
  │   (Static Frontend)   │                       │      (/api/*)       │
  │   Routes:             │                       │  - Express Adapter  │
  │    / (Home)           │                       │  - JWT Auth         │
  │    /dashboard         │                       │  - Credit Engine    │
  │    /credit-score      │                       │  - Loan Workflows   │
  │    /loans             │                       │  - Gemini AI SDK    │
  │    /calculator        │                       └──────────┬──────────┘
  │    /repayments        │                                  │
  │    /ai-assistant      │                     ┌────────────┴────────────┐
  │    /kyc, /admin       │                     ▼                         ▼
  └───────────────────────┘           ┌───────────────────┐    ┌────────────────────┐
                                      │ Managed Postgres  │    │ Dedicated Python   │
                                      │ (Neon / Supabase) │    │ ML Service (8000)  │
                                      │ Prisma ORM Pool   │    │ XGBoost + SHAP     │
                                      └───────────────────┘    └────────────────────┘
```

---

## 2. Vercel Project Settings

When importing this repository into Vercel:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Framework Preset** | `Vite` | Detected automatically |
| **Root Directory** | `./` | Root of the repository |
| **Build Command** | `npm run build` | Builds Prisma client, TypeScript backend, and Vite frontend |
| **Output Directory** | `client/dist` | Automatically configured via `vercel.json` |
| **Node.js Version** | `20.x` or `22.x` | Set in Project Settings > General |

---

## 3. Environment Variables

Configure the following environment variables in **Vercel Project Settings > Environment Variables**:

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | Managed PostgreSQL connection string with SSL | `postgresql://user:pass@ep-sample.neon.tech/spendify?sslmode=require` |
| `JWT_SECRET` | **Yes** | Cryptographic secret for signing access tokens | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | **Yes** | Cryptographic secret for signing refresh tokens | `openssl rand -base64 32` |
| `GEMINI_API_KEY` | **Yes** | Google AI Studio Gemini API Key | `AIzaSy...` (from [Google AI Studio](https://aistudio.google.com/)) |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-3.8-flash`) | `gemini-3.8-flash` or `gemini-2.5-flash` |
| `ML_SERVICE_URL` | No | URL of separately hosted Python ML inference service | `https://spendify-ml.onrender.com` |
| `NODE_ENV` | No | Node environment | `production` |

> [!IMPORTANT]
> **No Secrets in Frontend**: Notice that none of the secret variables have the `VITE_` prefix. Sensitive keys (`GEMINI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`) are strictly isolated to serverless execution and never bundled into client JavaScript.

---

## 4. Production Database Setup (PostgreSQL)

Vercel Serverless Functions execute in stateless, ephemeral micro-containers. Therefore, persistent SQLite file databases cannot be used in production.

SpendiFy uses **Prisma ORM** configured for PostgreSQL. You can use any managed PostgreSQL provider:
- **[Neon](https://neon.tech/)** (Recommended, serverless PostgreSQL with connection pooling)
- **[Supabase](https://supabase.com/)**
- **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)**
- **[AWS RDS / Render Postgres](https://render.com/)**

### Step 4.1: Run Database Migrations
Once your database is created, run the initial migration:
```bash
# Set your DATABASE_URL in your terminal or .env
export DATABASE_URL="postgresql://user:password@host/spendify?sslmode=require"

# Apply migrations
npm run db:migrate
```

Alternatively, you can execute the raw SQL migration script located at:
[`server/prisma/migrations/0_init/migration.sql`](file:///server/prisma/migrations/0_init/migration.sql) directly in your PostgreSQL SQL Editor (e.g. Neon Console or Supabase SQL Editor).

### Step 4.2: Seed Default Accounts
Populate demo users (Admin, Loan Officer, and Borrowers):
```bash
npm run db:seed
```

#### Seeded Test Credentials:
| Role | Email | Password | Initial State |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@spendify.com` | `Admin@123` | Full underwriting & KYC approval |
| **Loan Officer** | `officer@spendify.com` | `Officer@123` | Application reviewing & telemetry |
| **Borrower (Prime)** | `borrower@spendify.com` | `Borrower@123` | KYC Approved, Active Loan |
| **Borrower (Tech Lead)** | `aarav.sharma@spendify.com` | `Aarav@123` | Low Risk, 785 Credit Score |
| **Borrower (Designer)** | `priya.patel@spendify.com` | `Priya@123` | Medium Risk, 690 Credit Score |

---

## 5. Machine Learning Service Architecture

### Why is the Python ML Service hosted separately?
The SpendiFy ML scoring pipeline utilizes:
- **XGBoost 2.1** (Class-weighted gradient boosting)
- **Scikit-Learn 1.6** & **SciPy**
- **SHAP 0.46** (`TreeExplainer` attribution model)
- **Pandas 2.2** & **NumPy 2.0**

These C-extension scientific libraries uncompress to **> 450 MB**, exceeding Vercel’s 50 MB zipped / 250 MB uncompressed Serverless Function quota.

### Deployment Options for ML Service:
1. **Render.com / Railway / Fly.io / HuggingFace Spaces (Recommended)**:
   - Deploy `ai-service/` using Docker or Python runtime.
   - Set `ML_SERVICE_URL=https://your-ml-service.onrender.com` in Vercel.
2. **Local Machine / Development**:
   - Run `.\start.bat` or `python -m app.main` inside `ai-service/`.
   - Default `ML_SERVICE_URL=http://localhost:8000`.

### Transparent Offline State Handling:
If the Python ML service is offline or unreachable:
- SpendiFy **never generates fake mock scores**.
- The backend reports `ML scoring pipeline offline`.
- The dashboard displays an amber **"Automated Credit Scorer Unavailable"** banner with real error diagnostics and an interactive **"Retry Assessment"** button.
- Check pipeline status at anytime via `GET /api/ml/health`.

---

## 6. Verification and Health Checks

Once deployed to Vercel, test the following endpoints:

| Endpoint | Expected Result |
| :--- | :--- |
| `https://your-app.vercel.app/` | Loads landing page |
| `https://your-app.vercel.app/dashboard` | Borrower dashboard (SPA redirect) |
| `https://your-app.vercel.app/calculator` | Standalone loan calculator view |
| `https://your-app.vercel.app/repayments` | Repayment schedule view |
| `https://your-app.vercel.app/api/health` | `{"status": "OK", "service": "SpendiFy Backend Core API"}` |
| `https://your-app.vercel.app/api/ml/health` | Status of connection to ML service |
| `https://your-app.vercel.app/api/advisor/check` | Gemini AI configuration status |
