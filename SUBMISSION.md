# Submission Notes — The Untested API

## Summary of Deliverables

1. **Comprehensive Test Suite & High Coverage:**
   - **100 automated tests** implemented across unit and integration suites using Jest and Supertest.
   - **97.37% Statement Coverage**, **96.22% Branch Coverage**, **98.06% Line Coverage** (surpassing the 80% requirement).
   - Test suites:
     - [`task-api/tests/unit/validators.test.js`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/tests/unit/validators.test.js): Schema validation, type checks, whitespace trimming, non-object body checks, and strict ISO-8601 calendar overflow validation.
     - [`task-api/tests/unit/taskService.test.js`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/tests/unit/taskService.test.js): Business logic, CRUD operations, pagination offsets, exact status filtering, priority preservation, assignment, and immutable lifecycle protection (`completedAt`, `id`, `createdAt`).
     - [`task-api/tests/integration/tasks.test.js`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/tests/integration/tasks.test.js): End-to-end HTTP route tests with Supertest covering happy paths, edge cases, combined filtering/pagination, `GET /tasks/:id`, `PATCH /tasks/:id`, CORS headers, OPTIONS preflight, and 400 Bad Request error handling.

### Test Coverage Output

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

---

## Part A: Bug Report

A dedicated, in-depth bug report is documented in [**`BUG_REPORT.md`**](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/BUG_REPORT.md).

Key defects documented:
1. **BUG-01 (High):** `getPaginated` calculated `offset = page * limit`, causing Page 1 to skip items `0..limit-1` entirely.
2. **BUG-02 (Medium):** `completeTask` hardcoded `priority: 'medium'`, erasing existing priorities upon completion.
3. **BUG-03 (Medium):** `getByStatus` used `.includes(status)`, matching substrings (e.g., `'do'` matched `'todo'` and `'done'`).
4. **BUG-04 (Medium):** `update` blindly merged payload fields, allowing mutation of immutable `id` and `createdAt` properties.
5. **BUG-05 (Low):** `routes/tasks.js` prioritized `?status=` and returned early, discarding pagination parameters when combined.
6. **BUG-06 (Low):** `README.md` documented statuses as `pending | in-progress | completed`, conflicting with code validation (`todo | in_progress | done`).

---

## Part B: Fixes & Hardening Implemented

1. **Fixed Pagination Off-by-One (`taskService.js`):**
   Changed `offset = page * limit` to `(Math.max(1, page) - 1) * limit`, properly indexing page 1 to start from item index 0.
2. **Preserved Priority on Completion (`taskService.js`):**
   Removed the hardcoded `priority: 'medium'` assignment when completing a task so existing priority remains intact.
3. **Exact Status Match (`taskService.js`):**
   Replaced `.includes(status)` with exact comparison `t.status === status`.
4. **Protected Immutable Fields (`taskService.js`):**
   Filtered out `id`, `createdAt`, and `completedAt` in `update` so callers cannot overwrite system-generated identifiers or lifecycle timestamps.
5. **Combined Status Filtering and Pagination (`routes/tasks.js` & `taskService.js`):**
   Updated `getPaginated` and `queryTasks` to combine status filtering with pagination.
6. **Added Individual Task Retrieval (`GET /tasks/:id`):**
   Implemented `GET /tasks/:id` to fetch tasks by ID with 200/404 responses.
7. **Added General Partial Updates (`PATCH /tasks/:id`):**
   Supported partial updates across arbitrary fields on existing tasks with validation.
8. **Automated `completedAt` on Updates (`taskService.js`):**
   Whenever a task's status transitions to `'done'` via `PUT` or `PATCH`, `completedAt` is automatically populated with the current ISO timestamp, and cleared if reopened.
9. **Handled Malformed JSON Payloads (`app.js`):**
   Invalid JSON requests now return HTTP `400 Bad Request` (`Malformed JSON payload`) instead of unhandled `500 Internal Server Error`.
10. **Prevented `/tasks/stats` Route Collisions:**
    Mounted `router.all('/stats')` returning `405 Method Not Allowed` for non-GET methods to prevent collision with parameterized `/:id` handlers.
11. **Supported Multi-Filter Search (`GET /tasks`):**
    Added query support for `?priority=`, `?assignee=`, and text search `?search=`.
12. **Strict ISO-8601 & Calendar Overflow Prevention (`validators.js`):**
    Enforced strict date validation checking for valid calendar days (e.g. rejecting non-existent dates like `2026/02/31` or `2026-02-31`).
13. **CORS Headers & OPTIONS Preflight (`app.js`):**
    Configured permissive CORS headers and handled OPTIONS preflight requests (`204 No Content`) for web clients.



---

## Part C: New Feature — `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Path:** `PATCH /tasks/:id/assign`
- **Request Body:** `{ "assignee": "string" }`
- **Responses:**
  - `200 OK`: Returns the updated task with `assignee` set.
  - `400 Bad Request`: When body is not an object, `assignee` is missing, is non-string, or is empty/whitespace.
  - `404 Not Found`: When `:id` does not match an existing task.

### Design Decisions:
- **Empty / Whitespace validation:** Assigning an empty or whitespace string is rejected with a `400 Bad Request` (`'assignee must be a non-empty string'`).
- **Trimming:** Valid string names with surrounding whitespace (e.g., `"  Alice  "`) are trimmed to cleanly store `"Alice"`.
- **Reassignment:** If a task already has an assignee, submitting a new assignee smoothly reassigns the task and replaces the previous name.
- **Default Task Shape:** The `create()` method now initializes tasks with `assignee: null` by default.

---

## Reflection & Submission Questions

### 1. What would you test next if you had more time?
- **Concurrency & Race Conditions:** Because the data store is an in-memory array modified synchronously, testing simultaneous async requests under heavy concurrent load (e.g. concurrent deletes and pagination or simultaneous updates to the same task).
- **Fuzz & Property-Based Testing:** Using a tool like `fast-check` to test edge-case inputs for titles (emoji, Unicode, massive multi-megabyte payloads, null bytes) and malformed query strings.
- **Advanced Sorting & Filtering:** Adding multi-attribute sorting (e.g. by `priority` or `dueDate`) and date-range filters (`dueBefore`, `dueAfter`).
- **Date Boundary Tests:** Testing leap years, daylight saving time shifts, and timezone offsets in `dueDate` comparisons against `new Date()`.

### 2. Anything that surprised you in the codebase?
- **Intentional Subtle Bugs:** The `priority: 'medium'` reset inside `completeTask` was particularly sneaky — it would only surface when an engineer explicitly checked whether metadata survives a state transition.
- **Substring Filtering:** Using `.includes()` on status was surprising because status values in REST APIs are categorical enums.
- **Specification Divergence:** The `README.md` listing `pending | in-progress | completed` while the code and `ASSIGNMENT.md` enforced `todo | in_progress | done`.

### 3. Any questions you'd ask before shipping this to production?
- **Persistence & Scaling:** How will tasks be persisted across server restarts and multi-instance deployments (e.g., PostgreSQL, MongoDB, Redis)?
- **Authentication & User Validation:** Who can create/edit/assign tasks? Should the `assignee` field validate against a real user directory/ID rather than accepting arbitrary strings?
- **Production Hardening:** Are we adding rate limiting (`express-rate-limit`), security headers (`helmet`), CORS configuration, and structured request logging (e.g., Pino/Winston)?
- **API Versioning:** Should routes be prefixed with `/api/v1` before publishing to external consumers?
