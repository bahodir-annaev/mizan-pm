# Backend Changes Plan

> Comparison of the current ArchPlan backend (archplan.md) with the frontend requirements
> (backend_plan.md), and a phased implementation plan to bridge the gap.

---

## Table of Contents

1. [Database Schema Comparison](#1-database-schema-comparison)
2. [Enum Comparison](#2-enum-comparison)
3. [Endpoint Gap Analysis](#3-endpoint-gap-analysis)
4. [Logic & Feature Gap Analysis](#4-logic--feature-gap-analysis)
5. [Architectural Decisions Required](#5-architectural-decisions-required)
6. [Implementation Plan](#6-implementation-plan)

---

## 1. Database Schema Comparison

### 1.1 New Tables Required (not in current backend)

| Table | Purpose | Frontend Source |
|-------|---------|----------------|
| **organizations** | Multi-tenancy — top-level tenant for all data | `BudgetContext`, org settings |
| **clients** | External client companies that commission projects | `Clients.tsx`, `ClientDetail.tsx` |
| **contact_persons** | People linked to a client | `ClientDetail.tsx` (contacts tab) |
| **project_members** | Per-project team membership (replaces team-only scoping) | `ProjectDetail.tsx` (members tab) |
| **task_participants** | Additional users on a task beyond primary assignee | `WorksTable.tsx`, `TaskDetailPage.tsx` |
| **task_dependencies** | Blocker/blocked relationships between tasks | `TaskDetailPage.tsx` (dependencies) |
| **checklist_items** | Simple checklist items within a task | `TaskDetailPage.tsx`, `EditableChecklistItem.tsx` |
| **comments** | User comments/discussion on tasks | `TaskDetailModal.tsx` |
| **files** | Polymorphic file attachments (project, task, client) | `ProjectDetail.tsx` (files tab) |
| **notifications** | User notification inbox | `Header.tsx` (notification bell) |

### 1.2 Existing Tables Requiring Changes

#### **users** table

| Field | Current | Frontend Needs | Action |
|-------|---------|---------------|--------|
| org_id | -- | UUID FK to organizations | **ADD** (multi-tenancy) |
| firstName + lastName | Separate columns | Single `name` column | **KEEP both** + add computed `name` or add `name` column |
| phone | -- | VARCHAR(50) | **ADD** |
| position | -- | VARCHAR(255) e.g. "Senior Architect" | **ADD** |
| department | -- | VARCHAR(255) | **ADD** |
| location | -- | VARCHAR(255) | **ADD** |
| joinDate | -- | DATE | **ADD** |
| status | -- | ENUM (working, idle, offline) | **ADD** (employee online status) |
| skills | -- | TEXT[] | **ADD** |
| performance | -- | SMALLINT (0-100) | **ADD** |
| preferences | -- | JSONB (theme, language, column configs) | **ADD** |
| lastActiveAt | lastLoginAt exists | Rename/repurpose to lastActiveAt | **MODIFY** |
| role (enum) | Separate roles/permissions tables | Frontend uses simple enum (admin/manager/member) | **DECISION**: keep RBAC tables AND add a convenience role enum, or simplify |

**Recommendation**: Keep the existing RBAC system (roles + permissions tables) since it's already built and more flexible. Add the new profile fields (phone, position, department, etc.) to the User entity. Add `org_id` for multi-tenancy. The frontend role enum (admin/manager/member) can be derived from the user's assigned roles.

#### **projects** table

| Field | Current | Frontend Needs | Action |
|-------|---------|---------------|--------|
| org_id | -- (scoped via team) | UUID FK to organizations | **ADD** |
| client_id | -- | UUID FK to clients | **ADD** |
| parent_id | -- | UUID FK to projects (sub-projects) | **ADD** |
| code | -- | VARCHAR(20) UNIQUE e.g. "PRJ-001" | **ADD** |
| priority | -- | ENUM (low, medium, high) | **ADD** |
| projectType | -- | ENUM (interior, residential, commercial) | **ADD** |
| size | -- | ENUM (small, medium, large) | **ADD** |
| complexity | -- | ENUM (low, medium, high) | **ADD** |
| areaSqm | -- | DECIMAL(10,2) | **ADD** |
| budget | -- | DECIMAL(15,2) | **ADD** |
| progress | -- | SMALLINT (0-100) | **ADD** |
| estimatedDuration | -- | VARCHAR(50) e.g. "8-10 weeks" | **ADD** |
| color | -- | VARCHAR(7) hex for sidebar | **ADD** |
| isPinned | -- | BOOLEAN | **ADD** |
| isArchived | -- | BOOLEAN | **ADD** (alternative to soft delete for archiving) |
| status enum | planning, active, on_hold, completed, archived | start, in_progress, burning, end, late | **CHANGE** enum values |

#### **tasks** table

| Field | Current | Frontend Needs | Action |
|-------|---------|---------------|--------|
| code | -- | VARCHAR(20) e.g. "TSK-045" | **ADD** |
| workType | -- | ENUM (architecture, interior_design, ...) | **ADD** |
| acceptance | -- | ENUM (pending, approved, rejected, revision) | **ADD** |
| progress | -- | SMALLINT (0-100) | **ADD** |
| completedAt | -- | TIMESTAMPTZ | **ADD** |
| estimatedHours | -- | DECIMAL(8,2) | **ADD** |
| assigneeId | Via task_assignees table | Single primary assignee FK | **ADD** (keep task_assignees for multi-assignment too) |
| status enum | todo, in_progress, in_review, done, cancelled | start, in_progress, burning, end, late, cancelled | **CHANGE** enum values |
| priority enum | low, medium, high, urgent | low, medium, high | **CHANGE** (remove urgent, or keep) |
| materializedPath | Yes | Not in frontend plan (simpler) | **KEEP** (good for performance) |
| depth | Yes | Not in frontend plan | **KEEP** |
| position → sortOrder | `position` column | `sort_order` column name | **RENAME** (cosmetic, optional) |

#### **time_entries** table

| Field | Current | Frontend Needs | Action |
|-------|---------|---------------|--------|
| projectId | -- (derived via task) | UUID FK to projects | **ADD** (direct reference for faster queries) |
| Model | start_time / end_time / duration_seconds | date / hours | **DECISION** below |
| isBillable | -- | BOOLEAN | **ADD** |
| isManual | Yes | Not in frontend plan | **KEEP** (useful internally) |

**Time Entry Model Decision**: The current backend uses a timer model (start_time, end_time, duration_seconds) which is more powerful. The frontend plan uses a simplified date+hours model. **Recommendation**: Keep the current timer model AND add support for the date+hours format. The frontend can submit `{ date, hours }` and the backend converts it to start_time/end_time internally. Add `projectId` as a direct FK for faster aggregation queries.

#### **activity_log** table

| Field | Current | Frontend Needs | Action |
|-------|---------|---------------|--------|
| org_id | -- | UUID FK to organizations | **ADD** |
| changes | `metadata` JSONB | `changes` JSONB (same concept, different name) | **KEEP** as `metadata` |

### 1.3 Tables to Keep Unchanged

| Table | Notes |
|-------|-------|
| **roles** | Keep — more flexible than frontend's simple enum |
| **permissions** | Keep — already seeded, powers RolesGuard |
| **role_permissions** | Keep |
| **user_roles** | Keep |
| **teams** | Keep — but teams become optional org structure, not the sole project-scoping mechanism |
| **team_memberships** | Keep |
| **task_assignees** | Keep — already supports multi-user assignment |

### 1.4 Summary: Schema Change Count

| Category | Count |
|----------|-------|
| New tables to create | 10 |
| Existing tables to modify | 5 |
| New columns across existing tables | ~30 |
| Enum changes | 3 |
| Tables unchanged | 7 |

---

## 2. Enum Comparison

### 2.1 Enums to Change

| Enum | Current Values | Frontend Values | Recommendation |
|------|---------------|-----------------|----------------|
| **ProjectStatus** | planning, active, on_hold, completed, archived | start, in_progress, burning, end, late | **Replace** with frontend values (frontend drives UI) |
| **TaskStatus** | todo, in_progress, in_review, done, cancelled | start, in_progress, burning, end, late, cancelled | **Replace** with frontend values |
| **TaskPriority** | low, medium, high, urgent | low, medium, high | **Keep `urgent`** — strictly additive, harmless |

### 2.2 New Enums to Create

| Enum | Values | Used By |
|------|--------|---------|
| **EmployeeStatus** | working, idle, offline | users.status |
| **ClientType** | organization, person | clients.client_type |
| **ProjectType** | interior, residential, commercial | projects.project_type |
| **ProjectSize** | small, medium, large | projects.size |
| **ComplexityLevel** | low, medium, high | projects.complexity |
| **WorkType** | architecture, interior_design, exterior_design, landscape, working_drawings, 3d_visualization, author_supervision, documentation, engineering, client_coordination | tasks.work_type |
| **AcceptanceStatus** | pending, approved, rejected, revision | tasks.acceptance |
| **UserRole** | admin, manager, member | Convenience enum (maps to RBAC roles) |

---

## 3. Endpoint Gap Analysis

### 3.1 Endpoints That Already Exist (mapped to frontend needs)

| Frontend Need | Current Endpoint | Notes |
|---------------|-----------------|-------|
| POST /auth/register | POST /auth/register | Needs org creation added |
| POST /auth/login | POST /auth/login | OK |
| POST /auth/refresh | POST /auth/refresh | OK |
| POST /auth/logout | POST /auth/logout | OK |
| GET /auth/me | GET /users/me | OK (different path) |
| POST /auth/change-password | PATCH /users/me/password | OK (different method/path) |
| GET /users | GET /users | Needs org scoping + more filters |
| GET /users/:id | GET /users/:id | Needs stats enrichment |
| PATCH /users/:id | PATCH /users/:id | Needs more fields |
| DELETE /users/:id | DELETE /users/:id | OK |
| GET /projects | GET /projects | Needs more filters |
| GET /projects/:id | GET /projects/:id | Needs stats enrichment |
| POST /projects | POST /projects | Needs new fields |
| PATCH /projects/:id | PATCH /projects/:id | Needs new fields |
| DELETE /projects/:id | DELETE /projects/:id | Change to archive behavior |
| GET /projects/:id/tasks | GET /projects/:projectId/tasks | OK |
| GET /projects/:id/tasks (tree) | GET /projects/:projectId/tasks/tree | OK |
| POST /tasks | POST /tasks | Needs new fields |
| GET /tasks/:id | GET /tasks/:id | Needs subtasks, deps, checklist |
| PATCH /tasks/:id | PATCH /tasks/:id | Needs new fields |
| DELETE /tasks/:id | DELETE /tasks/:id | OK |
| GET /tasks/:id/subtasks | GET /tasks/:id/children | OK (same concept) |
| PATCH /tasks/:id/reorder | PATCH /tasks/:id/move | OK (same concept) |
| POST /time-entries | POST /time-entries | OK |
| PATCH /time-entries/:id | PATCH /time-entries/:id | OK |
| DELETE /time-entries/:id | DELETE /time-entries/:id | OK |
| POST /time-entries/start | POST /tasks/:taskId/time/start | Different path structure |
| POST /time-entries/stop | POST /tasks/:taskId/time/stop | Different path structure |
| GET /projects/:id/activity | GET /projects/:id/activity | OK |
| GET /tasks/:id/activity | GET /tasks/:id/activity | OK |
| GET /activity (global) | GET /activity | OK |

### 3.2 New Endpoints Required

#### Clients Module (~12 endpoints) — **ENTIRELY NEW**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /clients | List clients (search, group, filters) |
| GET | /clients/:id | Get client with contacts + project count |
| POST | /clients | Create client |
| PATCH | /clients/:id | Update client |
| DELETE | /clients/:id | Delete client |
| GET | /clients/:id/projects | List client's projects |
| GET | /clients/:id/contacts | List contact persons |
| POST | /clients/:id/contacts | Add contact person |
| PATCH | /clients/:id/contacts/:contactId | Update contact |
| DELETE | /clients/:id/contacts/:contactId | Delete contact |
| GET | /clients/:id/files | List client files |
| POST | /clients/:id/files | Upload file to client |
| PATCH | /clients/:id/favorite | Toggle favorite |

#### Project Enhancements (~7 new endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/members | List project team members |
| POST | /projects/:id/members | Add member to project |
| DELETE | /projects/:id/members/:userId | Remove member |
| GET | /projects/:id/budget | Get project budget details |
| PATCH | /projects/:id/budget | Update project budget |
| GET | /projects/:id/files | List project files |
| POST | /projects/:id/files | Upload file to project |
| PATCH | /projects/:id/pin | Toggle pin status |

#### Task Enhancements (~14 new endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tasks | Global task list (flat or tree, all filters) |
| POST | /tasks/:id/duplicate | Duplicate task with subtasks |
| PATCH | /tasks/:id/status | Quick status update |
| PATCH | /tasks/:id/acceptance | Update acceptance state |
| PATCH | /tasks/:id/progress | Update progress |
| PATCH | /tasks/:id/assignee | Reassign primary assignee |
| POST | /tasks/:id/subtasks | Create subtask (convenience) |
| GET | /tasks/:id/participants | List participants |
| POST | /tasks/:id/participants | Add participant |
| DELETE | /tasks/:id/participants/:userId | Remove participant |
| GET | /tasks/:id/dependencies | Get blocker/blocked deps |
| POST | /tasks/:id/dependencies | Add dependency |
| DELETE | /tasks/:id/dependencies/:depId | Remove dependency |

#### Checklist Endpoints (~5 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tasks/:id/checklist | List checklist items |
| POST | /tasks/:id/checklist | Add item |
| PATCH | /tasks/:id/checklist/:itemId | Toggle / rename |
| DELETE | /tasks/:id/checklist/:itemId | Delete item |
| PATCH | /tasks/:id/checklist/reorder | Reorder items |

#### Comments Endpoints (~4 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tasks/:id/comments | List comments (paginated) |
| POST | /tasks/:id/comments | Add comment |
| PATCH | /tasks/:id/comments/:commentId | Edit comment |
| DELETE | /tasks/:id/comments/:commentId | Delete comment |

#### Time Tracking Enhancements (~2 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /time-entries | List with filters (user, project, task, date range) |
| GET | /time-entries/summary | Aggregated report (group by project/user/work_type) |

#### Analytics Module (~10 new endpoints) — **ENTIRELY NEW**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/overview | Dashboard stats (completed, active, overdue, hours) |
| GET | /analytics/task-completion | Completion trend over time |
| GET | /analytics/task-distribution | Status/priority distribution |
| GET | /analytics/team-performance | Per-user metrics |
| GET | /analytics/time-by-project | Hours per project |
| GET | /analytics/time-by-type | Hours per work type |
| GET | /analytics/weekly-productivity | Tasks + hours by day of week |
| GET | /analytics/monthly-report | Monthly time breakdown |
| GET | /analytics/recently-completed | Last N completed tasks |
| GET | /analytics/export | Export as CSV/Excel |

#### Budget Endpoints (~2 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /budget | Org budget overview |
| PATCH | /budget/limit | Update org budget limit (admin) |

#### Files Module (~3 new generic endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /files/:id | Get file metadata |
| GET | /files/:id/download | Download (signed URL) |
| DELETE | /files/:id | Delete file |

#### Notifications Module (~3 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | List user's notifications |
| PATCH | /notifications/:id/read | Mark as read |
| PATCH | /notifications/read-all | Mark all as read |

#### Search (~1 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /search | Global search across entities |

#### User Enhancements (~4 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /users | Create/invite new user (admin/manager) |
| PATCH | /users/:id/status | Update online status |
| GET | /users/:id/tasks | Get user's assigned tasks |
| PUT | /users/:id/preferences | Save preferences (theme, lang, columns) |
| POST | /users/:id/avatar | Upload avatar |

### 3.3 Endpoint Summary

| Category | Existing | New | Total |
|----------|----------|-----|-------|
| Auth | 6 | 0 | 6 |
| Users | 9 | 5 | 14 |
| Teams | 9 | 0 | 9 |
| Projects | 5 | 8 | 13 |
| Tasks | 10 | 14 | 24 |
| Checklist | 0 | 5 | 5 |
| Comments | 0 | 4 | 4 |
| Clients | 0 | 13 | 13 |
| Time Tracking | 9 | 2 | 11 |
| Analytics | 0 | 10 | 10 |
| Budget | 0 | 2 | 2 |
| Files | 0 | 3 | 3 |
| Notifications | 0 | 3 | 3 |
| Search | 0 | 1 | 1 |
| Activity Log | 3 | 0 | 3 |
| Health | 1 | 0 | 1 |
| **TOTAL** | **52** | **70** | **~122** |

---

## 4. Logic & Feature Gap Analysis

### 4.1 Multi-Tenancy (NEW)
**Current**: No organization concept. Teams scope projects.
**Needed**: All data scoped to an organization. Registration creates org + admin user. All queries filter by `org_id`.
**Impact**: HIGH — touches every module. Every service needs org-scoping.

### 4.2 Client Management (NEW)
**Current**: Not implemented.
**Needed**: Full CRUD for clients + contact persons. Clients link to projects. Favorites, groups, labels, file uploads.
**Impact**: MEDIUM — new bounded context, no conflict with existing code.

### 4.3 Project Scoping Change
**Current**: Projects belong to a team (`team_id` FK). Authorization checks team membership.
**Needed**: Projects belong to an org + optionally a client. Project members are direct (project_members table). Team association becomes optional.
**Impact**: HIGH — changes project authorization model. Need to add `project_members` while keeping team relation optional.

### 4.4 Task Enhancements
**Current**: Task hierarchy, status state machine, assignment, move/reorder.
**Needed**: All current + work types, acceptance status, progress tracking, primary assignee, participants, dependencies, checklists, comments, duplication, task codes.
**Impact**: MEDIUM-HIGH — extends existing Task entity significantly. New sub-entities (dependencies, checklist, comments).

### 4.5 Status/Priority Enum Changes
**Current**: TaskStatus = todo, in_progress, in_review, done, cancelled. ProjectStatus = planning, active, on_hold, completed, archived.
**Needed**: TaskStatus = start, in_progress, burning, end, late, cancelled. ProjectStatus = start, in_progress, burning, end, late.
**Impact**: HIGH — requires DB migration, updating all status-related logic (state machine transitions, filters, tests).

### 4.6 Analytics (NEW)
**Current**: Only project time reports exist.
**Needed**: 10 analytics endpoints with aggregations across tasks, time entries, users.
**Impact**: MEDIUM — read-only queries, no schema changes. Depends on having data in the right shape.

### 4.7 File Upload System (NEW)
**Current**: Not implemented. avatarUrl exists as a string field.
**Needed**: Polymorphic file storage (project, task, client attachments). S3-compatible storage with signed URLs.
**Impact**: MEDIUM — new infrastructure concern (S3/MinIO), new entity, new endpoints on multiple controllers.

### 4.8 Notifications (NEW)
**Current**: Not implemented.
**Needed**: Notification inbox with read/unread state. Triggered by task assignments, deadlines, comments, etc.
**Impact**: MEDIUM — new entity + service. Integration with existing event system.

### 4.9 Real-Time (NEW)
**Current**: Not implemented.
**Needed**: Socket.IO or SSE for live updates (user status, task changes, notifications).
**Impact**: MEDIUM — new infrastructure layer. NestJS has built-in WebSocket gateway support.

### 4.10 Time Entry Model Adaptation
**Current**: Timer-based (start_time, end_time, duration_seconds).
**Needed**: Frontend expects date + hours for manual logging. Timer for real-time tracking.
**Impact**: LOW — add adapter layer. Keep internal model, expose simplified API for manual entries.

### 4.11 Search (NEW)
**Current**: Basic `search` filter on individual list endpoints.
**Needed**: Global cross-entity search endpoint.
**Impact**: LOW — single endpoint, queries across projects, tasks, clients, users.

### 4.12 Budget Management (NEW)
**Current**: Not implemented.
**Needed**: Org-level budget limit, per-project budgets, validation against limit.
**Impact**: LOW — organization.budget_limit + project.budget fields, 2 endpoints.

---

## 5. Architectural Decisions Required

### Decision 1: Multi-Tenancy Approach
**Options**:
- A) Add `org_id` FK to all tables, filter in every query (row-level tenancy)
- B) Schema-per-tenant (PostgreSQL schemas)
- **Recommended: A** — simpler, already how the frontend plan models it, works at current scale.

### Decision 2: Keep Teams or Replace with Project Members?
**Options**:
- A) Remove teams entirely, use only project_members for scoping
- B) Keep teams as organizational units, add project_members as parallel scoping
- **Recommended: B** — Teams are already built and tested. Keep them for organizational structure. Add project_members for fine-grained project access. Authorization checks project_members first, falls back to team membership.

### Decision 3: Status Enum Migration
**Options**:
- A) Replace enums entirely (breaking change for any existing data)
- B) Map old values to new: `todo→start`, `in_review→burning`, `done→end`
- C) Support both sets with a mapping layer
- **Recommended: B** — Clean DB migration with value mapping. Update all code references in one pass.

