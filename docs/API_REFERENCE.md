# Internal API Specification

> **Architecture:** Hybrid Monolith (Inertia.js + Laravel)
> **Protocol:** Inter-Process Communication (via HTTP/Session)
> **Authentication:** `web` guard (Cookie/Session)

---

## 1. Page Loads (Inertia Responses)
*These endpoints deliver the Application State (HTML + Props).*

### 1.1 Kanban Board (Main Interface)
**Endpoint:** `GET /kanban`
**Response:** Inertia Page Component (`Kanban`)
**Props:**
```json
{
  "tasks": ["Array of Task objects"],
  "boards": ["Array of Board objects"],
  "activeBoard": ["Current Board object"],
  "tags": ["Array of Tag objects"]
}
```

---

## 2. State Mutators (Action Endpoints)
*These endpoints modify system state. They typically redirect back with optimistic updates.*

### 2.1 Task Operations

#### Create Task
**Endpoint:** `POST /tasks`
**Payload:**
```json
{
  "title": "Fix Login Bug",         // Required | String
  "status": "todo",                 // Required | Enum: [todo, in-progress, in-review, done]
  "priority": "high",               // Required | Enum: [low, medium, high]
  "board_id": 5,                    // Optional | Integer (Defaults to first board)
  "description": "Details...",      // Optional | String
  "due_date": "2025-12-31"          // Optional | Date
}
```

#### Update Task (Move / Edit)
**Endpoint:** `PUT /tasks/{id}`
**Usage:** Drag-and-drop persistence or content editing.
**Payload:** (Partial updates accepted)
```json
{
  "status": "done",
  "priority": "low"
}
```
*Note:* Moving to `in-progress` sets `started_at`; moving to `done` sets `completed_at`.

#### Delete Task
**Endpoint:** `DELETE /tasks/{id}`
**Response:** Redirect (302) or 204 No Content (if JSON requested).

#### Archive / Restore Task
**Endpoint:** `POST /tasks/{id}/archive`
**Usage:** Toggles `archived_at` timestamp on a single task.

#### Bulk Archive Done Tasks
**Endpoint:** `POST /boards/{board}/archive-done`
**Usage:** Sets `archived_at` on all unarchived `done` tasks belonging to `{board}`.

### 2.2 Board Operations

#### Create Board
**Endpoint:** `POST /boards`
**Payload:** `{"title": "New Board", "theme_color": "#FF0000"}`

#### Rename / Update Board
**Endpoint:** `PUT /boards/{id}`
**Payload:** `{"title": "Updated Board Title", "theme_color": "#10B981"}`

#### Delete Board
**Endpoint:** `DELETE /boards/{id}`
**Constraint:** Requires board ownership (`403` otherwise).

---

## 3. AJAX & Export Endpoints
*Pure JSON / Stream endpoints for dynamic client-side fetching and backups.*

### 3.1 Task Activities
**Endpoint:** `GET /tasks/{id}/activities`
**Response:** JSON Array of activity logs (coalesced within 5-minute windows for rapid autosaves).

### 3.2 Cross-Board Search
**Endpoint:** `GET /search/tasks?q={keyword}`
**Response:** JSON Array of up to 25 matching tasks across all boards owned by the authenticated user.

### 3.3 Data Export (CSV / JSON)
**Endpoint:** `GET /export/tasks?format=csv|json&board_id={optional}`
**Response:** Downloadable attachment (`taratask-export-YYYY-MM-DD.csv` or `.json`) with CSV formula-injection sanitization.

---

## 4. Error Handling

**Validation (422):** Returns Inertia error bag (shared props).
**Authorization (403):** Returns `abort(403)` if accessing unauthorized board/task.
**Authentication (401):** Redirects to `/login`.
