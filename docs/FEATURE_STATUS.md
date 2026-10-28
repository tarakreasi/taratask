# Feature Validation Matrix

**Version Ref:** 2.1.0
**Validation Date:** October 28, 2026

---

## 1. Core Logic

| Metric | Status | Verification |
|--------|--------|--------------|
| **Task Management & Subtasks** | Operational | CRUD, subtasks checklist, and recurring auto-renewal verified via PHPUnit. |
| **Smart Autosave** | Operational | Debounced (`650ms`) PUT updates + 5-minute activity log coalescing verified. |
| **Cross-Board Search & Export** | Operational | Server-side `/search/tasks` (`Ctrl+K`) and sanitized CSV/JSON `/export/tasks` verified. |
| **Task Archival** | Operational | Single & bulk `Done` archival (`archived_at`) and restore flow verified. |
| **Cycle Logic & Recurring** | Operational | Start/End timestamps and `monthly`/`quarterly`/`yearly` renewal verified. |

---

## 2. Interface System

| Component | Status | Verification |
|-----------|--------|--------------|
| **Multi-Board & Inline Rename** | Operational | Context switching and sidebar inline rename verified. |
| **Quick Braindump (`/capture`)** | Operational | Mobile-first capture with `localStorage` draft persistence verified. |
| **Responsive Grid & Dark Mode** | Operational | Mobile/Desktop breakpoints and system theme preference verified. |

---

## 3. Security & Zero-Trust Posture

| Control | Status | Engineering Note |
|---------|--------|------------------|
| **Network Isolation (`ippahub`)** | Active | Caddy restricts access to Tailscale subnet `100.64.10.0/24`; external traffic redirects `302` to `tarakreasi.com`. |
| **IDOR & SQLi Hardening** | Active | Strict board ownership checks across all controllers and whitelisted sorting parameters. |
| **Single-Operator Auth** | Active | Public `/register` and `/forgot-password` routes disabled (`404`); session encryption enabled. |
| **CI/CD Gatekeeping** | Active | GitHub Actions passes `tsc --noEmit`, `vite build`, and 78 PHPUnit tests (`259 assertions`). |