### Decision 4: Keep Granular RBAC or Simplify?
**Options**:
- A) Keep roles/permissions tables (current), derive frontend role from assigned roles
- B) Replace with simple role enum on user (frontend plan)
- **Recommended: A** — RBAC is already built and more flexible. Add a `primaryRole` getter on User entity that returns admin/manager/member for the frontend's simpler role model.

### Decision 5: Time Entry Dual Model
**Options**:
- A) Keep timer model only, convert date+hours to timestamps on input
- B) Switch to date+hours model, lose timer precision
- C) Support both: timer entries (start/end) and log entries (date/hours)
- **Recommended: C** — Keep isManual flag. Timer entries use start_time/end_time. Manual log entries store date + hours (add `date` and `hours` columns alongside existing timer columns).

---

## 6. Implementation Plan

### Phase A: Foundation Changes (Organizations + User Enhancements)
**Priority: HIGHEST — everything else depends on this**

#### A.1 Organizations Module
- Create `Organization` entity (id, name, slug, logoUrl, budgetLimit, settings)
- Create `OrganizationModule` with service + controller
- DB migration: create organizations table

#### A.2 User Entity Expansion
- Add columns: orgId, phone, position, department, location, joinDate, status (employee_status enum), skills, performance, preferences
- Update RegisterDto to accept orgName, create org + user atomically
- Update UserService to scope queries by org_id
- DB migration: alter users table

