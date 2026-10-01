import Link from "next/link";

export function CustomerSheets({
  active,
  mode,
}: {
  active: "tambah" | "ubah";
  mode: "list" | "form";
}) {
  const base =
    mode === "form" ? "/pengajuan/customer/baru" : "/pengajuan/customer";
  const sheets = [
    { id: "tambah" as const, label: "Penambahan Master", href: base },
    {
      id: "ubah" as const,
      label: "Perubahan Data Customer",
      href: `${base}?sheet=ubah`,
    },
  ];

  return (
    <div
      className="flex gap-1 overflow-x-auto print:hidden"
      role="tablist"
      aria-label="Jenis pengajuan customer"
    >
      {sheets.map((sheet) => {
        const selected = active === sheet.id;
        return (
          <Link
            key={sheet.id}
            href={sheet.href}
            role="tab"
            aria-selected={selected}
            className={`rounded-t-xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap ${
              selected
                ? "border-line border-b-transparent bg-bg-elevated text-ink"
                : "border-transparent text-ink-muted hover:bg-brand-soft hover:text-ink"
            }`}
          >
            {sheet.label}
          </Link>
        );
      })}
    </div>
  );
}
