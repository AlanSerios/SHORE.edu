@C:\Users\Alan Serios\.codex\RTK.md

# SHORE Agent Workflow

- Work in `frontend/`; mirror backend edits in both `server.py` and `backend/server.py`. Never modify archives.
- Preserve existing user changes. Inspect relevant code and current UI before editing; use `rg` first.
- For UI work, read and apply the smallest useful set: `ui-taste`, `ui-ux-pro-max`, and `impeccable`. Use `systematic-debugging` for broken behavior. Use `caveman`/`caveman-review` when requested.
- Plan briefly: identify the real problem, affected files, responsive states, behavior, and verification. Then implement without unnecessary questions.
- Prefer the existing design system and dependencies. Keep layouts calm, accessible, responsive, and consistent; avoid decorative clutter and new libraries unless required.
- Test behavior, not only appearance. Verify desktop, laptop, and 390px mobile; include loading, empty, error, and retry states.
- Before finishing, run targeted lint, frontend build, relevant browser scripts, `python -m py_compile server.py backend/server.py`, and a server startup/import smoke test. Run Impeccable detection once after UI work.
- Fix evidence-backed failures only. Report results, remaining warnings, and key files concisely.
- Do not use subagents unless the user explicitly requests delegation.