#### A.3 Multi-Tenancy Wiring
- Add org_id FK to: projects, activity_log (clients/files/notifications come in later phases)
- Create `@CurrentOrg()` decorator or extend `@CurrentUser()` to include orgId
- Add org scoping to ProjectService, TeamService, ActivityLoggerService
- DB migration: alter existing tables to add org_id

#### A.4 User New Endpoints
- POST /users (create/invite user) — admin/manager only
- PATCH /users/:id/status (update online status)
- GET /users/:id/tasks (assigned tasks)
- PUT /users/:id/preferences (save preferences)
- POST /users/:id/avatar (upload — requires file infra, can stub initially)

**Estimated new/modified files**: ~20
**New tests**: ~30

---

### Phase B: Enum Migration + Project/Task Schema Expansion

#### B.1 Status Enum Migration
- Change ProjectStatus: planning→start, active→in_progress, on_hold→burning, completed→end, archived→late (or adjust mapping as frontend confirms)
- Change TaskStatus: todo→start, in_review→burning, done→end, add late
- Update task status state machine transitions
- Update all filter DTOs, tests, seed data
- DB migration: alter enum types and convert existing data

#### B.2 Project Entity Expansion
- Add columns: orgId, clientId, parentId, code, priority, projectType, size, complexity, areaSqm, budget, progress, estimatedDuration, color, isPinned, isArchived
- Create new enums: ProjectType, ProjectSize, ComplexityLevel
- Update CreateProjectDto, UpdateProjectDto, ProjectFilterDto
- Auto-generate project codes (PRJ-001, PRJ-002, etc.)
- DB migration: alter projects table

