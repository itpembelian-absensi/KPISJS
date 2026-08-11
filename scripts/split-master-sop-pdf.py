"""Split Master SOP PDF rev(3) into per-SOP PDFs + structured manifest."""
from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from pypdf import PdfReader, PdfWriter

SRC = Path(r"d:\KPI\SOP IT\Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (3).pdf")
WORD_FALLBACK = Path(
    r"d:\ActivityDaily IT\Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (2).docx"
)
OUT_DIR = Path(r"d:\KPI\SOP IT\_split")
OUT_DIR.mkdir(parents=True, exist_ok=True)

DAFTAR = {
    "001": (
        "Penanganan Support, Keluhan, dan Tiket IT",
        "IT Support Lead",
    ),
    "002": (
        "KPI dan Service Level Agreement Divisi IT",
        "IT Manager",
    ),
    "003": (
        "Manajemen Proyek IT, UAT, Go-Live, dan Hypercare",
        "IT Project Lead",
    ),
    "004": (
        "Onboarding, Mutasi, dan Offboarding Karyawan – IT & HR Support",
        "HRD Manager / IT Manager",
    ),
    "005": (
        "Manajemen Hak Akses, Administrator, Remote Desktop, dan Instalasi Software",
        "IT Security Administrator",
    ),
    "006": (
        "Pengelolaan Aset IT, Pergantian Hardware, Pembelian, dan Disposal",
        "IT Hardware Lead / Purchasing",
    ),
    "007": (
        "Penamaan File, Shared Folder Bulanan, Read-Only, dan Serah Terima Data",
        "IT Infrastructure / Head Department",
    ),
    "008": (
        "Backup Data G, Rotasi Media, dan Uji Restore",
        "IT Infrastructure Lead",
    ),
    "009": (
        "Maintenance Server, Network, dan Infrastruktur",
        "IT Infrastructure Lead",
    ),
    "010": (
        "Pengecekan CCTV, Rekaman, dan Eskalasi Gangguan",
        "IT Hardware / GA Security",
    ),
    "011": (
        "Penanganan Insiden Keamanan Informasi dan Disaster Recovery",
        "IT Manager",
    ),
    "012": (
        "Update Credit Limit, Term of Payment, Block/Overdue, dan Approval SO",
        "Finance Manager / Marketing Manager / IT Application",
    ),
    "013": (
        "Pembuatan dan Perubahan Master Customer",
        "Marketing Manager / Finance / IT Master Data",
    ),
    "014": (
        "Pengajuan Pembayaran dan Pencairan Cek Gudang – Serah ke Finance",
        "Finance Manager",
    ),
    "015": (
        "Approval dan Eksekusi Adjustment Inventory",
        "Warehouse Head / Accounting / IT Application",
    ),
    "016": (
        "Transaksi Ganti Baju / Pengalihan Customer",
        "Marketing Manager / Accounting / Finance / IT Application",
    ),
    "017": (
        "Void Transaksi SJS/CV/SPL",
        "Accounting Manager / Finance Manager / IT Application",
    ),
    "018": (
        "Penambahan dan Perubahan Chart of Account",
        "Accounting Manager / IT Application",
    ),
    "019": (
        "Pembuatan Custom Report dan Katalog Report Bulanan",
        "Department Head / IT Reporting",
    ),
    "020": (
        "Closing XO dan Penerbitan Laporan Keuangan",
        "Accounting Manager / IT Application",
    ),
    "021": (
        "Penghapusan Bill Dinar Menyesuaikan Rencana PB1",
        "Finance Process Owner / IT Database",
    ),
    "022": (
        "Pembuatan Entity Baru di Orlansoft",
        "Business Sponsor / Accounting / IT Application",
    ),
    "023": (
        "Pembuatan Aplikasi Internal / Custom",
        "IT Development Lead",
    ),
    "024": (
        "Portfolio Proyek IT: Uang Jalan, Orlansoft Web, Berkat Tirta, Talenta Gudang, dan CRM",
        "IT Manager / Project Sponsors",
    ),
    "025": (
        "Perubahan Data Orlansoft dan Eksekusi Query Database",
        "IT Database Lead / Data Owner",
    ),
    "026": (
        "Pengelolaan Vendor IT, Lisensi, dan Akses Pihak Ketiga",
        "IT Manager / Purchasing",
    ),
    "027": (
        "Klasifikasi Data, Retensi, dan Pemusnahan Aman",
        "IT Manager / Data Owners",
    ),
}

CODE_RE = re.compile(r"Kode:\s*IT-SOP/2026/(\d{3})", re.I)


