# ArchPlan Task Manager — Knowledge Transfer

> A complete onboarding reference for engineers joining this project.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Repository Layout](#2-repository-layout)
3. [Local Setup](#3-local-setup)
4. [Application Bootstrap](#4-application-bootstrap)
5. [Module Architecture (DDD)](#5-module-architecture-ddd)
6. [Database & Entities](#6-database--entities)
7. [Repository Pattern](#7-repository-pattern)
8. [Auth & Authorization](#8-auth--authorization)
9. [DTOs & Validation](#9-dtos--validation)
10. [Response Envelope](#10-response-envelope)
11. [Event System](#11-event-system)
12. [Shared Module](#12-shared-module)
13. [Testing](#13-testing)
14. [Development Workflow](#14-development-workflow)
15. [Environment Variables](#15-environment-variables)
16. [Docker Setup](#16-docker-setup)
17. [Security Notes](#17-security-notes)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh) via Passport.js |
| Validation | class-validator + class-transformer |
| Events | @nestjs/event-emitter (EventEmitter2) |
| Rate Limiting | @nestjs/throttler |
| Security headers | helmet |
| API Docs | Swagger (@nestjs/swagger) |
| Config | @nestjs/config + Joi schema validation |
| Health | @nestjs/terminus |
| Tests | Jest + Supertest |
| Containerisation | Docker (multi-stage) + docker-compose |
| CI | GitHub Actions |

---

## 2. Repository Layout

```
pm-app/
├── src/
│   ├── main.ts                   # App entry point
│   ├── app.module.ts             # Root module
│   ├── config/
│   │   └── app.config.ts        # Joi-validated env schema
│   ├── database/
│   │   ├── data-source.ts       # TypeORM CLI DataSource
│   │   └── migrations/          # Timestamped migration files
│   ├── shared/                   # Cross-cutting utilities (see §12)
│   └── modules/
│       ├── identity/             # Users, auth, roles, permissions
│       ├── organization/         # Teams, memberships
│       ├── project-management/   # Projects, tasks, comments
│       ├── time-tracking/        # Time entries
│       ├── finance/              # Budgets, rates, costs
│       ├── client/               # Clients, contact persons
│       ├── files/                # File uploads
│       ├── notifications/        # In-app notifications
│       ├── analytics/            # Reports
│       ├── search/               # Full-text search
│       └── realtime/             # WebSocket (stub)
├── test/                         # E2E test suites
├── docs/                         # Project documentation
├── Dockerfile
├── docker-compose.yml
├── entrypoint.sh
├── package.json
├── tsconfig.json
└── nest-cli.json
```

Every feature module has the same internal structure:

```
module-name/
├── domain/
│   ├── entities/                 # TypeORM entity classes + enums
│   ├── repositories/             # Repository interfaces (IXxxRepository)
│   ├── events/                   # Domain event value objects
│   └── value-objects/            # e.g. Password (hashes on construct)
├── application/
│   ├── dtos/                     # Request/Response DTOs
│   ├── services/                 # Business logic
│   └── listeners/                # EventEmitter2 event handlers
├── infrastructure/
│   ├── persistence/              # TypeORM repository implementations
│   ├── guards/                   # NestJS guards
│   ├── strategies/               # Passport strategies
│   └── decorators/               # Custom param/method decorators
├── presentation/
│   └── controllers/              # HTTP controllers
└── module-name.module.ts
```

---

## 3. Local Setup

**Prerequisites:** Node.js ≥ 20, Docker Desktop, PostgreSQL client (optional).

```bash
# 1. Install dependencies
"C:\Program Files\nodejs\npm.cmd" install --legacy-peer-deps
# Note: npm v11 required. --legacy-peer-deps needed for @nestjs/swagger@11 + @nestjs/common@10 peer conflict.

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Start the database
docker-compose up -d postgres

# 4. Run migrations
npm run migration:run

# 5. Seed initial data
npm run seed

# 6. Start the API in watch mode
npm run start:dev
```

API is available at `http://localhost:3000/api/v1`.  
Swagger UI at `http://localhost:3000/api/docs`.

---

## 4. Application Bootstrap

[src/main.ts](src/main.ts) sets up the application in this order:

1. `NestFactory.create(AppModule)`
2. `app.use(helmet())` — security headers
3. `app.use(cookieParser())`
4. `app.setGlobalPrefix('api/v1')`
5. `ValidationPipe` — whitelist, forbidNonWhitelisted, transform
6. `ClassSerializerInterceptor` — applies `@Exclude()` on entities
7. CORS with configurable origins
8. Swagger document builder
9. `app.listen(port)`

**Global providers registered in AppModule:**

| Token | Class | Effect |
|---|---|---|
| `APP_INTERCEPTOR` | `ResponseEnvelopeInterceptor` | Wraps every response in `{ data, meta, errors }` |
| `APP_FILTER` | `GlobalExceptionFilter` | Maps any exception to the same envelope shape |
| `APP_GUARD` | `ThrottlerGuard` | 100 req / 60 s rate limit (configurable) |

---

## 5. Module Architecture (DDD)

The project follows **Domain-Driven Design** with four layers per bounded context:

| Layer | Responsibility | May depend on |
|---|---|---|
| **Domain** | Entities, repository interfaces, value objects, events | Nothing |
| **Application** | Services, DTOs, event listeners | Domain |
| **Infrastructure** | Repository implementations, guards, Passport strategies | Domain, Application |
| **Presentation** | HTTP controllers | Application (services + DTOs) |

This means services never import TypeORM directly; they only depend on repository interfaces (injected via Symbol tokens). Infrastructure swaps in the real implementation.

**Modules currently implemented:**

| Module | Key entities | Highlights |
|---|---|---|
| `identity` | User, Role, Permission, RefreshToken | JWT pair auth, RBAC, password value object |
| `organization` | Organization, Team, TeamMembership | Team-scoped access |
| `project-management` | Project, Task, TaskAssignee, Comment, ChecklistItem | Task hierarchy (materialized path), status state machine, cascading cancel |
| `time-tracking` | TimeEntry | Start/stop timer, manual CRUD, project report |
| `finance` | HourlyRate, ExchangeRate, Equipment, OverheadCost, ProjectFinancialPlan, ProjectMonthlyCost | Salary breakdown cost model (UZS/USD), versioned plans |
| `client` | Client, ContactPerson | CRM basics |
| `shared` | ActivityLog | Cross-cutting audit trail (see §12) |

---

## 6. Database & Entities

**TypeORM config highlights:**
- `synchronize: false` — always use migrations, never auto-sync in any environment
- `migrations` glob picks up all files in `src/database/migrations/`
- `entities` glob picks up all `*.entity.ts` files recursively

**Base class hierarchy:**

```
shared/base.entity.ts  (BaseEntity)
  └─ id: uuid (PK, generated)
  └─ createdAt: timestamptz
  └─ updatedAt: timestamptz
  └─ deletedAt: timestamptz  ← soft delete

shared/aggregate-root.entity.ts  (AggregateRoot extends BaseEntity)
  └─ _domainEvents: DomainEvent[]  ← for future event sourcing
```

All meaningful entities extend `AggregateRoot`. `TimeEntry` is the one exception — it extends `BaseEntity` directly (no soft delete per ER diagram spec).

**Notable entity design decisions:**

- **TaskAssignee** is a standalone entity (not a ManyToMany join), because it carries extra columns (assignedAt, role on task).
- **Task** uses a **materialized path** (`path` string column) to support efficient subtree queries.
- **HourlyRate** is unique per user per `effectiveDate`. It stores a computed breakdown of costs (salary, tax, JSSM contribution, admin/equipment/overhead share) to reconstruct hourly billing rate from first principles.
- **ProjectFinancialPlan** is versioned — a project can have multiple plan versions.
- Monetary values use `decimal` columns. UZS and USD are stored in separate columns wherever currency conversion matters.

**Migrations:**

```bash
npm run migration:run        # apply pending
npm run migration:revert     # undo last
npm run migration:show       # list status
npm run migration:generate   # auto-generate from entity diff (review before committing)
```

---

## 7. Repository Pattern

Repositories use **interface injection** so services stay decoupled from TypeORM.

**Step 1 — define the interface in `domain/repositories/`:**

```typescript
export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findAll(skip: number, take: number, filters?: FilterParams): Promise<[Project[], number]>;
  save(project: Project): Promise<Project>;
  softDelete(id: string): Promise<void>;
}
```

**Step 2 — implement in `infrastructure/persistence/`:**

```typescript
@Injectable()
export class TypeOrmProjectRepository implements IProjectRepository {
  constructor(@InjectRepository(Project) private repo: Repository<Project>) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['team', 'members'] });
  }
  // ...
}
```

**Step 3 — bind in module:**

```typescript
providers: [
  { provide: PROJECT_REPOSITORY, useClass: TypeOrmProjectRepository },
  ProjectService,
]
```

**Step 4 — inject in service:**

```typescript
constructor(
  @Inject(PROJECT_REPOSITORY) private projectRepo: IProjectRepository,
) {}
```

This pattern makes services 100% unit-testable by swapping `useClass` with a mock.

---

## 8. Auth & Authorization

### JWT Flow

```
POST /auth/register  →  { accessToken, refreshToken }
POST /auth/login     →  { accessToken, refreshToken }
POST /auth/refresh   →  { accessToken, refreshToken }  (old refresh deleted — rotation)
POST /auth/logout    →  deletes all refresh tokens for user
```

- **Access token** lifetime: 15 min (configurable via `JWT_ACCESS_EXPIRATION`)
- **Refresh token** lifetime: 7 days; stored **hashed** in `RefreshToken` table
- Token payload: `{ sub: userId, email, roles: string[], orgId?: string }`

### Guards

| Guard | Applied | Effect |
|---|---|---|
| `JwtAuthGuard` | Per controller / route | Validates Bearer token |
| `RolesGuard` | Per route | Checks `roles[]` in token against `@Roles()` decorator |
| `PermissionsGuard` | Per route | Checks granular permissions (`project.read`, etc.) |
| `ThrottlerGuard` | Global (APP_GUARD) | 100 req / 60 s |

### Decorators

```typescript
@CurrentUser()                   // Injects req.user (JwtPayload)
@Roles('admin', 'manager')      // Required roles (OR logic)
@Permissions('project.create')  // Required permission strings
@Public()                        // Skips JwtAuthGuard
```

### Password

`Password` is a value object in `identity/domain/value-objects/`. Hashing (bcrypt, 12 rounds) happens in the constructor so a plain string can never accidentally reach the database. The entity stores only the hash; `@Exclude()` prevents it from appearing in responses.

Password reset uses a one-time SHA256 token with a 1-hour expiry. Issuing a reset token revokes all refresh tokens for that user.

---

## 9. DTOs & Validation

**Naming convention:**

| Purpose | Name pattern |
|---|---|
| Create request | `CreateProjectDto` |
| Update request | `UpdateProjectDto` |
| Filter / query params | `ProjectFilterDto` (extends `PaginationQueryDto`) |
| Single response | `ProjectResponseDto` |
| List response | `PaginatedResult<ProjectResponseDto>` |

**Validation decorators** come from `class-validator`:

```typescript
@IsString()
@IsEmail()
@IsEnum(ProjectStatus)
@IsUUID()
@IsOptional()
@MinLength(8)
@IsDecimal({ decimal_digits: '2' })
```

**Swagger decorators** come from `@nestjs/swagger`:

```typescript
@ApiProperty({ example: 'My Project', description: '...' })
@ApiPropertyOptional()
@ApiTags('projects')
@ApiBearerAuth()
```

The global `ValidationPipe` is set with:
- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — throws on unknown properties
- `transform: true` — auto-coerces query param strings to numbers/booleans

---

## 10. Response Envelope

Every HTTP response (including errors) is wrapped by `ResponseEnvelopeInterceptor`:

```json
// Success (single object)
{ "data": { ... }, "meta": null, "errors": null }

// Success (paginated list)
{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "totalItems": 54, "totalPages": 3 }, "errors": null }

// Error
{ "data": null, "meta": null, "errors": [{ "message": "Project not found" }] }
```

The interceptor detects a `PaginatedResult` object and promotes its `meta` field automatically, so controllers just return a `PaginatedResult<T>` and the envelope handles the rest.

---

## 11. Event System

Services emit named events using `EventEmitter2`:

```typescript
this.eventEmitter.emit('project.created', { projectId: project.id, actorId: userId });
```

Event naming convention: `<entity>.<past-tense-verb>` — e.g. `task.completed`, `team.member.added`.

Listeners live in `application/listeners/` and are decorated with `@OnEvent`:

```typescript
@OnEvent('project.*')
async handleProjectEvent(payload: ProjectEventPayload) { ... }
```

`ActivityLogListener` in the shared module listens to `'*'` (all events) and persists an `ActivityLog` row for every emission. Services do not need to know about audit logging — it is fully decoupled.

---

## 12. Shared Module

`src/shared/` contains utilities used across all modules:

| File / Class | Purpose |
|---|---|
| `base.entity.ts` | `id`, `createdAt`, `updatedAt`, `deletedAt` |
| `aggregate-root.entity.ts` | Extends BaseEntity; adds domain event list |
| `pagination.dto.ts` | `PaginationQueryDto` (page, limit) |
| `pagination-meta.ts` | `PaginationMeta` value object |
| `paginated-result.ts` | `PaginatedResult<T>` wrapper returned by services |
| `response-envelope.interceptor.ts` | Wraps all responses (see §10) |
| `global-exception.filter.ts` | Maps all exceptions to the error envelope |
| `activity-log.entity.ts` | Audit log row: actorId, action, entityType, entityId, metadata |
| `activity-logger.service.ts` | Service to persist ActivityLog rows |
| `activity-log.listener.ts` | Catches all events → calls logger service |
| `activity-log.controller.ts` | GET endpoints: project feed, task feed, global feed |

`SharedModule` is imported by `AppModule` and re-exports `ActivityLoggerService` for any module that needs to log manually (rare — prefer events).

---

## 13. Testing

**Unit tests** live next to source files (`*.spec.ts`). Run with:

```bash
npm run test           # single run
npm run test:watch     # watch mode
npm run test:cov       # with coverage report
```

**E2E tests** live in `test/` and use a real NestJS application instance + Supertest:

```bash
npm run test:e2e
```

**Patterns:**

- Mock a repository by providing a plain object against its Symbol token:
  ```typescript
  { provide: PROJECT_REPOSITORY, useValue: { findById: jest.fn(), save: jest.fn() } }
  ```
- Test service methods directly; assert on mock calls and return values.
- E2E tests register and log in a test user, then assert full HTTP flows including auth headers.

**All 190 tests must pass** before merging. Run `npm run test && npm run test:e2e` in CI (GitHub Actions workflow also runs typecheck and lint).

---

## 14. Development Workflow

Adding a new feature end-to-end:

1. **Entity** — create `src/modules/<module>/domain/entities/<name>.entity.ts` extending `AggregateRoot`.
2. **Repository interface** — define `I<Name>Repository` and its Symbol in `domain/repositories/`.
3. **TypeORM implementation** — create `TypeOrm<Name>Repository` in `infrastructure/persistence/`.
4. **DTOs** — `Create<Name>Dto`, `Update<Name>Dto`, `<Name>ResponseDto` in `application/dtos/`.
5. **Service** — inject repository via Symbol, implement business logic in `application/services/`.
6. **Controller** — map HTTP routes to service calls in `presentation/controllers/`.
7. **Module** — register entity in `TypeOrmModule.forFeature([...])`, provide repository binding, declare service and controller.
8. **AppModule** — import the new module.
9. **Migration** — `npm run migration:generate -- -n AddNameFeature`, review the generated file, commit it.
10. **Tests** — unit tests for the service, E2E tests for the controller.

**Commit hygiene:** migrations must always be committed together with the entity changes that produced them. Never commit `synchronize: true`.

---

## 15. Environment Variables

All variables are validated by Joi at startup — the app will refuse to start if any required variable is missing or wrong type.

| Variable | Default | Description |
|---|---|---|
| `APP_PORT` | `3000` | HTTP listen port |
| `APP_PREFIX` | `api/v1` | Global route prefix |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |
| `DB_HOST` | — | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | — | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_DATABASE` | — | Database name |
| `DB_SYNCHRONIZE` | `false` | TypeORM auto-sync (keep false) |
| `DB_LOGGING` | `false` | Log SQL queries |
| `JWT_SECRET` | — | HMAC signing secret |
| `JWT_ACCESS_EXPIRATION` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRATION` | `7d` | Refresh token TTL |
| `BCRYPT_ROUNDS` | `12` | Bcrypt work factor |
| `THROTTLE_TTL` | `60000` | Rate limit window (ms) |
| `THROTTLE_LIMIT` | `100` | Max requests per window |

Copy `.env.example` and fill in values. Never commit `.env`.

---

## 16. Docker Setup

**docker-compose.yml** defines three services:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `api` | Built from `Dockerfile` | 3000 | NestJS application |
| `postgres` | `postgres:16-alpine` | 5432 | Primary database |
| `pgadmin` | pgAdmin 4 | 5050 | Database browser UI |

```bash
docker-compose up -d          # start all
docker-compose up -d postgres # start only DB (for local dev)
docker-compose logs -f api    # tail API logs
```

The **Dockerfile** uses a two-stage build:
- **builder** — installs all deps, compiles TypeScript with `tsc`
- **production** — copies `dist/`, installs only production deps, runs via `entrypoint.sh`

`entrypoint.sh` runs `migration:run` before starting the server, so container deploys are migration-safe.

---

## 17. Security Notes

| Concern | Implementation |
|---|---|
| XSS / clickjacking | `helmet` middleware (15+ security headers) |
| Password storage | bcrypt, 12 rounds, `Password` value object |
| Refresh token storage | SHA256-hashed in `RefreshToken` table; rotated on every use |
| Token revocation | All refresh tokens deleted on logout or password reset |
| SQL injection | TypeORM parameterised queries; safe column mapping in filter helpers |
| Sensitive fields | `@Exclude()` on `passwordHash`, `hashedRefreshToken` via ClassSerializerInterceptor |
| Rate limiting | Global ThrottlerGuard — 100 req / 60 s (configurable) |
| CORS | Explicit origin allowlist via `CORS_ORIGINS` env var |
| Input validation | Global ValidationPipe strips and rejects unknown fields |
| Audit trail | Every significant mutation emits an event → ActivityLog row |

Known gaps (tracked for future work):
- Refresh tokens stored in DB table but not yet in HttpOnly cookies.
- `user_roles` join table is missing extra columns modelled in the ER diagram.
- `findByResetToken` implementation is a naive scan (should use a dedicated indexed column).
