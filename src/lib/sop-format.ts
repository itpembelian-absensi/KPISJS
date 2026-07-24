/** Nilai untuk <input type="date"> (YYYY-MM-DD) */
export function toDateInputValue(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Contoh lama: 01-Sep-23 / 01-Sep-2023
  const m = s.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})$/);
  if (m) {
    const months: Record<string, string> = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const mon = months[m[2].toLowerCase()];
    if (mon) {
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      return `${year}-${mon}-${String(Number(m[1])).padStart(2, "0")}`;
    }
  }

  return "";
}

/** Tampilkan tanggal SOP (id-ID), fallback ke teks asli */
export function formatSopDate(raw: string | null | undefined): string {
  if (!raw || !String(raw).trim()) return "-";
  const iso = toDateInputValue(raw);
  if (!iso) return String(raw).trim();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
