# ArchPlan Task Manager — Backend Reference Book

> Written for developers who know HTML/CSS/JavaScript but are new to backend development.
> This book explains every technology, library, and architectural pattern used in this project.

---

## Table of Contents

1. [The Big Picture — How a Backend Works](#1-the-big-picture)
2. [TypeScript — JavaScript with Types](#2-typescript)
3. [Node.js — JavaScript on the Server](#3-nodejs)
4. [NestJS — The Application Framework](#4-nestjs)
5. [PostgreSQL — The Database](#5-postgresql)
6. [TypeORM — Talking to the Database](#6-typeorm)
7. [Authentication — JWT & Passport.js](#7-authentication)
8. [Validation — class-validator & class-transformer](#8-validation)
9. [Security Libraries](#9-security-libraries)
10. [API Documentation — Swagger](#10-swagger)
11. [Testing — Jest](#11-testing)
12. [DevOps — Docker & CI/CD](#12-devops)
13. [Design Patterns](#13-design-patterns)
14. [Architecture — Domain-Driven Design](#14-domain-driven-design)
15. [Event-Driven Architecture](#15-event-driven-architecture)
16. [Real-Time — WebSockets & Socket.io](#16-websockets)
17. [How Everything Connects — Request Lifecycle](#17-request-lifecycle)
18. [Glossary](#18-glossary)

---

## 1. The Big Picture

When you write a webpage, the browser runs your JavaScript. The backend is the other half — a program running on a server that the browser talks to over HTTP.

### Frontend vs Backend

```
BROWSER (Frontend)                     SERVER (Backend)
────────────────────                   ─────────────────────────────
HTML/CSS/JS you write      ──HTTP──►   NestJS app receives the request
User sees a UI                         Runs business logic
                           ◄──JSON──   Sends back data (JSON)
                                       PostgreSQL stores/retrieves data
```

### What HTTP Requests Look Like

Your JavaScript (`fetch`) sends requests like this:

```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "secret" }
```

The backend reads that, validates the credentials, and responds:

```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "user": { "id": "uuid", "email": "user@example.com" }
  },
  "meta": null,
  "errors": null
}
```

That wrapper `{ data, meta, errors }` is called a **response envelope** — every endpoint in this project returns that shape.

### HTTP Methods (Verbs)

| Method   | Meaning              | Example                         |
|----------|----------------------|---------------------------------|
| `GET`    | Read data            | `GET /api/v1/projects`          |
| `POST`   | Create something     | `POST /api/v1/projects`         |
| `PATCH`  | Partially update     | `PATCH /api/v1/projects/:id`    |
| `PUT`    | Fully replace        | (not heavily used here)         |
| `DELETE` | Remove something     | `DELETE /api/v1/projects/:id`   |

### HTTP Status Codes

| Code | Meaning                                    |
|------|--------------------------------------------|
| 200  | OK — success                               |
| 201  | Created — resource was created             |
| 400  | Bad Request — your data was invalid        |
| 401  | Unauthorized — not logged in               |
| 403  | Forbidden — logged in but not allowed      |
| 404  | Not Found                                  |
| 429  | Too Many Requests — rate limited           |
| 500  | Internal Server Error — bug on the server  |

---

## 2. TypeScript

TypeScript is JavaScript with a type system on top. It compiles down to plain JavaScript that Node.js runs. The compiler (`tsc`) checks for errors before the code even runs.

### Why Types Matter on the Backend

On the frontend, if you pass the wrong thing to a function, the page might just look wrong. On the backend, passing the wrong type of data to a database query can corrupt data, expose security holes, or crash the server.

### Key TypeScript Concepts Used in This Project

#### Interfaces — Contracts

An interface describes the shape of an object. Nothing is implemented — it's just a promise.

```typescript
// src/modules/identity/domain/repositories/user-repository.interface.ts
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  softDelete(id: string): Promise<void>;
}
```

The concrete class (TypeORM implementation) must fulfil every method listed here.

#### Abstract Classes — Shared Blueprints

Abstract classes can have real implemented methods AND abstract ones (must be implemented by subclasses). You cannot instantiate them directly.

```typescript
// src/shared/domain/base.entity.ts
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  // ... every entity inherits these fields automatically
}
```

Every entity (`User`, `Team`, `Task`, etc.) `extends BaseEntity` and gets `id`, `createdAt`, `updatedAt`, `deletedAt` for free.

#### Decorators — Metadata Annotations

Decorators start with `@`. They attach metadata or behaviour to classes, methods, and properties. TypeScript supports them via `experimentalDecorators: true` in tsconfig.

```typescript
@Entity('users')           // tells TypeORM this class maps to the 'users' table
export class User {
  @PrimaryGeneratedColumn('uuid')   // this column is the primary key, auto UUID
  id: string;

  @Column({ unique: true })         // this maps to a DB column, must be unique
  email: string;

  @IsEmail()                        // validation: must be a valid email
  email: string;
}
```

#### Generics — Reusable Types

Generics let you write code that works with any type while still being type-safe.

```typescript
// PaginatedResult<T> works for tasks, projects, users — any T
export class PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// Usage:
const result: PaginatedResult<Task> = await taskRepo.findAll(page, limit);
// TypeScript knows result.items is Task[]
```

#### Enums — Named Constants

```typescript
export enum TaskStatus {
  BACKLOG = 'backlog',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

// Usage: task.status = TaskStatus.IN_PROGRESS
// Much safer than raw strings — typos are caught at compile time
```

#### Promises and async/await

Every database call takes time. Instead of blocking everything, JavaScript uses async operations. `async/await` is the modern way to write them:

```typescript
// Without async/await (callback hell):
userRepo.findById(id).then(user => {
  if (user) {
    user.name = newName;
    userRepo.save(user).then(saved => { console.log(saved); });
  }
});

// With async/await (clean, readable):
async function updateUser(id: string, newName: string) {
  const user = await userRepo.findById(id);  // waits for DB result
  if (user) {
    user.name = newName;
    const saved = await userRepo.save(user); // waits again
    return saved;
  }
}
```

The `await` keyword pauses execution of that function until the Promise resolves, but does NOT block other requests — Node.js handles many requests concurrently.

---

## 3. Node.js

Node.js is a JavaScript runtime built on Chrome's V8 engine. It lets JavaScript run outside the browser, on a server.

### Key Characteristics

**Single-threaded event loop:** Node.js runs on one thread but handles thousands of concurrent connections using non-blocking I/O. While waiting for a database response, it handles other requests.

**npm (Node Package Manager):** The ecosystem for installing libraries (packages). `package.json` lists all dependencies.

```json
// package.json (simplified)
{
  "dependencies": {
    "@nestjs/core": "^11.0.0",    // the framework
    "typeorm": "^0.3.28",         // the ORM
    "pg": "^8.x",                 // PostgreSQL driver
    "bcrypt": "^5.x"              // password hashing
  }
}
```

**Important:** This project requires `"C:\Program Files\nodejs\npm.cmd"` (v11) with `--legacy-peer-deps` due to peer dependency conflicts.

---

## 4. NestJS

NestJS is the application framework — the backbone that structures how your server is built. Think of it like a very opinionated set of rules and tools built on top of Node.js.

> Analogy: If Node.js is raw lumber, NestJS is a prefabricated house kit — all the pieces fit together by design.

### The Core Concepts

#### Modules — Organizational Units

A module groups related code. The app is a tree of modules:

```
AppModule
├── IdentityModule       (users, auth)
├── OrganizationModule   (teams)
├── ProjectManagementModule (projects, tasks)
├── TimeTrackingModule
├── SharedModule         (activity log, base classes)
└── ...
```

Each module declares what it provides and what it needs:

```typescript
// src/modules/identity/identity.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Role]),  // which DB tables to use
    JwtModule.registerAsync({ ... }),                   // JWT configuration
    PassportModule,                                     // authentication
  ],
  providers: [
    AuthService,               // business logic
    UserService,
    JwtStrategy,               // how to validate tokens
    LocalStrategy,
    TypeOrmUserRepository,     // DB access
  ],
  controllers: [
    AuthController,            // HTTP endpoints
    UserController,
  ],
  exports: [UserService],      // other modules can use UserService
})
export class IdentityModule {}
```

#### Dependency Injection (DI)

This is one of the most important patterns in this codebase. Instead of classes creating their own dependencies, dependencies are **injected** by the framework.

```typescript
// BAD — tightly coupled, hard to test:
export class AuthService {
  private userRepo = new TypeOrmUserRepository(); // creates it itself
}

// GOOD — loosely coupled, testable:
export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,  // injected by NestJS
    private readonly jwtService: JwtService,      // injected by NestJS
  ) {}
}
```

NestJS reads the constructor parameters, finds the correct registered provider, and passes it automatically. This is why you see `@Injectable()` on services — it marks them as injectable.

**Benefits:**
- Easy to test: swap the real DB with a mock
- Decoupled: `AuthService` doesn't know (or care) which specific repo it gets
- Single instance: by default, providers are singletons (one instance shared everywhere)

#### Controllers — HTTP Endpoints

Controllers handle incoming HTTP requests. Each method handles one route:

```typescript
// src/modules/identity/presentation/controllers/auth.controller.ts
@Controller('auth')                    // all routes start with /auth
@ApiTags('Authentication')             // Swagger grouping
export class AuthController {

  constructor(private readonly authService: AuthService) {}

  @Post('login')                       // POST /api/v1/auth/login
  @HttpCode(HttpStatus.OK)             // respond with 200 (not default 201)
  @ApiOperation({ summary: 'Login' })  // Swagger doc
  async login(@Body() dto: LoginDto) { // @Body() extracts JSON body
    return this.authService.login(dto);
  }

  @Get('profile')                      // GET /api/v1/auth/profile
  @UseGuards(JwtAuthGuard)             // must have valid JWT token
  async getProfile(@CurrentUser() user: AuthenticatedUser) {  // custom decorator
    return this.userService.findById(user.id);
  }
}
```

**Parameter decorators:**

| Decorator         | What it extracts                              |
|-------------------|-----------------------------------------------|
| `@Body()`         | The JSON request body                         |
| `@Param('id')`    | URL parameter (e.g., `/projects/:id`)         |
| `@Query('page')`  | Query string (e.g., `/projects?page=2`)       |
| `@Headers()`      | HTTP headers                                  |
| `@CurrentUser()`  | Custom — extracts the logged-in user          |

#### Services — Business Logic

Services contain the "what the app actually does" logic. They are injected into controllers (and other services).

```typescript
// src/modules/project-management/application/services/project.service.ts
@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProjectDto, currentUser: AuthenticatedUser) {
    // 1. Authorization check
    this.assertCanCreateProject(currentUser);

    // 2. Build the domain object
    const project = new Project();
    project.name = dto.name;
    project.createdBy = currentUser.id;

    // 3. Persist to database
    const saved = await this.projectRepo.save(project);

    // 4. Emit event (for activity log, notifications, etc.)
    this.eventEmitter.emit('project.created', { projectId: saved.id, userId: currentUser.id });

    return saved;
  }
}
```

#### Guards — Access Control

Guards decide whether a request can proceed. They run before the controller method.

```typescript
// src/modules/identity/infrastructure/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
// This guard checks: "Does the request have a valid JWT token?"
// If not → 401 Unauthorized is returned automatically

// src/modules/identity/infrastructure/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
// This guard checks: "Does the user have the required role?"
// If not → 403 Forbidden
```

Applied with `@UseGuards()`:
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
async findOne(@Param('id') id: string) { ... }
```

#### Interceptors — Request/Response Transformation

Interceptors wrap around controllers — they can modify requests before they reach the controller, and modify responses before they go back to the client.

```typescript
// src/shared/infrastructure/response-envelope.interceptor.ts
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        data: data instanceof PaginatedResult ? data.items : data,
        meta: data instanceof PaginatedResult ? data.meta : null,
        errors: null,
      }))
    );
  }
}
```

This is registered globally in `app.module.ts` — every single response is wrapped in `{ data, meta, errors }` without each controller having to do it manually.

#### Pipes — Validation & Transformation

Pipes process incoming data before it reaches the controller. The global validation pipe is set up in `main.ts`:

```typescript
// src/main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,         // strip unknown properties (security!)
  forbidNonWhitelisted: true, // throw error if unknown properties sent
  transform: true,         // auto-convert strings to numbers where declared
}));
```

With `transform: true`, if your DTO says `@IsInt() page: number` and the query string sends `"2"` (a string), the pipe automatically converts it to the number `2`.

#### Exception Filters — Error Handling

Exception filters catch errors and convert them to proper HTTP responses:

```typescript
// src/shared/infrastructure/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    response.status(status).json({
      data: null,
      meta: null,
      errors: [{ message: errorMessage }],
    });
  }
}
```

When code throws `throw new NotFoundException('Project not found')`, this filter catches it and returns a proper 404 JSON response with the error envelope.

#### Custom Decorators

You can create your own decorators to extract data from requests:

```typescript
// src/modules/identity/infrastructure/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // set by JwtStrategy.validate()
  },
);

// Usage in controller:
@Get('profile')
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  // user is automatically extracted from the JWT payload
}
```

#### The Module Lifecycle

```
Request arrives
      │
      ▼
  Middleware (helmet, cookie-parser, CORS)
      │
      ▼
    Guard (JwtAuthGuard checks the token)
      │
      ▼
    Interceptor (before: can log, transform request)
      │
      ▼
    Pipe (validate & transform DTO)
      │
      ▼
  Controller method runs
      │
      ▼
    Service(s) called
      │
      ▼
  Repository → Database
      │
      ▼
    Interceptor (after: wraps in response envelope)
      │
      ▼
  Response sent to client
```

---

## 5. PostgreSQL

PostgreSQL is the relational database. Data is stored in **tables** with **rows** and **columns**, like a spreadsheet — except tables can link to each other via **foreign keys**.

### Relational Concepts

#### Tables and Rows

```sql
-- The 'users' table has these columns:
id          | email             | first_name | created_at  | deleted_at
------------|-------------------|------------|-------------|------------
uuid-1      | alice@example.com | Alice      | 2026-01-01  | NULL
uuid-2      | bob@example.com   | Bob        | 2026-01-02  | NULL
```

`deleted_at = NULL` means not deleted. This project uses **soft deletes** — rows are never actually removed, just marked with a deletion timestamp. This preserves history and allows recovery.

#### Foreign Keys — Linking Tables

```sql
-- projects table
id      | name          | team_id   | created_by
--------|---------------|-----------|------------
proj-1  | "Website Redo"| team-uuid | user-uuid

-- team_id references teams.id
-- created_by references users.id
```

When you query a project with its team, PostgreSQL performs a **JOIN** — combining data from multiple tables in one query.

#### Indexes

Indexes make queries fast. Without an index, finding `WHERE email = 'alice@example.com'` requires scanning every row. With an index on `email`, PostgreSQL jumps directly to the right row.

#### UUIDs vs Auto-increment IDs

This project uses UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`) for all primary keys instead of sequential integers (1, 2, 3...). UUIDs:
- Can be generated by the app without asking the DB
- Don't reveal the number of records in the system
- Safe to generate across multiple servers

#### JSONB Columns

PostgreSQL supports storing JSON documents in a column:

```typescript
// User entity
@Column({ type: 'jsonb', nullable: true })
preferences: Record<string, any> | null;
// Stored as: { "theme": "dark", "notifications": true }
```

---

## 6. TypeORM

TypeORM is the **Object-Relational Mapper (ORM)**. Instead of writing raw SQL, you write TypeScript classes and TypeORM translates them into SQL queries.

> Analogy: TypeORM is like a translator between your TypeScript objects and the database's SQL language.

### Entities — Table Definitions

An entity class maps to a database table. Each property maps to a column:

```typescript
// src/modules/project-management/domain/entities/task.entity.ts
@Entity('tasks')                        // → maps to the 'tasks' table
export class Task extends BaseEntity {  // inherits id, createdAt, updatedAt, deletedAt

  @Column({ length: 500 })
  title: string;                        // → VARCHAR(500) NOT NULL

  @Column({ type: 'text', nullable: true })
  description: string | null;           // → TEXT NULL

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.BACKLOG })
  status: TaskStatus;                   // → ENUM column

  @Column({ name: 'estimated_hours', type: 'decimal', nullable: true })
  estimatedHours: number | null;        // → DECIMAL NULL

  @ManyToOne(() => Project, project => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;                     // → project_id UUID FK → projects.id
```

### Relationships

#### One-to-Many / Many-to-One

```typescript
// One Project has many Tasks:
@Entity('projects')
export class Project {
  @OneToMany(() => Task, task => task.project)
  tasks: Task[];
}

// Many Tasks belong to one Project:
@Entity('tasks')
export class Task {
  @ManyToOne(() => Project, project => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;
}
```

#### Many-to-Many (via join entity)

When a many-to-many relationship needs extra data (like a role), this project uses a **standalone join entity** instead of TypeORM's built-in `@ManyToMany`:

```typescript
// TaskAssignee is a standalone entity (not pure ManyToMany)
// because we need to store which role the assignee has
@Entity('task_assignees')
export class TaskAssignee {
  @ManyToOne(() => Task) task: Task;
  @ManyToOne(() => User) user: User;
  @Column() role: string;           // the extra column that justifies the entity
}
```

### Repository Pattern with TypeORM

TypeORM provides a built-in `Repository<Entity>` class:

```typescript
// src/modules/identity/infrastructure/persistence/typeorm-user.repository.ts
@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)            // TypeORM injects Repository<User>
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: ['userRoles', 'userRoles.role'],  // eager-load roles
    });
  }

  async findAll(skip: number, take: number): Promise<[User[], number]> {
    return this.repo.findAndCount({
      where: { deletedAt: IsNull() },    // only non-deleted users
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }
}
```

### QueryBuilder — Complex Queries

For complex queries with filters and sorting:

```typescript
const qb = this.taskRepo.createQueryBuilder('task')
  .leftJoinAndSelect('task.assignee', 'assignee')
  .where('task.project_id = :projectId', { projectId })
  .andWhere('task.status IN (:...statuses)', { statuses })
  .orderBy('task.created_at', 'DESC')
  .skip((page - 1) * limit)
  .take(limit);

const [tasks, total] = await qb.getManyAndCount();
```

### Soft Deletes

Instead of `DELETE FROM tasks WHERE id = ?`, soft delete does:
```sql
UPDATE tasks SET deleted_at = NOW() WHERE id = ?
```

TypeORM automatically filters out soft-deleted records from all queries when you use `@DeleteDateColumn`. Restore by setting `deletedAt = null`.

### Database Synchronization

In `app.config.ts`, `DB_SYNCHRONIZE: true` (dev only) makes TypeORM automatically alter the database schema to match your entities when the app starts. In production this should be `false` — use migrations instead.

---

## 7. Authentication

Authentication answers: "Who are you?" This project uses **JWT** (JSON Web Tokens) with **Passport.js**.

### JWT — JSON Web Tokens

A JWT is a string with three base64-encoded parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIn0.signature
    HEADER                              PAYLOAD                                       SIGNATURE
```

**Header:** Algorithm used to sign (HS256)
**Payload (claims):** The data inside the token (user id, email, roles, expiry)
**Signature:** HMAC of header+payload using `JWT_SECRET` — proves it wasn't tampered with

When a user logs in:
1. Server validates email/password
2. Server creates a JWT signed with `JWT_SECRET`
3. Server sends token to client
4. Client sends token in every future request: `Authorization: Bearer <token>`
5. Server verifies signature — no database lookup needed!

**Access Token:** Short-lived (15 minutes). Used for API calls.
**Refresh Token:** Long-lived (7 days). Stored in the DB (hashed). Used only to get a new access token.

```
Login ──► Access Token (15m) + Refresh Token (7d, httpOnly cookie)
API calls ──► Authorization: Bearer <access token>
Token expires ──► POST /auth/refresh (uses cookie) ──► New access token
```

### Passport.js — Authentication Strategies

Passport.js provides pluggable "strategies" for different auth methods:

#### LocalStrategy — Email/Password Login

```typescript
// src/modules/identity/infrastructure/strategies/local.strategy.ts
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException();
    return user;  // attached to request.user
  }
}
```

Used only on the login endpoint (`@UseGuards(LocalAuthGuard)`).

#### JwtStrategy — Token Validation

```typescript
// src/modules/identity/infrastructure/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    // Called after token signature is verified
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      orgId: payload.orgId,
    };
    // This return value becomes request.user
  }
}
```

Used on all protected endpoints (`@UseGuards(JwtAuthGuard)`).

### Password Hashing — bcrypt

Passwords are NEVER stored in plain text. bcrypt is a one-way hashing algorithm:

```typescript
// Storing a password:
const hash = await bcrypt.hash('myPassword123', 12);  // 12 = work factor (slow on purpose)
// Stored in DB: "$2b$12$..." (60 chars)