#### B.3 Project Members
- Create `ProjectMember` entity (id, projectId, userId, role, joinedAt)
- Add endpoints: GET/POST/DELETE /projects/:id/members
- Update authorization to check project membership alongside team membership

#### B.4 Task Entity Expansion
- Add columns: code, workType, acceptance, progress, completedAt, estimatedHours, assigneeId (primary)
- Create new enums: WorkType, AcceptanceStatus
- Auto-generate task codes per project (001, 002, etc.)
- Update CreateTaskDto, UpdateTaskDto, TaskFilterDto
- Add quick-update endpoints: PATCH status, acceptance, progress, assignee
- DB migration: alter tasks table

#### B.5 Pin & Archive Endpoints
- PATCH /projects/:id/pin — toggle isPinned
- DELETE /projects/:id — change to set isArchived=true instead of soft delete

**Estimated new/modified files**: ~25
**New tests**: ~40

---

### Phase C: Client Management Module (NEW)

#### C.1 Client Entity + CRUD
- Create `Client` entity with all fields from schema
- Create `ClientModule` (service, controller, DTOs)
- Endpoints: GET/POST/PATCH/DELETE /clients
- Client search, group filter, favorites
- Scoped by org_id

#### C.2 Contact Persons
- Create `ContactPerson` entity
- Endpoints: GET/POST/PATCH/DELETE /clients/:id/contacts
- is_primary flag management

