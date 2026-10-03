# 🌊 SHORE.edu — Educational Analytics & Learning Management Platform

<div align="center">

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**A modern, full-stack educational management platform empowering educators, volunteers, and students with real-time academic tracking, automated OMR grading, gamified recitations, and offline-resilient PWA capabilities.**

[Explore Live Demo](https://shore-backend.onrender.com) • [Report Bug](https://github.com/AlanSerios/SHORE.edu/issues) • [Request Feature](https://github.com/AlanSerios/SHORE.edu/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Security & Identity Hardening](#-security--identity-hardening)
- [PWA & Offline Resilience](#-pwa--offline-resilience)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [One-Click Local Launch](#one-click-local-launch-windows)
  - [Manual Setup](#manual-setup)
- [API Reference](#-api-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**SHORE** (*Student Holistic Outcomes & Records Engine*) is engineered to bridge educational accessibility gaps in regional and community classrooms. Designed with a mobile-first philosophy, SHORE combines institutional analytics with gamified student engagement, supporting zero-latency offline workflows for low-connectivity environments.

---

## 🚀 Key Features

### 📊 1. Academic Performance & Analytics
- **Pre-Test & Post-Test Analytics**: Automated delta calculation ($Score_{post} - Score_{pre}$), class mastery distributions, and individual growth trajectory charts.
- **Subject Radar Profiling**: Visual competence mapping across core competencies (Science, Math, English).

### 📷 2. Computer Vision OMR Scanner
- **Optical Mark Recognition**: Real-time camera capture and photo upload grading for standardized bubble sheets with instant score extraction.

### 🛡️ 3. Attendance & Streak Engine
- **Session Attendance Tracking**: Single-tap check-in and QR code scanning for students and volunteers.
- **Gamified Session Streaks**: Milestone celebrations with dynamic Lottie fire animations and custom progress timelines.

### 🏆 4. Recitations & Live Leaderboard
- **Live Participation Scoring**: Real-time points award system for active classroom recitations.
- **Interactive Leaderboard**: Animated podium rankings with celebratory confetti particle effects.

### 🛍️ 5. Rewards Economy & Avatar Customization
- **In-App Shop**: Students redeem academic points for digital perks and cosmetic profile borders (Emerald, Neon Wave, Gold Aureole, Cyber Pulse).
- **Avatar System**: Custom profile photos with dynamic SVG animated ring frames.

### 🎓 6. Scholarships & Opportunity Tracker
- **Requirement Checklists**: Interactive submission tracker with document upload status, GPA requirements, and deadline countdowns.

### 📄 7. Automated PDF Progress Reports
- **Institutional-Grade PDF Export**: Server-side document compilation using ReportLab for batch printing and parent-teacher reporting.

### 👥 8. Administrative Roster Management
- **Role-Based Portals**: Dedicated, isolated experiences for **Admin**, **Volunteer**, and **Student** roles.
- **Account Directory**: Inline management, account password overrides, and role reassignment.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Browser / Client     │
                                  │  (React 19 + PWA SW)   │
                                  └──────────┬─────────────┘
                                             │
                       HTTP / HTTPS (JWT Bearer Token / REST API)
                                             │
                                             ▼
                       ┌──────────────────────────────────────────┐
                       │           Flask Python Backend           │
                       │ ──────────────────────────────────────── │
                       │ • Security Headers & CORS Middleware     │
                       │ • JWT Authentication & Session Resolver  │
                       │ • Role-Based Access Control (@require)   │
                       │ • SSRF & Input Sanitization Guards       │
                       │ • PDF ReportLab Generation Engine        │
                       └─────────────────────┬────────────────────┘
                                             │
                               Firebase Admin SDK
                                             │
                                             ▼
                               ┌──────────────────────────┐
                               │ Firebase Realtime DB     │
                               │  & Cloud Messaging (FCM) │
                               └──────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide Icons](https://lucide.dev/) |
| **Data Viz & Motion** | [Recharts](https://recharts.org/), [Canvas Confetti](https://github.com/catdad/canvas-confetti), [Lottie Web](https://airbnb.io/lottie/) |
| **Offline & PWA** | Custom Service Worker Cache Shell, Web App Manifest, Cache-First Static Assets, Network-First API Fallback |
| **Backend API** | [Python 3.10+](https://www.python.org/), [Flask](https://flask.palletsprojects.com/), [ReportLab PDF](https://www.reportlab.com/) |
| **Database & Auth** | [Firebase Realtime Database](https://firebase.google.com/), [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup), Signed JWT (HMAC-SHA256) |
| **Testing** | Custom Python Multi-Suite E2E & Security Test Suite (16 Automated Assertions) |
| **Deployment** | [Vercel](https://vercel.com/) (Frontend CDN) & [Render](https://render.com/) (Backend Web Service) |

---

## 🔒 Security & Identity Hardening

- **Stateless JWT Authentication**: Cryptographically signed tokens (HMAC-SHA256) attached via global fetch interceptors in `Authorization: Bearer <token>` headers.
- **Server-Side RBAC**: Strict role enforcement via Python decorators (`@require_role('admin')` / `@require_role('admin', 'volunteer')`) preventing unauthorized resource mutations.
- **SSRF Prevention**: Strict URL schema validation and loopback/private subnet blocking on all outbound webhook utilities.
- **Constant-Time Cryptography**: Timing-safe string comparisons (`hmac.compare_digest`) for administrative PIN and credential evaluation.
- **Hardened HTTP Headers**: Comprehensive defensive header suite:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security (HSTS)`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 📱 PWA & Offline Resilience

Built specifically for regional environments with intermittent cellular connectivity:
- **Instant App Installation**: Custom PWA banner allowing native Android/iOS/Desktop home-screen installation without app store friction.
- **Precached App Shell**: Core styling, bundle assets, and UI components load instantly offline.
- **Network-First API Caching**: Automatically saves cached responses for scholarships, schedules, and student profile data when connectivity drops.
- **Live Connection Barometer**: Non-intrusive UI indicator displaying online/offline sync status.

---

## 📂 Project Structure

```
SHORE_Web_App/
├── backend/                  # Python Flask API & Microservices
│   ├── server.py             # Core API routing, Firebase handlers & RBAC
│   ├── pdf_generator.py      # Automated ReportLab PDF compiler
│   ├── requirements.txt      # Python dependencies
│   ├── firebase_key.json     # Firebase service account credential (gitignored)
│   ├── venv/                 # Local Python virtual environment (gitignored)
│   └── scripts/              # Migration, admin & test automation scripts
│       ├── comprehensive_test_suite.py # 16-step automated test suite
│       └── ...
├── frontend/                 # React 19 + Vite Frontend Application
│   ├── public/               # PWA icons, manifest.json & sw.js
│   │   ├── manifest.json     # PWA configuration
│   │   └── sw.js             # Service worker caching engine
│   ├── src/
│   │   ├── App.jsx           # Master application shell & navigation
│   │   ├── main.jsx          # Entry point & global JWT auth interceptor
│   │   ├── index.css         # Typography, design tokens & scrollbar styling
│   │   ├── components/       # Modular view components
│   │   │   ├── AccountsView.jsx
│   │   │   ├── AnnouncementsView.jsx
│   │   │   ├── AttendanceAdminView.jsx
│   │   │   ├── AttendanceStudentView.jsx
│   │   │   ├── AvatarBorder.jsx
│   │   │   ├── CalendarView.jsx
│   │   │   ├── LeaderboardView.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ManageClassView.jsx
│   │   │   ├── ManageTeamView.jsx
│   │   │   ├── OfflineIndicator.jsx
│   │   │   ├── OMRScannerView.jsx
│   │   │   ├── PWAInstallBanner.jsx
│   │   │   ├── RecitationsAdminView.jsx
│   │   │   ├── ReportsView.jsx
│   │   │   ├── ScholarshipsView.jsx
│   │   │   ├── SettingsView.jsx
│   │   │   ├── ShopView.jsx
│   │   │   └── TicketsView.jsx
│   │   └── utils.js          # Shared helper utilities (cn, styling)
│   ├── tailwind.config.js    # Design system theme configuration
│   └── vite.config.js        # Vite bundler & dev proxy configuration
├── server.py                 # Root production entrypoint (Render deployment)
├── pdf_generator.py          # Root production PDF generator
├── requirements.txt          # Root production Python dependencies
├── start.bat                 # One-click Windows dev startup script
└── README.md                 # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Firebase Account**: Service account key exported as JSON.

### One-Click Local Launch (Windows)
Double-click `start.bat` or run:
```cmd
start.bat
```
This will automatically configure the Python virtual environment, install dependencies, and start the API server on `http://127.0.0.1:5000`.

---

### Manual Setup

#### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/AlanSerios/SHORE.edu.git
cd SHORE.edu

# Create and activate Python virtual environment
python -m venv backend/venv
# On Windows:
backend\venv\Scripts\activate
# On macOS/Linux:
source backend/venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Place your Firebase Service Account JSON at root and in backend/
# firebase_key.json

# Start the Flask API server
python server.py
```

#### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite Development Server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📡 API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/login` | Public | Authenticate user & issue signed JWT token |
| `GET` | `/api/users/me` | Authenticated | Validate session & retrieve current user profile |
| `GET` | `/api/users` | Authenticated | List all registered user accounts |
| `PUT` | `/api/users/<email>` | Admin | Update user information, role, or credentials |
| `DELETE` | `/api/users/<email>` | Admin | Remove user account from database |
| `GET` | `/api/attendance` | Authenticated | Fetch session attendance logs |
| `POST` | `/api/attendance` | Volunteer / Admin | Record student/volunteer attendance |
| `GET` | `/api/announcements` | Authenticated | Retrieve announcements and comment threads |
| `POST` | `/api/announcements` | Volunteer / Admin | Publish new announcement |
| `GET` | `/api/scholarships` | Authenticated | Fetch active scholarship directory |
| `POST` | `/api/scholarships` | Admin | Create new scholarship listing |
| `POST` | `/api/shop/buy` | Student | Purchase cosmetic avatar border with earned points |
| `POST` | `/api/shop/equip` | Student | Equip unlocked avatar border |
| `POST` | `/api/generate_pdf` | Admin | Compile and generate PDF progress report |

---

## 🧪 Testing & Quality Assurance

SHORE includes an automated end-to-end and security regression test suite. Run all test assertions with:

```bash
python backend/scripts/comprehensive_test_suite.py
```

**Test Coverage Highlights:**
- ✅ JWT Authentication Lifecycle (Issuance, Signature Verification, Expiration)
- ✅ Role-Based Access Control (403 Forbidden on Unauthorized Access)
- ✅ Server-Side Input Sanitization & SSRF URL Validation
- ✅ Hardened Security Headers (CSP, HSTS, X-Frame-Options)
- ✅ CRUD Lifecycle for Students, Volunteers, Attendance & Scholarships
- ✅ Shop Economics & Inventory Border Equipping
- ✅ Automatic Test Data Cleanup (Zero leftover database artifacts)

---

## 🚀 Deployment

### Backend (Render / Railway / Cloud Run)
1. Set Environment Variable in Render Dashboard:
   - `FIREBASE_CREDENTIALS`: *(Paste the raw JSON string from `firebase_key.json`)*
   - `PORT`: `5000`
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `gunicorn server:app` or `python server.py`

### Frontend (Vercel)
1. Connect repository root with Framework preset: **Vite**.
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`

---

## 🤝 Contributing

Contributions make the open source community a fantastic place to learn, inspire, and create.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">

*SHORE.edu — Empowering educators and learners everywhere.*

</div>