// Verifying:
const matches = await bcrypt.compare('myPassword123', storedHash);  // true or false
```

The work factor (12) makes each hash take ~250ms on modern hardware. This is intentionally slow to make brute-force attacks impractical — even if the database is stolen, cracking the passwords would take years.

### Role-Based Access Control (RBAC)

The project uses roles (`admin`, `manager`, `member`) to control what users can do:

```typescript
// Defined via custom decorator:
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')             // only admins and managers can list all projects
async findAll() { ... }

// Services do additional authorization checks:
private assertTeamManagerOrAdmin(user: AuthenticatedUser, teamId: string) {
  const isManager = user.roles.includes('admin') || this.isTeamManager(teamId, user.id);
  if (!isManager) throw new ForbiddenException('Only managers can perform this action');
}
```

---

## 8. Validation

### class-validator — Decorators for Validation Rules

DTOs (Data Transfer Objects) define the shape and validation rules for incoming data:

```typescript
// src/modules/identity/application/dtos/register.dto.ts
export class RegisterDto {
  @IsEmail()                    // must be valid email format
  email: string;

  @IsString()
  @MinLength(8)                 // at least 8 characters
  @MaxLength(128)               // at most 128 characters
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, { message: 'Password too weak' })
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsOptional()                 // this field is not required
  @IsString()
  orgName?: string;
}
```

When the global `ValidationPipe` is active, it automatically runs these validators on the incoming JSON body. If validation fails, a `400 Bad Request` is returned with specific error messages — the controller method is never called.

### class-transformer — Transforming Data

class-transformer converts plain JSON objects into typed class instances, and can exclude/expose properties:

```typescript
// User entity
@Column({ name: 'password_hash' })
@Exclude()                        // never included in response JSON
passwordHash: string;
```

The `ClassSerializerInterceptor` (registered globally) automatically applies these transformations when serializing responses.

```typescript
// Also used for transformation:
export class PaginationQueryDto {
  @Type(() => Number)             // convert string "2" → number 2
  @IsInt()
  page: number = 1;
}
```

---

## 9. Security Libraries

### Helmet — HTTP Security Headers

```typescript
// src/main.ts
app.use(helmet());
```

Helmet sets various HTTP headers that protect against common web vulnerabilities:

| Header                        | Protects Against                              |
|-------------------------------|-----------------------------------------------|
| `X-Content-Type-Options`      | MIME sniffing attacks                         |
| `X-Frame-Options`             | Clickjacking (embedding in iframes)           |
| `Content-Security-Policy`     | Cross-site scripting (XSS)                    |
| `Strict-Transport-Security`   | Forces HTTPS                                  |
| `X-XSS-Protection`            | Browser-level XSS filter                      |

### @nestjs/throttler — Rate Limiting

Prevents abuse by limiting how many requests a client can make:

```typescript
// app.module.ts
ThrottlerModule.forRootAsync({
  useFactory: (config: ConfigService) => [{
    ttl: config.get('THROTTLE_TTL'),     // time window in ms (default 60000 = 1 min)
    limit: config.get('THROTTLE_LIMIT'), // max requests per window (default 100)
  }],
})
```

`ThrottlerGuard` is registered as `APP_GUARD` — it applies globally to every endpoint. If a client sends 101 requests in a minute, the 101st gets a `429 Too Many Requests` response.

### CORS — Cross-Origin Resource Sharing

Browsers block JavaScript from fetching data from a different domain by default. CORS headers tell the browser which domains are allowed:

```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS,  // e.g., 'http://localhost:4200'
  credentials: true,                  // allow cookies to be sent
});
```

### HttpOnly Cookies

Refresh tokens are sent as `httpOnly` cookies:

```typescript
// auth.controller.ts
response.cookie('refreshToken', tokens.refreshToken, {
  httpOnly: true,    // JavaScript CANNOT read this cookie — prevents XSS theft
  secure: true,      // only sent over HTTPS
  sameSite: 'strict', // not sent in cross-site requests — prevents CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

---

## 10. Swagger

Swagger (OpenAPI) automatically generates interactive API documentation:

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('ArchPlan API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Visit `http://localhost:3000/api/docs` to see and test all endpoints in the browser.

The `@ApiProperty()`, `@ApiOperation()`, `@ApiTags()` decorators provide metadata:

```typescript
@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateTaskDto) { ... }
}
```

---

## 11. Testing

### Jest — Test Framework

Jest is the test runner. It finds files ending in `.spec.ts` and runs them:

```typescript
// src/modules/identity/application/services/auth.service.spec.ts
describe('AuthService', () => {

  // Set up mocks before each test:
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: IUserRepository,
          useValue: {                         // mock the repository
            findByEmail: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepo = module.get(IUserRepository);
  });

  it('should throw UnauthorizedException for wrong password', async () => {
    userRepo.findByEmail.mockResolvedValue(mockUser);

    await expect(
      authService.login({ email: 'a@b.com', password: 'wrong' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return tokens on successful login', async () => {
    userRepo.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({ email: 'a@b.com', password: 'correct' });

    expect(result.accessToken).toBeDefined();
    expect(userRepo.save).toHaveBeenCalled(); // refresh token was saved
  });
});
```

**Key Jest concepts:**
- `describe()` — groups related tests
- `it()` / `test()` — individual test case
- `expect().toBe()` / `.toEqual()` / `.rejects.toThrow()` — assertions
- `jest.fn()` — creates a mock function
- `mockResolvedValue()` — mocks an async return value
- `beforeEach()` — runs before every test (reset state)

---

## 12. DevOps

### Docker — Containerization

Docker packages the app and all its dependencies into a **container** — an isolated environment that runs identically everywhere.

```dockerfile
# Dockerfile (multi-stage build)

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps      # install dependencies
COPY . .
RUN npm run build                  # compile TypeScript → dist/

# Stage 2: Production image (smaller)
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]       # run compiled app
```

Multi-stage build: the `builder` stage has dev tools (TypeScript compiler, etc.). The `production` stage only copies the compiled output — much smaller image.

### docker-compose.yml — Local Development

```yaml
services:
  api:                          # the NestJS app
    build: .
    ports: ["3000:3000"]
    environment:
      DB_HOST: postgres
    depends_on: [postgres]

  postgres:                     # the database
    image: postgres:16
    environment:
      POSTGRES_DB: archplan_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data  # persist data

  pgadmin:                      # database UI at localhost:5050
    image: dpage/pgadmin4
    ports: ["5050:80"]
```

Run `docker-compose up` to start the entire stack locally with one command.

### GitHub Actions — CI/CD

CI/CD = Continuous Integration / Continuous Deployment. Every time code is pushed to GitHub, automated checks run:

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - uses: actions/checkout@v4      # get the code
      - run: npm ci                    # install deps
      - run: npm run lint              # check code style
      - run: npm run typecheck         # TypeScript compilation
      - run: npm test                  # run all 190 tests
      - run: npm run build             # ensure it compiles
```

If any step fails, the push is flagged as failing. This prevents broken code from reaching production.

---

## 13. Design Patterns

### Repository Pattern

**Problem:** Business logic (services) shouldn't know how data is stored. If you decide to switch from PostgreSQL to MongoDB, you shouldn't have to rewrite your services.

**Solution:** Define a repository **interface** in the domain layer. The service depends on the interface. The infrastructure layer provides the concrete implementation.

```
IUserRepository (interface — in domain/)
        ↑
        │ implements
        │
TypeOrmUserRepository (concrete — in infrastructure/)
        │
        │ uses
        ↓
TypeORM Repository<User>
        │
        ↓
PostgreSQL
```

```typescript
// Domain layer (doesn't know about TypeORM):
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Infrastructure layer (TypeORM-specific):
export class TypeOrmUserRepository implements IUserRepository {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
  findByEmail(email: string) { return this.repo.findOne({ where: { email } }); }
  save(user: User) { return this.repo.save(user); }
}

// Service (only knows about the interface):
export class AuthService {
  constructor(private readonly userRepo: IUserRepository) {}
  // Could be TypeORM, MongoDB, or even a mock — doesn't matter
}
```

### Factory Pattern

Used implicitly by NestJS's DI container — the framework creates (constructs) all service instances for you.

### Singleton Pattern

By default, every `@Injectable()` service is a singleton — one instance is created and shared across all uses. This means:
- State stored in a service is shared across all requests
- Be careful with mutable state in services!

### Observer Pattern (Event-Driven)

Services emit events; listeners react to them:

```typescript
// Emitter (publisher):
this.eventEmitter.emit('task.created', { taskId, userId, projectId });

// Listener (subscriber):
@OnEvent('task.created')
async handleTaskCreated(payload: TaskCreatedEvent) {
  await this.activityLogger.log(payload.userId, 'TASK_CREATED', 'task', payload.taskId);
}
```

Multiple listeners can react to the same event independently. Adding a new listener doesn't require changing the emitting code.

### Template Method Pattern

`BaseEntity` and `AggregateRoot` define the template (structure) that all entities follow. Concrete entities fill in the specific details:

```typescript
// Template (abstract):
abstract class BaseEntity {
  id: string;         // every entity has this
  createdAt: Date;    // and this
  updatedAt: Date;    // and this
  deletedAt: Date;    // and this
}

// Concrete (inherits structure):
class Task extends BaseEntity {
  title: string;      // task-specific fields
  status: TaskStatus;
}
```

### Value Objects

Value objects represent domain concepts with no identity — two value objects with the same data are equal:

```typescript
// src/modules/identity/domain/value-objects/password.vo.ts
export class Password {
  private readonly hashed: string;

  private constructor(hashed: string) {
    this.hashed = hashed;
  }

  static async create(plainText: string): Promise<Password> {
    if (plainText.length < 8) throw new Error('Password too short');
    const hashed = await bcrypt.hash(plainText, 12);
    return new Password(hashed);
  }

  async verify(plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, this.hashed);
  }

  getValue(): string { return this.hashed; }
}
```

The password business rules (minimum length, hashing) live inside the value object — not scattered across services.

### Builder Pattern (via DTOs)

DTOs act as structured builders for creating domain objects:

```typescript
// DTO carries the validated input:
class CreateProjectDto {
  @IsString() name: string;
  @IsUUID() teamId: string;
  @IsOptional() description?: string;
}

// Service builds the entity from the DTO:
const project = new Project();
project.name = dto.name;
project.teamId = dto.teamId;
project.description = dto.description ?? null;
project.status = ProjectStatus.ACTIVE; // default not in DTO
const saved = await this.repo.save(project);
```

---

## 14. Domain-Driven Design

DDD is an approach to organizing complex software around the **business domain** — the real-world concepts the app is about.

### Bounded Contexts

Large systems are split into **bounded contexts** — each is a self-contained model of one part of the domain:

```
┌─────────────────────┐  ┌─────────────────────┐
│   Identity Context  │  │ Organization Context │
│ ──────────────────  │  │ ──────────────────── │
│  User               │  │  Team                │
│  Role               │  │  TeamMembership      │
│  RefreshToken       │  │                      │
└─────────────────────┘  └─────────────────────┘

┌──────────────────────────┐  ┌────────────────────────┐
│ Project-Management       │  │  Time-Tracking Context │
│ Context                  │  │ ───────────────────    │
│ ────────────────────     │  │  TimeEntry             │
│  Project                 │  │                        │
│  Task                    │  │                        │
│  TaskAssignee            │  │                        │
│  Comment                 │  │                        │
└──────────────────────────┘  └────────────────────────┘
```

Each context has its own definition of "User." In Identity, User has a password hash. In Project-Management, User is just referenced by ID when assigning tasks.

### Layered Architecture

Each bounded context (module) has four layers:

```
presentation/     ← HTTP Controllers (talk to the world)
    │
application/      ← Services, DTOs, Commands (orchestrate)
    │
domain/           ← Entities, Value Objects, Repository Interfaces (business rules)
    │
infrastructure/   ← TypeORM repos, guards, strategies (technical details)
```

**The Dependency Rule:** Dependencies only point inward. Domain layer knows nothing about infrastructure. Application layer knows nothing about HTTP.

```
presentation → application → domain ← infrastructure
                                ↑
                      (infrastructure implements
                       domain interfaces)
```

### Aggregates

An **aggregate** is a cluster of domain objects treated as one unit. The **aggregate root** is the entry point — you can only modify the cluster through the root.

`Task` is an aggregate root. `ChecklistItem`, `TaskAssignee`, and `Comment` belong to the Task aggregate:

```typescript
// You don't save a ChecklistItem directly —
// you go through the Task:
task.addChecklistItem('Write tests');
await taskRepository.save(task); // saves task + checklist items together
```

`AggregateRoot` in this project extends `BaseEntity` and adds domain event tracking:

```typescript
export abstract class AggregateRoot extends BaseEntity {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
  // Events are dispatched after the aggregate is saved
}
```

### Ubiquitous Language

DDD emphasizes using the same terms in code as in business conversations. When a product manager says "a Task can be moved to another Project," the code has a method called `moveTask(taskId, targetProjectId)` — not `updateTaskProjectId()`.

---

## 15. Event-Driven Architecture

Instead of one service directly calling another (tight coupling), services emit **events** and any number of **listeners** can react.

### @nestjs/event-emitter

```typescript
// Registration in app.module.ts:
EventEmitterModule.forRoot({ wildcard: true })
```

**Emitting an event:**
```typescript
// src/modules/project-management/application/services/task.service.ts
async updateStatus(taskId: string, status: TaskStatus, user: AuthenticatedUser) {
  const task = await this.taskRepo.findById(taskId);
  const previousStatus = task.status;
  task.status = status;
  await this.taskRepo.save(task);

  // Any listener subscribed to 'task.status_changed' will be called:
  this.eventEmitter.emit('task.status_changed', {
    taskId,
    userId: user.id,
    previousStatus,
    newStatus: status,
  });
}
```

**Listening to events:**
```typescript
// src/shared/application/listeners/activity-log.listener.ts
@Injectable()
export class ActivityLogListener {

  @OnEvent('task.status_changed')
  async handleTaskStatusChanged(payload: TaskStatusChangedEvent) {
    await this.activityLogger.log(
      payload.userId,
      `STATUS_CHANGED: ${payload.previousStatus} → ${payload.newStatus}`,
      'task',
      payload.taskId,
    );
  }

  @OnEvent('task.*')  // wildcard — all task events
  async handleAnyTaskEvent(payload: any) { ... }
}
```

**Events used in this project:**

| Module              | Events                                                          |
|---------------------|-----------------------------------------------------------------|
| Identity            | (handled directly)                                              |
| Organization        | `team.created`, `team.updated`, `team.deleted`, `team.member_added`, `team.member_removed` |
| Project-Management  | `project.created/updated/deleted`, `task.created/updated/status_changed/deleted/assigned/unassigned/moved` |
| Time-Tracking       | `time.started`, `time.stopped`                                  |

The `ActivityLogListener` subscribes to all 15 of these and records them in the `activity_logs` table.

### Benefits of Event-Driven Design

1. **Decoupled:** `TaskService` doesn't import or call `ActivityLoggerService` directly
2. **Extensible:** Add a new listener (e.g., send a push notification on `task.assigned`) without touching `TaskService`
3. **Audit trail:** Every state change is automatically logged

---

## 16. WebSockets

HTTP is **request-response** — the client asks, server answers. WebSockets maintain a persistent two-way connection — the server can push data to the client without a request.

### Socket.io via @nestjs/websockets

```typescript
// src/modules/realtime/realtime.gateway.ts
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGINS },
})
export class RealtimeGateway {

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-project')
  handleJoinProject(client: Socket, projectId: string) {
    client.join(`project:${projectId}`); // subscribe to a room
  }

