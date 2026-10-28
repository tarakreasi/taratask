# System Change Log

> **Audit Trail:** Usage of `[ADDED]`, `[CHANGED]`, `[FIXED]`, `[REMOVED]` tags is mandatory.

---

## [v2.1.0] - Personal Workflow, Autosave & Zero-Trust Hardening (2026-10-28)

### [ADDED]
*   **Quick Braindump Capture (`/capture`):** Mobile-first, zero-pressure task intake page with automatic bullet-to-subtask parsing (`- ` / `* `) and `localStorage` draft protection.
*   **Smart Autosave & Activity Coalescing:** Debounced (`650ms`) autosave in `TaskModal` with live status indicator (`Saving...` -> `Autosaved`) and 5-minute server-side activity log coalescing to prevent audit log spam.
*   **Task Archival Engine:** Non-destructive archival (`archived_at`), bulk `POST /boards/{board}/archive-done`, and archive visibility toggle.
*   **Recurring Tasks & Due Date Alerts:** Automatic next-cycle task spawning (`monthly`, `quarterly`, `yearly`) when moving tasks to `done`, plus visual urgency badges on cards.
*   **Subtasks Checklist:** JSON-backed `subtasks` checklist inside each task card with completion progress bar (`done/total`).
*   **Global Server-Side Search & Data Export:** Cross-board search (`GET /search/tasks`) integrated into Command Palette (`Ctrl+K`) and full `CSV`/`JSON` export (`GET /export/tasks`).
*   **Inline Board Renaming:** Direct inline board title editing from the sidebar (`PUT /boards/{board}`).
*   **CI/CD Pipeline:** GitHub Actions workflow (`.github/workflows/ci.yml`) validating TypeScript, Vite production manifest build, and 78 PHPUnit tests (`259 assertions`).

### [CHANGED]
*   **Codebase Hygiene:** Consolidated React components into `resources/js/components/`, removed legacy Next.js prototype artifacts, and modernized all PHPUnit tests to PHP 8 `#[Test]` attributes.
*   **Authentication & Zero-Trust Security:** Configured single-operator username login (`twantoro`), disabled public `/register` and `/forgot-password` routes, enforced strict IDOR ownership checks across all controllers, whitelisted SQL `ORDER BY` parameters, and sanitized CSV exports against formula injection.

---

## [v2.0.0] - Refactoring Sprints

### [CHANGED]
*   **Documentation Architecture:** Complete rewrite of `/docs` to align with "Engineer's Journey" narrative.
*   **Core Metaphors:** Adopted "Circuit Board" logic for Architecture and "SOP" style for Guides.
*   **Networking:** Standardized development ports to `8000` (Laravel) and `5173` (Vite).

### [REMOVED]
*   **Non-Technical Fluff:** Removed marketing language and excessive emojis from all documentation.
*   **Ambiguity:** Replaced vague "future plans" with concrete Roadmap items.

---

## [v1.2.0] - The Productivity Update (2025-12-21)

### [ADDED]
*   **Multi-Board System:** Support for multiple context switches (Work/Personal).
*   **Analytics Engine:** Cycle Time and WIP calculations.
*   **Dark Mode:** Native system-preference support.

---

## [v1.0.0] - Initial Release (2025-07-20)

### [ADDED]
*   **Core System:** Laravel 12 + Inertia + React 19 stack.
*   **Interaction:** `@dnd-kit` implementation for Kanban logic.
*   **Database:** SQLite schema integration.
