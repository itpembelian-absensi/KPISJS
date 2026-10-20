import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "itsupport.db");

declare global {
  // eslint-disable-next-line no-var
  var __sjsSqlite: Database.Database | undefined;
}

function createSchema(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kpi_functions (
      id TEXT PRIMARY KEY,
      department_id TEXT,
      name TEXT NOT NULL,
      weight_percent REAL NOT NULL,
      focus TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kpi_projects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      department_id TEXT NOT NULL,
      kpi_function_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      owner_staff_id TEXT,
      start_date TEXT,
      end_date TEXT,
      progress_percent REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kpi_activities (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      project_id TEXT,
      kpi_function_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      assignee_staff_id TEXT,
      activity_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kpi_assessments (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      period_label TEXT NOT NULL,
      staff_id TEXT,
      kpi_function_id TEXT NOT NULL,
      score REAL NOT NULL,
      target_score REAL NOT NULL DEFAULT 100,
      notes TEXT NOT NULL DEFAULT '',
      assessed_by_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_kpi_functions_dept ON kpi_functions(department_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_projects_dept ON kpi_projects(department_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_activities_dept ON kpi_activities(department_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_assessments_dept ON kpi_assessments(department_id);

    CREATE TABLE IF NOT EXISTS kpi_score_indicators (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      kpi_function_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      weight_percent REAL NOT NULL DEFAULT 100,
      metric_type TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kpi_score_ind_dept
      ON kpi_score_indicators(department_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_score_ind_fn
      ON kpi_score_indicators(kpi_function_id);

    CREATE TABLE IF NOT EXISTS kpi_score_templates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      functions_json TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kpi_indicator_actuals (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      period_label TEXT NOT NULL,
      indicator_id TEXT NOT NULL,
      actual_value REAL,
      target_override REAL,
      computed_score REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(staff_id, period_label, indicator_id)
    );
    CREATE INDEX IF NOT EXISTS idx_kpi_ind_actuals_dept
      ON kpi_indicator_actuals(department_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_ind_actuals_staff_period
      ON kpi_indicator_actuals(staff_id, period_label);

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      late_minutes INTEGER NOT NULL DEFAULT 0,
      early_leave_minutes INTEGER NOT NULL DEFAULT 0,
      overtime_minutes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'present',
      source_file TEXT NOT NULL DEFAULT '',
      imported_at TEXT NOT NULL,
      UNIQUE(staff_id, work_date)
    );

    CREATE TABLE IF NOT EXISTS attendance_period_summaries (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      period_label TEXT NOT NULL,
      work_days INTEGER NOT NULL DEFAULT 0,
      present_days INTEGER NOT NULL DEFAULT 0,
      absent_days INTEGER NOT NULL DEFAULT 0,
      late_count INTEGER NOT NULL DEFAULT 0,
      total_late_minutes INTEGER NOT NULL DEFAULT 0,
      total_overtime_minutes INTEGER NOT NULL DEFAULT 0,
      discipline_score REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(staff_id, period_label)
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance_records(staff_id, work_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_summary_period ON attendance_period_summaries(period_label);

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      kpi_function_id TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_staff_id TEXT,
      assignee_id TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      result_notes TEXT,
      events_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (kpi_function_id) REFERENCES kpi_functions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_work_orders_function ON work_orders(kpi_function_id);

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      employee_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      department_id TEXT NOT NULL,
      position TEXT NOT NULL DEFAULT 'Staff',
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS it_team (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('it_staff', 'it_manager')),
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'it_staff', 'assessor')),
      staff_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'rejected')),
      requested_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status
      ON password_reset_requests(status);
    CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user
      ON password_reset_requests(user_id);

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_dept TEXT NOT NULL,
      requester_staff_id TEXT,
      assignee_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      first_response_at TEXT,
      resolved_at TEXT,
      closed_at TEXT,
      satisfaction INTEGER,
      is_repeat INTEGER NOT NULL DEFAULT 0,
      related_ticket_id TEXT,
      root_cause TEXT,
      resolution TEXT,
      events_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_staff_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      version TEXT NOT NULL DEFAULT '1.0',
      steps_json TEXT NOT NULL DEFAULT '[]',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      division_label TEXT NOT NULL DEFAULT 'DIVISI IT',
      document_type TEXT NOT NULL DEFAULT 'STANDARD OPERATING PROCEDURE',
      effective_date TEXT NOT NULL DEFAULT '',
      revision TEXT NOT NULL DEFAULT '-',
      revision_date TEXT NOT NULL DEFAULT '',
      purpose TEXT NOT NULL DEFAULT '',
      materials TEXT NOT NULL DEFAULT '',
      qualifications TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      dispositions_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_sops_active ON sops(active);

    CREATE TABLE IF NOT EXISTS it_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Server',
      ip_address TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      hardware_spec TEXT NOT NULL DEFAULT '',
      os TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      os_credentials_json TEXT NOT NULL DEFAULT '[]',
      apps_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS it_server_logs (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      log_date TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_by_staff_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (server_id) REFERENCES it_servers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_it_server_logs_server ON it_server_logs(server_id);

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('void', 'customer', 'barang', 'perubahan', 'asset', 'akses')),
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected', 'done')),
      payload_json TEXT NOT NULL DEFAULT '{}',
      note TEXT NOT NULL DEFAULT '',
      requester_name TEXT NOT NULL,
      requester_dept TEXT NOT NULL,
      requester_staff_id TEXT,
      department_id TEXT NOT NULL DEFAULT '',
      reviewer_name TEXT NOT NULL DEFAULT '',
      reviewer_note TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT,
      completed_by TEXT NOT NULL DEFAULT '',
      completion_note TEXT NOT NULL DEFAULT '',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_requester ON submissions(requester_staff_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_department ON submissions(department_id);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      customer_type TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      npwp TEXT NOT NULL DEFAULT '',
      pic_name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      credit_limit TEXT NOT NULL DEFAULT '',
      term_of_payment TEXT NOT NULL DEFAULT '',
      photo_urls_json TEXT NOT NULL DEFAULT '[]',
      note TEXT NOT NULL DEFAULT '',
      last_change TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'done')),
      submission_id TEXT NOT NULL UNIQUE,
      requester_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

    CREATE TABLE IF NOT EXISTS kpi_wa_reports (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      activity_id TEXT,
      project_id TEXT,
      title TEXT NOT NULL,
      leader_name TEXT NOT NULL,
      report_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      photo_urls_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'reported',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_kpi_wa_reports_dept ON kpi_wa_reports(department_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_wa_reports_date ON kpi_wa_reports(report_date);
    CREATE INDEX IF NOT EXISTS idx_kpi_wa_reports_act ON kpi_wa_reports(activity_id);

    CREATE TABLE IF NOT EXISTS meeting_notes (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      meeting_time TEXT NOT NULL DEFAULT '',
      attendees TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_by_user_id TEXT NOT NULL DEFAULT '',
      created_by_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meeting_notes_date ON meeting_notes(meeting_date);
    CREATE INDEX IF NOT EXISTS idx_meeting_notes_dept ON meeting_notes(department_id);

    CREATE TABLE IF NOT EXISTS meeting_items (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meeting_items_meeting ON meeting_items(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_meeting_items_status ON meeting_items(status);
  `);

  const meetingCols = db
    .prepare("PRAGMA table_info(meeting_notes)")
    .all() as Array<{ name: string }>;
  if (meetingCols.length > 0) {
    const meetingNames = new Set(meetingCols.map((c) => c.name));
    if (!meetingNames.has("department_ids_json")) {
      db.exec(
        "ALTER TABLE meeting_notes ADD COLUMN department_ids_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
    if (!meetingNames.has("attendee_staff_ids_json")) {
      db.exec(
        "ALTER TABLE meeting_notes ADD COLUMN attendee_staff_ids_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
    if (!meetingNames.has("external_attendees")) {
      db.exec(
        "ALTER TABLE meeting_notes ADD COLUMN external_attendees TEXT NOT NULL DEFAULT ''",
      );
    }
    const legacy = db
      .prepare(
        `SELECT id, department_id FROM meeting_notes
         WHERE department_ids_json IS NULL
            OR trim(department_ids_json) = ''
            OR department_ids_json = '[]'`,
      )
      .all() as Array<{ id: string; department_id: string }>;
    const fillDept = db.prepare(
      "UPDATE meeting_notes SET department_ids_json = ? WHERE id = ?",
    );
    for (const row of legacy) {
      if (!row.department_id) continue;
      fillDept.run(JSON.stringify([row.department_id]), row.id);
    }
  }

  const meetingItemCols = db
    .prepare("PRAGMA table_info(meeting_items)")
    .all() as Array<{ name: string }>;
  if (meetingItemCols.length > 0) {
    const itemNames = new Set(meetingItemCols.map((c) => c.name));
    if (!itemNames.has("start_date")) {
      db.exec(
        "ALTER TABLE meeting_items ADD COLUMN start_date TEXT NOT NULL DEFAULT ''",
      );
    }
    if (!itemNames.has("problem_detail")) {
      db.exec(
        "ALTER TABLE meeting_items ADD COLUMN problem_detail TEXT NOT NULL DEFAULT ''",
      );
    }
    if (!itemNames.has("owner_staff_id")) {
      db.exec(
        "ALTER TABLE meeting_items ADD COLUMN owner_staff_id TEXT NOT NULL DEFAULT ''",
      );
    }
    if (!itemNames.has("owner_staff_ids_json")) {
      db.exec(
        "ALTER TABLE meeting_items ADD COLUMN owner_staff_ids_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
    if (!itemNames.has("department_ids_json")) {
      db.exec(
        "ALTER TABLE meeting_items ADD COLUMN department_ids_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
    const legacyOwners = db
      .prepare(
        `SELECT id, owner_staff_id FROM meeting_items
         WHERE owner_staff_id != ''
           AND (
             owner_staff_ids_json IS NULL
             OR trim(owner_staff_ids_json) = ''
             OR owner_staff_ids_json = '[]'
           )`,
      )
      .all() as Array<{ id: string; owner_staff_id: string }>;
    const fillOwners = db.prepare(
      "UPDATE meeting_items SET owner_staff_ids_json = ? WHERE id = ?",
    );
    for (const row of legacyOwners) {
      fillOwners.run(JSON.stringify([row.owner_staff_id]), row.id);
    }
  }

  // Migrasi kolom SOP formal (aman jika tabel lama tanpa kolom baru)
  const sopCols = db
    .prepare("PRAGMA table_info(sops)")
    .all() as Array<{ name: string }>;
  if (sopCols.length > 0) {
    const sopNames = new Set(sopCols.map((c) => c.name));
    const sopAlters: Array<[string, string]> = [
      ["division_label", "TEXT NOT NULL DEFAULT 'DIVISI IT'"],
      [
        "document_type",
        "TEXT NOT NULL DEFAULT 'STANDARD OPERATING PROCEDURE'",
      ],
      ["effective_date", "TEXT NOT NULL DEFAULT ''"],
      ["revision", "TEXT NOT NULL DEFAULT '-'"],
      ["revision_date", "TEXT NOT NULL DEFAULT ''"],
      ["purpose", "TEXT NOT NULL DEFAULT ''"],
      ["materials", "TEXT NOT NULL DEFAULT ''"],
      ["qualifications", "TEXT NOT NULL DEFAULT ''"],
      ["notes", "TEXT NOT NULL DEFAULT ''"],
      ["dispositions_json", "TEXT NOT NULL DEFAULT '[]'"],
      ["department_id", "TEXT NOT NULL DEFAULT ''"],
    ];
    for (const [col, def] of sopAlters) {
      if (!sopNames.has(col)) {
        db.exec(`ALTER TABLE sops ADD COLUMN ${col} ${def}`);
      }
    }
    // Migrate description → purpose jika purpose masih kosong
    db.exec(
      `UPDATE sops SET purpose = description
       WHERE (purpose IS NULL OR purpose = '')
         AND description IS NOT NULL AND description != ''`,
    );

    // SOP lama tanpa departemen → IT (atau departemen pertama)
    const itDept = db
      .prepare(
        `SELECT id FROM departments WHERE lower(code) = 'it' LIMIT 1`,
      )
      .get() as { id: string } | undefined;
    const anyDept =
      itDept ??
      (db
        .prepare(`SELECT id FROM departments ORDER BY code LIMIT 1`)
        .get() as { id: string } | undefined);
    if (anyDept) {
      db.prepare(
        `UPDATE sops SET department_id = ?
         WHERE department_id IS NULL OR trim(department_id) = ''`,
      ).run(anyDept.id);
    }
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_sops_department ON sops(department_id)`,
    );
  }

  // Migrasi kolom jadwal pengerjaan (aman jika sudah ada)
  const cols = db
    .prepare("PRAGMA table_info(tickets)")
    .all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("scheduled_start")) {
    db.exec("ALTER TABLE tickets ADD COLUMN scheduled_start TEXT");
  }
  if (!names.has("scheduled_end")) {
    db.exec("ALTER TABLE tickets ADD COLUMN scheduled_end TEXT");
  }
  if (!names.has("photo_urls_json")) {
    db.exec(
      "ALTER TABLE tickets ADD COLUMN photo_urls_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("work_photo_urls_json")) {
    db.exec(
      "ALTER TABLE tickets ADD COLUMN work_photo_urls_json TEXT NOT NULL DEFAULT '[]'",
    );
  }

  // Migrasi foto kegiatan (JSON array URL) + frekuensi
  const actCols = db
    .prepare("PRAGMA table_info(kpi_activities)")
    .all() as Array<{ name: string }>;
  const actNames = new Set(actCols.map((c) => c.name));
  if (!actNames.has("photo_urls_json")) {
    db.exec(
      "ALTER TABLE kpi_activities ADD COLUMN photo_urls_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!actNames.has("document_urls_json")) {
    db.exec(
      "ALTER TABLE kpi_activities ADD COLUMN document_urls_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!actNames.has("frequency")) {
    db.exec(
      "ALTER TABLE kpi_activities ADD COLUMN frequency TEXT NOT NULL DEFAULT 'daily'",
    );
  }

  // Migrasi kpi_functions → per departemen
  const kpiCols = db
    .prepare("PRAGMA table_info(kpi_functions)")
    .all() as Array<{ name: string }>;
  const kpiNames = new Set(kpiCols.map((c) => c.name));
  if (!kpiNames.has("department_id")) {
    db.exec("ALTER TABLE kpi_functions ADD COLUMN department_id TEXT");
  }

  // Hapus UNIQUE global pada name (fungsi boleh sama antar dept)
  const kpiIndexes = db
    .prepare("PRAGMA index_list(kpi_functions)")
    .all() as Array<{ name: string; unique: number }>;
  const hasUniqueName = kpiIndexes.some((idx) => {
    if (!idx.unique) return false;
    const cols = db
      .prepare(`PRAGMA index_info('${idx.name.replace(/'/g, "''")}')`)
      .all() as Array<{ name: string }>;
    return cols.length === 1 && cols[0]?.name === "name";
  });
  if (hasUniqueName) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE kpi_functions_mig (
        id TEXT PRIMARY KEY,
        department_id TEXT,
        name TEXT NOT NULL,
        weight_percent REAL NOT NULL,
        focus TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO kpi_functions_mig
        (id, department_id, name, weight_percent, focus, sort_order, active)
      SELECT id, department_id, name, weight_percent, focus, sort_order, active
      FROM kpi_functions;
      DROP TABLE kpi_functions;
      ALTER TABLE kpi_functions_mig RENAME TO kpi_functions;
      CREATE INDEX IF NOT EXISTS idx_kpi_functions_dept ON kpi_functions(department_id);
      PRAGMA foreign_keys = ON;
    `);
  }

  const itDept = db
    .prepare("SELECT id FROM departments WHERE code = 'IT' LIMIT 1")
    .get() as { id: string } | undefined;
  if (itDept) {
    db.prepare(
      "UPDATE kpi_functions SET department_id = ? WHERE department_id IS NULL OR department_id = ''",
    ).run(itDept.id);
  }

  // Akses per-user: menu & batasan departemen
  const userCols = db
    .prepare("PRAGMA table_info(users)")
    .all() as Array<{ name: string }>;
  const userNames = new Set(userCols.map((c) => c.name));
  if (!userNames.has("allowed_menus_json")) {
    db.exec("ALTER TABLE users ADD COLUMN allowed_menus_json TEXT");
  }
  if (!userNames.has("department_scope_json")) {
    db.exec("ALTER TABLE users ADD COLUMN department_scope_json TEXT");
  }
  if (!userNames.has("assessment_staff_ids_json")) {
    db.exec("ALTER TABLE users ADD COLUMN assessment_staff_ids_json TEXT");
  }

  // Migrasi role: tambah 'assessor' (Penilai) ke CHECK constraint users
  const usersTable = db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'`,
    )
    .get() as { sql: string } | undefined;
  if (usersTable?.sql && !usersTable.sql.includes("'assessor'")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE users_mig (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'it_staff', 'assessor')),
        staff_id TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        allowed_menus_json TEXT,
        department_scope_json TEXT,
        assessment_staff_ids_json TEXT,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      );
      INSERT INTO users_mig (
        id, username, password_hash, role, staff_id, active,
        created_at, updated_at, allowed_menus_json, department_scope_json,
        assessment_staff_ids_json
      )
      SELECT
        id, username, password_hash, role, staff_id, active,
        created_at, updated_at, allowed_menus_json, department_scope_json,
        NULL
      FROM users;
      DROP TABLE users;
      ALTER TABLE users_mig RENAME TO users;
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      PRAGMA foreign_keys = ON;
    `);
  }

  // Migrasi it_servers untuk credentials_json dan apps_json serta category
  const itServerCols = db
    .prepare("PRAGMA table_info(it_servers)")
    .all() as Array<{ name: string }>;
  if (itServerCols.length > 0) {
    const itServerNames = new Set(itServerCols.map((c) => c.name));
    if (!itServerNames.has("os_credentials_json")) {
      db.exec("ALTER TABLE it_servers ADD COLUMN os_credentials_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!itServerNames.has("apps_json")) {
      db.exec("ALTER TABLE it_servers ADD COLUMN apps_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!itServerNames.has("category")) {
      db.exec("ALTER TABLE it_servers ADD COLUMN category TEXT NOT NULL DEFAULT 'Server'");
    }
    if (!itServerNames.has("url")) {
      db.exec("ALTER TABLE it_servers ADD COLUMN url TEXT NOT NULL DEFAULT ''");
    }
  }

  // Foto pendukung pengajuan
  const submissionCols = db
    .prepare("PRAGMA table_info(submissions)")
    .all() as Array<{ name: string }>;
  if (submissionCols.length > 0) {
    const submissionNames = new Set(submissionCols.map((c) => c.name));
    if (!submissionNames.has("photo_urls_json")) {
      db.exec(
        "ALTER TABLE submissions ADD COLUMN photo_urls_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
  }

  // Jenis customer_ubah: perubahan data customer di sheet Master Customer
  const submissionsTable = db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'submissions'`,
    )
    .get() as { sql: string } | undefined;
  if (
    submissionsTable?.sql &&
    !submissionsTable.sql.includes("'customer_ubah'")
  ) {
    db.exec(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE submissions_mig (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('void', 'customer', 'barang', 'perubahan', 'asset', 'akses', 'customer_ubah')),
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected', 'done')),
        payload_json TEXT NOT NULL DEFAULT '{}',
        note TEXT NOT NULL DEFAULT '',
        requester_name TEXT NOT NULL,
        requester_dept TEXT NOT NULL,
        requester_staff_id TEXT,
        department_id TEXT NOT NULL DEFAULT '',
        reviewer_name TEXT NOT NULL DEFAULT '',
        reviewer_note TEXT NOT NULL DEFAULT '',
        reviewed_at TEXT,
        completed_by TEXT NOT NULL DEFAULT '',
        completion_note TEXT NOT NULL DEFAULT '',
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        photo_urls_json TEXT NOT NULL DEFAULT '[]'
      );

      INSERT INTO submissions_mig (
        id, code, type, title, status, payload_json, note,
        requester_name, requester_dept, requester_staff_id, department_id,
        reviewer_name, reviewer_note, reviewed_at,
        completed_by, completion_note, completed_at,
        created_at, updated_at, photo_urls_json
      )
      SELECT
        id, code, type, title, status, payload_json, note,
        requester_name, requester_dept, requester_staff_id, department_id,
        reviewer_name, reviewer_note, reviewed_at,
        completed_by, completion_note, completed_at,
        created_at, updated_at, photo_urls_json
      FROM submissions;

      DROP TABLE submissions;
      ALTER TABLE submissions_mig RENAME TO submissions;

      CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
      CREATE INDEX IF NOT EXISTS idx_submissions_requester ON submissions(requester_staff_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_department ON submissions(department_id);

      PRAGMA foreign_keys = ON;
    `);
  }

  // Rantai approval pengajuan (pengaturan) dan salinan per pengajuan
  db.exec(`
    CREATE TABLE IF NOT EXISTS pengajuan_approval_levels (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pengajuan_approval_levels_order
      ON pengajuan_approval_levels(sort_order);

    CREATE TABLE IF NOT EXISTS pengajuan_approval_level_users (
      id TEXT PRIMARY KEY,
      level_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (level_id, user_id),
      FOREIGN KEY (level_id) REFERENCES pengajuan_approval_levels(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pengajuan_approval_level_users_level
      ON pengajuan_approval_level_users(level_id);
    CREATE INDEX IF NOT EXISTS idx_pengajuan_approval_level_users_user
      ON pengajuan_approval_level_users(user_id);

    CREATE TABLE IF NOT EXISTS submission_approval_steps (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      actor_user_id TEXT,
      actor_name TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      acted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_approval_steps_order
      ON submission_approval_steps(submission_id, sort_order);

    CREATE TABLE IF NOT EXISTS submission_approval_assignees (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      UNIQUE (step_id, user_id),
      FOREIGN KEY (step_id) REFERENCES submission_approval_steps(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_submission_approval_assignees_step
      ON submission_approval_assignees(step_id);
    CREATE INDEX IF NOT EXISTS idx_submission_approval_assignees_user
      ON submission_approval_assignees(user_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_asset_categories_order
      ON asset_categories(sort_order, name);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS jenis_data (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jenis_data_order
      ON jenis_data(sort_order, name);
  `);

  const jenisCols = db
    .prepare("PRAGMA table_info(jenis_data)")
    .all() as Array<{ name: string }>;
  const jenisNames = new Set(jenisCols.map((col) => col.name));
  if (!jenisNames.has("code")) {
    db.exec("ALTER TABLE jenis_data ADD COLUMN code TEXT NOT NULL DEFAULT ''");
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_jenis_data_code
      ON jenis_data(code) WHERE code != '';

    CREATE TABLE IF NOT EXISTS perubahan_counters (
      jenis_code TEXT NOT NULL,
      period TEXT NOT NULL,
      last_number INTEGER NOT NULL,
      PRIMARY KEY (jenis_code, period)
    );
  `);

  // Migrasi: tambah kolom username ke tabel kpi_wa_reports
  const waCols = db
    .prepare("PRAGMA table_info(kpi_wa_reports)")
    .all() as Array<{ name: string }>;
  const waNames = new Set(waCols.map((col) => col.name));
  if (!waNames.has("username")) {
    db.exec("ALTER TABLE kpi_wa_reports ADD COLUMN username TEXT NOT NULL DEFAULT ''");
    try {
      db.exec(`
        UPDATE kpi_wa_reports
        SET username = COALESCE(
          (SELECT username FROM users WHERE users.id = kpi_wa_reports.user_id),
          ''
        )
        WHERE username = '' OR username IS NULL
      `);
    } catch {
      /* ignore backfill error */
    }
  }
}

export function getDb(): Database.Database {
  if (!global.__sjsSqlite) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    global.__sjsSqlite = new Database(DB_PATH);
  }

  // Selalu jalankan schema agar tabel baru (mis. kpi_functions) terbuat
  // meski koneksi DB sudah di-cache hot reload.
  createSchema(global.__sjsSqlite);
  return global.__sjsSqlite;
}

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

export function boolToInt(v: boolean): number {
  return v ? 1 : 0;
}

export function intToBool(v: number | boolean): boolean {
  return Boolean(v);
}

export function closeDb() {
  const current = global.__sjsSqlite;
  if (!current) return;
  try {
    current.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    /* ignore */
  }
  try {
    current.close();
  } catch {
    /* ignore */
  }
  global.__sjsSqlite = undefined;
}

export { DB_PATH, DATA_DIR };