#### C.3 Client-Project Linkage
- Wire client_id FK on projects
- GET /clients/:id/projects endpoint
- Update project create/update DTOs to accept clientId

**Estimated new/modified files**: ~15
**New tests**: ~25

---

### Phase D: Task Sub-Features (Dependencies, Checklist, Comments, Participants)

#### D.1 Task Participants
- Create `TaskParticipant` entity (task_id, user_id, unique constraint)
- Endpoints: GET/POST/DELETE /tasks/:id/participants
- Distinct from task_assignees (assignees = responsible, participants = collaborators)

#### D.2 Task Dependencies
- Create `TaskDependency` entity (blocker_id, blocked_id, self-reference check)
- Endpoints: GET/POST/DELETE /tasks/:id/dependencies
- Circular dependency detection

#### D.3 Checklist Items
- Create `ChecklistItem` entity (task_id, title, isCompleted, sortOrder)
- Endpoints: GET/POST/PATCH/DELETE + reorder
- Affect task progress calculation (optional: auto-compute from checklist completion %)

#### D.4 Comments
- Create `Comment` entity (task_id, user_id, content)
- Endpoints: GET (paginated)/POST/PATCH/DELETE
- Emit events for notification triggers

#### D.5 Task Duplication
- POST /tasks/:id/duplicate — deep copy task with subtasks, checklist items
- Generate new codes, reset status to start

