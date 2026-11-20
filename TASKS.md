# SHORE UI Follow-Ups

- [x] Keep Profile, Tracked Scholarships, and Security & Password details collapsed until opened.
- [x] Defer Firebase Messaging until authentication and remove the unused Playfair Display request from the shared font load; signed-out pages load only the Inter and Geist Mono fonts.
- [x] Revisit the Manage Account experience with a compact overview for Profile, Attendance, Tracked Scholarships, and Security & Password. Keep summaries short, open details only on request, and route Attendance to its existing page.
- [x] Split the signed-in navigation shell and admin tracker dialog out of the signed-out startup path; the initial JS entry fell from 714.64 KB (214.68 KB gzip) to 646.10 KB (197.32 KB gzip).
- [x] Keep registration heading focus from scrolling the brand header out of view; use Title Case for auth step labels.
- [x] Tighten the first signup step so its fields, primary action, and sign-in link fit the compact local viewport without scrolling.
- [x] Review password, recovery PIN, and required onboarding preference steps at 390px phone size; preserve the no-skip flow. Login, registration steps, and all three required onboarding screens passed axe with no page scroll at 390×667.
- [x] Fix the collapsed-sidebar overlap: raise the sidebar stacking layer so calendar date labels cannot paint over the Academic Tools flyout.
- [x] Visually confirm the Academic Tools flyout on an authenticated calendar view at 1024px; the flyout stayed inside the viewport and its Attendance action opened the page.
- [x] Profile populated authenticated dashboard and account routes, reduce startup cost, and verify the route assets actually loaded. With compressed local production assets and 30 fixture students: Dashboard 92 and Accounts 96 performance, both 100 accessibility / 100 best practices. Main entry is now 414.64 KB raw / 131.16 KB gzip. These are local lab measurements, not production field scores.
- [x] Audit Accounts at 320px, 390px, 1024px, and 1365px with long names and profile data; no axe violations or horizontal overflow. Profile dialog stays within the viewport and shows the saved picture.
- [x] Exercise Manage Class and Manage Team add, duplicate prevention, edit, remove, failed-save retention, and retry flows with mocked API responses.
