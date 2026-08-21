# SJS KPI & IT Helpdesk

Aplikasi antrian tiket support IT & KPI management untuk SJS — login ber-role, master data, SLA, repeat issue, work orders, dan SOP.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: TailwindCSS v4
- **Database**: SQLite via `better-sqlite3`
- **Deploy**: Docker + GitHub Actions CI/CD (self-hosted runner)

## Database

File database: `data/itsupport.db` (otomatis dibuat + di-seed saat pertama dijalankan).

Schema & migrasi dikelola secara otomatis di `src/lib/db.ts` — lihat [AGENTS.md](AGENTS.md) untuk detail pattern migrasi.

## Login

Akun dibuat oleh Admin di **Master Data → User & Role**. Jika lupa password, ajukan permintaan di halaman login; password baru hanya bisa diatur oleh Admin atau IT Staf.

Saat database masih kosong, sistem men-seed akun awal. Ganti password segera setelah login pertama.

## Fitur

- Login + multi-role: **Admin**, **Manager**, **Staf**, **IT Staf**, **Assessor**
- Master **Departemen**, **Staf**, **Tim IT**, **User & Role**
- Antrian tiket, assignment handler, SLA, repeat issue
- KPI management, scoring, templates, assessments
- Work Orders & SOP management
- Attendance tracking & import
- Report generation (PDF, Excel)

## Development

```bash
npm install
npm run dev
```

Buka [http://localhost:7101](http://localhost:7101) → login.

## Docker Deployment

### First time setup

```bash
# Clone & setup
git clone https://github.com/itpembelian-absensi/KPISJS.git
cd KPISJS
mkdir -p data public/uploads

# Build & run
docker compose up -d --build

# Verify
curl http://localhost:7101/login
```

### CI/CD

Deploy otomatis via GitHub Actions saat push ke `master`:
- **Full rebuild**: jika `Dockerfile`, `docker-compose.yml`, `package.json`, `package-lock.json`, atau `next.config.ts` berubah
- **Quick deploy**: jika hanya source code yang berubah (lebih cepat, tanpa rebuild Docker image)

Self-hosted runner label: `kpisjs`

### Persistent Data

Data berikut di-mount sebagai Docker volumes dan **tidak akan hilang** saat rebuild:

| Path | Isi |
|------|-----|
| `./data/` | SQLite database |
| `./public/uploads/` | File foto yang diupload |

## Project Structure

```
src/
├── app/           # Pages & API routes (App Router)
├── components/    # Reusable React components
├── lib/           # Business logic & data layer
│   ├── db.ts      # Schema, migrations, DB connection
│   ├── store.ts   # CRUD operations, seeder
│   └── types.ts   # TypeScript type definitions
└── middleware.ts  # Auth middleware
```