**Estimated new/modified files**: ~20
**New tests**: ~35

---

### Phase E: Files & Notifications

#### E.1 File Upload Infrastructure
- Integrate S3-compatible storage (MinIO for dev, S3 for prod)
- Create `File` entity (polymorphic: entity_type + entity_id)
- Multer + S3 upload pipeline
- Signed URL generation for downloads
- Generic endpoints: GET /files/:id, GET /files/:id/download, DELETE /files/:id

#### E.2 Entity-Specific File Endpoints
- GET/POST /projects/:id/files
- GET/POST /clients/:id/files
- Task file endpoints (via entity_type='task')
- POST /users/:id/avatar (uses file infra)

#### E.3 Notifications
- Create `Notification` entity
- Create NotificationService + NotificationController
- Endpoints: GET /notifications, PATCH read, PATCH read-all
- Integrate with EventEmitter: on task.assigned → create notification, on comment.created → notify assignee, etc.

**Estimated new/modified files**: ~15
**New tests**: ~20

---

### Phase F: Analytics & Budget

#### F.1 Analytics Module
- Create `AnalyticsModule` with `AnalyticsService` + `AnalyticsController`
- 10 aggregation endpoints (all read-only, no new entities)
- Heavy use of SQL aggregation queries (GROUP BY, COUNT, SUM, date_trunc)
- Endpoints: overview, task-completion, task-distribution, team-performance, time-by-project, time-by-type, weekly-productivity, monthly-report, recently-completed, export

