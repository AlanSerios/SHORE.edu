# 🌊 SHORE.edu — The Official SHORE-Skwela Platform

<div align="center">

![SHORE Logo](frontend/public/shore_logo.png)

### **Supplementary and Holistic Opportunity to Refresh One's e-Skwela**
*The Official Academic & Student Management Platform for the SHORE-Skwela Organization*

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**Registered with the National Youth Commission (NYC - YORP) & Accredited Partner of the Oro Youth Council.**

[Live Application](https://shore-backend.onrender.com) • [About SHORE-Skwela](#-about-shore-skwela) • [Track Record & Impact](#-track-record--impact) • [Features](#-core-platform-modules) • [Architecture](#-system-architecture) • [Getting Started](#-getting-started)

</div>

---

## 📖 About SHORE-Skwela

**SHORE-Skwela** (*Supplementary and Holistic Opportunity to Refresh One's e-Skwela*) is an **independent, youth-led non-profit educational organization** founded in Barangay Bulua, Cagayan de Oro City, Philippines.

Headed by college scholars and student leaders across Cagayan de Oro universities, SHORE-Skwela’s mission is to equip aspiring scholars—particularly from financially challenged backgrounds, public senior high schools, and Out-of-School Youth (OSY)—with the knowledge, mastery, and confidence to ace competitive college entrance tests (CETs) and scholarship examinations (including DOST-SEI, CHED, SM Foundation, City Scholarships, and university grants).

Rooted in the motto **"PASAR SHORE"**, the organization blends rigorous academic review with values formation, peer mentorship, and leadership development.

```
                  ┌────────────────────────────────────────┐
                  │              PASAR SHORE               │
                  │   Where Hope Meets Real Opportunity    │
                  └───────────────────┬────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
  📚 Academic Review            🤝 Peer Mentorship          💡 Values & Leadership
  • Math, Science, English      • University Scholars       • Community Service
  • Abstract Reasoning (4.0)    • 1-on-1 Consultations      • Ethical Leadership
  • Simulated Mock Exams        • College Life Navigation   • Volunteerism Culture
```

---

## 🏆 Track Record & Accolades

### 📈 Proven Impact Across Cohorts
- **100% Passing Rate**: Achieved a perfect 100% scholarship qualification rate in its first two years of operations (2021–2022).
- **83% Overall Success Rate**: Maintained an 83% multi-year success rate across 100+ scholars entering institutions such as **Xavier University (Ateneo de Cagayan)**, **USTP**, **MSU-IIT**, **Liceo de Cagayan**, and **Cagayan de Oro College**.
- **Multiple Scholarship Qualifiers**: High proportion of scholars earning simultaneous offers from national programs (DOST, CHED) and local LGU/private grants.

### 🎖️ Major Institutional Recognitions
- 🏆 **Most Outstanding Project of the Year** — Kinanao Awards 2023 *(City Scholarships Office, Cagayan de Oro)*
- 🏆 **Outstanding Emerging Youth Organization** — 2025 Kasadya Awards *(Oro Youth Council)*
- 🏆 **Outstanding City-wide Project for Social Involvement** — 2025 Kasadya Awards *(Oro Youth Council)*
- 🏆 **Most Sustainable Project** — Pinas Forward e-Bayanihan Ideathon 2023 *(Taiwan Foundation)*
- 🏛️ **National Youth Commission (NYC)**: Officially registered under the **Youth Organization Registration Program (YORP)**.

---

## 🎯 Why this Platform was Built

To scale SHORE-Skwela from manual tracking and paper logs into a data-driven, regional educational ecosystem, Head of Organization **Alan Serios** engineered the **SHORE Web Application**:

1. **Automate Assessment & Diagnostics**: Eliminate grading bottlenecks by scanning physical bubble sheets via Computer Vision (OMR) and calculating baseline vs. diagnostic score deltas ($Score_{post} - Score_{pre}$).
2. **Gamify Student Retention**: Foster consistent study habits through animated attendance streaks, recitation leaderboards, and a rewards coin economy with customizable avatar borders.
3. **Bridge the Digital Divide**: Built as an **Offline-First Progressive Web App (PWA)** with service worker caching, ensuring students in low-connectivity areas across Mindanao can access schedules, materials, and scholarship trackers with zero cellular data.
4. **Institutional Reporting**: Enable rapid PDF generation of comprehensive student report cards for parents, school administrators, and partner organizations.

---

## 🌟 Core Platform Modules

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SHORE.edu Command Center                          │
├───────────────────┬──────────────────────────────┬───────────────────────┤
│ 📊 Academic Engine │ 👥 Cohort & Student Ops      │ 🎮 Gamification & PWA │
├───────────────────┼──────────────────────────────┼───────────────────────┤
│ • Pre/Post Deltas │ • Admin & Volunteer Portals  │ • Lottie Fire Streaks │
│ • OMR Bubble Scan │ • QR Attendance Check-In     │ • Recitations Podium  │
│ • Subject Radars  │ • Real-time Announcements    │ • Rewards Avatar Shop │
│ • PDF Generator   │ • Scholarship Requirement DB │ • Offline PWA Shell   │
└───────────────────┴──────────────────────────────┴───────────────────────┘
```

### 1. 📊 Academic Analytics & Diagnostic Engine
- **Pre-Test & Post-Test Analytics**: Continuous tracking of baseline vs. post-intervention score deltas.
- **Subject Competency Radars**: Visual competence mapping across Mathematics, Science, English, and Abstract Reasoning.
- **Automated PDF Reports**: Compiles institutional progress summaries via Python ReportLab.

### 2. 📷 Optical Mark Recognition (OMR) Scanner
- **Camera & Photo Scanner**: Instant browser-based optical evaluation of printed bubble sheets for simulated mock entrance exams.

### 3. 🛡️ Attendance Engine & Milestone Streaks
- **QR & Single-Tap Check-in**: Streamlined session attendance for students and volunteer tutors.
- **Milestone Celebrations**: Dynamic Lottie flame animations tracking attendance milestones (OB, S1–S8, Midterms, Graduation).

### 4. 🏆 Live Recitations & Podium Leaderboard
- **Participation Points**: Volunteers award live points during lectures.
- **Interactive Leaderboard**: Real-time podium rankings with celebratory confetti particle effects.

### 5. 🛍️ Points Economy & Avatar Customization
- **In-App Shop**: Students redeem academic points for digital perks and cosmetic profile borders (Emerald, Neon Wave, Gold Aureole, Cyber Pulse).
- **Dynamic Avatar Frames**: Custom SVG animated rings surrounding student profile photos.

### 6. 🎓 Scholarship & Opportunity Tracker
- **Requirements Database**: Tracks deadlines, GPA prerequisites, and submission status for DOST-SEI, CHED, City Scholarships, and private grants.

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

| Layer | Technology | Purpose |
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

## 👥 Organization & Community Ecosystem

- **Head of Organization & Lead Developer**: **Alan Serios**
- **Founder**: **Crist Leyson Millare** *(Magis 18 Awardee 2024, Kinanao Exemplar Awardee 2023 & 2024)*
- **Affiliation**: Independent Youth Organization (formerly partnered with ISDA Bulua Association and SK Bulua)
- **Accreditations & Registrations**: 
  - **National Youth Commission (NYC)** — *Youth Organization Registration Program (YORP)*
  - **Oro Youth Council** — *Accredited Partner Organization*
- **Key Community & Educational Partners**:
  - Bulua National High School (BNHS)
  - City Education Development Office (CEDO)
  - ISDA Iponan Association
  - StudyCo
  - CDO Golden Eagles Club, Virginia Inc., Estenzo Images, Tabang Sikad, Balaod Mindanao, 3Zero Club Philippines

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

<div align="center">

*PASAR SHORE — Raising our sail to reclaim, rebuild, and reimagine education across Cagayan de Oro and Northern Mindanao.*

</div>