  // Called from a service when a task is updated:
  emitTaskUpdated(projectId: string, task: Task) {
    this.server
      .to(`project:${projectId}`)      // send only to clients in this room
      .emit('task-updated', task);
  }
}
```

**Client-side (your JavaScript):**
```javascript
const socket = io('http://localhost:3000');
socket.emit('join-project', 'project-uuid');
socket.on('task-updated', (task) => {
  // Update the UI when someone else changes a task
  renderTask(task);
});
```

---

## 17. Request Lifecycle

Let's trace a real request: `PATCH /api/v1/tasks/abc-123` with body `{ "status": "done" }`.

### Step 1 — Middleware

`main.ts` middleware runs first:
- **helmet** — adds security headers to the response
- **cookie-parser** — parses cookies (finds the refresh token if present)
- **CORS** — checks if the request origin is allowed

### Step 2 — Global ThrottlerGuard

Checks: has this IP sent more than 100 requests in the last minute? If yes → `429 Too Many Requests`.

### Step 3 — JwtAuthGuard

The route has `@UseGuards(JwtAuthGuard)`. Passport's JWT strategy:
1. Extracts `Authorization: Bearer eyJhbGc...` header
2. Verifies the signature using `JWT_SECRET`
3. Checks token hasn't expired
4. Calls `JwtStrategy.validate(payload)` → returns `{ id, email, roles, orgId }`
5. Attaches result to `request.user`

If the token is missing or invalid → `401 Unauthorized`.

### Step 4 — ValidationPipe

The route has `@Body() dto: UpdateTaskStatusDto`. The pipe:
1. Parses the JSON body
2. Instantiates `UpdateTaskStatusDto`
3. Runs `class-validator` decorators (`@IsEnum(TaskStatus)` etc.)
4. If validation fails → `400 Bad Request` with detailed errors

### Step 5 — Controller Method

```typescript
@Patch(':id/status')
async updateStatus(
  @Param('id') id: string,           // 'abc-123'
  @Body() dto: UpdateTaskStatusDto,  // { status: 'done' } (validated)
  @CurrentUser() user: AuthenticatedUser,  // { id, email, roles }
) {
  return this.taskService.updateStatus(id, dto.status, user);
}
```

### Step 6 — Service

```typescript
async updateStatus(taskId: string, status: TaskStatus, user: AuthenticatedUser) {
  const task = await this.taskRepo.findById(taskId);
  if (!task) throw new NotFoundException(`Task ${taskId} not found`);

  this.assertAssignedOrManager(user, task); // authorization check

  task.status = status;
  const saved = await this.taskRepo.save(task);

  this.eventEmitter.emit('task.status_changed', { taskId, userId: user.id, ... });

  return saved;
}
```

### Step 7 — Repository

```typescript
async findById(id: string): Promise<Task | null> {
  return this.repo.findOne({ where: { id }, relations: ['assignee', 'project'] });
}
// TypeORM generates: SELECT * FROM tasks LEFT JOIN ... WHERE id = $1 AND deleted_at IS NULL

