# SHORE Local UI Audit — 2026-11-19

Tools: axe-core 4.14, Playwright with installed Chrome, Lighthouse 13.6, Impeccable detector, Oxlint, and existing feature scripts. References: dequelabs/axe-core, microsoft/playwright, GoogleChrome/lighthouse, and vercel-labs/web-interface-guidelines.

## Confirmed Fixes

- Account profile controls now derive their accessible names from visible content; long names and emails pass the label-content check.
- Account role filters use 8px gaps, including 320px screens.
- Attendance, Tickets, and Recitations headings follow the document hierarchy.
- Shared page/roster spacing, green foreground contrast, sidebar controls, and roster cross-links were corrected from audit findings.

## Verification

- Production preview: 12 routes at 390×844 and 1365×768 passed axe with no horizontal page overflow. Evidence: `scratch/ui-system/final-axe-audit.json`.
- Shared UI script: 10 routes at 1440×900, 1024×768, and 390×844 passed page and inner overflow checks.
- Accounts with populated fixtures: 320, 390, 1024, and 1365px passed axe; the profile dialog remained within the viewport and included a saved picture.
- Manage Class and Manage Team: duplicate prevention, add/edit/remove, failed-save input retention, and retry passed with mocked API responses.
- Registration and required onboarding: 390×667 passed axe and fit without page scrolling using the tested fixture choices.
- Calendar collapsed Academic Tools flyout: visually inspected at 1024px; no calendar labels painted over it, and Attendance navigation worked.
- Oxlint, production build, calendar/attendance/tracker scripts, backend Python compilation, and local backend HTTP smoke checks passed.

These browser flows use mocked API data. They do not prove production database writes, physical-device behavior, all populated states, or complete WCAG compliance.

## Remaining Priorities

1. Performance baseline: local signed-out production mobile Lighthouse originally scored **83 performance / 100 accessibility / 100 best practices**. Follow-up results below supersede this baseline. Monitor deployed field data separately.
2. Startup and Lottie warnings have been addressed: main entry is now 414.64 KB minified / 131.16 KB gzip, and the expression-free SVG player removes the Lottie `eval` warning. Final build has no oversized-chunk warning.
3. Design-system drift: review Settings custom spacing and undefined semantic aliases in shared button/card variants before reusing those variants.
4. Impeccable flagged the named Nebula avatar cosmetic's purple gradient. It is intentional cosmetic content, so the warning does not justify changing the app palette or removing that cosmetic.

No commit, push, production account, calendar, or database mutation was performed by this audit.

## Performance Follow-Up

The first optimized local mobile run scored **90 performance / 100 accessibility / 100 best practices**, with 3.4s LCP, 60ms total blocking time, and zero layout shift. Report: `C:/Users/Alan Serios/Downloads/SHORE_UI_Audit_Tools/reports/lighthouse-fonts-optimized.json`.

- Self-hosted the existing Inter and Geist Mono variable fonts, with font licenses, and preloaded Inter. Removed the blocking Google Fonts stylesheet.
- Used the installed Zod v3-compatible schema entry for existing auth validation. Main JS declined from 645.81 KB to 623.68 KB raw. Existing registration/onboarding browser checks passed.
- Hidden desktop auth imagery selects a tiny resource on phones; the first desktop image appears without a fade-in and honors reduced motion on changes.
- Shared buttons use explicit transition properties and a restrained 0.97 press state only when reduced motion is off.
- Reviewed the supplied Charles Liu reel's visible animation recommendations. Directional auth steps and reduced-motion-aware errors already exist. No carousel, theme, or drag behaviors were added to screens without those interactions.

## Final Authenticated Follow-Up

- Final signed-out local production mobile run: **91 performance / 100 accessibility / 100 best practices**, 3.5s LCP and 30ms blocking time. Report: `C:/Users/Alan Serios/Downloads/SHORE_UI_Audit_Tools/reports/lighthouse-login-final.json`. The initial font-only run and this final split-entry build both improve on the original 83 baseline; individual lab runs vary.
- Local mobile Lighthouse with compressed production assets and 30 fixture students: **Dashboard 92 / Accounts 96 performance**. Both scored **100 accessibility / 100 best practices**. Each reported 0.9s LCP. Reports: `lighthouse-auth-dashboard.json` and `lighthouse-auth-accounts.json` in the audit tools' reports directory. Startup cache was cleared while preserving the fixture session. The harness verifies the visible route heading and matching route assets. Preliminary measurements from its uncompressed fixture server are not comparable and are excluded.
- Sign In is lazy-loaded, and a session-restoration state prevents flashing/downloading it when restoring a saved session. Unrelated routes no longer preload automatically; existing navigation intent preloads remain.
- Lottie fire chunk declined from 336.49 KB to 190.79 KB. The SVG light build preserves the actual fire artwork, pauses offscreen/hidden, and is absent in the reduced-motion streak state. Direct dependency is declared; installing it reconciled local node_modules to the existing lockfile (Vite 8.1.3 rather than the earlier local 8.3.8), so size differences include that reconciliation.
- Removed the streak popup's delayed reveal, global animation selectors, animated counter, and unnecessary anime import. Content and Continue are available immediately. Zero streaks receive factual copy.
- Fixed populated Dashboard heading hierarchy and accessible button names, plus selected account-filter count contrast. Permission prompts no longer run on login; existing notification opt-ins may still refresh their device token.
- Populated Dashboard and Accounts pass axe at 390px, 1024px, and 1440px, including normal/reduced motion on phones. Streak SVG rendering and open/close behavior pass; fixture network logs confirm no unrelated page or Sign In downloads on restored sessions. Evidence: `scratch/ui-system/optimized-routes-results.json` and `optimized-streak-*.png`.
- These are synthetic Chrome viewport/fixture checks. Real production latency, production database writes, physical devices, and all possible records remain outside this local verification.
