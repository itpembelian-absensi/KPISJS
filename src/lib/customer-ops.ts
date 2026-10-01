import { randomUUID } from "crypto";
import { getDb, getMeta, setMeta } from "./db";
import type { MasterCustomer, Pengajuan, PengajuanStatus } from "./types";

const CUSTOMER_CODE_START_META = "customer_code_start";

/** 2 huruf depan nama. Spasi dan tanda baca diabaikan. */
export function customerCodePrefix(name: string): string {
  const letters = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return (letters + "XX").slice(0, 2);
}

export function getCustomerCodeStart(): number {
  const raw = Number(getMeta(CUSTOMER_CODE_START_META) ?? "1");
  if (!Number.isInteger(raw) || raw < 1 || raw > 999) return 1;
  return raw;
}

export function setCustomerCodeStart(start: number): number {
  if (!Number.isInteger(start) || start < 1 || start > 999) {
    throw new Error("Counter awal harus bilangan 1–999");
  }
  setMeta(CUSTOMER_CODE_START_META, String(start));
  return start;
}

/** Pratinjau kode tanpa menyimpan. Nomor lanjut per 2 huruf, tidak mengulang kode yang ada. */
export function previewCustomerCode(name: string): string {
  const prefix = customerCodePrefix(name);
  const start = getCustomerCodeStart();
  const rows = getDb()
    .prepare(`SELECT code FROM customers WHERE code LIKE ?`)
    .all(`${prefix}%`) as Array<{ code: string }>;
  let max = start - 1;
  const pattern = new RegExp(`^${prefix}(\\d{3})$`);
  for (const row of rows) {
    const match = pattern.exec(row.code);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isInteger(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  if (next > 999) {
    throw new Error(`Counter kode customer untuk awalan ${prefix} sudah mencapai 999`);
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
}

type CustomerRow = {
  id: string;
  code: string;
  name: string;
  customer_type: string;
  phone: string;
  email: string;
  npwp: string;
  pic_name: string;
  address: string;
  credit_limit: string;
  term_of_payment: string;
  photo_urls_json: string;
  note: string;
  last_change: string;
  status: PengajuanStatus;
  submission_id: string;
  requester_name: string;
  created_at: string;
  updated_at: string;
};

function parsePhotoUrls(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (url): url is string =>
        typeof url === "string" && url.startsWith("/uploads/pengajuan/"),
    );
  } catch {
    return [];
  }
}

function mapCustomer(row: CustomerRow): MasterCustomer {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    customerType: row.customer_type,
    phone: row.phone,
    email: row.email,
    npwp: row.npwp,
    picName: row.pic_name,
    address: row.address,
    creditLimit: row.credit_limit,
    termOfPayment: row.term_of_payment,
    photoUrls: parsePhotoUrls(row.photo_urls_json),
    note: row.note,
    lastChange: row.last_change,
    status: row.status,
    submissionId: row.submission_id,
    requesterName: row.requester_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function customerCodesBySubmission(): Record<string, string> {
  const rows = getDb()
    .prepare(`SELECT submission_id, code FROM customers`)
    .all() as Array<{ submission_id: string; code: string }>;
  const codes: Record<string, string> = {};
  for (const row of rows) codes[row.submission_id] = row.code;
  return codes;
}

export function getCustomerCodeBySubmission(submissionId: string): string | null {
  const row = getDb()
    .prepare(`SELECT code FROM customers WHERE submission_id = ?`)
    .get(submissionId) as { code: string } | undefined;
  return row?.code ?? null;
}

export function listCustomers(): MasterCustomer[] {
  const rows = getDb()
    .prepare(`SELECT * FROM customers ORDER BY created_at DESC`)
    .all() as CustomerRow[];
  return rows.map(mapCustomer);
}

export function getCustomerByCode(code: string): MasterCustomer | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const row = getDb()
    .prepare(`SELECT * FROM customers WHERE lower(code) = lower(?)`)
    .get(trimmed) as CustomerRow | undefined;
  return row ? mapCustomer(row) : null;
}

/** Simpan customer baru dari pengajuan penambahan. Aman dijalankan ulang. */
export function saveCustomerFromSubmission(
  item: Pengajuan,
  options?: { photos?: boolean },
) {
  if (item.type !== "customer") return;
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM customers WHERE submission_id = ?`)
    .get(item.id) as { id: string } | undefined;
  const now = new Date().toISOString();
  const payload = item.payload;
  if (existing) {
    if (options?.photos) {
      db.prepare(
        `UPDATE customers
         SET status = ?, photo_urls_json = ?, updated_at = ?
         WHERE submission_id = ?`,
      ).run(item.status, JSON.stringify(item.photoUrls), now, item.id);
      return;
    }
    db.prepare(
      `UPDATE customers SET status = ?, updated_at = ? WHERE submission_id = ?`,
    ).run(item.status, now, item.id);
    return;
  }

  const insert = db.prepare(
    `INSERT INTO customers (
      id, code, name, customer_type, phone, email, npwp, pic_name, address,
      credit_limit, term_of_payment, photo_urls_json, note, status,
      submission_id, requester_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const customerName = payload.namaCustomer || item.title;
  let saved = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = previewCustomerCode(customerName);
    try {
      insert.run(
        randomUUID(),
        code,
        customerName,
        payload.tipeCustomer || "",
        payload.telepon || "",
        payload.email || "",
        payload.npwp || "",
        payload.namaPic || "",
        payload.alamat || "",
        payload.limit || "",
        payload.termOfPayment || "",
        JSON.stringify(item.photoUrls),
        item.note,
        item.status,
        item.id,
        item.requesterName,
        item.createdAt || now,
        now,
      );
      saved = true;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("customers.code")) throw error;
    }
  }
  if (!saved) {
    throw new Error("Kode customer bentrok, coba simpan lagi");
  }
}

