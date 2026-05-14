# Plan: Enforce Roles & Permissions Matrix Across All Endpoints

Source of truth: `docs/roles-and-permissions.md`

---

## 1. Summary of Gaps

Cross-referencing the permission matrix against the current controller `@Roles()` decorators reveals the following mismatches:

| Endpoint | Current Guard | Required (matrix) | Gap |
|----------|---------------|-------------------|-----|
| `POST /projects` | `@Roles('manager')` | admin+ (`project:create`) | ❌ Too permissive |
| `DELETE /projects/:id` | `@Roles('manager')` | admin+ (`project:delete`) | ❌ Too permissive |
| `POST /users` | `@Roles('admin','manager')` | admin+ (`user:create`) | ❌ Too permissive |
| `PATCH /users/:id` | *(none)* | admin+ for other users (`user:update`) | ❌ Missing guard |
| `PATCH /time-entries/:id` | *(none)* | member+ (`time-entry:update`) | ❌ Missing guard |
| `DELETE /time-entries/:id` | *(none)* | admin+ (`time-entry:delete`) | ❌ Missing guard (see §3.4) |
| `POST /users/:id/roles` | `@Roles('admin')` | owner only (`role:manage`) | ❌ Too permissive |
| `DELETE /users/:id/roles/:roleId` | `@Roles('admin')` | owner only (`role:manage`) | ❌ Too permissive |
| `GET /users/:id/roles` | `@Roles('admin')` | viewer+ (`user:read`) | ❌ Too restrictive |

Endpoints NOT in the matrix (clients, files, analytics, finance, search, notifications, budget) require a **default policy decision** (§5).

---

## 2. Changes by Module

### 2.1 Identity — UserController (`src/modules/identity/presentation/controllers/user.controller.ts`)

#### `POST /users` — user:create → admin+
- **Change:** Remove `'manager'` from `@Roles('admin', 'manager')` → `@Roles('admin')`

#### `GET /users`, `GET /users/:id` — user:read → viewer+
- **Change:** No `@Roles` decorator needed; `JwtAuthGuard` alone suffices (all authenticated users qualify). Already correct — **no change required**.

#### `PATCH /users/:id` — user:update → admin+ (for other users)
- **Problem:** A user must be able to update their own profile (password, preferences), but changing another user's data is admin-only per the matrix.
- **Change:** Add service-layer check in `UsersService.update()`:
  - If `requestingUser.id === targetId` → allow (any authenticated user)
  - Otherwise → require global role ≥ admin (call `assertAdmin(user)`)
- No additional `@Roles` decorator; the split is enforced in the service.

#### `PATCH /users/:id/status` — online status (own record only)
- **Change:** Add service-layer ownership check: only the user themselves may update their own status. Currently no guard; keep it that way but add the ownership assertion.

#### `GET /users/:id/roles` — user:read → viewer+
- **Change:** Remove `@Roles('admin')` decorator. All authenticated users should be able to see role lists.

#### `POST /users/:id/roles`, `DELETE /users/:id/roles/:roleId` — role:manage → owner only
- **Change:** Replace `@Roles('admin')` with `@Roles('owner')` on both endpoints.

---

### 2.2 Organization — OrganizationController (`src/modules/organization/presentation/controllers/organization.controller.ts`)

#### `GET /organizations/:id` — organization:read → viewer+
- Currently no `@Roles` on the endpoint; all authenticated users pass. **No change required.**

#### `PATCH /organizations/:id` — organization:update → admin+
- Currently `@Roles('admin')`. **No change required.**

#### `DELETE /organizations/:id` — organization:delete → admin+
- Currently `@Roles('admin')`. **No change required.**

#### Missing: `POST /organizations` — organization:create → admin+
- The permission matrix includes `organization:create` for admin/owner.
- **Decision needed:** If a create endpoint exists or will be added, it must carry `@Roles('admin')`.

---

### 2.3 Organization — TeamController (`src/modules/organization/presentation/controllers/team.controller.ts`)

Teams are an organizational resource. The matrix does not have a `team` row; team operations map to the `organization` resource.