def page_text(page) -> str:
    try:
        return page.extract_text() or ""
    except Exception:
        return ""


def extract_title(chunk: str, num: str) -> str:
    # Prefer line containing title before "Berlaku"
    m = re.search(
        r"STANDARD OPERATING PROCEDURE[^\n]*\n(.+?)\s*Berlaku:",
        chunk,
        re.S | re.I,
    )
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()
        title = re.sub(r"^Revisi:[^\n]*", "", title, flags=re.I).strip()
        if title and "Kerahasiaan" not in title and "Halaman" not in title:
            if num == "001" and "KPI" in title.upper():
                return DAFTAR[num][0]
            return title
    return DAFTAR.get(num, (f"SOP IT-SOP/2026/{num}", ""))[0]


def extract_section(chunk: str, start: str, ends: list[str]) -> str:
    end_pat = "|".join(ends)
    m = re.search(
        rf"{start}\s*(.+?)(?={end_pat})",
        chunk,
        re.S | re.I,
    )
    if not m:
        return ""
    return re.sub(r"\s+", " ", m.group(1)).strip()


def parse_steps(chunk: str) -> list[dict]:
    m = re.search(
        r"(?:\d+\.\s*)?Prosedur\s*(.+?)(?=\n\d+\.\s*KPI|\n\d+\.\s*Dokumen|\nPengesahan SOP|\nPT SAHABAT JAYA SUKSES Kode:|$)",
        chunk,
        re.S | re.I,
    )
    if not m:
        return []
    body = m.group(1)
    # Remove table header noise
    body = re.sub(
        r"No\.\s*PIC\s*/\s*Jabatan\s*Aktivitas\s*Output\s*/\s*Bukti",
        "",
        body,
        flags=re.I,
    )
    steps: list[dict] = []
    # Numbered blocks: "1\nPIC\nactivity..."
    parts = re.split(r"(?m)^(?=\d{1,2}\s*$)", body)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        hm = re.match(r"^(\d{1,2})\s*\n(.+)$", part, re.S)
        if not hm:
            continue
        order = int(hm.group(1))
        rest = hm.group(2).strip()
        lines = [ln.strip() for ln in rest.splitlines() if ln.strip()]
        if not lines:
            continue
        title = lines[0][:120]
        body_txt = " ".join(lines[1:]) if len(lines) > 1 else lines[0]
        body_txt = re.sub(r"\s+", " ", body_txt).strip()[:1800]
        # If title looks like activity (too long), split
        if len(title) > 60 and " " in title:
            # use first 2-4 words as PIC-ish
            pass
        steps.append({"order": order, "title": title, "body": body_txt})
        if len(steps) >= 15:
            break
    if steps:
        return steps
    # Fallback single-line
    for sm in re.finditer(r"(?m)^(\d{1,2})\s+(.+)$", body):
        order = int(sm.group(1))
        line = re.sub(r"\s+", " ", sm.group(2)).strip()
        if len(line) < 8:
            continue
        steps.append({"order": order, "title": f"Langkah {order}", "body": line[:1800]})
        if len(steps) >= 12:
            break
    return steps


def word_extract_sop_004() -> str | None:
    if not WORD_FALLBACK.exists():
        return None
    with zipfile.ZipFile(WORD_FALLBACK) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paras = []
    for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        texts = [
            t.text or ""
            for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
        ]
        if texts:
            paras.append("".join(texts))
    full = "\n".join(paras)
    # Find 004 block until next Kode
    m = re.search(
        r"Kode:\s*IT-SOP/2026/004\s*(.+?)(?=Kode:\s*IT-SOP/2026/005)",
        full,
        re.S | re.I,
    )
    return m.group(0) if m else None


