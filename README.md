# HostelOps — Multi-Property Hostel Operations Platform

HostelOps is an enterprise-grade staff attendance, geolocation clock-in/out, task management, and payroll/leave tracking application designed for hostel chains.

---

## 🏗️ Architecture & Deployment Model

```
┌────────────────────────────────────────────────────────┐
│             DEVELOPMENT (Google AI Studio)             │
│  - VITE_APP_ENV=development (Default)                 │
│  - In-memory mock data & local state store             │
│  - Zero risk of polluting production Supabase          │
│  - Instant UI iteration, persona switching & testing   │
└──────────────────────────┬─────────────────────────────┘
                           │ (Push / Sync to GitHub)
                           ▼
┌────────────────────────────────────────────────────────┐
│             SOURCE OF TRUTH (GitHub `main`)            │
│  - Production branch triggers Netlify auto-deploy      │
└──────────────────────────┬─────────────────────────────┘
                           │ (CI/CD Deployment)
                           ▼
┌────────────────────────────────────────────────────────┐
│             PRODUCTION (Netlify + Supabase)            │
│  - Hosting: Netlify SPA (with security headers)        │
│  - Backend & Database: Supabase PostgreSQL             │
│  - Authentication: Supabase Auth (Phone + PIN mapping) │
│  - File Storage: Supabase Storage (`task-proofs`)     │
│  - Serverless AI: Netlify Functions (Proxy to Gemini)  │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 Environment Variable Matrix

| Variable | Scope | Description | Development Default | Production Required? |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_APP_ENV` | Client (Vite) | Environment flag: `development` or `production` | `development` | Yes (`production`) |
| `VITE_SUPABASE_URL` | Client (Vite) | Supabase Project URL (`https://xyz.supabase.co`) | *Optional* | **Yes** |
| `VITE_SUPABASE_ANON_KEY` | Client (Vite) | Supabase Public / Anon API Key | *Optional* | **Yes** |
| `GEMINI_API_KEY` | Serverless (Netlify) | Google Gemini API Secret Key | *Dev helper* | **Yes** (in Netlify Dashboard) |

---

## 🚀 Getting Started

### 1. Development (Google AI Studio)
In Google AI Studio, `VITE_APP_ENV` is set to `development` by default.
- All operations run safely against the in-memory data layer in `src/mockData.ts`.
- You can test with preloaded personas (Owners, Managers, Staff).
- No external network credentials or Supabase setup are needed to test functionality.

### 2. Production Database Setup (Supabase)
1. Go to your **Supabase Dashboard** → **SQL Editor**.
2. Open `/supabase/migrations/full_migration.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
   - This creates: `properties`, `users`, `task_categories`, `tasks`, `vouchers`, `attendance_records`, `week_off_requests`, `leave_requests`, and `attendance_correction_requests`.
   - It enables **Row Level Security (RLS)** with role-based policies.
   - It creates Storage buckets: `task-proofs` and `attendance-selfies`.
4. In Supabase Dashboard → **Authentication** → **Providers** → **Email**:
   - Turn **OFF** *"Confirm email"* (since users authenticate with phone number and PIN mapped to internal identities).

### 3. Production Deployment (Netlify)
1. Link your GitHub repository (`main` branch) to Netlify.
2. In Netlify Dashboard → **Site Configuration** → **Environment Variables**, add:
   - `VITE_APP_ENV` = `production`
   - `VITE_SUPABASE_URL` = `https://<your-project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-anon-publishable-key>`
   - `GEMINI_API_KEY` = `<your-gemini-api-key>`
3. Trigger a deploy. Netlify will build the SPA and deploy the serverless functions in `/netlify/functions/`.

---

## 📂 Project Structure

```
├── netlify/
│   └── functions/
│       ├── gemini.ts            # Serverless Gemini AI proxy (holds secret GEMINI_API_KEY)
│       └── health.ts            # Netlify health check
├── src/
│   ├── config/
│   │   └── env.ts               # Strict environment detection (isProduction / isDevelopment)
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication context with session management
│   ├── services/
│   │   ├── authService.ts       # Authentication abstraction (Dev mock vs Supabase Auth)
│   │   ├── dataService.ts       # Unified data CRUD abstraction (Dev vs Supabase PostgreSQL)
│   │   ├── storageService.ts    # File / image upload abstraction (Local URL vs Supabase Storage)
│   │   └── aiService.ts         # AI assistant abstraction (Local fallback vs Netlify Function)
│   ├── components/              # UI components (Attendance, Tasks, Leaves, Properties, etc.)
│   ├── mockData.ts              # In-memory development data store
│   ├── supabaseClient.ts        # Supabase client initialization & helpers
│   ├── types.ts                 # TypeScript domain types
│   ├── App.tsx                  # Root application router
│   └── main.tsx                 # Vite entry point
├── supabase/
│   └── migrations/
│       ├── 20260830_initial_schema.sql  # PostgreSQL table definitions & triggers
│       ├── 20260830_rls_policies.sql    # Row Level Security policies
│       ├── 20260830_storage_setup.sql   # Storage buckets and storage policies
│       └── full_migration.sql           # All-in-one execution script for Supabase
├── netlify.toml                 # Netlify build, redirect, and security header configuration
└── .env.example                 # Documented environment variables
```

---

## 🔑 Authentication Architecture
The system uses **Phone Number + 6-digit PIN** for authentication.
- **Client Side**: Users only enter their Phone number (e.g. `+91 98765 00001`) and PIN.
- **Internal Mapping**: Phone numbers are transformed to internal email identifiers: `${digits}@hostelops.internal`.
- **Security**: Supabase Auth securely manages password hashing and JWT sessions. Role-based profiles in the `users` table control property-level permissions.
