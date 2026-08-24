import fs from "fs";
import path from "path";
import { closeDb, DATA_DIR, DB_PATH, getDb } from "./db";

export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;
const SQLITE_MAGIC = "SQLite format 3\0";

export function getDatabaseFileInfo(): {
  exists: boolean;
  size: number;
  updatedAt: string | null;
} {
  if (!fs.existsSync(DB_PATH)) {
    return { exists: false, size: 0, updatedAt: null };
  }
  const st = fs.statSync(DB_PATH);
  return {
    exists: true,
    size: st.size,
    updatedAt: st.mtime.toISOString(),
  };
}

export async function createDatabaseBackup(): Promise<Buffer> {
  const db = getDb();
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    /* lanjut backup snapshot */
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const tmp = path.join(DATA_DIR, `itsupport-backup-${Date.now()}.tmp.db`);
  try {
    await db.backup(tmp);
    return fs.readFileSync(tmp);
  } finally {
    if (fs.existsSync(tmp)) {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  }
}

export function isSqliteDatabase(buf: Buffer): boolean {
  if (buf.length < 16) return false;
  return buf.subarray(0, 16).toString("utf8") === SQLITE_MAGIC;
}

export function restoreDatabase(buf: Buffer): { error?: string } {
  if (!isSqliteDatabase(buf)) {
    return { error: "File bukan database SQLite yang valid." };
  }
  if (buf.length > MAX_BACKUP_BYTES) {
    return { error: "File backup terlalu besar (maksimal 200MB)." };
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const incoming = path.join(DATA_DIR, "itsupport.incoming.db");
  const previous = path.join(DATA_DIR, `itsupport.prev-${Date.now()}.db`);

  fs.writeFileSync(incoming, buf);

  closeDb();

  try {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, previous);
    }
    fs.copyFileSync(incoming, DB_PATH);
    for (const extra of [`${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
      if (fs.existsSync(extra)) fs.unlinkSync(extra);
    }
  } catch (err) {
    if (fs.existsSync(previous)) {
      try {
        fs.copyFileSync(previous, DB_PATH);
      } catch {
        /* ignore */
      }
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Gagal menimpa file database.",
    };
  } finally {
    if (fs.existsSync(incoming)) {
      try {
        fs.unlinkSync(incoming);
      } catch {
        /* ignore */
      }
    }
  }

  try {
    getDb();
  } catch (err) {
    if (fs.existsSync(previous)) {
      closeDb();
      fs.copyFileSync(previous, DB_PATH);
      getDb();
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "File backup tidak bisa dibuka sebagai database.",
    };
  }

  if (fs.existsSync(previous)) {
    try {
      fs.unlinkSync(previous);
    } catch {
      /* biarkan file prev jika gagal dihapus */
    }
  }

  return {};
}

export function backupDownloadName(): string {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `itsupport-backup-${stamp}.db`;
}
