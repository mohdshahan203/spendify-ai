# SpendiFy — AI-Powered Micro-Lending Platform

<div align="center">

**Premium FinTech platform for intelligent micro-lending with AI credit scoring, risk assessment, and explainable AI**

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![XGBoost](https://img.shields.io/badge/XGBoost-2.1-orange)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

</div>

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React 19      │────▶│  Express v5 API  │────▶│  FastAPI AI     │
│   Tailwind v4   │     │  Prisma ORM      │     │  XGBoost + RF   │
│   Three.js      │     │  JWT Auth        │     │  SHAP           │
│   Framer Motion │     │  Multer          │     │  Chatbot        │
└─────────────────┘     └───────┬──────────┘     └─────────────────┘
                                │
                        ┌───────▼──────────┐
                        │   PostgreSQL 16  │
                        └──────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 16 (or Docker)
- npm

### 1. Clone & Install

```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Install AI service dependencies
cd ../ai-service && pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Option A: Docker
docker-compose up -d

# Option B: Manual PostgreSQL
# Create database: spendify

# Copy environment file
cp .env.example .env

# Run migrations
cd server
npx prisma migrate dev --name init
npx prisma generate

# Seed sample data
npx tsx prisma/seed.ts
```

### 3. Train AI Models

```bash
cd ai-service

# Generate synthetic training data
python training/generate_synthetic_data.py

# Train credit scoring models
python training/train_credit_model.py
```

### 4. Start All Services

```bash
# Terminal 1: Backend (port 5000)
cd server && npm run dev

# Terminal 2: AI Service (port 8000)
cd ai-service && uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend (port 5173)
cd client && npm run dev
```

### 5. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/health
- **AI Service**: http://localhost:8000/health
- **Prisma Studio**: `cd server && npx prisma studio`

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@spendify.com | Admin@123 |
| Loan Officer | officer@spendify.com | Officer@123 |
| Borrower | borrower@spendify.com | Borrower@123 |

## User Roles

1. **Borrower** — Apply for loans, view credit score, get AI recommendations
2. **Admin** — Review KYC, manage loans, view analytics
3. **Loan Officer** — Review loan applications, manage borrowers

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/verify-email` | Verify email with OTP |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/logout` | Logout |

### KYC
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kyc/upload` | Upload KYC documents |
| GET | `/api/kyc/status` | Get KYC status |
| POST | `/api/kyc/review/:userId` | Admin review KYC |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loans/apply` | Apply for loan |
| GET | `/api/loans/my-loans` | Get borrower's loans |
| POST | `/api/loans/:id/approve` | Admin approve loan |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/analyze` | Analyze bank statement |
| GET | `/api/ai/credit-score` | Get credit score |
| POST | `/api/ai/chat` | AI financial advisor |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Three.js, Framer Motion, GSAP |
| Backend | Express v5, TypeScript, Prisma ORM, JWT, Zod |
| AI/ML | FastAPI, XGBoost, Random Forest, SHAP, scikit-learn |
| Database | PostgreSQL 16 |
| 3D | React Three Fiber, drei, postprocessing |

## License

MIT