| Endpoint | Current | Proposed |
|----------|---------|----------|
| `POST /teams` | `@Roles('admin')` | Keep — maps to organization:create |
| `GET /teams`, `GET /teams/:id` | *(none)* | Keep — maps to organization:read (viewer+) |
| `PATCH /teams/:id` | `@Roles('manager')` | **Change to `@Roles('admin')`** — maps to organization:update |
| `DELETE /teams/:id` | `@Roles('admin')` | Keep — maps to organization:delete |
| `GET /teams/:id/members` | *(none)* | Keep — viewer+ |
| `POST /teams/:id/members` | `@Roles('manager')` | **Change to `@Roles('admin')`** — org mutation |
| `PATCH /teams/:id/members/:userId` | `@Roles('manager')` | **Change to `@Roles('admin')`** — org mutation |
| `DELETE /teams/:id/members/:userId` | `@Roles('manager')` | **Change to `@Roles('admin')`** — org mutation |

> **Note:** The team-level `assertTeamManagerOrAdmin()` service-layer check currently provides a secondary pass for team-level owners/admins. Decide whether to keep that override or remove it when tightening the guard to `admin`.

---

### 2.4 Project Management — ProjectController (`src/modules/project-management/presentation/controllers/project.controller.ts`)

| Endpoint | Current | Required | Change |
|----------|---------|----------|--------|
| `GET /projects`, `GET /projects/:id` | *(none)* | viewer+ | No change |
| `POST /projects` | `@Roles('manager')` | admin+ | **Change to `@Roles('admin')`** |
| `PATCH /projects/:id` | `@Roles('manager')` | manager+ | No change |
| `PATCH /projects/:id/pin` | *(none)* | member+ (project:update) | **Add `@Roles('member')`** |
| `DELETE /projects/:id` | `@Roles('manager')` | admin+ | **Change to `@Roles('admin')`** |
| `GET /projects/:id/members` | *(none)* | viewer+ | No change |
| `POST /projects/:id/members` | `@Roles('manager')` | admin+ | **Change to `@Roles('admin')`** |
| `DELETE /projects/:id/members/:userId` | `@Roles('manager')` | admin+ | **Change to `@Roles('admin')`** |

---

### 2.5 Project Management — TaskController (`src/modules/project-management/presentation/controllers/task.controller.ts`)

| Endpoint | Current | Required | Change |
|----------|---------|----------|--------|
| `GET /tasks`, `GET /tasks/:id` | *(none)* | viewer+ (task:read) | No change |
| `GET /tasks/:id/children`, `GET /tasks/:id/subtree` | *(none)* | viewer+ | No change |
| `POST /tasks` | `@Roles('member')` | member+ (task:create) | No change |
| `PATCH /tasks/:id` | `@Roles('member')` | member+ (task:update) | No change |
| `PATCH /tasks/:id/move` | `@Roles('member')` | member+ (task:update) | No change |
| `DELETE /tasks/:id` | `@Roles('manager')` | manager+ (task:delete) | No change |
| `GET /tasks/:id/assignees` | *(none)* | viewer+ (task:read) | No change |
| `POST /tasks/:id/assignees` | `@Roles('manager')` | manager+ (task:assign) | No change |
| `DELETE /tasks/:id/assignees/:userId` | `@Roles('manager')` | manager+ (task:assign) | No change |

**TaskFeaturesController** (participants, dependencies, checklist, comments):
- All currently `@Roles('member')`.
- Matrix classifies these under `task:update` (member+). **No changes required.**

---

### 2.6 Time Tracking

#### TimeTrackingController (`/tasks/:taskId/time/*`)

| Endpoint | Current | Required | Change |
|----------|---------|----------|--------|
| `GET /tasks/:taskId/time` | *(none)* | viewer+ (time-entry:read) | No change |
| `POST /tasks/:taskId/time/start` | `@Roles('member')` | member+ (time-entry:create) | No change |
| `POST /tasks/:taskId/time/stop` | `@Roles('member')` | member+ | No change |

#### TimeEntryController (`/time-entries`)

| Endpoint | Current | Required | Change |
|----------|---------|----------|--------|
| `POST /time-entries` | `@Roles('member')` | member+ (time-entry:create) | No change |
| `PATCH /time-entries/:id` | *(none)* | member+ (time-entry:update) | **Add `@Roles('member')`** |
| `DELETE /time-entries/:id` | *(none)* | admin+ (time-entry:delete) per matrix | **See §3.4** |