def write_text_pdf(path: Path, title: str, body: str) -> None:
    """Minimal PDF via reportlab-less approach: use pypdf blank + ... 
    Actually generate with a simple PDF writer using pdfminer-free pure approach.
    Fallback: write .txt and also a one-page PDF using pypdf PageObject - hard.
    Use Node later; here write UTF-8 text and a placeholder PDF copying front page stamped.
    """
    # Store text; PDF will be generated by node pdfkit in import step if missing content PDF
    path.with_suffix(".txt").write_text(body, encoding="utf-8")
    # Create a tiny valid PDF with the text as stream (ASCII-safe subset)
    safe = body.encode("latin-1", errors="replace").decode("latin-1")
    # Better: keep txt only and let importer build PDF with pdfkit
    path.write_bytes(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")


def main() -> None:
    reader = PdfReader(str(SRC))
    n = len(reader.pages)
    texts = [page_text(p) for p in reader.pages]

    starts: dict[str, int] = {}
    for i, t in enumerate(texts):
        for m in CODE_RE.finditer(t):
            num = m.group(1)
            code = f"IT-SOP/2026/{num}"
            # Only count as body start if STANDARD OPERATING appears nearby
            window = t
            if "STANDARD OPERATING" in window.upper() or "STANDARD OPERATING" in (
                texts[i][:800].upper()
            ):
                if code not in starts:
                    starts[code] = i
            elif code not in starts and i >= 7:
                # still accept if footer kode style on body pages
                if "1. Tujuan" in t or "1. Tujuan" in (texts[min(i + 1, n - 1)] if i + 1 < n else ""):
                    starts[code] = i

    # Refine: require Tujuan on this or next page for body
    refined: dict[str, int] = {}
    for code, i in starts.items():
        window = texts[i] + "\n" + (texts[i + 1] if i + 1 < n else "")
        if "1. Tujuan" in window or "Tujuan" in window[:1500]:
            refined[code] = i
        elif code not in refined:
            refined[code] = i
    starts = refined

    ordered = sorted(starts.items(), key=lambda x: (x[1], x[0]))
    print(f"pages={n} detected_body={len(ordered)}")
    for code, p in ordered:
        print(f"  {code} page {p + 1}")

    ranges = []
    for idx, (code, start) in enumerate(ordered):
        end = ordered[idx + 1][1] - 1 if idx + 1 < len(ordered) else n - 1
        # trim trailing appendix-only pages for last SOP? keep
        if end < start:
            end = start
        ranges.append({"code": code, "num": code[-3:], "start": start, "end": end})

    meta = []
    for r in ranges:
        chunk = "\n".join(texts[r["start"] : r["end"] + 1])
        num = r["num"]
        title = extract_title(chunk, num)
        pemilik_daftar = DAFTAR.get(num, ("", "IT Manager"))[1]
        purpose = extract_section(
            chunk,
            r"1\.\s*Tujuan",
            [r"\n2\.\s*Ruang Lingkup", r"\n2\.\s"],
        )
        purpose = re.sub(r"\s+", " ", purpose).strip()[:2000]
        scope = extract_section(
            chunk,
            r"2\.\s*Ruang Lingkup",
            [r"\n3\.\s", r"\n4\.\s"],
        )
        scope = re.sub(r"\s+", " ", scope).strip()[:1500]
        roles = extract_section(
            chunk,
            r"(?:\d+\.\s*)?Peran dan Tanggung Jawab",
            [r"\n\d+\.\s*Kontrol", r"\n\d+\.\s*Prosedur", r"\n\d+\.\s*Definisi"],
        )
        roles = re.sub(r"\s+", " ", roles).strip()[:1500]
        steps = parse_steps(chunk)
        kontrol = extract_section(
            chunk,
            r"(?:\d+\.\s*)?Kontrol Kritis",
            [r"\n\d+\.\s*Prosedur", r"\n\d+\.\s*KPI"],
        )
        kontrol = re.sub(r"\s+", " ", kontrol).strip()[:1500]
        kpi = extract_section(
            chunk,
            r"(?:\d+\.\s*)?KPI\s*/\s*SLA[^\n]*",
            [r"\n\d+\.\s*Dokumen", r"\n\d+\.\s*Catatan", r"\nPengesahan"],
        )
        kpi = re.sub(r"\s+", " ", kpi).strip()[:1500]

        notes_parts = [
            f"Pemilik proses (daftar induk): {pemilik_daftar}",
            "Status: DRAFT Internal — belum berlaku sebelum disahkan.",
        ]
        if kontrol:
            notes_parts.append("Kontrol kritis:\n" + kontrol)
        if kpi:
            notes_parts.append("KPI/SLA:\n" + kpi)
        notes_parts.append(
            "Sumber file: Master_SOP_IT_PT_Sahabat_Jaya_Sukses-rev (3).pdf"
        )

        materials = scope
        if roles:
            materials = (scope + "\n\nPeran: " + roles).strip()[:2000]

        writer = PdfWriter()
        for pi in range(r["start"], r["end"] + 1):
            writer.add_page(reader.pages[pi])
        out_pdf = OUT_DIR / f"IT-SOP-2026-{num}.pdf"
        with open(out_pdf, "wb") as f:
            writer.write(f)
        (OUT_DIR / f"IT-SOP-2026-{num}.txt").write_text(chunk, encoding="utf-8")

        meta.append(
            {
                "code": r["code"],
                "title": title,
                "pemilik": pemilik_daftar,
                "purpose": purpose
                or f"SOP {title} sesuai Master SOP IT Divisi Information Technology.",
                "materials": materials
                or "Lihat file PDF lampiran untuk ruang lingkup dan peralatan.",
                "qualifications": f"PIC sesuai pemilik proses: {pemilik_daftar}. Pelaksana IT dan process owner terkait.",
                "steps": steps
                or [
                    {
                        "order": 1,
                        "title": "Ikuti prosedur pada file PDF",
                        "body": "Detail langkah lengkap ada pada lampiran PDF SOP ini.",
                    }
                ],
                "notes": "\n\n".join(notes_parts),
                "pdf": str(out_pdf),
                "pages": [r["start"] + 1, r["end"] + 1],
                "pageCount": r["end"] - r["start"] + 1,
                "missingFromPdf": False,
            }
        )

    # SOP 004 missing in PDF body — pull from Word if possible
    if not any(x["code"].endswith("004") for x in meta):
        print("WARN: IT-SOP/2026/004 missing in PDF body — trying Word fallback")
        w = word_extract_sop_004()
        title, pemilik = DAFTAR["004"]
        purpose = ""
        steps = []
        notes = (
            "PERINGATAN: SOP 004 tidak ada di isi PDF rev(3) (lompat 003→005). "
            "Entri ini diisi dari daftar induk + Word rev(2) bila tersedia. "
            "Perlu dilengkapi di revisi Word/PDF berikutnya."
        )
        materials = "Onboarding, mutasi, offboarding — akses sistem IT & HR."
        if w:
            (OUT_DIR / "IT-SOP-2026-004.txt").write_text(w, encoding="utf-8")
            purpose_m = re.search(r"1\.\s*Tujuan\s*(.+?)(?=\n2\.\s)", w, re.S)
            if purpose_m:
                purpose = re.sub(r"\s+", " ", purpose_m.group(1)).strip()[:2000]
            steps = parse_steps(w)
            notes += "\n\nTeks diambil dari Word Master SOP rev(2)."
            # Build PDF via copying a cover-like single blank from page 0 + note — importer uses pdfkit
            missing_pdf = OUT_DIR / "IT-SOP-2026-004.pdf"
            # Use node later; for now write text file marker
            missing_pdf.write_text("", encoding="utf-8")  # invalid; fix in importer
            # Better: write a multi-line text PDF with reportlab-free using fpdf? skip
            # Copy page 1 as stub and rely on txt + regenerate in TS
            writer = PdfWriter()
            writer.add_page(reader.pages[0])
            with open(missing_pdf, "wb") as f:
                writer.write(f)
            pdf_path = str(missing_pdf)
        else:
            pdf_path = ""
            purpose = (
                "Mengatur proses onboarding, mutasi, dan offboarding karyawan terkait "
                "akses IT, perangkat, dan dukungan HR agar aman dan terdokumentasi."
            )
            steps = [
                {
                    "order": 1,
                    "title": "HRD",
                    "body": "Kirim notice join/mutasi/resign ke IT sesuai jadwal (usulan H-3).",
                },
                {
                    "order": 2,
                    "title": "IT",
                    "body": "Siapkan/cabut akses sesuai access matrix; dokumentasikan checklist.",
                },
                {
                    "order": 3,
                    "title": "User / Atasan",
                    "body": "Konfirmasi kesiapan akses atau serah terima aset.",
                },
            ]

        meta.append(
            {
                "code": "IT-SOP/2026/004",
                "title": title,
                "pemilik": pemilik,
                "purpose": purpose
                or f"SOP {title} (konten PDF belum tersedia).",
                "materials": materials,
                "qualifications": f"PIC: {pemilik}",
                "steps": steps
                or [
                    {
                        "order": 1,
                        "title": "Lengkapi dokumen",
                        "body": "SOP 004 belum ada di PDF rev(3); lengkapi dari Word.",
                    }
                ],
                "notes": notes,
                "pdf": pdf_path,
                "pages": None,
                "pageCount": 0,
                "missingFromPdf": True,
            }
        )

    # Front matter + full master copy reference
    if ordered:
        first = ordered[0][1]
        writer = PdfWriter()
        for pi in range(0, first):
            writer.add_page(reader.pages[pi])
        front = OUT_DIR / "IT-SOP-2026-MASTER-frontmatter.pdf"
        with open(front, "wb") as f:
            writer.write(f)

    # Sort meta by code
    meta.sort(key=lambda x: x["code"])
    meta_path = OUT_DIR / "manifest.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest count={len(meta)} -> {meta_path}")
    missing = [m["code"] for m in meta if m.get("missingFromPdf")]
    if missing:
        print("missing_from_pdf:", ", ".join(missing))


if __name__ == "__main__":
    main()
