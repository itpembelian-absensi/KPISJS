const MAX_MONEY_DIGITS = 15;

const ONES = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
] as const;

const SCALES = ["", "ribu", "juta", "miliar", "triliun"] as const;

/** Ambil digit dari teks uang. Pemisah dan awalan "Rp" diabaikan. */
export function moneyDigits(value: string): string {
  const raw = value.replace(/\D/g, "");
  const trimmed = raw.replace(/^0+/, "");
  return (trimmed || (raw ? "0" : "")).slice(0, MAX_MONEY_DIGITS);
}

/** 4000000 → 4.000.000 */
export function formatMoneyGrouped(value: string): string {
  const digits = moneyDigits(value);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 4000000 atau 4.000.000 → Rp 4.000.000 */
export function formatMoneyCurrency(value: string): string {
  const grouped = formatMoneyGrouped(value);
  if (!grouped) return "";
  return `Rp ${grouped}`;
}

function spellUnderThousand(n: number): string {
  if (n <= 0) return "";
  if (n < 10) return ONES[n] ?? "";
  if (n === 10) return "sepuluh";
  if (n === 11) return "sebelas";
  if (n < 20) return `${ONES[n - 10]} belas`;
  if (n < 100) {
    const rest = n % 10;
    return `${ONES[Math.floor(n / 10)]} puluh${rest ? ` ${ONES[rest]}` : ""}`;
  }
  const rest = n % 100;
  const hundreds = Math.floor(n / 100);
  const head = hundreds === 1 ? "seratus" : `${ONES[hundreds]} ratus`;
  return rest ? `${head} ${spellUnderThousand(rest)}` : head;
}

function spellInteger(digits: string): string {
  if (!digits) return "";
  if (digits === "0") return "nol";
  const groups: number[] = [];
  let rest = digits;
  while (rest.length > 0) {
    groups.push(Number(rest.slice(-3)));
    rest = rest.slice(0, -3);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i] ?? 0;
    if (!group) continue;
    const scale = SCALES[i] ?? "";
    if (i === 1 && group === 1) {
      parts.push("seribu");
      continue;
    }
    const words = spellUnderThousand(group);
    parts.push(scale ? `${words} ${scale}` : words);
  }
  return parts.join(" ");
}

function capitalizeFirst(text: string): string {
  if (!text) return "";
  return text.charAt(0).toLocaleUpperCase("id-ID") + text.slice(1);
}

/**
 * Pecah teks uang jadi rupiah utuh dan sen.
 * Titik pemisah ribuan diabaikan. Koma, atau satu titik dengan 1–2 digit di belakang, dibaca sebagai sen.
 */
function splitRupiah(value: string): { whole: string; sen: string } | null {
  const text = value.trim().replace(/^rp\.?\s*/i, "").trim();
  if (!text) return null;

  let wholeRaw = text;
  let senRaw = "";
  const commaAt = text.lastIndexOf(",");
  if (commaAt >= 0) {
    wholeRaw = text.slice(0, commaAt);
    senRaw = text.slice(commaAt + 1);
  } else {
    const dot = text.match(/^(\d+)\.(\d{1,2})$/);
    if (dot) {
      wholeRaw = dot[1] ?? "";
      senRaw = dot[2] ?? "";
    }
  }

  const whole = moneyDigits(wholeRaw);
  const sen = senRaw.replace(/\D/g, "").replace(/^0+/, "");
  if (!whole && !sen) return null;
  return { whole: whole || "0", sen };
}

/** 4000000 → "Empat juta rupiah". Kosong jika tidak ada angka. */
export function terbilangRupiah(value: string): string {
  const parts = splitRupiah(value);
  if (!parts) return "";
  const wholeWords = spellInteger(parts.whole);
  if (!wholeWords) return "";
  const sentence = `${capitalizeFirst(wholeWords)} rupiah`;
  if (!parts.sen) return sentence;
  const senWords = spellInteger(parts.sen.replace(/^0+/, "") || "0");
  if (!senWords || senWords === "nol") return sentence;
  return `${sentence} ${senWords} sen`;
}