#### UserTimeController (`/users/me/time/*`)
- Currently `JwtAuthGuard` only, no `RolesGuard`.
- `GET /users/me/time` and `GET /users/me/time/active` are own-data reads → viewer+.
- **Change:** Add `RolesGuard` at class level (keeps default pass-through). No `@Roles` decorator needed since viewer is the minimum authenticated role.

#### ProjectTimeReportController, ActiveSessionsController
- `GET /projects/:id/time-report` → `@Roles('manager')`: maps to time-entry:read but is an aggregated report — manager+ is appropriate. **No change.**
- `GET /time/active` → `@Roles('manager')`: same reasoning. **No change.**

---

## 3. Edge Cases & Policy Decisions Required

### 3.1 Self-update vs. other-user update (`PATCH /users/:id`)

The matrix says `user:update` is admin-only. However, users updating their **own** profile (display name, preferences, password) should not require admin.

**Proposed rule:**
- `requestingUser.id === targetId` → allow any authenticated user
- `requestingUser.id !== targetId` → require global role ≥ admin

Implement in `UsersService.update()` via a conditional `assertAdmin()`.

### 3.2 Team-level override vs. global role restriction

`assertTeamManagerOrAdmin()` currently allows a **team-level** owner/admin to perform project and task mutations even when their **global** role is below the required level. After tightening guards to `admin` for project:create/delete and team mutations, this service-helper bypass will need re-evaluation:

**Option A:** Remove the team-level override — global role is the single source of truth.  
**Option B:** Keep the override for project:update, task CRUD (where team-level authority makes sense), but remove it for project:create/delete.

**Decision needed before implementation.**

### 3.3 Owner-exclusive `role:manage`

Tightening `POST /users/:id/roles` and `DELETE /users/:id/roles/:roleId` from `admin` to `owner` means no admin can assign or revoke roles. Confirm this is the intended design (only one owner per organization means a single person manages all role assignments).

### 3.4 `time-entry:delete` — matrix says admin+, service says own-entry or manager+

The permission matrix grants `time-entry:delete` to admin/owner only. The current service allows any user to delete their **own** time entries.

**Option A (strict matrix):** Only admin/owner may delete any time entry. Add `@Roles('admin')` to `DELETE /time-entries/:id`.  
**Option B (pragmatic):** Keep own-entry deletion for member+ but require admin+ to delete others' entries. Add `@Roles('member')` to the controller; service checks ownership and falls back to `assertAdmin()` for non-owners.

**Decision needed before implementation.**

### 3.5 Viewer role and mutation endpoints

Viewers have read-only access per the matrix. Currently there is no check preventing a viewer from reaching the `JwtAuthGuard + RolesGuard` endpoints that have **no** `@Roles` decorator (the guard passes when no metadata is set). Read endpoints are fine; confirm that no write-path endpoint is accidentally accessible to viewers by auditing every POST/PATCH/PUT/DELETE without a `@Roles` decorator.

Endpoints that currently have no `@Roles` on write operations:
- `PATCH /users/:id/status` (status update — own only)
- `PUT /users/:id/preferences` (preferences — own only)
- `PATCH /projects/:id/pin`
- All `PATCH/DELETE` in files, clients, budget (see §5)

---

## 4. Endpoints Outside the Permission Matrix

The following resources have no entry in the matrix and require a policy decision:

### 4.1 Client module (`/clients/*`)
All CRUD operations currently have no `@Roles` decorator. Proposed mapping:
- GET (read) → viewer+
- POST (create) → admin+
- PATCH (update) → manager+ or admin+
- DELETE → admin+

### 4.2 Files module (`/files/*`, `/projects/:id/files`, `/clients/:id/files`)
- Upload → member+ (creates project/client assets)
- Download/metadata → viewer+
- Delete → uploader owns their file; admin+ can delete any

### 4.3 Finance module (`/finance/*`)
- Exchange rate reads → member+ (already `@Roles('member')`) ✓
- Exchange rate mutations → admin+ (already `@Roles('admin')`) ✓
- Recalculate endpoints → admin+ (already `@Roles('admin')`) ✓
- Project recalculate → manager+ (already `@Roles('manager')`) ✓