#### F.2 Budget Endpoints
- GET /budget — org budget overview (limit, used = SUM(project.budget), remaining)
- PATCH /budget/limit — admin updates org budget limit
- Validation: project budget cannot exceed org remaining budget

#### F.3 CSV/Excel Export
- GET /analytics/export?format=csv|xlsx
- Use `exceljs` or `json2csv` library

**Estimated new/modified files**: ~10
**New tests**: ~20

---

### Phase G: Time Entry Adaptation + Search

#### G.1 Time Entry Model Extension
- Add columns to time_entries: projectId (direct FK), date, hours, isBillable
- Update manual entry creation: accept { taskId, projectId, date, hours } format
- Keep timer model (start/stop) for real-time tracking
- GET /time-entries with filters (user, project, task, date range)
- GET /time-entries/summary with group_by

#### G.2 Global Search
- GET /search?q=keyword&type=project|task|client|user
- PostgreSQL full-text search across name/title/description fields
- Return mixed results with entity type tags

**Estimated new/modified files**: ~8
**New tests**: ~15

---

### Phase H: Real-Time (WebSocket / SSE)

#### H.1 WebSocket Gateway
- Install @nestjs/websockets + socket.io
- Create gateway with room-based channels: org:{orgId}, project:{projectId}, user:{userId}
- Auth via JWT on WebSocket handshake

