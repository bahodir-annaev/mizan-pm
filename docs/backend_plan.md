# Backend Plan — Project Management Dashboard

> Comprehensive database schema and API design to replace all client-side mock data
> with a persistent, production-ready backend.

---

## Table of Contents

1. [Tech Stack Recommendation](#1-tech-stack-recommendation)
2. [Frontend Entity Inventory](#2-frontend-entity-inventory)
3. [Database Schema (PostgreSQL)](#3-database-schema-postgresql)
4. [Enum Definitions](#4-enum-definitions)
5. [API Endpoints](#5-api-endpoints)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Real-Time Features](#7-real-time-features)
8. [File Storage](#8-file-storage)
9. [Migration Roadmap](#9-migration-roadmap)

---

## 1. Tech Stack Recommendation

| Layer | Technology | Reasoning |
|-------|-----------|-----------|
| **Runtime** | Node.js 20+ (TypeScript) | Shares language with React frontend, fast onboarding |
| **Framework** | Express.js or Fastify | Lightweight, mature, huge ecosystem |
| **Database** | PostgreSQL 16 | JSONB for flexible fields, excellent for relational + hierarchical data |
| **ORM** | Prisma or Drizzle ORM | Type-safe queries, auto-migrations, TS-native |
| **Auth** | JWT (access + refresh tokens) | Stateless, works with the existing client-side architecture |
| **Real-time** | Socket.IO or SSE | For team dashboard live status, task updates |
| **File storage** | S3-compatible (MinIO / AWS S3) | Task attachments, employee avatars, project files |
| **Cache** | Redis | Session store, rate limiting, analytics caching |
| **Search** | PostgreSQL full-text or Meilisearch | For project/task/client search |

---

## 2. Frontend Entity Inventory

Entities extracted from every component and context in the codebase:

| Entity | Source Component(s) | Mock Count | Key Fields |
|--------|---------------------|------------|------------|
| **User / Employee** | `TeamDashboard.tsx`, `TeamManagement.tsx`, `EmployeeProfile.tsx` | 8 + 16 | id, name, role, email, phone, department, skills, performance |
| **Project** | `ProjectTable.tsx`, `ProjectDetail.tsx`, `Sidebar.tsx` | 8 | id, name, client, dates, status, size, type, area, budget |
| **Task (Work)** | `WorksTable.tsx`, `WorksTableWrapper.tsx`, `TaskDetailPage.tsx` | 10 + subtasks | id, title, project, assignee, participants, status, priority, dates, progress, workType, acceptance, dependencies |
| **Subtask** | `WorksTable.tsx`, `TaskDetailPage.tsx` | ~15 | Same as task, nested under parent |
| **Client** | `Clients.tsx`, `ClientDetail.tsx`, `EditClientModal.tsx` | 13 | id, name, contactPerson, phone, group, labels, address, VAT |
| **Contact Person** | `ClientDetail.tsx` | 0 (tab exists) | name, email, phone, role, linked client |
| **Budget** | `BudgetContext.tsx`, `BudgetDisplay.tsx` | 4 | project, amount, limit |
| **Time Entry** | `AnalyticsDashboard.tsx`, `TeamDashboard.tsx` | mock aggregates | user, task, date, hours |
| **Activity Log** | `TaskDetailModal.tsx` | mock | user, action, target, timestamp |
| **File / Attachment** | `ProjectDetail.tsx` (files tab), `ClientDetail.tsx` | 0 (placeholder) | name, url, size, uploader, entity |
| **Checklist Item** | `TaskDetailPage.tsx`, `EditableChecklistItem.tsx` | 3 mock | title, completed, task |
| **Comment** | `TaskDetailModal.tsx` | mock | user, task, text, timestamp |
| **Column Config** | `useColumnConfig.ts` | localStorage | user, table key, columns JSON |
| **User Preferences** | `Settings.tsx`, `Header.tsx` | localStorage | theme, language, layout prefs |

---

## 3. Database Schema (PostgreSQL)

### 3.1 `organizations`
The top-level tenant for multi-tenancy support.

```sql
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    logo_url        TEXT,
    budget_limit    DECIMAL(15,2) DEFAULT 0,       -- global budget cap (e.g. 10B)
    settings        JSONB DEFAULT '{}',             -- org-wide settings
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 `users`
Covers employees, team members, managers — anyone with a login.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'member',     -- enum: admin, manager, member
    position        VARCHAR(255),                            -- "Senior Architect", "3D Visualizer"
    department      VARCHAR(255),
    location        VARCHAR(255),
    join_date       DATE,
    status          employee_status DEFAULT 'offline',       -- working, idle, offline
    skills          TEXT[] DEFAULT '{}',
    performance     SMALLINT CHECK (performance BETWEEN 0 AND 100),
    preferences     JSONB DEFAULT '{}',                      -- theme, language, column configs
    is_active       BOOLEAN DEFAULT true,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### 3.3 `clients`
External clients/companies that commission projects.

```sql
CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    client_type     client_type DEFAULT 'organization',      -- organization, person
    phone           VARCHAR(50),
    website         TEXT,
    address         VARCHAR(500),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    vat_number      VARCHAR(100),
    gst_number      VARCHAR(100),
    client_group    VARCHAR(100),
    labels          TEXT[] DEFAULT '{}',
    is_favorite     BOOLEAN DEFAULT false,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON clients(org_id);
CREATE INDEX idx_clients_name ON clients(org_id, name);
```

### 3.4 `contact_persons`
People associated with a client.

```sql
CREATE TABLE contact_persons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    role            VARCHAR(100),                            -- "CEO", "Project Liaison"
    is_primary      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_client ON contact_persons(client_id);
```

### 3.5 `projects`
Central entity — architecture/construction projects.

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
    parent_id       UUID REFERENCES projects(id) ON DELETE SET NULL,  -- sub-projects
    code            VARCHAR(20) UNIQUE NOT NULL,              -- "PRJ-001"
    name            VARCHAR(500) NOT NULL,
    description     TEXT,
    status          project_status NOT NULL DEFAULT 'start',
    priority        priority_level DEFAULT 'medium',
    project_type    project_type DEFAULT 'interior',          -- interior, residential, commercial
    size            project_size DEFAULT 'medium',            -- small, medium, large
    complexity      complexity_level DEFAULT 'medium',        -- low, medium, high
    area_sqm        DECIMAL(10,2),                            -- "kvadratura" in m²
    budget          DECIMAL(15,2) DEFAULT 0,                  -- in base currency
    progress        SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    date_start      DATE,
    date_end        DATE,
    estimated_duration VARCHAR(50),                           -- "8-10 weeks"
    color           VARCHAR(7),                               -- hex for sidebar display
    is_pinned       BOOLEAN DEFAULT false,
    is_archived     BOOLEAN DEFAULT false,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_parent ON projects(parent_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_code ON projects(code);
```

### 3.6 `project_members`
Many-to-many: which users work on which projects, and in what role.

```sql
CREATE TABLE project_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(100),                             -- "Lead Architect", "PM"
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_user ON project_members(user_id);
```

### 3.7 `tasks`
Self-referencing for unlimited nesting (task → subtask → sub-subtask).

```sql
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- NULL = top-level task
    code            VARCHAR(20) NOT NULL,                     -- "001", "TSK-045"
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    status          task_status NOT NULL DEFAULT 'start',
    priority        priority_level NOT NULL DEFAULT 'medium',
    work_type       work_type NOT NULL DEFAULT 'architecture',
    acceptance      acceptance_status DEFAULT 'pending',
    progress        SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    date_start      DATE,
    date_end        DATE,
    completed_at    TIMESTAMPTZ,
    estimated_hours DECIMAL(8,2),
    sort_order      INTEGER DEFAULT 0,                        -- ordering within parent
    assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_code ON tasks(project_id, code);
```

### 3.8 `task_participants`
Additional people working on a task (beyond the primary assignee).

```sql
CREATE TABLE task_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(task_id, user_id)
);

CREATE INDEX idx_tp_task ON task_participants(task_id);
CREATE INDEX idx_tp_user ON task_participants(user_id);
```

### 3.9 `task_dependencies`
Task blocking relationships (blockedBy / blocks).

```sql
CREATE TABLE task_dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,  -- this task blocks...
    blocked_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,  -- ...this task
    UNIQUE(blocker_id, blocked_id),
    CHECK(blocker_id != blocked_id)
);

CREATE INDEX idx_td_blocker ON task_dependencies(blocker_id);
CREATE INDEX idx_td_blocked ON task_dependencies(blocked_id);
```

### 3.10 `checklist_items`
Simple checklist items within a task.

```sql
CREATE TABLE checklist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    is_completed    BOOLEAN DEFAULT false,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_task ON checklist_items(task_id);
```

### 3.11 `time_entries`
Core time-tracking records.

```sql
CREATE TABLE time_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    hours           DECIMAL(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    description     TEXT,
    is_billable     BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_user ON time_entries(user_id);
CREATE INDEX idx_time_task ON time_entries(task_id);
CREATE INDEX idx_time_project ON time_entries(project_id);
CREATE INDEX idx_time_date ON time_entries(date);
CREATE INDEX idx_time_user_date ON time_entries(user_id, date);
```

### 3.12 `comments`
Comments / activity on tasks.

```sql
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON comments(task_id);
```

### 3.13 `activity_log`
Audit trail for all entity changes.

```sql
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type     VARCHAR(50) NOT NULL,                    -- 'task', 'project', 'client', etc.
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,                    -- 'created', 'updated', 'deleted', 'status_changed'
    changes         JSONB,                                   -- { field: { old: x, new: y } }
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_org ON activity_log(org_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_date ON activity_log(created_at);
```

### 3.14 `files`
Attachments for tasks, projects, or clients.

```sql
CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    entity_type     VARCHAR(50) NOT NULL,                    -- 'task', 'project', 'client'
    entity_id       UUID NOT NULL,
    file_name       VARCHAR(500) NOT NULL,
    file_url        TEXT NOT NULL,
    file_size       BIGINT,                                  -- bytes
    mime_type       VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_org ON files(org_id);
```

### 3.15 `notifications`

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    type            VARCHAR(50),                             -- 'task_assigned', 'deadline', 'comment', etc.
    entity_type     VARCHAR(50),
    entity_id       UUID,
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

---

## 4. Enum Definitions

```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member');

CREATE TYPE employee_status AS ENUM ('working', 'idle', 'offline');

CREATE TYPE client_type AS ENUM ('organization', 'person');

CREATE TYPE project_status AS ENUM ('start', 'in_progress', 'burning', 'end', 'late');

CREATE TYPE project_type AS ENUM ('interior', 'residential', 'commercial');

CREATE TYPE project_size AS ENUM ('small', 'medium', 'large');

CREATE TYPE complexity_level AS ENUM ('low', 'medium', 'high');

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

CREATE TYPE task_status AS ENUM ('start', 'in_progress', 'burning', 'end', 'late', 'cancelled');

CREATE TYPE work_type AS ENUM (
    'architecture',
    'interior_design',
    'exterior_design',
    'landscape',
    'working_drawings',
    '3d_visualization',
    'author_supervision',
    'documentation',
    'engineering',
    'client_coordination'
);

CREATE TYPE acceptance_status AS ENUM ('pending', 'approved', 'rejected', 'revision');
```

---

## 5. API Endpoints

Base URL: `/api/v1`

All endpoints return JSON. Authenticated via `Authorization: Bearer <token>`.

### 5.1 Authentication

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|-------------|
| `POST` | `/auth/register` | Register new org + admin user | `{ orgName, name, email, password }` |
| `POST` | `/auth/login` | Login, returns JWT pair | `{ email, password }` |
| `POST` | `/auth/refresh` | Refresh access token | `{ refreshToken }` |
| `POST` | `/auth/logout` | Invalidate refresh token | — |
| `POST` | `/auth/change-password` | Change current user password | `{ currentPassword, newPassword }` |
| `GET`  | `/auth/me` | Get current user profile | — |

### 5.2 Users / Employees

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| `GET` | `/users` | List all users in org | Query: `?status=working&department=Architecture&search=sarah` |
| `GET` | `/users/:id` | Get user profile with stats | Includes `tasksCompleted`, `hoursToday`, `weeklyHours`, `recentProjects` |
| `POST` | `/users` | Create new user (invite) | Admin/Manager only |
| `PATCH` | `/users/:id` | Update user details | Self or Admin |
| `DELETE` | `/users/:id` | Deactivate user | Admin only (soft delete) |
| `PATCH` | `/users/:id/status` | Update online status | `{ status: "working" \| "idle" \| "offline" }` |
| `GET` | `/users/:id/tasks` | Get user's assigned tasks | Query: `?status=in_progress` |
| `GET` | `/users/:id/time-entries` | Get user's time entries | Query: `?from=2024-01-01&to=2024-01-31` |
| `PUT` | `/users/:id/preferences` | Save user preferences | `{ theme, language, columnConfigs }` |
| `POST` | `/users/:id/avatar` | Upload avatar | Multipart form data |

### 5.3 Projects

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| `GET` | `/projects` | List projects | Query: `?status=in_progress&client_id=x&search=bobur&is_archived=false` |
| `GET` | `/projects/:id` | Get project with members, stats | Includes task counts, budget, team |
| `POST` | `/projects` | Create project | `{ name, clientId, dateStart, dateEnd, type, size, budget, ... }` |
| `PATCH` | `/projects/:id` | Update project | Partial update any field |
| `DELETE` | `/projects/:id` | Archive project | Soft delete (set `is_archived`) |
| `GET` | `/projects/:id/tasks` | Get project's tasks (tree) | Returns nested task hierarchy |
| `GET` | `/projects/:id/members` | List project team members | |
| `POST` | `/projects/:id/members` | Add member to project | `{ userId, role }` |
| `DELETE` | `/projects/:id/members/:userId` | Remove member | |
| `GET` | `/projects/:id/budget` | Get project budget details | |
| `PATCH` | `/projects/:id/budget` | Update project budget | `{ budget }` — validates against org limit |
| `GET` | `/projects/:id/files` | List project files | |
| `POST` | `/projects/:id/files` | Upload file to project | Multipart |
| `PATCH` | `/projects/:id/pin` | Toggle pin status | `{ isPinned }` |
| `GET` | `/projects/:id/activity` | Get project activity log | |

### 5.4 Tasks

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| `GET` | `/tasks` | List all tasks (flat or tree) | Query: `?project_id=x&status=in_progress&assignee_id=x&priority=high&work_type=architecture&view=tree` |
| `GET` | `/tasks/:id` | Get task with subtasks, deps, checklist | Full detail view |
| `POST` | `/tasks` | Create task | `{ projectId, parentId?, title, assigneeId, status, priority, workType, dateStart, dateEnd }` |
| `PATCH` | `/tasks/:id` | Update task | Partial update — inline editing support |
| `DELETE` | `/tasks/:id` | Delete task + cascades subtasks | |
| `POST` | `/tasks/:id/duplicate` | Duplicate a task | Creates copy with subtasks |
| `PATCH` | `/tasks/:id/status` | Quick status update | `{ status }` |
| `PATCH` | `/tasks/:id/acceptance` | Update acceptance state | `{ acceptance }` |
| `PATCH` | `/tasks/:id/progress` | Update progress | `{ progress }` |
| `PATCH` | `/tasks/:id/assignee` | Reassign task | `{ assigneeId }` |
| `PATCH` | `/tasks/:id/reorder` | Change sort order | `{ sortOrder, parentId? }` — for drag & drop |
| `GET` | `/tasks/:id/subtasks` | List subtasks | |
| `POST` | `/tasks/:id/subtasks` | Create subtask | Same body as create task, auto-sets `parentId` |

### 5.5 Task Participants

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/participants` | List participants |
| `POST` | `/tasks/:id/participants` | Add participant — `{ userId }` |
| `DELETE` | `/tasks/:id/participants/:userId` | Remove participant |

### 5.6 Task Dependencies

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/dependencies` | Get blockedBy and blocks |
| `POST` | `/tasks/:id/dependencies` | Add dependency — `{ blockerId?, blockedId? }` |
| `DELETE` | `/tasks/:id/dependencies/:depId` | Remove dependency |

### 5.7 Checklist Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/checklist` | List checklist items |
| `POST` | `/tasks/:id/checklist` | Add item — `{ title }` |
| `PATCH` | `/tasks/:id/checklist/:itemId` | Update (toggle, rename) — `{ title?, isCompleted? }` |
| `DELETE` | `/tasks/:id/checklist/:itemId` | Delete item |
| `PATCH` | `/tasks/:id/checklist/reorder` | Reorder items — `{ items: [{ id, sortOrder }] }` |

### 5.8 Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/comments` | List comments (paginated) |
| `POST` | `/tasks/:id/comments` | Add comment — `{ content }` |
| `PATCH` | `/tasks/:id/comments/:commentId` | Edit comment |
| `DELETE` | `/tasks/:id/comments/:commentId` | Delete comment |

### 5.9 Time Tracking

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| `GET` | `/time-entries` | List time entries | Query: `?user_id=x&project_id=x&task_id=x&from=date&to=date` |
| `POST` | `/time-entries` | Log time | `{ taskId, projectId, date, hours, description, isBillable }` |
| `PATCH` | `/time-entries/:id` | Update entry | |
| `DELETE` | `/time-entries/:id` | Delete entry | |
| `GET` | `/time-entries/summary` | Aggregated time report | Query: `?group_by=project\|user\|work_type&from=date&to=date` |
| `POST` | `/time-entries/start` | Start timer | `{ taskId }` — creates running entry |
| `POST` | `/time-entries/stop` | Stop timer | Closes running entry, calculates hours |

### 5.10 Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/clients` | List clients | Query: `?search=discover&group=vip&has_projects=true` |
| `GET` | `/clients/:id` | Get client with contacts + project count |
| `POST` | `/clients` | Create client |
| `PATCH` | `/clients/:id` | Update client |
| `DELETE` | `/clients/:id` | Delete client |
| `GET` | `/clients/:id/projects` | List client's projects |
| `GET` | `/clients/:id/contacts` | List contact persons |
| `POST` | `/clients/:id/contacts` | Add contact person |
| `PATCH` | `/clients/:id/contacts/:contactId` | Update contact |
| `DELETE` | `/clients/:id/contacts/:contactId` | Delete contact |
| `GET` | `/clients/:id/files` | List client files |
| `POST` | `/clients/:id/files` | Upload file |
| `PATCH` | `/clients/:id/favorite` | Toggle favorite — `{ isFavorite }` |

### 5.11 Analytics

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| `GET` | `/analytics/overview` | Dashboard stats | Returns: completedTasks, activeTasks, overdueTasks, totalHours, avgTimePerTask |
| `GET` | `/analytics/task-completion` | Task completion trend | Query: `?from=date&to=date&interval=day\|week` |
| `GET` | `/analytics/task-distribution` | Status / priority distribution | Query: `?group_by=status\|priority` |
| `GET` | `/analytics/team-performance` | Per-user metrics | Returns: completed, active, hours, efficiency per user |
| `GET` | `/analytics/time-by-project` | Hours per project | Query: `?from=date&to=date&limit=10` |
| `GET` | `/analytics/time-by-type` | Hours per work type | Query: `?from=date&to=date` |
| `GET` | `/analytics/weekly-productivity` | Tasks + hours per day of week | |
| `GET` | `/analytics/monthly-report` | Monthly time breakdown | Returns projects with hours, tasks, members, status |
| `GET` | `/analytics/recently-completed` | Last N completed tasks | Query: `?limit=5` |
| `GET` | `/analytics/export` | Export analytics as CSV/Excel | Query: `?format=csv\|xlsx&report=monthly\|time` |

### 5.12 Budget

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/budget` | Get org budget overview (limit, used, remaining, per-project breakdown) |
| `PATCH` | `/budget/limit` | Update org budget limit — `{ limit }` (admin only) |

### 5.13 Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/files/:id` | Get file metadata |
| `GET` | `/files/:id/download` | Download file (signed URL redirect) |
| `DELETE` | `/files/:id` | Delete file |

### 5.14 Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` | List user's notifications | Query: `?is_read=false` |
| `PATCH` | `/notifications/:id/read` | Mark as read |
| `PATCH` | `/notifications/read-all` | Mark all as read |

### 5.15 Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search` | Global search across projects, tasks, clients, users | Query: `?q=keyword&type=project\|task\|client\|user` |

---

## 6. Authentication & Authorization

### JWT Token Structure

```jsonc
// Access token payload (short-lived: 15min)
{
  "sub": "user-uuid",
  "org": "org-uuid",
  "role": "admin",        // admin | manager | member
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Role Permissions Matrix

| Action | Admin | Manager | Member |
|--------|:-----:|:-------:|:------:|
| Manage org settings / budget limit | Yes | No | No |
| Create/delete users | Yes | No | No |
| Create/archive projects | Yes | Yes | No |
| Manage project members | Yes | Yes | No |
| Create/edit/delete tasks | Yes | Yes | Yes (own/assigned) |
| Log time | Yes | Yes | Yes (own) |
| View analytics | Yes | Yes | Yes (limited) |
| Manage clients | Yes | Yes | No |
| Upload files | Yes | Yes | Yes |

---

## 7. Real-Time Features

Using **Socket.IO** or **Server-Sent Events (SSE)** for:

| Event | Channel | Payload | Used By |
|-------|---------|---------|---------|
| `user:status` | `org:{orgId}` | `{ userId, status, lastActive }` | TeamDashboard — live working/idle/offline |
| `task:updated` | `project:{projectId}` | `{ taskId, changes }` | WorksTable, BoardView, GanttView |
| `task:created` | `project:{projectId}` | `{ task }` | All task views |
| `task:deleted` | `project:{projectId}` | `{ taskId }` | All task views |
| `project:updated` | `org:{orgId}` | `{ projectId, changes }` | ProjectTable, Sidebar |
| `budget:updated` | `org:{orgId}` | `{ projectId, budget, totalUsed }` | BudgetDisplay |
| `notification` | `user:{userId}` | `{ notification }` | Header notification bell |
| `time:logged` | `org:{orgId}` | `{ userId, hours, taskId }` | TeamDashboard hours |

---

## 8. File Storage

```
S3 Bucket Structure:
├── {org_id}/
│   ├── avatars/
│   │   └── {user_id}.{ext}
│   ├── projects/
│   │   └── {project_id}/
│   │       └── {file_id}_{filename}
│   ├── tasks/
│   │   └── {task_id}/
│   │       └── {file_id}_{filename}
│   └── clients/
│       └── {client_id}/
│           └── {file_id}_{filename}
```

- Upload: Client → pre-signed URL from API → direct upload to S3
- Download: API generates short-lived signed URL → redirect

---

## 9. Migration Roadmap

Step-by-step plan to convert the frontend from mock data to real backend:

### Phase 1: Foundation
1. Set up Node.js + Express + PostgreSQL + Prisma
2. Run all CREATE TABLE migrations
3. Implement auth endpoints (register, login, refresh)
4. Seed database with current mock data
5. Add CORS and JWT middleware

### Phase 2: Core CRUD
6. Implement Users CRUD → replace `TeamManagement.tsx` mock data
7. Implement Projects CRUD → replace `ProjectTable.tsx` mock data
8. Implement Tasks CRUD with nested subtasks → replace `WorksTable.tsx` mock data
9. Implement Clients CRUD → replace `Clients.tsx` mock data
10. Implement Budget endpoints → replace `BudgetContext` local state

### Phase 3: Relationships & Features
11. Task participants + dependencies endpoints
12. Checklist items + comments endpoints
13. File upload (S3) for projects, tasks, clients
14. Contact persons endpoints for clients

### Phase 4: Time Tracking
15. Time entry CRUD + start/stop timer
16. Time summary/aggregation queries
17. Replace `AnalyticsDashboard.tsx` mock data with real aggregations

### Phase 5: Real-Time & Polish
18. Socket.IO integration for live updates
19. Notifications system
20. Global search endpoint
21. Analytics export (CSV/XLSX)
22. User preferences persistence (theme, language, column configs)

### Phase 6: Frontend Integration
23. Create API client layer (`src/api/`) with fetch wrappers
24. Create React Query or SWR hooks for each endpoint
25. Replace `useState` mock data with API hooks component by component
26. Replace `BudgetContext` provider with API-backed state
27. Add optimistic updates for inline editing
28. Add WebSocket event listeners for real-time updates

### Estimated Effort
| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1 | Auth + DB setup | Foundation |
| Phase 2 | 4 entity CRUDs | Core |
| Phase 3 | Relations + files | Medium |
| Phase 4 | Time tracking | Medium |
| Phase 5 | Real-time + analytics | Advanced |
| Phase 6 | Frontend rewiring | Largest — touches every component |

---

## Entity-Relationship Summary

```
Organization (1) ──── (*) Users
Organization (1) ──── (*) Clients
Organization (1) ──── (*) Projects

Client (1) ──── (*) Contact Persons
Client (1) ──── (*) Projects

Project (1) ──── (*) Tasks
Project (1) ──── (*) Project Members ──── (*) Users
Project (1) ──── (*) Sub-Projects (self-ref)

Task (1) ──── (*) Subtasks (self-ref, unlimited depth)
Task (1) ──── (*) Task Participants ──── (*) Users
Task (1) ──── (*) Task Dependencies (blocker ↔ blocked)
Task (1) ──── (*) Checklist Items
Task (1) ──── (*) Comments
Task (1) ──── (*) Time Entries
Task (1) ──── (*) Files

User (1) ──── (*) Time Entries
User (1) ──── (*) Comments
User (1) ──── (*) Notifications
User (1) ──── (*) Activity Log entries
```