async save(task: Task): Promise<Task> {
  return this.repo.save(task);
  // TypeORM generates: UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2
}
```

### Step 8 — Event Listener

`ActivityLogListener.handleTaskStatusChanged()` is called asynchronously:
```typescript
await this.activityLogger.log(userId, 'STATUS_CHANGED: backlog → done', 'task', taskId);
// INSERT INTO activity_logs ...
```

### Step 9 — Response Interceptor

The controller returned the `Task` object. The `ResponseEnvelopeInterceptor` wraps it:

```json
{
  "data": {
    "id": "abc-123",
    "title": "Implement login",
    "status": "done",
    "updatedAt": "2026-03-16T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

The client receives this with status `200 OK`.

---

## 18. Glossary

| Term                 | Definition                                                                                  |
|----------------------|---------------------------------------------------------------------------------------------|
| **API**              | Application Programming Interface — a set of endpoints your app exposes for others to use  |
| **Aggregate**        | A cluster of domain objects treated as one unit, with one aggregate root                    |
| **Aggregate Root**   | The entry point to an aggregate; only way to modify the cluster                             |
| **Bounded Context**  | An isolated model of one part of the domain (e.g., Identity, Project-Management)            |
| **CORS**             | Cross-Origin Resource Sharing — browser security that controls which domains can make API calls |
| **DTO**              | Data Transfer Object — a class that defines the shape of data flowing in or out             |
| **DDD**              | Domain-Driven Design — architecture philosophy centered on the business domain              |
| **DI**               | Dependency Injection — framework provides dependencies instead of classes creating them     |
| **Entity**           | A domain object with a unique identity (UUID) that persists to the database                 |
| **Event Emitter**    | Broadcasts that something happened; listeners react without tight coupling                  |
| **Guard**            | NestJS component that decides if a request is allowed to proceed                            |
| **httpOnly Cookie**  | A cookie JavaScript cannot read — protects tokens from XSS theft                           |
| **Interceptor**      | Wraps around controllers to transform requests or responses                                 |
| **Interface**        | TypeScript contract — defines what methods a class must have                                |
| **JWT**              | JSON Web Token — a signed token containing user identity data                               |
| **Middleware**       | Code that runs on every request before routing (helmet, CORS, cookie-parser)                |
| **Migration**        | A versioned script that alters the database schema                                          |
| **Module**           | NestJS organizational unit that groups related providers, controllers, and imports          |
| **ORM**              | Object-Relational Mapper — maps TypeScript classes to database tables                       |
| **Pipe**             | NestJS component that validates and transforms incoming data                                |
| **Provider**         | Any injectable class in NestJS (services, repositories, guards, strategies)                 |
| **RBAC**             | Role-Based Access Control — permissions granted based on user roles                         |
| **Repository**       | Abstraction over data persistence — encapsulates all DB queries for one entity              |
| **REST**             | Representational State Transfer — a style for HTTP APIs using nouns + verbs                 |
| **Singleton**        | One shared instance of a class used everywhere                                              |
| **Soft Delete**      | Marking a record as deleted (via `deleted_at`) without removing it from the DB             |
| **Strategy Pattern** | An algorithm/behavior that can be swapped at runtime (JWT strategy, Local strategy)         |
| **UUID**             | Universally Unique Identifier — a random 128-bit ID used as a primary key                  |
| **Value Object**     | An immutable domain concept with no identity (Password, Email) — equal if same data        |
| **WebSocket**        | A persistent bidirectional connection — allows server to push data to the client            |

---

*This reference book covers the complete technology stack of the ArchPlan Task Manager as of March 2026. Every pattern and library mentioned is actually in use in this codebase — nothing hypothetical.*
