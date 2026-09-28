# Bug Report — The Untested API

This document details the bugs and edge-case defects identified during the exploratory review and test suite execution of the Task Manager API codebase.

---

## Summary of Identified Bugs

| ID | Location | Severity | Summary | Status |
|----|----------|----------|---------|--------|
| BUG-01 | `src/services/taskService.js:12` | **High** | Pagination calculation skips the first page (`offset = page * limit`) | **Fixed** |
| BUG-02 | `src/services/taskService.js:69` | **Medium** | Marking a task complete overwrites its priority to `'medium'` | **Fixed** |
| BUG-03 | `src/services/taskService.js:9` | **Medium** | Status filtering uses substring matching (`.includes()`) instead of exact equality | **Fixed** |
| BUG-04 | `src/services/taskService.js:50` | **Medium** | `update` permits overwriting immutable fields (`id`, `createdAt`) | **Fixed** |
| BUG-05 | `src/routes/tasks.js:14-24` | **Low** | Query parameter conflict: combining `?status=` with `?page=` ignores pagination | **Fixed** |
| BUG-06 | `README.md:77` vs `src/utils/validators.js:1` | **Low** | Documentation specifies `pending/in-progress/completed` while code implements `todo/in_progress/done` | **Fixed** |

---

## Detailed Bug Reports

### BUG-01: Pagination Off-By-One Skips Page 1

- **Location:** [`src/services/taskService.js:11-14`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L11-L14)
- **Severity:** High
- **Expected Behavior:**
  When querying page 1 with limit 10 (`page=1, limit=10`), the API should return items at indices 0 through 9 (the first 10 items). The offset for 1-indexed pagination is `(page - 1) * limit`.
- **Actual Behavior:**
  The calculation is implemented as:
  ```javascript
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
  ```
  For `page = 1` and `limit = 10`, `offset` is calculated as `1 * 10 = 10`. The first 10 tasks (index 0 to 9) are completely skipped, returning tasks from index 10 onward. Page 1 behaves as Page 2.
- **How It Was Discovered:**
  Unit test `getPaginated › returns the first page of items when page=1` failed. Instead of returning `Task 1` and `Task 2`, it returned `Task 3`.
- **Recommended Fix:**
  Ensure 1-indexed pagination calculates offset using `(Math.max(page, 1) - 1) * limit`:
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

### BUG-02: `completeTask` Unconditionally Resets Task Priority to `'medium'`

- **Location:** [`src/services/taskService.js:67-72`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L67-L72)
- **Severity:** Medium
- **Expected Behavior:**
  Marking a task complete (`PATCH /tasks/:id/complete`) should update the task's `status` to `'done'` and set `completedAt` to the current ISO timestamp, preserving the task's existing `priority` ('high', 'low', etc.).
- **Actual Behavior:**
  `completeTask` explicitly overrides `priority: 'medium'`:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
  Any task previously set to `'high'` or `'low'` priority is silently corrupted to `'medium'` upon completion.
- **How It Was Discovered:**
  Unit test `completeTask › preserves existing task priority when completing task` failed with:
  `Expected: "high", Received: "medium"`.
- **Recommended Fix:**
  Remove `priority: 'medium'` from the updated object:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

### BUG-03: `getByStatus` Uses Substring Matching Instead of Exact Match

- **Location:** [`src/services/taskService.js:9`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L9)
- **Severity:** Medium
- **Expected Behavior:**
  Filtering tasks by status should match only tasks whose status is identical to the target status (`t.status === status`).
- **Actual Behavior:**
  Filtering is implemented with `.includes()`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
  Passing `status=do` returns tasks with status `'todo'` AND status `'done'`.
- **How It Was Discovered:**
  Unit test `getByStatus › should match status exactly rather than substring` failed, returning 2 tasks instead of an empty array.
- **Recommended Fix:**
  Change to exact equality:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### BUG-04: `update` Allows Mutating Immutable Fields (`id`, `createdAt`)

- **Location:** [`src/services/taskService.js:50`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/services/taskService.js#L50)
- **Severity:** Medium
- **Expected Behavior:**
  A task's primary identifier (`id`) and audit timestamp (`createdAt`) should remain immutable once created.
- **Actual Behavior:**
  `update` blindly spreads the incoming `fields` over the task:
  ```javascript
  const updated = { ...tasks[index], ...fields };
  ```
  If a caller supplies `{ "id": "custom-uuid", "createdAt": "fake-date" }`, the system will overwrite these system fields.
- **How It Was Discovered:**
  Code review of `update` and `validateUpdateTask`.
- **Recommended Fix:**
  Destructure and filter allowed fields in `update` or strip `id` and `createdAt` before updating:
  ```javascript
  const { id: _, createdAt: __, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```

---

### BUG-05: Query Parameter Precedence Drops Pagination on Filtered Queries

- **Location:** [`src/routes/tasks.js:14-24`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/routes/tasks.js#L14-L24)
- **Severity:** Low
- **Status:** Fixed
- **Expected Behavior:**
  When querying `GET /tasks?status=todo&page=1&limit=5`, the API should filter by status *and* paginate the filtered result set.
- **Actual Behavior:**
  The `if (status)` check immediately returns `taskService.getByStatus(status)` before the pagination block can execute. Pagination parameters are silently discarded whenever `status` is provided.
- **How It Was Discovered:**
  Route inspection in `routes/tasks.js`.
- **Recommended Fix:**
  Apply filters and pagination sequentially or pass query options into a unified `getTasks({ status, page, limit })` service method.
- **Implemented Fix:**
  Updated `taskService.getPaginated(page, limit, status)` to accept an optional status filter, and updated `routes/tasks.js` to execute pagination with the status filter when `page` or `limit` is provided.

---

### BUG-06: Documentation Mismatch on Valid Statuses

- **Location:** [`README.md:77`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/README.md#L77) vs [`src/utils/validators.js:1`](file:///Users/jenish112005gmail.com/Documents/assignment/Take-Home-Assignment-The-Untested-API/task-api/src/utils/validators.js#L1)
- **Severity:** Low
- **Status:** Fixed
- **Expected Behavior:**
  API documentation and schema validation should define consistent status enums.
- **Actual Behavior:**
  `README.md` lists `"status": "pending | in-progress | completed"`, while `ASSIGNMENT.md`, `validators.js`, and `taskService.js` use `"todo | in_progress | done"`. Attempting to use the documented `README` statuses results in a 400 validation error.
- **How It Was Discovered:**
  Cross-referencing `README.md` with `validators.js`.
- **Recommended Fix:**
  Update `README.md` to match the canonical codebase enums (`todo`, `in_progress`, `done`).
- **Implemented Fix:**
  Updated `README.md` with canonical enums (`todo | in_progress | done`), included `assignee` in the documented task schema, and updated sample curl queries.