**No changes required for finance.**

### 4.4 Analytics module (`/analytics/*`)
- General analytics → member+ (already `@Roles('member')`) ✓
- Finance analytics → manager+ (already `@Roles('manager')`) ✓

**No changes required for analytics.**

### 4.5 Budget module (`/budget`)
- `GET /budget` → currently no `@Roles`. Propose viewer+.
- `PATCH /budget/limit` → currently `@Roles('admin')` ✓

### 4.6 Search module (`GET /search`)
- Currently `JwtAuthGuard` only. Global search returns only resources the user has access to; viewer+ is fine. **Add `RolesGuard` at class level** (no `@Roles` needed, all authenticated users pass).

### 4.7 Notifications (`/notifications/*`)
- All notification endpoints are own-data only; viewer+ is correct. Currently `JwtAuthGuard` only. **Add `RolesGuard`** at class level for consistency.

---

## 5. Implementation Order

1. **Quick wins** — `@Roles` decorator changes on existing endpoints (no logic change):
   - `POST /projects` → `admin`
   - `DELETE /projects/:id` → `admin`
   - `POST /projects/:id/members`, `DELETE /projects/:id/members/:userId` → `admin`
   - `POST /users` → `admin`
   - `POST /users/:id/roles`, `DELETE /users/:id/roles/:roleId` → `owner`
   - `GET /users/:id/roles` → remove `@Roles`
   - `PATCH /time-entries/:id` → add `@Roles('member')`
   - Team mutation endpoints → `admin`

2. **Policy decisions** (§3) — agree on rules before coding:
   - Self-update rule for `PATCH /users/:id`
   - Team-level override scope
   - `time-entry:delete` rule

3. **Service-layer changes** — after policy decisions:
   - `UsersService.update()` — self vs. other-user split
   - `TimeEntryService.delete()` — own vs. other + role check

4. **Missing guards on write paths** — add `@Roles` to:
   - `PATCH /users/:id/status`, `PUT /users/:id/preferences` (no `@Roles` needed, but verify viewer cannot reach)
   - `PATCH /projects/:id/pin` → `@Roles('member')`
   - Client mutations (§4.1)
   - File uploads (§4.2)

5. **Consistency cleanup** — add `RolesGuard` (no `@Roles` decorator) to:
   - `UserTimeController`
   - `SearchController`
   - `NotificationController`
   - `ActivityLogController` (project/task activity endpoints)

6. **Tests** — for each changed endpoint, add/update e2e or integration tests covering:
   - Role below minimum → 403
   - Role at minimum → 200/201
   - Role above minimum → 200/201
   - Unauthenticated → 401

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src/modules/identity/presentation/controllers/user.controller.ts` | `POST /users` roles; remove `admin` from `GET /users/:id/roles`; `owner` for role management endpoints |
| `src/modules/identity/application/services/users.service.ts` | Self vs. other-user update assertion |
| `src/modules/organization/presentation/controllers/team.controller.ts` | Team mutation endpoints → `admin` |
| `src/modules/project-management/presentation/controllers/project.controller.ts` | project:create/delete/members → `admin`; pin → `member` |
| `src/modules/time-tracking/presentation/controllers/time-entry.controller.ts` | Add `@Roles('member')` to PATCH; resolve DELETE policy |
| `src/modules/time-tracking/presentation/controllers/user-time.controller.ts` | Add `RolesGuard` |
| `src/modules/time-tracking/application/services/time-tracking.service.ts` | Delete assertion logic (pending §3.4 decision) |
| `src/modules/search/presentation/controllers/search.controller.ts` | Add `RolesGuard` |
| `src/modules/notifications/presentation/controllers/notification.controller.ts` | Add `RolesGuard` |
| `src/shared/presentation/controllers/activity-log.controller.ts` | Add `RolesGuard` to project/task activity endpoints |
| `src/modules/client/presentation/controllers/client.controller.ts` | Add `@Roles` to mutations |
| `src/modules/files/presentation/controllers/file.controller.ts` | Add `@Roles` to upload/delete |
| `src/modules/organization/presentation/controllers/budget.controller.ts` (if exists) | Add `RolesGuard` |
