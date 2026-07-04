# Mobile Navigation & Feature Parity Design

## 1. Goal
Restore 100% feature parity to the mobile layout of the SHORE Web App without cluttering the UI. Fix the vertical scroll issue on the Calendar view.

## 2. Approach: The "Menu" Tab
Instead of a hamburger drawer, we will implement a "Menu" tab in the Mobile Bottom Navigation Bar.
- The 4 bottom nav items will be: Dashboard, Announcements, Calendar, Menu.
- Tapping "Menu" will display a full-screen view (`MobileMenuView.jsx` or inline in `App.jsx`).

## 3. The Menu View Component
The Menu View will contain:
- **Header Section**: Profile Picture, User Name (e.g. Admin or Email), Role, and a "Sign Out" button.
- **Tools Grid**: A 2-column or 1-column list of all tools that the user has access to based on their role:
  - Attendance
  - Leaderboard
  - Recitations (Admin)
  - Scholarships
  - Reports (Admin)
  - Manage Class (Admin)
  - Manage Team (Admin)
  - Accounts (Admin)
  - Settings (moved from the bottom nav)

## 4. Calendar Scroll Fix
- In `CalendarView.jsx`, the current wrapper has `overflow-y-hidden` which traps vertical scrolling.
- We will replace `overflow-y-hidden` with `overflow-y-auto`, and add `-webkit-overflow-scrolling: touch` properties if necessary (or just let Tailwind's `overflow-y-auto` do its job).
- Ensure the overall page height isn't forcefully clipped to `h-screen` in a way that prevents the calendar grid from scrolling its internal rows.

## 5. Security & Consistency
- Non-admin users will only see the tools permitted by their role in the Menu Grid.
- The "Sign Out" functionality will clear the auth token and redirect to `/login`.
