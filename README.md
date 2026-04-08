# ArchPlan Task Manager

NestJS REST API for project/task management with time tracking, team organization, and activity logging.

## Prerequisites

- **Node.js** 20+
- **Docker Engine** installed inside WSL (not Docker Desktop)
- **WSL 2** (Ubuntu recommended)

## Dev Setup

### 1. Environment

Copy the example env file:

```bash
cp .env.example .env
```

For local development, set these values in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=archplan
DB_PASSWORD=archplan_secret
DB_DATABASE=archplan
DB_SYNCHRONIZE=true
DB_LOGGING=true

JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

APP_PORT=3000
APP_PREFIX=api/v1
CORS_ORIGINS=http://localhost:4200,http://localhost:3000

BCRYPT_ROUNDS=12
```

### 2. Start PostgreSQL (from WSL terminal)

Since Docker runs inside WSL, open a WSL terminal and navigate to the project directory:

```bash
cd /mnt/c/Projects/ai/claude/pm-app
```

Start only the database and pgAdmin services:

```bash
docker compose up -d postgres pgadmin
```

Verify the container is healthy:

```bash
docker compose ps
```

PostgreSQL is exposed on port `5432` and is accessible from Windows via `localhost` thanks to WSL 2 port forwarding.

> **pgAdmin** is available at [http://localhost:5050](http://localhost:5050)
> - Email: `admin@archplan.local`
> - Password: `admin`

### 3. Install dependencies

Back in your Windows terminal (or VSCode terminal):

```bash
npm install
```

> **Note:** If you hit peer dependency conflicts, use:
> ```bash
> npm install --legacy-peer-deps
> ```

### 4. Run the app in dev mode

```bash
npm run start:dev
```

The API starts at [http://localhost:3000/api/v1](http://localhost:3000/api/v1) with hot-reload enabled.

### 5. Seed the database (optional)

```bash
npm run seed
```

## Useful endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/health` | Health check with DB ping |
| `POST /api/v1/auth/register` | Register a new user |
| `POST /api/v1/auth/login` | Login |
| `GET /api/v1/projects` | List projects (auth required) |
| `GET /api/v1/teams` | List teams (auth required) |

## Running tests

```bash
npm test
```

## Docker (full stack)

To run the entire stack (API + Postgres + pgAdmin) in containers from WSL:

```bash
cd /mnt/c/Projects/ai/claude/pm-app
docker compose up -d
```

## Stopping services

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```
