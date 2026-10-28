# Quality Control (QC) Protocol

> **Philosophy:** "Testing is not an 'optional step'. It is the difference between a prototype and a product."
> **Standard:** Zero Tolerance for Critical Failures.

---

## 1. Automated Test Suite (CI/CD & Local)
*Verifying individual components and full-stack feature flows.*

**Tools:** PHPUnit 11 (`#[Test]` attributes), TypeScript (`tsc --noEmit`), Vite Build
**Commands:**
```bash
npx tsc --noEmit
npx vite build
php artisan test --compact
```
**Current Coverage:** `78 passed (259 assertions)` across Unit and Feature test suites.

### Critical Checkpoints:
*   [ ] **Models:** Do `Task` and `User` models strictly enforce fillable attributes?
*   [ ] **Value Objects:** Do Service classes reject invalid inputs (e.g., negative IDs)?

---

## 2. Feature Testing (Integration Checks)
*Verifying the assembly works when powered on.*

**Command:** `php artisan test --testsuite=Feature`

### Test Scenarios:
1.  **Kanban Flow:**
    *   *Input:* User creates Task -> Drags to "In Progress".
    *   *Expected Output:* Database updates `status` and sets `started_at` timestamp.
2.  **Auth Guard:**
    *   *Input:* Unauthenticated user attempts `POST /tasks`.
    *   *Expected Output:* 401 Unauthorized / Redirect to Login.

---

## 3. Manual Verification (Pre-Flight Checklist)

Before any deployment, run this manual check sequence:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | **Login** | Redirects to Board (Dashboard). |
| 2 | **Create Task** | Appears instantly (Optimistic UI). |
| 3 | **Drag Task** | Snaps to new column. No jitter. |
| 4 | **Hard Refresh** | Data persists. |
| 5 | **Logout** | Session cookie destroyed. |
