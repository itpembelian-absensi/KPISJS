"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Department } from "@/lib/types";

/** Jumlah departemen per halaman */
const LIST_PAGE_SIZE = 10;

export function DepartmentMaster({
  initial,
}: {
  initial: Department[];
}) {
  const [listPage, setListPage] = useState(1);
  const totalListPages = Math.max(1, Math.ceil(initial.length / LIST_PAGE_SIZE));
  const currentListPage = Math.min(listPage, totalListPages);
  const paged = useMemo(() => {
    const start = (currentListPage - 1) * LIST_PAGE_SIZE;
    return initial.slice(start, start + LIST_PAGE_SIZE);
  }, [initial, currentListPage]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="font-semibold">Daftar departemen</h2>
        <Link
          href="/master/departments/new"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          Tambah departemen
        </Link>
      </div>
      {initial.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">
          Belum ada departemen.
        </p>
      ) : (
        paged.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"
          >
            <div>
              <p className="mono text-xs text-brand">{d.code}</p>
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-ink-muted">{d.description || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  d.active ? "bg-ok-soft text-ok" : "bg-line text-ink-muted"
                }`}
              >
                {d.active ? "Aktif" : "Nonaktif"}
              </span>
              <Link
                href={`/master/departments/${d.id}/edit`}
                className="rounded-lg border border-line px-2 py-1 text-xs"
              >
                Edit
              </Link>
            </div>
          </div>
        ))
      )}
      {totalListPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-xs text-ink-muted">
            Halaman {currentListPage} dari {totalListPages}
            {" · "}
            {(currentListPage - 1) * LIST_PAGE_SIZE + 1}–
            {Math.min(currentListPage * LIST_PAGE_SIZE, initial.length)} dari{" "}
            {initial.length}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={currentListPage <= 1}
              onClick={() => setListPage(1)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman awal"
              title="Halaman awal"
            >
              «
            </button>
            <button
              type="button"
              disabled={currentListPage <= 1}
              onClick={() => setListPage((page) => Math.max(1, page - 1))}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
              title="Halaman sebelumnya"
            >
              ‹
            </button>
            {Array.from({ length: totalListPages }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setListPage(page)}
                  className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium ${
                    page === currentListPage
                      ? "bg-brand text-white"
                      : "border border-line hover:bg-bg"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentListPage >= totalListPages}
              onClick={() =>
                setListPage((page) => Math.min(totalListPages, page + 1))
              }
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
              title="Halaman berikutnya"
            >
              ›
            </button>
            <button
              type="button"
              disabled={currentListPage >= totalListPages}
              onClick={() => setListPage(totalListPages)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman akhir"
              title="Halaman akhir"
            >
              »
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
