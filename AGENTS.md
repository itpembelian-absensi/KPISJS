<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# KPISJS — Project Rules for AI Agents

## Project Overview

Aplikasi **KPI & IT Helpdesk** untuk PT SJS. Next.js 16 (App Router, TypeScript, TailwindCSS v4), database SQLite via `better-sqlite3`, deploy via Docker + GitHub Actions CI/CD.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS v4 via `@tailwindcss/postcss` |
| Database | SQLite via `better-sqlite3` (file-based, no external DB) |
| Auth | Cookie-based session (`sjs_session`) |
| Deploy | Docker (standalone output) + GitHub Actions self-hosted runner |

## Project Structure

```
KPISJS/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   │   ├── api/          # API endpoints
│   │   ├── kpi/          # KPI pages
│   │   ├── login/        # Login page
│   │   ├── master/       # Master data pages
│   │   ├── sop/          # SOP pages
│   │   ├── tickets/      # Ticket management pages
│   │   ├── work-orders/  # Work order pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Dashboard
│   │   └── globals.css   # Global styles
│   ├── components/       # Reusable React components
│   ├── lib/              # Business logic & data layer
│   │   ├── db.ts         # Database connection, schema, migrations
│   │   ├── store.ts      # Data access layer, seeder, CRUD operations
│   │   ├── types.ts      # TypeScript type definitions
│   │   ├── auth.ts       # Authentication logic
│   │   ├── session.ts    # Session management
│   │   └── ...           # Other business modules
│   └── middleware.ts     # Auth middleware
├── data/                 # SQLite database (gitignored, volume-mounted)
├── public/uploads/       # User uploaded files (gitignored, volume-mounted)
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Container configuration
└── .github/workflows/    # CI/CD pipeline
```

## Critical Rules

### 1. Database Location

- Database file: `data/itsupport.db`
- Path defined in `src/lib/db.ts`: `path.join(process.cwd(), "data")`
- **NEVER** hardcode absolute paths. Always use `process.cwd()` relative paths.
- `data/` directory is gitignored and Docker volume-mounted. NEVER commit production data.

### 2. No Environment Variables

- This project does **NOT** use `process.env` for any configuration.
- Port is hardcoded to `7101` in `package.json` scripts.
- Database path is relative to `process.cwd()`.
- If you need to add env vars in the future, update `Dockerfile`, `docker-compose.yml`, and document them here.

### 3. Native Dependencies

- `better-sqlite3`, `pdfkit`, `xlsx` are listed in `serverExternalPackages` in `next.config.ts`.
- These require native compilation. **NEVER** remove them from `serverExternalPackages`.
- If adding a new native dependency, also add it to `serverExternalPackages`.

### 4. Next.js Standalone Output

- `next.config.ts` has `output: "standalone"` for Docker optimization.
- **NEVER** remove this setting — it's required for the Docker build.

---

## Database Migration Guide

> **THIS IS CRITICAL.** All schema changes MUST follow these patterns. Failure to do so WILL break production.

### How Migrations Work

Migrations run **automatically on every app start** via this call chain:

```
getDb() → createSchema(db)     ← in src/lib/db.ts
ensureDb() → seedIfEmpty()     ← in src/lib/store.ts
           → migrateOrphanKpiFunctions()
           → seedKpiFunctionsIfEmpty()
```

There is **NO** separate migration tool, CLI, or migration files. All schema changes go directly into the `createSchema()` function in `src/lib/db.ts`.

### Pattern 1: Adding a New Table

Add `CREATE TABLE IF NOT EXISTS` inside the `createSchema()` function's main `db.exec()` block.

```typescript
// In createSchema(), inside the db.exec(`...`) block:
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
```

**Rules:**
- Always use `IF NOT EXISTS`
- Always use `TEXT PRIMARY KEY` with UUID values (use `randomUUID()` from `crypto`)
- Use `TEXT` for dates (ISO 8601 format)
- Use `INTEGER` for booleans (0/1), convert with `boolToInt()`/`intToBool()` from `db.ts`
- Use `TEXT` with `DEFAULT '[]'` for JSON array columns (suffix with `_json`)
- Add indexes for frequently queried columns

### Pattern 2: Adding a New Column

Add migration code **AFTER** the main `db.exec()` block in `createSchema()`. Always check if the column already exists first.

```typescript
// After the main db.exec() block in createSchema():

// Migrasi: tambah kolom xyz ke tabel abc
const abcCols = db
  .prepare("PRAGMA table_info(abc)")
  .all() as Array<{ name: string }>;
const abcNames = new Set(abcCols.map((c) => c.name));
if (!abcNames.has("new_column")) {
  db.exec("ALTER TABLE abc ADD COLUMN new_column TEXT NOT NULL DEFAULT ''");
}
```