export function syncCustomerFromSubmission(
  item: Pengajuan,
  options?: { photos?: boolean },
) {
  saveCustomerFromSubmission(item, options);
}

function findCustomerId(code: string, name: string): string | null {
  const db = getDb();
  const trimmedCode = code.trim();
  if (trimmedCode) {
    const byCode = db
      .prepare(`SELECT id FROM customers WHERE lower(code) = lower(?)`)
      .get(trimmedCode) as { id: string } | undefined;
    if (byCode) return byCode.id;
  }
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  const byName = db
    .prepare(`SELECT id FROM customers WHERE lower(name) = lower(?)`)
    .all(trimmedName) as Array<{ id: string }>;
  return byName.length === 1 ? byName[0].id : null;
}

/** Terapkan perubahan limit, TOP, dan catatan setelah pengajuan disetujui. */
export function applyCustomerChange(item: Pengajuan) {
  if (item.type !== "customer_ubah") return;
  if (item.status !== "approved" && item.status !== "done") return;
  const id = findCustomerId(
    item.payload.kodeCustomer || "",
    item.payload.namaCustomer || "",
  );
  if (!id) return;

  const current = getDb()
    .prepare(`SELECT * FROM customers WHERE id = ?`)
    .get(id) as CustomerRow;
  const limit = item.payload.limitBaru?.trim() || current.credit_limit;
  const top = item.payload.termOfPayment?.trim() || current.term_of_payment;
  const lastChange = item.payload.dataBaru?.trim() || current.last_change;
  const photos = parsePhotoUrls(current.photo_urls_json);
  for (const url of item.photoUrls) {
    if (!photos.includes(url)) photos.push(url);
  }

  getDb()
    .prepare(
      `UPDATE customers
       SET credit_limit = ?, term_of_payment = ?, last_change = ?,
           photo_urls_json = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      limit,
      top,
      lastChange,
      JSON.stringify(photos),
      new Date().toISOString(),
      id,
    );
}

/** Isi master customer dari pengajuan penambahan yang sudah ada. */
export function backfillCustomersFromSubmissions() {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM submissions WHERE type = 'customer'`)
    .all() as Array<{
    id: string;
    title: string;
    status: PengajuanStatus;
    payload_json: string;
    note: string;
    photo_urls_json: string | null;
    requester_name: string;
    created_at: string;
  }>;

  for (const row of rows) {
    let payload: Record<string, string> = {};
    try {
      const parsed = JSON.parse(row.payload_json) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value ?? ""),
          ]),
        );
      }
    } catch {
      payload = {};
    }
    saveCustomerFromSubmission({
      id: row.id,
      code: "",
      type: "customer",
      title: row.title,
      status: row.status,
      payload,
      photoUrls: parsePhotoUrls(row.photo_urls_json),
      note: row.note,
      requesterName: row.requester_name,
      requesterDept: "",
      requesterStaffId: null,
      departmentId: "",
      reviewerName: "",
      reviewerNote: "",
      reviewedAt: null,
      completedBy: "",
      completionNote: "",
      completedAt: null,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    });
  }
}