#### H.2 Event Broadcasting
- Extend existing EventEmitter listeners to broadcast via WebSocket
- Events: user:status, task:updated, task:created, task:deleted, project:updated, budget:updated, notification, time:logged

**Estimated new/modified files**: ~5
**New tests**: ~10

---

## Implementation Priority & Dependency Order

```
Phase A ──→ Phase B ──→ Phase C ──→ Phase D ──→ Phase E
  │              │                       │
  │              └──→ Phase F ───────────┘
  │                                      │
  └──────────────────→ Phase G ──────────┘
                                         │
                                    Phase H (last)
```

| Phase | Name | Dependencies | New Endpoints | New Entities |
|-------|------|-------------|---------------|-------------|
| **A** | Foundation (Org + User) | None | ~5 | 1 (Organization) |
| **B** | Enums + Project/Task Expansion | A | ~12 | 1 (ProjectMember) |
| **C** | Client Management | A | ~13 | 2 (Client, ContactPerson) |
| **D** | Task Sub-Features | B | ~14 | 4 (TaskParticipant, TaskDependency, ChecklistItem, Comment) |
| **E** | Files & Notifications | A | ~9 | 2 (File, Notification) |
| **F** | Analytics & Budget | B | ~12 | 0 |
| **G** | Time Entry + Search | A, B | ~3 | 0 |
| **H** | Real-Time WebSocket | All | 0 (WS events) | 0 |

**Total new entities**: 10
**Total new endpoints**: ~68
**Estimated total endpoints after all phases**: ~120

---

## Risk & Considerations

1. **Enum migration** (Phase B) is the riskiest change — touches all existing tests and seed data. Recommend doing it early to avoid compounding issues.
2. **Multi-tenancy** (Phase A) needs to be wired into every query. Consider a TypeORM subscriber or query builder extension that auto-adds `WHERE org_id = ?`.
3. **File upload** (Phase E) introduces external infrastructure dependency (S3/MinIO). Dev environment needs MinIO in docker-compose.
4. **Analytics queries** (Phase F) may need DB indexes beyond what exists. Profile with EXPLAIN ANALYZE.
5. **WebSocket** (Phase H) changes the deployment model — need sticky sessions or Redis adapter for multi-instance.
