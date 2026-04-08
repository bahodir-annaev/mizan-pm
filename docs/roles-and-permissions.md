# Roles & Permissions Matrix

## Role Hierarchy

Five global roles with numeric levels, enforced by `RolesGuard`:

| Role | Level |
|------|-------|
| viewer | 1 |
| member | 2 |
| manager | 3 |
| admin | 4 |
| owner | 5 |

---

## Permission Matrix

Permissions follow a `resource:action` naming convention. Defined in `src/database/seeds/seed.ts`.

| Resource | Action | viewer | member | manager | admin | owner |
|----------|--------|--------|--------|---------|-------|-------|
| organization | read | ✓ | ✓ | ✓ | ✓ | ✓ |
| organization | create | | | | ✓ | ✓ |
| organization | update | | | | ✓ | ✓ |
| organization | delete | | | | ✓ | ✓ |
| project | read | ✓ | ✓ | ✓ | ✓ | ✓ |
| project | create | | | | ✓ | ✓ |
| project | update | | | ✓ | ✓ | ✓ |
| project | delete | | | | ✓ | ✓ |
| task | read | ✓ | ✓ | ✓ | ✓ | ✓ |
| task | create | | ✓ | ✓ | ✓ | ✓ |
| task | update | | ✓ | ✓ | ✓ | ✓ |
| task | delete | | | ✓ | ✓ | ✓ |
| task | assign | | | ✓ | ✓ | ✓ |
| time-entry | read | ✓ | ✓ | ✓ | ✓ | ✓ |
| time-entry | create | | ✓ | ✓ | ✓ | ✓ |
| time-entry | update | | ✓ | ✓ | ✓ | ✓ |
| time-entry | delete | | | | ✓ | ✓ |
| user | read | ✓ | ✓ | ✓ | ✓ | ✓ |
| user | create | | | | ✓ | ✓ |
| user | update | | | | ✓ | ✓ |
| user | delete | | | | ✓ | ✓ |
| role | manage | | | | | ✓ |

---

## Authorization Layers

There are **two authorization scopes** running in parallel:

### 1. System-Level (global roles)

Applied via `@UseGuards(JwtAuthGuard, RolesGuard)` on controllers, or `@UseGuards(PermissionsGuard)` for fine-grained checks. Guards live in `src/modules/identity/infrastructure/guards/`.

### 2. Team-Level (TeamRole enum)

A separate `team_memberships` table has its own role column (`owner | admin | manager | member`). Most mutation operations go through service-layer helpers that check both:

- **`assertTeamManagerOrAdmin(teamId, user)`** — used in ProjectService, TaskService: passes if user has global `admin/owner` OR is a team-level `owner/admin` in that specific team.
- **`assertAssignedOrManager(taskId, user)`** — used in TimeTrackingService: passes if user is assigned to the task OR has `manager/admin/owner` globally.
- **`assertAdmin(user)`** — used in TeamService: passes only if user has global `admin/owner`.

---

## Key Design Observations

1. **`PermissionsGuard` is underutilized** — most authorization happens in service-layer `assert*` helpers rather than through the DB-driven permission model, making the permission table mostly relevant for seeding/display purposes.

2. **Roles are embedded in the JWT** — meaning a role change doesn't take effect until the user's access token expires (15 min TTL). The DB is only re-queried when `PermissionsGuard` is used.

3. **Team role ≠ global role** — a user can be a `manager` within one team but a `member` globally. The `assertTeamManagerOrAdmin` checks team membership in the DB on every call.

4. **`role:manage`** is the only permission exclusive to `owner` — admins can do everything else including user CRUD.
