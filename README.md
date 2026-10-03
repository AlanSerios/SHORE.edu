# 🌊 SHORE.edu — SHORE-Skwela Educational Platform

<div align="center">

![SHORE Logo](frontend/public/shore_logo.png)

### *Student Holistic Outcomes & Records Engine*
**The Official Academic & Student Management Platform for the SHORE-Skwela Initiative**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**Recognized at the 2023 Kinanao Awards as an Outstanding Community-Based Educational Project in Cagayan de Oro City.**

[Live Web App](https://shore-backend.onrender.com) • [About SHORE-Skwela](#-about-shore-skwela) • [Architecture](#-system-architecture) • [Features](#-core-platform-modules) • [Setup Guide](#-getting-started)

</div>

---

## 📖 About SHORE-Skwela

**SHORE-Skwela** (led by Head of Organization **Alan Serios** in partnership with community scholars, the **ISDA Bulua Association**, and the **Sangguniang Kabataan of Barangay Bulua**) is an award-winning grassroots educational initiative based in **Cagayan de Oro City, Philippines**.

The mission of SHORE-Skwela is to democratize quality academic mentorship, college entrance exam preparation (CETs), and government/private scholarship coaching (including DOST-SEI, City Scholarships, and CHED) for senior high school students across partner institutions like **Bulua National High School**.

In **2023**, SHORE-Skwela was honored with the prestigious **Kinanao Award for Outstanding Community-Based Project** by the Cagayan de Oro City Scholarships Office for its transformative impact on student outcomes.

### 🎯 Why this Platform was Built
To scale the initiative and replace manual paperwork, Alan Serios engineered the **SHORE Web Application** as an end-to-end digital command center:
1. **Track Real Academic Growth**: Automatically calculate pre-test vs. post-test score gains and subject competency radials across cohorts.
2. **Automate Grading**: Scan physical bubble-sheet mock exams instantly via Computer Vision (OMR).
3. **Gamify Attendance & Learning**: Keep students motivated with attendance streaks, recitation leaderboards, and rewards shop cosmetics.
4. **Resilience in Low-Connectivity**: Provide an offline-first Progressive Web App (PWA) so students in regional Mindanao can access notes and requirements with zero mobile data.

---

## 🌟 Core Platform Modules

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SHORE.edu Command Center                          │
├───────────────────┬──────────────────────────────┬───────────────────────┤
│ 📊 Academic Engine │ 👥 Operations & Cohorts      │ 🎮 Gamification & PWA │
├───────────────────┼──────────────────────────────┼───────────────────────┤
│ • Pre/Post Deltas │ • Admin & Volunteer Portals  │ • Session Streaks     │
│ • OMR Bubble Scan │ • QR Attendance Logging      │ • Recitations Podium  │
│ • Subject Radars  │ • Real-time Announcements    │ • Rewards Points Shop │
│ • PDF Generators  │ • Scholarship Trackers       │ • Offline PWA Shell   │
└───────────────────┴──────────────────────────────┴───────────────────────┘
```

### 1. 📊 Academic Performance & Pre/Post-Test Analytics
- **Continuous Evaluation**: Tracks student baseline competency (Pre-Test) and measures diagnostic growth post-intervention (Post-Test).
- **Competency Radar Graphs**: Visual breakdowns across Science, Mathematics, English, and Abstract Reasoning.
- **Automated PDF Reports**: Compiles institutional progress summaries via Python ReportLab for parent-teacher reviews.

### 2. 📷 Optical Mark Recognition (OMR) Scanner
- **Camera & Photo Scanner**: Instant browser-based optical evaluation of printed bubble sheets for mock entrance exams, eliminating hours of manual grading.

### 3. 🛡️ Attendance Engine & Milestone Streaks
- **QR & Tap Check-in**: Fast session attendance for large classrooms.
- **Streak Celebrations**: Gamified attendance tracker featuring animated Lottie flame milestones (OB, S1–S8, Midterms, Graduation).

### 4. 🏆 Recitations & Live Leaderboard
- **Active Participation Scoring**: Volunteers award live points during lectures.
- **Podium Rankings**: Real-time leaderboard with confetti particle physics to boost classroom engagement.

### 5. 🛍️ Student Economy & Profile Customization
- **In-App Rewards Shop**: Points earned from attendance and recitations can be redeemed for school supplies, load allowance, and avatar borders (Emerald, Neon Wave, Gold Aureole, Cyber Pulse).
- **Dynamic Profile Borders**: Custom animated SVG rings surrounding student avatars.

### 6. 🎓 Scholarship & Opportunity Tracker
- **Requirements Checklist**: Tracks deadlines, GPA prerequisites, and submission status for DOST-SEI, CHED, and local LGU scholarships.

### 7. 📱 Offline-Resilient Progressive Web App (PWA)
- **Zero-Data Mode**: Pre-cached app shell with offline network fallback, allowing students with poor data reception to review saved scholarship requirements and class schedules.
- **1-Click Home Screen Install**: Instant native-like mobile installation without app store downloads.

---

## 🏗️ System Architecture

```
                               ┌───────────────────────────┐
                               │   Student / Volunteer     │
                               │   Mobile / Desktop PWA    │
                               │  (React 19 + Service Wkr) │
                               └─────────────┬─────────────┘
                                             │
                       HTTPS / REST (JWT Bearer Token Interceptor)
                                             │
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │          Python Flask Backend             │
                       │ ───────────────────────────────────────── │
                       │ • JWT Authentication & Token Lifecycle    │
                       │ • Role-Based Access Control (@require)    │
                       │ • Modern Defensive Headers (CSP/HSTS)     │
                       │ • ReportLab PDF Compilation Engine        │
                       │ • SSRF & Cryptographic Secret Protection  │
                       └─────────────────────┬─────────────────────┘
                                             │
                               Firebase Admin SDK
                                             │
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │       Firebase Realtime Database          │
                       │  & Firebase Cloud Messaging (FCM Alerts)  │
                       └───────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | **React 19** + **Vite 5** | High-performance reactive client with instant HMR |
| **Styling & Design** | **Tailwind CSS 3.4** + **Google Fonts** | Inter & Geist typography, sleek card UI, custom scrollbars |
| **Motion & Graphics** | **Framer Motion** + **Recharts** + **Lottie** | Interactive graphs, streak fire animations, and podium effects |
| **Offline Architecture** | **Service Worker** + **Web App Manifest** | PWA precaching, offline API cache fallback, install prompts |
| **Backend Framework** | **Python 3.10+** + **Flask 3.0** | Secure RESTful API services and middleware |
| **PDF Compilation** | **ReportLab Engine** | Automated server-side PDF generation for report cards |
| **Cloud Database** | **Firebase Realtime DB** | Real-time synchronization for scores, attendance, and announcements |
| **Authentication** | **Signed JWT (HMAC-SHA256)** | Stateless bearer token auth with automatic frontend interceptors |
| **Security Controls** | **RBAC Decorators** + **Timing-Safe Digest** | Server-side role enforcement and defense against brute-force/SSRF |

---

## 🔒 Security & Identity Hardening

- **Stateless Bearer JWTs**: All protected API requests pass through a global client-side fetch interceptor attaching cryptographically signed JWT tokens.
- **Server-Side RBAC**: Endpoints are strictly guarded with `@require_role('admin')` and `@require_role('admin', 'volunteer')` decorators.
- **Timing-Attack Defense**: Credential and administrative PIN verification utilizes constant-time comparisons via `hmac.compare_digest`.
- **SSRF Defense**: Strict URL whitelist validation and loopback/private IP blocking on outbound network handlers.
- **Enterprise HTTP Headers**: Comprehensive defensive header policy enforcing CSP, HSTS, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.

---

## 📂 Project Structure

```
SHORE_Web_App/
├── backend/                  # Python Flask API & Microservices
│   ├── server.py             # Main API server, Firebase handlers & RBAC
│   ├── pdf_generator.py      # Automated ReportLab PDF generator
│   ├── requirements.txt      # Python dependencies
│   ├── firebase_key.json     # Firebase service account credential (gitignored)
│   ├── venv/                 # Python virtual environment (gitignored)
│   └── scripts/              # Migration, admin & test automation scripts
│       ├── comprehensive_test_suite.py # 16-assertion automated test suite
│       ├── generate_bubble_sheets.py   # OMR sheet generator
│       ├── seed_attendance.py          # Attendance seeding utility
│       └── migrate_to_firebase.py      # Migration utility
├── frontend/                 # React 19 + Vite Frontend Application
│   ├── public/               # Static assets & PWA files
│   │   ├── manifest.json     # Web App Manifest
│   │   ├── sw.js             # Service Worker caching script
│   │   └── shore_logo.png    # Official SHORE logo
│   ├── src/
│   │   ├── App.jsx           # Main application shell & routing
│   │   ├── main.jsx          # App entrypoint & JWT interceptor
│   │   ├── index.css         # Design system tokens & typography
│   │   ├── components/       # Active modular views
│   │   │   ├── AccountsView.jsx          # Admin account management
│   │   │   ├── AnnouncementsView.jsx     # Real-time posts & comments
│   │   │   ├── AttendanceAdminView.jsx   # Admin attendance dashboard
│   │   │   ├── AttendanceStudentView.jsx # Student attendance self-view
│   │   │   ├── AvatarBorder.jsx          # Cosmetic border renderer
│   │   │   ├── CalendarView.jsx          # Class scheduling calendar
│   │   │   ├── LeaderboardView.jsx       # Gamified live leaderboard
│   │   │   ├── LoginPage.jsx             # Secure authentication view
│   │   │   ├── ManageClassView.jsx       # Student roster management
│   │   │   ├── ManageTeamView.jsx        # Volunteer team management
│   │   │   ├── OfflineIndicator.jsx      # Offline status banner
│   │   │   ├── OMRScannerView.jsx        # Optical mark recognition scanner
│   │   │   ├── PWAInstallBanner.jsx      # Mobile PWA 1-click install banner
│   │   │   ├── RecitationsAdminView.jsx  # Recitation scoring interface
│   │   │   ├── ReportsView.jsx           # Performance reports & charts
│   │   │   ├── ScholarshipsView.jsx      # Scholarship requirement tracker
│   │   │   ├── SettingsView.jsx          # Profile & security settings
│   │   │   ├── ShopView.jsx              # Rewards points economy
│   │   │   └── TicketsView.jsx           # Student support desk
│   │   └── utils.js          # Shared styling and layout helpers
│   ├── tailwind.config.js    # Tailwind theme configuration
│   └── vite.config.js        # Vite build & proxy settings
├── server.py                 # Root production entrypoint (Render deployment)
├── pdf_generator.py          # Root production PDF generator
├── requirements.txt          # Root production Python dependencies
├── start.bat                 # One-click Windows development startup script
└── README.md                 # Complete project documentation
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Firebase Project**: Service account credentials JSON.

### One-Click Local Launch (Windows)
Double-click `start.bat` or execute in your terminal:
```cmd
start.bat
```
This script automatically provisions the virtual environment, installs requirements, and launches the API at `http://127.0.0.1:5000`.

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

# Install dependencies
pip install -r backend/requirements.txt

# Ensure your firebase_key.json is placed in backend/ and root
# Run Flask Server
python server.py
```

#### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 📡 REST API Reference

| Method | Endpoint | Role Access | Description |
|---|---|---|---|
| `POST` | `/api/users/login` | Public | Authenticate user & issue signed JWT Bearer token |
| `POST` | `/api/users/register` | Public | Register new student or volunteer account |
| `GET` | `/api/users/me` | Authenticated | Validate session and retrieve profile info |
| `GET` | `/api/users` | Authenticated | Fetch list of registered user accounts |
| `PUT` | `/api/users/<email>` | Admin | Update user information, role, or credentials |
| `DELETE` | `/api/users/<email>` | Admin | Permanently delete user account |
| `GET` | `/api/attendance` | Authenticated | Fetch student & volunteer session attendance |
| `POST` | `/api/attendance` | Volunteer / Admin | Log check-in / check-out records |
| `GET` | `/api/announcements` | Authenticated | Fetch active announcements & comment threads |
| `POST` | `/api/announcements` | Volunteer / Admin | Publish new announcement with FCM push notifications |
| `GET` | `/api/scholarships` | Authenticated | Retrieve active scholarship directory |
| `POST` | `/api/scholarships` | Admin | Create or update scholarship listing |
| `POST` | `/api/shop/buy` | Student | Redeem academic points for cosmetic borders |
| `POST` | `/api/shop/equip` | Student | Equip unlocked avatar border |
| `POST` | `/api/generate_pdf` | Admin | Generate and download student progress PDF |

---

## 🧪 Testing & Verification

The platform includes an automated multi-suite test script verifying authentication, RBAC boundaries, SSRF defenses, shop economics, and PWA shells:

```bash
python backend/scripts/comprehensive_test_suite.py
```

```
============================================================
       SHORE WEB APP COMPREHENSIVE TEST SUITE
============================================================
[*] Running: Login with Invalid Credentials (401)... PASSED
[*] Running: User Upsert & Valid Login Flow... PASSED
[*] Running: PIN Password Reset Security... PASSED
[*] Running: Attendance Invalid Time Out Validation... PASSED
[*] Running: Attendance Full Workflow (In & Out)... PASSED
[*] Running: Scholarships CRUD & AI Auto-Parser... PASSED
[*] Running: Announcements, Comments & FCM Read Tracking... PASSED
[*] Running: Recitations Participation & Scoring... PASSED
[*] Running: Support Tickets Validation & Resolution... PASSED
[*] Running: Shop Coin Balance Enforcement & Purchase Security... PASSED
[*] Running: PDF Report Generator Validation... PASSED
[*] Running: Security: Boundary & Injection Resilience... PASSED
[*] Running: Security: Server-Side Request Forgery (SSRF) Defense... PASSED
[*] Running: Security: Modern HTTP Security Headers Enforcement... PASSED
[*] Running: Security: JWT Token Generation & RBAC 403 Enforcement... PASSED
[*] Running: PWA: Web App Manifest & Service Worker Shell Delivery... PASSED
============================================================
RESULTS: 16/16 PASSED (100.0%) | 0 FAILED
============================================================
```

---

## 🚀 Deployment

### Backend (Render / Railway / Cloud Run)
1. Environment Variables:
   - `FIREBASE_CREDENTIALS`: *(Raw JSON string of `firebase_key.json`)*
   - `PORT`: `5000`
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `gunicorn server:app` or `python server.py`

### Frontend (Vercel)
1. Framework Preset: **Vite**
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`

---

## 👥 Organization & Leadership

- **Head of Organization & Platform Lead**: **Alan Serios**
- **Partner Organizations**: 
  - **ISDA (IsKolar sa Dakbayan) Bulua Association**
  - **Sangguniang Kabataan (SK) of Barangay Bulua**
  - **Bulua National High School (BNHS)**
  - **Cagayan de Oro City Scholarships Program**
- **Accolades**: 🏆 *Outstanding Project in Community-Based Category — 2023 Kinanao Awards*

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

<div align="center">

*SHORE.edu — Empowering educators, scholars, and future leaders across Northern Mindanao.*

</div>
