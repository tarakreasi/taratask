# Product Roadmap

**Last Updated:** October 28, 2026
**Version:** 2.1.0

---

## Vision Statement
To engineer a personal Kanban board that balances operational stability with user-centric efficiency, serving as a functional daily driver and a reference implementation of modern full-stack systems integration.

---

## 1. Development Timeline

| Phase | Milestone | Target | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Core Foundation & Codebase Hygiene | Q3 2025 – Oct 2026 | Complete |
| **Phase 2** | Personal Workflow (Archival, Recurring, Subtasks) | Oct 2026 | Complete |
| **Phase 3** | Cross-Board Search (`Ctrl+K`), CSV/JSON Export & Autosave | Oct 2026 | Complete |
| **Phase 4** | Zero-Trust Private Deployment (`ippahub` Tailscale) | Oct 2026 | Complete |
| **Phase 5** | Native Android Companion / Offline PWA | Future | Planned |

---

## 2. Phase 1: Core Foundation & Hygiene
**Status:** Complete

*   **Stack:** Laravel 12 + React 19 + Inertia.js + Tailwind CSS 4 + SQLite.
*   **Hygiene:** Unified component casing (`resources/js/components`), strict TypeScript (`tsc --noEmit` 0 errors), and GitHub Actions CI pipeline.

## 3. Phase 2: Personal Workflow Engine
**Status:** Complete

*   **Archival:** Single and bulk archival (`Archive All Done`) with restore toggle.
*   **Recurring Tasks:** Automatic `monthly`, `quarterly`, and `yearly` task renewal upon completion.
*   **Subtasks & Urgency:** Interactive checklist inside task cards with progress bar and due-date urgency badges.

## 4. Phase 3: Speed, Portability & Smart Autosave
**Status:** Complete

*   **Quick Braindump (`/capture`):** Mobile-first, zero-pressure task input directly into `To Do` with `localStorage` draft protection.
*   **Smart Autosave:** Debounced (`650ms`) modal autosave with 5-minute activity log coalescing.
*   **Search & Export:** Global server-side search (`Ctrl+K`) across all boards and formula-sanitized CSV/JSON export.

## 5. Phase 4: Zero-Trust Deployment (`task.tarakreasi.com`)
**Status:** Complete

*   **Network Isolation:** Restricted exclusively to the `ippahub` Tailscale mesh (`100.64.10.0/24`); unauthorized external traffic silently redirects to `https://tarakreasi.com`.
*   **Application Hardening:** Single-operator username auth (`twantoro`), disabled public registration/reset routes, strict IDOR checks, and encrypted HTTPS sessions.
