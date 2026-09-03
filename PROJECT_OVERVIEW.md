# Cognito AI / Wildcards — Project Overview

## What this project does

This project is an AI content transformation application. A user signs in with an email and password, optionally verifies a new account with a one-time code, provides source material, and asks the system to turn it into formats such as executive summaries, advisories, LinkedIn posts, video scripts, presentations, X threads, and infographics.

It also contains a separate memory service that can save and search user memories using Mem0 and Groq.

## Main components

### 1. React/Vite frontend

Location: `gen-ai-content-engine/frontend`

The frontend is a React application bundled with Vite. The main flow is in `src/App.jsx`:

- Shows `AuthScreen` until the user is authenticated.
- Sends email/password and OTP requests to the content API.
- Allows pasted text or uploaded files as source material.
- Sends tone, audience, and selected output formats to `/transform`.
- Displays generated cards through `ResultsWorkspace`.
- Provides copy-to-clipboard and saved history functionality.
- Uses `AppShell`, `Sidebar`, `SourceInput`, `OutputSelector`, and `GenerationControls` for the workspace UI.

The login page has a reactive `DotGrid` background. The authenticated AI workspace has its own smaller animated background through `DitherWave`.

### 2. Content-generation backend

Location: `gen-ai-content-engine/backend/main.py`

This is a FastAPI service, normally running on port `8000`. It handles:

- Email/password account creation and login.
- OTP generation, expiry, attempt limits, and cooldowns.
- Gmail SMTP or Resend email delivery.
- Secure signed session cookies.
- Text extraction from PDFs and images using `pypdf`, Pillow, and Tesseract OCR.
- AI content generation through Groq.
- Transformation history storage.
- CORS for the configured frontend origins.

Important endpoints include:

| Endpoint | Purpose |
|---|---|
| `POST /auth/send` | Start login or account verification |
| `POST /auth/verify` | Verify an OTP and create a session |
| `POST /auth/logout` | Clear the session |
| `POST /auth/forgot/send` | Send a password-reset OTP |
| `POST /auth/forgot/verify` | Reset the password |
| `POST /transform` | Generate selected content formats |
| `GET /history` | Load the signed-in user's history |

The same authentication routes are also available under `/api/...` for compatibility.

### 3. Standalone memory API

Location: `api.py`

This is a second FastAPI service, normally running on port `8001`. It uses a fixed development user ID (`yash`) and provides:

- `POST /add_memory` to save text to Mem0.
- `POST /search_memory` to search memories and ask Groq for a concise answer.
- `GET /` as a health message.

This service is separate from the content-generation backend and should not replace port `8000`.

### 4. Java memory gateway

Location: `memory-gateway`

This Spring Boot 3 application runs as a thin proxy in front of the standalone memory API. It exposes:

- `POST /api/add`
- `POST /api/search`

It forwards requests to the Python memory API using the URL in `application.properties`, with connection/read timeouts and basic upstream error handling.

### 5. Legacy command-line memory assistant

Location: `start.py`

This is an interactive terminal program. It can save memories, search them, and stream answers from Groq. It is useful for testing Mem0 independently from the web UI.

## Data and authentication

- OTPs are held in memory and expire after five minutes.
- OTP requests have a cooldown and maximum verification attempts.
- Accounts are stored locally by the content backend in `backend/accounts.sqlite3`.
- Transformation history is stored in `backend/chat_history.json`.
- Mem0 is optional context storage and receives best-effort memory/history copies.
- Session cookies are signed with `AUTH_SECRET`.
- `DEV_AUTH_FALLBACK=true` prints OTPs in the backend terminal for local development.
- Production should use real email delivery, a strong secret, persistent storage, and a shared OTP repository such as Redis.

## Environment variables

Configure these in the root `.env` file. Never commit this file or share its values.

```env
GROQ_API_KEY=...
MEM0_API_KEY=...
AUTH_SECRET=...
DEV_AUTH_FALLBACK=false
FRONTEND_ORIGINS=http://localhost:3000,http://localhost:5173
SMTP_EMAIL=...
SMTP_APP_PASSWORD=...
MEMORY_API_PORT=8001
MEMORY_API_URL=http://127.0.0.1:8001
VITE_GEN_AI_API_URL=http://localhost:8000
```

Gmail app passwords may be displayed with spaces; the backend removes whitespace before SMTP login.

## Local startup

### Content backend

```powershell
cd gen-ai-content-engine
pip install -r backend/requirements.txt
uvicorn backend.main:app --port 8000 --reload
```

### Frontend

In another terminal:

```powershell
cd gen-ai-content-engine/frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, commonly `http://localhost:5173`.

### Standalone memory API

```powershell
python api.py
```

### Java gateway

```powershell
cd memory-gateway
.\mvnw.cmd spring-boot:run
```

The Java gateway must point to port `8001`, not the content backend on port `8000`.

## Frontend development commands

From `gen-ai-content-engine/frontend`:

```powershell
npm run dev      # Start Vite development server
npm run build    # Create a production build in dist/
npm run lint     # Run Oxlint
npm run preview  # Preview the production build
```

## Current limitations and useful next improvements

- OTP storage is process-local and disappears after a restart.
- The memory API currently uses one fixed user ID.
- File processing is limited by the backend upload size and installed OCR tools.
- There is no production job queue for long-running generation.
- Generated outputs could benefit from editing, versions, exports, brand-voice profiles, project search, and a content calendar.
- Secrets currently need careful rotation if they have ever been exposed outside the local machine.

## Repository map

```text
Wildcards/
├── .env                         # Local secrets and configuration
├── api.py                       # Standalone Mem0 memory API
├── start.py                     # CLI memory assistant
├── gen-ai-content-engine/
│   ├── backend/
│   │   ├── main.py              # Auth, email, files, Groq, history API
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/App.jsx          # Main application flow
│       ├── src/components/      # UI and visual components
│       └── package.json
└── memory-gateway/               # Spring Boot proxy for memory API
```