**Rules:**
- ALWAYS check with `PRAGMA table_info()` before `ALTER TABLE`
- ALWAYS provide a `DEFAULT` value for new `NOT NULL` columns
- For multiple columns on the same table, batch them:

```typescript
const alters: Array<[string, string]> = [
  ["column_a", "TEXT NOT NULL DEFAULT ''"],
  ["column_b", "INTEGER NOT NULL DEFAULT 0"],
];
for (const [col, def] of alters) {
  if (!colNames.has(col)) {
    db.exec(`ALTER TABLE my_table ADD COLUMN ${col} ${def}`);
  }
}
```

### Pattern 3: Changing a Column Type or CHECK Constraint

SQLite doesn't support `ALTER COLUMN`. You must recreate the table. Follow this exact pattern:

```typescript
// Check if migration is needed (e.g., check if constraint already updated)
const tableInfo = db
  .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'my_table'`)
  .get() as { sql: string } | undefined;

if (tableInfo?.sql && !tableInfo.sql.includes("'new_value'")) {
  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE my_table_mig (
      -- full new schema here
    );

    INSERT INTO my_table_mig (col1, col2, ...)
    SELECT col1, col2, ...
    FROM my_table;

    DROP TABLE my_table;
    ALTER TABLE my_table_mig RENAME TO my_table;

    -- Recreate all indexes
    CREATE INDEX IF NOT EXISTS idx_my_table_col ON my_table(col);

    PRAGMA foreign_keys = ON;
  `);
}
```

**Rules:**
- ALWAYS wrap with `PRAGMA foreign_keys = OFF/ON`
- ALWAYS use a condition to check if migration is needed (idempotent!)
- ALWAYS recreate all indexes after the rename
- ALWAYS copy ALL columns (including any previously migrated ones)
- Use `_mig` suffix for the temporary table name

### Pattern 4: Adding Seed Data

Seed data goes in `src/lib/store.ts` in the `seedIfEmpty()` or related functions.

**Rules:**
- `seedIfEmpty()` only runs when `users` table is empty
- For new seed data that should always run, add a new function and call it from `ensureDb()`
- Use idempotent checks: `SELECT COUNT(*)`, `WHERE NOT EXISTS`, etc.

### Migration Anti-Patterns (NEVER DO THESE)

❌ **NEVER** use `DROP TABLE` without the full recreate-and-copy pattern  
❌ **NEVER** assume a column exists without checking `PRAGMA table_info()`  
❌ **NEVER** create a migration that isn't idempotent (must be safe to run multiple times)  
❌ **NEVER** put migrations in separate files — all go in `createSchema()` in `db.ts`  
❌ **NEVER** modify the `CREATE TABLE IF NOT EXISTS` block for existing tables (add ALTER migrations instead)  
❌ **NEVER** delete old migration code from `createSchema()` — it must stay for databases that haven't been migrated yet  

---

## CI/CD & Docker

### Deployment Architecture

- **GitHub Actions** with self-hosted runner (label: `kpisjs`)
- **Docker** with standalone Next.js build
- **Smart rebuild detection**: only rebuilds Docker image when Docker environment files change

### Docker Environment Files (trigger full rebuild)

Changes to these files trigger a full `docker compose build --no-cache`:
- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `package-lock.json`
- `next.config.ts`

### Quick Deploy (no rebuild)

Changes to any other files (e.g., `src/`, `public/`) trigger a quick deploy:
1. Copy source into running container
2. `npm run build` inside container
3. Restart container

### Persistent Data (Docker Volumes)

These directories are volume-mounted and survive container rebuilds:
- `./data/` → `/app/data/` (SQLite database)
- `./public/uploads/` → `/app/public/uploads/` (uploaded files)

### When Adding Dependencies

If you add a new npm package (`npm install xyz`):
- `package.json` and `package-lock.json` will change
- This **WILL** trigger a full Docker rebuild (by design)
- If the package has native bindings, add it to `serverExternalPackages` in `next.config.ts`

---

## Code Conventions

### TypeScript Types

- All types defined in `src/lib/types.ts`
- Database rows use `snake_case` (e.g., `staff_id`)
- Application objects use `camelCase` (e.g., `staffId`)
- Map functions convert between the two (e.g., `mapUser()`, `mapTicket()`)

### ID Generation

- Always use `randomUUID()` from Node.js `crypto` module
- IDs are stored as `TEXT PRIMARY KEY` in SQLite

### API Routes

- Located in `src/app/api/`
- Follow Next.js App Router conventions
- Protected by middleware (cookie-based auth)

### Language

- UI text and comments are in **Bahasa Indonesia**
- Code identifiers (variables, functions) are in **English**
