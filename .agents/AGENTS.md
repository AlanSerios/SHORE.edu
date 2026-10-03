### Responsive Design & Feature Parity
- **Never Drop Features for Mobile:** When adapting a desktop UI to mobile, absolutely DO NOT remove application features, navigation routes, or user controls just to save space. Mobile users must have 100% feature parity with desktop users.
- **Handling Overflowing Navigation:** If a desktop sidebar contains too many items to fit in a Mobile Bottom Navigation Bar (which comfortably holds max 4-5 items), you MUST implement a "Hamburger Menu / Drawer" or a "More Tools" tab to house the remaining items.
- **Touch Scrolling:** When building grids, tables, or calendars, always ensure they are scrollable on touch devices (avoid trapping them in `overflow-hidden` containers).

### Project Structure (SHORE Web App)
- **Active Frontend:** `frontend/` — React + Vite + Tailwind CSS
- **Active Backend:** `server.py` (root, deployed to Render) and `backend/server.py` (local copy)
- **Backend Files:** `backend/` contains local copies of all Python files + `venv/`
- **Scripts:** `backend/scripts/` contains one-off utility scripts
- **Legacy/Archive:** `archive/` and `SHORE.edu/` contain older versions (do not modify)
- **Separate App:** `KABAWv2/` is a completely different weather/map app (do not modify unless asked)

### Active Components (frontend/src/components/)
AccountsView, AnnouncementsView, AttendanceAdminView, AttendanceStudentView, AvatarBorder,
CalendarView, LeaderboardView, LoginPage, ManageClassView, ManageTeamView, OMRScannerView,
RecitationsAdminView, ReportsView, ScholarshipsView, SettingsView, ShopView, TicketsView

### Backend API (server.py — Firebase Realtime Database)
Uses Firebase Admin SDK. All data goes to Firebase, NOT local JSON files.
When adding new API routes, add them to BOTH `server.py` (root) AND `backend/server.py`.
