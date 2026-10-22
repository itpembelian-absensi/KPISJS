import { getMeta, setMeta } from "./db";

const HOST_KEY = "wa_gowa_host";
const USER_KEY = "wa_gowa_username";
const PASS_KEY = "wa_gowa_password";
const DEVICE_KEY = "wa_gowa_device_id";

export type GowaConfig = {
  host: string;
  username: string;
  password: string;
  deviceId: string;
};

export type GowaPublicConfig = {
  host: string;
  username: string;
  deviceId: string;
  hasPassword: boolean;
};

/** Isi sekali dari gateway kantor. Tidak menimpa nilai yang sudah disimpan. */
export function ensureGowaConfig() {
  if (getMeta(HOST_KEY)) return;
  setMeta(HOST_KEY, "http://192.168.2.226:3000");
  setMeta(USER_KEY, "mintao");
  setMeta(DEVICE_KEY, "33a1b362-88e9-4d75-a800-e2ee31bcb53f");
}

export function normalizeGowaHost(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export function getGowaConfig(): GowaConfig | null {
  ensureGowaConfig();
  const host = normalizeGowaHost(getMeta(HOST_KEY) || "");
  const username = (getMeta(USER_KEY) || "").trim();
  const password = getMeta(PASS_KEY) || "";
  const deviceId = (getMeta(DEVICE_KEY) || "").trim();
  if (!host || !username || !password || !deviceId) return null;
  return { host, username, password, deviceId };
}

export function getGowaPublicConfig(): GowaPublicConfig {
  ensureGowaConfig();
  return {
    host: getMeta(HOST_KEY) || "",
    username: getMeta(USER_KEY) || "",
    deviceId: getMeta(DEVICE_KEY) || "",
    hasPassword: Boolean(getMeta(PASS_KEY)),
  };
}

export function saveGowaConfig(input: {
  host: string;
  username: string;
  password?: string;
  deviceId: string;
}): string | null {
  const host = normalizeGowaHost(input.host);
  const username = input.username.trim();
  const deviceId = input.deviceId.trim();
  const password = input.password ?? "";
  if (!host || !username || !deviceId) {
    return "Host, username, dan device id wajib diisi.";
  }
  const nextPassword = password.trim() || getMeta(PASS_KEY) || "";
  if (!nextPassword) return "Password gateway wajib diisi.";
  setMeta(HOST_KEY, host);
  setMeta(USER_KEY, username);
  setMeta(PASS_KEY, nextPassword);
  setMeta(DEVICE_KEY, deviceId);
  return null;
}

function authHeader(config: GowaConfig): string {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
}

async function gowaFetch(config: GowaConfig, path: string, init?: RequestInit) {
  return fetch(`${config.host}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(config),
      "X-Device-Id": config.deviceId,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
}

function errorText(status: number, body: string): string {
  if (status === 401) return "Username atau password gateway ditolak.";
  try {
    const data = JSON.parse(body) as { message?: string };
    if (data.message) return data.message;
  } catch {
    /* body bukan JSON */
  }
  const plain = body.replace(/\s+/g, " ").trim();
  if (plain && plain.length < 180) return plain;
  return `Gateway menolak permintaan (${status}).`;
}

export async function testGowaConnection(): Promise<{ ok: boolean; detail: string }> {
  const config = getGowaConfig();
  if (!config) return { ok: false, detail: "Gateway WhatsApp belum lengkap." };
  try {
    const res = await gowaFetch(config, "/app/status");
    const body = await res.text();
    if (!res.ok) return { ok: false, detail: errorText(res.status, body) };
    const data = JSON.parse(body) as {
      results?: { is_connected?: boolean; is_logged_in?: boolean; jid?: string };
    };
    const result = data.results;
    if (result?.is_logged_in) {
      const jid = result.jid ? ` (${result.jid})` : "";
      return { ok: true, detail: `WhatsApp terhubung${jid}.` };
    }
    if (result?.is_connected) {
      return { ok: false, detail: "Perangkat terhubung, tetapi belum login WhatsApp." };
    }
    return { ok: false, detail: "Perangkat belum terhubung ke WhatsApp." };
  } catch {
    return { ok: false, detail: "Gateway tidak terjangkau. Periksa host dan jaringan." };
  }
}

export async function sendGowaText(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const config = getGowaConfig();
  if (!config) return { ok: false, error: "Gateway WhatsApp belum diatur." };
  try {
    const res = await gowaFetch(config, "/send/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: errorText(res.status, body) };
    return { ok: true };
  } catch {
    return { ok: false, error: "Gateway tidak terjangkau." };
  }
}
