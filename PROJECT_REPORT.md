# Task Manager API — Technical Assessment & Implementation Report

**Candidate:** Jenish  
**Role:** Full Stack Developer Intern  
**Repository:** [https://github.com/jenish-prog/Take-Home-Assignment-The-Untested-API](https://github.com/jenish-prog/Take-Home-Assignment-The-Untested-API)  
**Live Deployed API:** [https://take-home-assignment-the-untested-api-tin5.onrender.com/](https://take-home-assignment-the-untested-api-tin5.onrender.com/)  
**Tech Stack:** Node.js, Express, Jest, Supertest, Render Cloud  

---

## 1. Executive Summary

This report documents the testing, defect remediation, feature implementation, and cloud deployment of the Task Manager REST API. 

### Key Accomplishments:
* **100 Automated Tests:** Achieved **97.37% statement coverage** across unit and integration suites using Jest and Supertest.
* **Resolved 7 Codebase Defects:** Corrected critical bugs including pagination offset calculations, task priority corruption, substring status filtering, and calendar overflow validation.
* **Implemented New Feature:** Built `PATCH /tasks/:id/assign` with comprehensive input validation, whitespace trimming, and reassignment handling.
* **Production Hardening:** Added CORS middleware, malformed JSON handling (`400 Bad Request`), strict ISO date parsing, route collision guards, and single-task retrieval (`GET /tasks/:id`).
* **Live Deployment:** Successfully deployed on Render with an automated 27/27 live test verification pass.

---

## 2. API Endpoints Map

| Method | Endpoint | Description | Auth | Status |
|--------|----------|-------------|------|--------|
| `GET` | `/` | Service health check and endpoint directory | None | `200 OK` |
| `GET` | `/tasks` | List tasks (supports `?status=`, `?priority=`, `?assignee=`, `?search=`, `?page=`, `?limit=`) | None | `200 OK` |
| `POST` | `/tasks` | Create a new task with validation | None | `201 Created` |
| `GET` | `/tasks/:id` | Retrieve an individual task by UUID | None | `200 OK` / `404` |
| `PUT` | `/tasks/:id` | Full update of task attributes | None | `200 OK` / `404` |
| `PATCH` | `/tasks/:id` | Partial update of task attributes | None | `200 OK` / `404` |
| `PATCH` | `/tasks/:id/assign` | Assign a user to a task | None | `200 OK` / `404` |
| `PATCH` | `/tasks/:id/complete`| Mark task complete & record timestamp | None | `200 OK` / `404` |
| `DELETE`| `/tasks/:id` | Delete a task | None | `204 No Content`|
| `GET` | `/tasks/stats` | Aggregated counts (`todo`, `in_progress`, `done`, `overdue`) | None | `200 OK` |

---

## 3. Automated Test Suite & Coverage Report

The test architecture separates concerns into unit tests for business logic/validation and integration tests for HTTP request/response lifecycles.

### Coverage Summary (`npm run coverage`)

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.37 |    96.22 |    97.5 |   98.06 |                   
 src             |   83.33 |    81.81 |      75 |   83.33 | 35-36,42-43       
  app.js         |   83.33 |    81.81 |      75 |   83.33 |                   
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |    96.22 |     100 |     100 |                   
  taskService.js |     100 |    96.22 |     100 |     100 | 11,87             
 src/utils       |   96.42 |    97.26 |     100 |     100 |                   
  validators.js  |   96.42 |    97.26 |     100 |     100 | 14-17             
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       100 passed, 100 total
```

### Test Suites Structure:
1. **`tests/unit/validators.test.js` (24 tests):** Tests creation, update, and assignment schemas, non-object body rejections, whitespace trimming, and calendar overflow checks.
2. **`tests/unit/taskService.test.js` (28 tests):** Direct data layer tests for CRUD operations, pagination offset math, exact status matching, priority preservation, and read-only property protections.
3. **`tests/integration/tasks.test.js` (48 tests):** End-to-end HTTP tests with Supertest covering status codes (`200`, `201`, `204`, `400`, `404`, `405`), query parameters, search functionality, CORS headers, and OPTIONS preflight requests.

---

## 4. Bug Report & Defect Analysis

### Bug 1: Pagination Calculation Skips Page 1 (High Severity)
* **Location:** `src/services/taskService.js`
* **Defect:** Offset was calculated as `const offset = page * limit`. When `page = 1, limit = 10`, `offset = 10`, skipping items `0..9` entirely.
* **Resolution:** Changed offset formula to `(Math.max(1, page) - 1) * limit`.

### Bug 2: Task Completion Overwrites Priority to 'Medium' (Medium Severity)
* **Location:** `src/services/taskService.js`
* **Defect:** `completeTask()` hardcoded `priority: 'medium'`, corrupting existing `'high'` or `'low'` priority tasks upon completion.
* **Resolution:** Removed the priority overwrite; status updates preserve original priority.

### Bug 3: Status Filtering Uses Substring Matching (Medium Severity)
* **Location:** `src/services/taskService.js`
* **Defect:** Implemented as `t.status.includes(status)`. A query for `status=do` matched both `todo` and `done`.
* **Resolution:** Updated to strict equality `t.status === status`.

### Bug 4: Immutable Field Tampering on Updates (Medium Severity)
* **Location:** `src/services/taskService.js`
* **Defect:** `update()` spread incoming fields directly: `{ ...tasks[index], ...fields }`, allowing mutation of `id`, `createdAt`, and `completedAt`.
* **Resolution:** Explicitly stripped `id`, `createdAt`, and `completedAt` from user-supplied updates.

### Bug 5: Unhandled Malformed JSON Triggers HTTP 500 (Medium Severity)
* **Location:** `src/app.js`
* **Defect:** Sending syntax-invalid JSON triggered Express's default error handler, returning an unhandled `500 Internal Server Error`.
* **Resolution:** Added syntax error interceptor middleware returning `400 Bad Request` with `{ "error": "Malformed JSON payload" }`.

### Bug 6: Weak Date Validation with Calendar Day Overflow (Low Severity)
* **Location:** `src/utils/validators.js`
* **Defect:** Loose `Date.parse()` allowed invalid dates like `"2026/02/31"` or `"2026-02-31"`, which JavaScript automatically rolled over into March.
* **Resolution:** Implemented strict ISO-8601 regex and calendar day verification preventing month-day overflows.

### Bug 7: Route Collision on `/tasks/stats` (Low Severity)
* **Location:** `src/routes/tasks.js`
* **Defect:** Non-GET methods on `/tasks/stats` (e.g. `PUT /tasks/stats`) matched the parameterized `/:id` handler with `id = 'stats'`.
* **Resolution:** Mounted `router.all('/stats')` returning `405 Method Not Allowed` for non-GET methods.

---

## 5. New Feature Implementation: `PATCH /tasks/:id/assign`

### Endpoint Specification
* **Route:** `PATCH /tasks/:id/assign`
* **Payload:** `{ "assignee": "string" }`
* **Expected Responses:**
  * `200 OK`: Returns updated task with `assignee` set.
  * `400 Bad Request`: When body is not an object, `assignee` is missing, non-string, or empty/whitespace.
  * `404 Not Found`: When `:id` does not match an existing task.

### Design Decisions:
1. **Whitespace Trimming:** Leading and trailing spaces are trimmed (e.g., `"  Alex  "` is cleanly stored as `"Alex"`).
2. **Reassignment Support:** Tasks already assigned can be seamlessly reassigned to a new user.
3. **Empty String Rejection:** An empty string (`""` or `"   "`) returns `400 Bad Request` rather than silently clearing the assignee.
4. **Default Task Shape:** Newly created tasks initialize with `"assignee": null`.

---

## 6. Additional Production Hardening

1. **Individual Task Retrieval (`GET /tasks/:id`):** Added route allowing clients to fetch single tasks by UUID.
2. **General Partial Updates (`PATCH /tasks/:id`):** Added support for updating individual task fields without requiring full resource replacement.
3. **Automated `completedAt` Lifecycle:** Automatically populates `completedAt` with an ISO timestamp when transitioning to `status: "done"`, and resets to `null` if reopened.
4. **Advanced Query Filters (`GET /tasks`):**
   * Filter by priority: `?priority=high`
   * Filter by assignee: `?assignee=alex` (case-insensitive)
   * Keyword search: `?search=keyword` (searches across title and description)
   * Combined pagination: `?status=todo&limit=5&page=1`
5. **CORS & Preflight Headers:** Added CORS headers (`Access-Control-Allow-Origin: *`) and handled `OPTIONS` preflight requests (`204 No Content`) for web frontend integration.

---

## 7. Live Deployment & Verification

* **Deployment Platform:** Render Cloud Web Service
* **Live Root URL:** [`https://take-home-assignment-the-untested-api-tin5.onrender.com/`](https://take-home-assignment-the-untested-api-tin5.onrender.com/)

### Live Endpoint Audit Results: **27 / 27 Passed (100%)**

An automated test script executed against the live Render server verified all endpoints:
* ✅ `GET /` ➔ `200 OK` (Healthy status & endpoint directory)
* ✅ `OPTIONS /tasks` ➔ `204 No Content` (Permissive CORS headers verified)
* ✅ `POST /tasks` ➔ `400 Bad Request` (Malformed JSON, invalid dates, empty titles caught)
* ✅ `POST /tasks` ➔ `201 Created` (Valid tasks created with server defaults)
* ✅ `GET /tasks/:id` ➔ `200 OK` (Task fetched) & `404 Not Found` (Missing ID)
* ✅ `PATCH /tasks/:id/assign` ➔ `200 OK` (Assigned and trimmed)
* ✅ `PATCH /tasks/:id/complete` ➔ `200 OK` (Marked done, timestamp recorded, priority preserved)
* ✅ `PUT /tasks/:id` ➔ `200 OK` (Updated; manual `completedAt` tampering rejected)
* ✅ `GET /tasks` ➔ `200 OK` (Filtered by priority, assignee, search, and paginated)
* ✅ `GET /tasks/stats` ➔ `200 OK` (Metrics verified) & `405 Method Not Allowed` (Collision protection)
* ✅ `DELETE /tasks/:id` ➔ `204 No Content` & subsequent re-fetch returns `404 Not Found`

---

## 8. Engineering Reflection & Production Readiness

### 1. What would you test next with more time?
* **Concurrency & Mutex Locking:** Since the in-memory array is synchronously accessed, simulate rapid concurrent read/write/delete operations to ensure consistency under heavy async load.
* **Property-Based / Fuzz Testing:** Use `fast-check` to test edge-case inputs (multi-megabyte strings, unicode characters, emojis, null bytes).
* **Memory Limits & Garbage Collection:** Profile memory usage when handling 100,000+ in-memory tasks to identify potential leaks or pagination bottlenecks.

### 2. Anything that surprised you in the codebase?
* **Subtle Priority Reset:** Overwriting `priority: 'medium'` during completion was an intentional defect that only surfaced when specifically checking attribute preservation across state transitions.
* **Substring Status Filtering:** Using `.includes()` on status enums was unexpected, as status fields in REST APIs are categorical values.

### 3. Questions to ask before shipping to production:
1. **Data Persistence:** Which persistent database (e.g., PostgreSQL, MongoDB) will replace the in-memory store for multi-container deployments?
2. **Authentication & Authorization:** Who is permitted to assign or delete tasks? Should `assignee` validate against an authenticated user directory?
3. **Observability & Rate Limiting:** What rate limiting policies (`express-rate-limit`) and structured logging/telemetry tools (e.g., Winston, Pino, Datadog) should be implemented before public exposure?
