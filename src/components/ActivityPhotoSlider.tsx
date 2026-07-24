"use client";

import { useEffect, useState } from "react";

export function ActivityPhotoSlider({
  photos,
  onRemove,
  compact = false,
}: {
  photos: string[];
  onRemove?: (url: string) => void;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const safeIndex =
    photos.length === 0 ? 0 : Math.min(index, photos.length - 1);
  const current = photos[safeIndex] ?? "";

  useEffect(() => {
    if (!zoomed || photos.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "ArrowLeft" && photos.length > 1) {
        setIndex((i) => (i - 1 + photos.length) % photos.length);
      }
      if (e.key === "ArrowRight" && photos.length > 1) {
        setIndex((i) => (i + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoomed, photos.length]);

  if (!photos.length) return null;

  return (
    <div className={compact ? "mt-2" : "mt-1"}>
      <div
        className={`relative overflow-hidden rounded-xl border border-line bg-bg ${
          compact ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="block h-full w-full cursor-zoom-in"
          title="Klik untuk perbesar"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={`Foto kegiatan ${safeIndex + 1}`}
            className="h-full w-full object-cover"
          />
        </button>
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i - 1 + photos.length) % photos.length);
              }}
              className="absolute top-1/2 left-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-lg font-bold text-white shadow-md"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i + 1) % photos.length);
              }}
              className="absolute top-1/2 right-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-lg font-bold text-white shadow-md"
            >
              ›
            </button>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2 py-1">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ke foto ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`h-2 w-2 rounded-full ${
                    i === safeIndex ? "bg-white" : "bg-white/45"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(current);
            }}
            className="absolute top-2 right-2 z-10 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-medium text-white shadow-md"
          >
            Hapus foto
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-center text-[11px] text-ink-muted">
        Foto {safeIndex + 1} / {photos.length} · klik foto untuk perbesar
      </p>

      {zoomed ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Perbesar foto"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute top-3 right-3 z-[110] rounded-xl bg-white px-3 py-2 text-sm font-medium text-ink shadow"
          >
            Tutup
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Foto sebelumnya"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + photos.length) % photos.length);
                }}
                className="absolute top-1/2 left-3 z-[110] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-lg sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % photos.length);
                }}
                className="absolute top-1/2 right-3 z-[110] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-lg sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
          <div
            className="relative max-h-full max-w-full cursor-zoom-out"
            onClick={() => setZoomed(false)}
            title="Klik untuk kembali"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={`Foto kegiatan diperbesar ${safeIndex + 1}`}
              className="max-h-[90vh] max-w-[min(96vw,1100px)] rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-sm text-white/90">
              Foto {safeIndex + 1} / {photos.length} · klik foto untuk kembali
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
