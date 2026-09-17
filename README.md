# 🚀 NEXAI — AI-Powered Mock Interview & Proctoring Platform

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js Express" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Google-Gemini_AI-8E75C2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 🌐 Live Production Deployments

| Component | Platform | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://ai-mock-interview-blue-eight.vercel.app](https://ai-mock-interview-blue-eight.vercel.app) |
| **Backend REST API** | **Render** | [https://ai-mock-interview-xnfn.onrender.com](https://ai-mock-interview-xnfn.onrender.com) |
| **Database** | **Neon Cloud** | Serverless PostgreSQL with Connection Pooling |

---

## 📖 Overview

**NEXAI** is an enterprise-grade AI technical interview preparation and remote proctoring platform. Built for university candidates, engineering students, and software developers, NEXAI simulates rigorous placement and technical rounds with real-time AI question synthesis, webcam monitoring, speech-to-text voice answers, anti-cheat tab switch detection, and instant evaluation analytics.

---

## ✨ Key Features

### 🧠 1. Dynamic AI Question Synthesis
- Powered by **Google Gemini AI** with automatic cascading fallback (`gemini-1.5-flash` $\to$ `gemini-3.6-flash` $\to$ `gemini-3.5-flash` $\to$ `gemini-flash-latest`).
- Dynamically creates tailored sets of 5 questions combining **Multiple Choice Questions (MCQs)** and **In-Depth Technical / Coding Questions** matched to chosen tech stacks (React, Python, Node, Java, DSA, System Design) and difficulty levels (*Easy*, *Medium*, *Hard*).

### 🛡️ 2. Real-Time Anti-Cheat Proctoring Room
- **Candidate Webcam HUD**: Picture-in-picture live candidate video feed with recording indicators.
- **Tab & Window Focus Enforcement**: Detects tab-switches, window blur events, or desktop switching.
- **3-Strike Violation Flow**: Displays visual warning alerts with violation counters (`1/3`, `2/3`, `3/3`) before automatically terminating compromised sessions.
- **30-Minute Countdown Timer**: Top-mounted proctoring clock turns yellow below 5 minutes, pulses red below 60 seconds, and executes graceful auto-submission on expiration.

### 🎙️ 3. Candidate Voice Dictation & Code Sandbox
- **Speech-to-Text**: Built-in **Web Speech API** (`webkitSpeechRecognition`) lets candidates dictate technical explanations hands-free with real-time transcription.
- **Tab-Indentation Support**: Code editor textarea traps `Tab` keys to insert standard 2-space indentation without losing component focus.

### 📊 4. Comprehensive Evaluation & Placement Readiness
- **Interactive Score Dial**: Visual gauge from 0 to 100 with automated placement readiness tier classification:
  - 🟢 **Placement Ready** ($\ge 80$)
  - 🟡 **Proficient** ($60 - 79$)
  - 🔴 **Needs Practice** ($< 60$)
- **Sub-Metric Breakdown**: Separates objective MCQ accuracy from open-ended technical code quality and problem-solving depth.
- **Filterable Review System**: Filter questions by *All*, *MCQs Only*, *Code / Detailed Only*, or *Needs Review* (ratings $< 7$).
- **Actionable AI Feedback**: Shows candidate answer, model solution, constructive AI critique, and rating for every response.
- **PDF Export**: Single-click "Print / Save PDF" report generation.

### 📈 5. Visual Dashboard Analytics
- **Historical Score Trajectory**: Interactive **Recharts** line graph mapping score progression across test sessions.
- **Topic Competency Matrix**: Comparative bar chart evaluating candidate strength across varying technologies and domains.
- **Session History**: Quick-access cards to instantly review previous evaluations and track improvement.

### 🔒 6. Enterprise-Grade Security & Authentication
- **Google OAuth 2.0**: Seamless single sign-on via Passport.js.
- **Dual-Token Refresh Rotation**:
  - Short-lived **15-minute JWT access tokens**.
  - Long-lived **7-day HTTP-Only SameSite refresh tokens**.
  - **Axios Response Interceptors**: Automatically catches expired tokens on 401/403 and performs seamless background token refreshes without candidate interruption.
- **IDOR Protection**: All interview session queries and submissions are strictly validated against `userId: req.user.id`.
- **Submission Idempotency**: Blocks duplicate test grading requests (`400 Bad Request`) to prevent score tampering and duplicate AI billing.
- **DDoS & Rate Limiting**: `express-rate-limit` enforces quotas on AI generation endpoints (max 15 generation requests / 15 minutes).
- **Hardened HTTP Headers**: Implemented with `helmet` and secure CORS whitelisting.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Vercel)"]
        UI["React 19 + Vite UI"]
        Axios["Axios Interceptor (Silent Token Refresh)"]
        Voice["Web Speech API (Voice Dictation)"]
        Cam["MediaStream Webcam HUD"]
    end

    subgraph Server["Backend API (Render)"]
        Express["Express.js Server"]
        Auth["Passport.js Google OAuth & JWT"]
        Limiter["Express Rate Limiter"]
        Security["Helmet & CORS Whitelist"]
        Passport["Google OAuth Strategy"]
    end

    subgraph Data["Data & AI Layer"]
        Gemini["Google Gemini AI API"]
        Prisma["Prisma ORM"]
        NeonDB[("Neon Cloud PostgreSQL")]
    end

    UI -->|HTTPS Requests + Bearer Token| Express
    Axios -->|POST /api/auth/refresh| Express
    Express --> Limiter
    Limiter --> Security
    Security --> Auth
    Auth <-->|Verify ID & Profile| Passport
    Express -->|Prisma Client| NeonDB
    Express -->|Generative AI Prompting| Gemini
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts & Data Viz**: [Recharts](https://recharts.org/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) (with automatic credentials and refresh interceptors)
- **Forms & State**: [React Hook Form](https://react-hook-form.com/), [TanStack React Query](https://tanstack.com/query)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES6+ / CommonJS)
- **Framework**: [Express 5](https://expressjs.com/)
- **Authentication**: [Passport.js](http://www.passportjs.org/), [passport-google-oauth20](https://www.passportjs.org/packages/passport-google-oauth20/), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with [Neon PostgreSQL](https://neon.tech/)
- **AI Engine**: [@google/generative-ai SDK](https://www.npmjs.com/package/@google/generative-ai) (Gemini models)
- **Security**: [Helmet](https://helmetjs.github.io/), [cookie-parser](https://www.npmjs.com/package/cookie-parser), [cors](https://www.npmjs.com/package/cors), [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)

### Infrastructure & DevOps
- **Containerization**: Docker, Docker Compose (PostgreSQL, Express API, Nginx frontend)
- **Hosting**: Vercel (Frontend), Render (Backend), Neon (Database)

---

## 📂 Project Structure

```
AI-Mock-Interview/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (User, Interview, Question)
│   ├── src/
│   │   ├── config/
│   │   │   └── passport.js       # Google OAuth 2.0 Passport strategy
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js           # Google login, refresh token, logout, me
│   │   │   └── interview.js      # Generate questions, submit test, get report
│   │   └── server.js             # Express app setup, CORS, rate limits, routes
│   ├── .env.example              # Backend environment template
│   ├── Dockerfile                # Production Node backend Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx        # Navigation bar, auth state, logout
│   │   ├── pages/
│   │   │   ├── Landing.jsx       # Hero page and Google Sign-in
│   │   │   ├── Dashboard.jsx     # Analytics, progression charts, history
│   │   │   ├── Session.jsx       # Proctored exam room, timer, webcam, dictation
│   │   │   └── Result.jsx        # Evaluation report, score dial, PDF export
│   │   ├── api.js                # Configured Axios with automatic token refresh
│   │   ├── App.jsx               # Route definitions
│   │   └── main.jsx
│   ├── .env.example              # Frontend environment template
│   ├── Dockerfile                # Production Nginx frontend Dockerfile
│   └── package.json
│
├── docker-compose.yml            # Multi-container orchestration (DB + API + Web)
└── README.md                     # Documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- PostgreSQL database (or free [Neon](https://neon.tech/) cloud instance)
- Google Cloud OAuth 2.0 Credentials ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/app/apikey))

---

### Step 1: Clone Repository
```bash
git clone https://github.com/BhaveshYadavIITBHU/AI_Mock_Interview.git
cd AI_Mock_Interview
```

---

### Step 2: Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure your `.env` variables:
   ```env
   DATABASE_URL="postgresql://username:password@host:5432/neondb?sslmode=require"
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
   FRONTEND_URL="http://localhost:5173"
   JWT_SECRET="your-strong-jwt-secret"
   JWT_REFRESH_SECRET="your-strong-jwt-refresh-secret"
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=5000
   ```

4. Push schema to database and generate Prisma Client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend runs on `http://localhost:5000`.*

---

### Step 3: Configure Frontend

1. Open a new terminal tab and navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```

2. (Optional) Create `.env` if pointing to a custom backend:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```
   *(Defaults to `http://localhost:5000` in development and `https://ai-mock-interview-xnfn.onrender.com` in production builds automatically).*

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend runs on `http://localhost:5173`.*

---

### Step 4: Run with Docker Compose (Alternative)

To spin up the entire stack (PostgreSQL + Backend API + Frontend Nginx) with one command:
```bash
docker-compose up --build
```
- Frontend will be live on `http://localhost`
- Backend API will be live on `http://localhost:5000`
- PostgreSQL will be mapped to `localhost:5432`

---

## 🔑 Google Cloud OAuth Setup

To enable Google Sign-In, configure your OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com/):

### 1. Authorized JavaScript Origins
```
http://localhost:5173
http://localhost:5000
https://ai-mock-interview-blue-eight.vercel.app
https://ai-mock-interview-xnfn.onrender.com
```

### 2. Authorized Redirect URIs
```
http://localhost:5000/api/auth/google/callback
https://ai-mock-interview-xnfn.onrender.com/api/auth/google/callback
```

---

## 📡 API Reference

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Initiates Google OAuth 2.0 flow | No |
| `GET` | `/api/auth/google/callback` | Google OAuth redirect callback | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer Token) |
| `POST` | `/api/auth/refresh` | Silently issue fresh access token via HTTP-Only cookie | Refresh Token |
| `POST` | `/api/auth/logout` | Clears refresh token cookie and ends session | Yes |

### Interview & Proctoring Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/interview/generate` | Generates 5 tailored AI interview questions | Yes (Bearer Token) |
| `GET` | `/api/interview/session/:id` | Fetch specific interview session (with IDOR protection) | Yes (Bearer Token) |
| `POST` | `/api/interview/session/:id/submit` | Submit answers for grading & AI evaluation | Yes (Bearer Token) |
| `GET` | `/api/interview/history` | Retrieve user historical tests & score progression | Yes (Bearer Token) |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project (`https://github.com/BhaveshYadavIITBHU/AI_Mock_Interview/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [ISC License](LICENSE).

---

<p align="center">
  Crafted with ❤️ by <a href="https://github.com/BhaveshYadavIITBHU">Bhavesh Yadav</a>
</p>
