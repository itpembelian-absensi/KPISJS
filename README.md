# SJS IT Support Helpdesk

Aplikasi antrian tiket support IT untuk SJS — login ber-role, master data, SLA, dan repeat issue.

## Database

Menggunakan **SQLite** via `better-sqlite3`.

File database: `data/itsupport.db` (otomatis dibuat + di-seed saat pertama dijalankan).

## Akun demo

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| staff | staff123 | Staf |
| itstaff | itstaff123 | IT Staf |

## Fitur

- Login + 4 role: **Admin**, **Manager**, **Staf**, **IT Staf**
- Master **Departemen**, **Staf**, **Tim IT**, **User & Role**
- Antrian tiket, assignment handler, SLA, repeat issue, KPI

## Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:7101](http://localhost:7101) → login.
