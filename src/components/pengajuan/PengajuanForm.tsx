"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityPhotoSlider } from "@/components/ActivityPhotoSlider";
import {
  PENGAJUAN_MAX_PHOTOS,
  type PengajuanField,
  type PengajuanTypeDef,
} from "@/lib/pengajuan";
import type { Department, StaffMember } from "@/lib/types";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2.5 outline-none focus:border-brand";

function savedPath(type: string, id: string) {
  if (type === "customer") return "/pengajuan/customer";
  return `/pengajuan/${type}/${id}`;
}

export type CustomerChoice = {
  code: string;
  name: string;
  creditLimit: string;
  termOfPayment: string;
  phone: string;
  email: string;
  npwp: string;
  picName: string;
  address: string;
};

function currentOtherData(customer: CustomerChoice) {
  return [
    customer.phone ? `Telepon: ${customer.phone}` : "",
    customer.picName ? `PIC: ${customer.picName}` : "",
    customer.address ? `Alamat: ${customer.address}` : "",
    customer.npwp ? `NPWP: ${customer.npwp}` : "",
    customer.email ? `Email: ${customer.email}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function FieldControl({
  field,
  value,
  onValue,
  readOnly = false,
}: {
  field: PengajuanField;
  value?: string;
  onValue?: (value: string) => void;
  readOnly?: boolean;
}) {
  const label = (
    <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
      {field.label}
      {field.required ? "" : " (opsional)"}
    </span>
  );

  if (field.kind === "textarea") {
    return (
      <label className={`block ${field.wide ? "md:col-span-2" : ""}`}>
        {label}
        <textarea
          name={field.key}
          required={field.required}
          rows={3}
          placeholder={field.placeholder}
          readOnly={readOnly}
          {...(value === undefined
            ? {}
            : { value, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onValue?.(e.target.value) })}
          className={`${inputClass} read-only:bg-bg read-only:text-ink-muted`}
        />
      </label>
    );
  }

  if (field.kind === "select") {
    return (
      <label className={`block ${field.wide ? "md:col-span-2" : ""}`}>
        {label}
        <select
          name={field.key}
          required={field.required}
          {...(value === undefined
            ? { defaultValue: "" }
            : {
                value,
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                  onValue?.(e.target.value),
              })}
          className={inputClass}
        >
          <option value="">Pilih</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={`block ${field.wide ? "md:col-span-2" : ""}`}>
      {label}
      <input
        name={field.key}
        required={field.required}
        readOnly={readOnly}
        type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
        min={field.kind === "number" ? 1 : undefined}
        max={field.kind === "number" ? 999 : undefined}
        step={field.kind === "number" ? 1 : undefined}
        placeholder={field.placeholder}
        {...(value === undefined
          ? {}
          : { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onValue?.(e.target.value) })}
        className={`${inputClass} read-only:bg-bg read-only:text-ink-muted`}
      />
    </label>
  );
}

export function PengajuanForm({
  def,
  departments,
  staffList,
  defaultStaffId = "",
  lockRequester = false,
  customers,
}: {
  def: Pick<PengajuanTypeDef, "type" | "fields" | "photos">;
  departments: Department[];
  staffList: StaffMember[];
  defaultStaffId?: string;
  lockRequester?: boolean;
  customers?: CustomerChoice[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState(defaultStaffId || staffList[0]?.id || "");
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPreview, setPendingPreview] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [codePreview, setCodePreview] = useState("");
  const [pickedCode, setPickedCode] = useState("");
  const [currentData, setCurrentData] = useState({
    namaCustomer: "",
    limitLama: "",
    topLama: "",
    dataLama: "",
  });

  const selectedStaff = staffList.find((s) => s.id === staffId) ?? null;
  const selectedDept =
    departments.find((d) => d.id === selectedStaff?.departmentId) ?? null;

  useEffect(() => {
    return () => {
      for (const url of pendingPreview) URL.revokeObjectURL(url);
    };
    // cleanup hanya saat unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (def.type !== "customer") return;
    const name = customerName.trim();
    if (!name) {
      setCodePreview("");
      return;
    }
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ name });
      fetch(`/api/pengajuan/customer-code?${query.toString()}`)
        .then((res) => res.json())
        .then((data: { code?: string }) => {
          setCodePreview(typeof data.code === "string" ? data.code : "");
        })
        .catch(() => setCodePreview(""));
    }, 250);
    return () => clearTimeout(timer);
  }, [customerName, def.type]);

  function pickCustomer(code: string) {
    setPickedCode(code);
    const customer = customers?.find((item) => item.code === code);
    if (!customer) {
      setCurrentData({
        namaCustomer: "",
        limitLama: "",
        topLama: "",
        dataLama: "",
      });
      return;
    }
    setCurrentData({
      namaCustomer: customer.name,
      limitLama: customer.creditLimit,
      topLama: customer.termOfPayment,
      dataLama: currentOtherData(customer),
    });
  }

  function clearPendingPhotos() {
    setPendingPreview((prev) => {
      for (const url of prev) URL.revokeObjectURL(url);
      return [];
    });
    setPendingPhotos([]);
  }

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files);
    setPendingPhotos((prev) => {
      const next = [...prev, ...picked].slice(0, PENGAJUAN_MAX_PHOTOS);
      setPendingPreview((old) => {
        for (const url of old) URL.revokeObjectURL(url);
        return next.map((file) => URL.createObjectURL(file));
      });
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedStaff || !selectedDept) {
      setLoading(false);
      setError("Pilih pemohon dari master staf");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const field of def.fields) {
      payload[field.key] = String(fd.get(field.key) || "");
    }

    try {
      const res = await fetch("/api/pengajuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: def.type,
          requesterStaffId: selectedStaff.id,
          note: String(fd.get("note") || ""),
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan pengajuan");
        setLoading(false);
        return;
      }

      if (def.photos && pendingPhotos.length > 0) {
        const photoBody = new FormData();
        photoBody.append("pengajuanId", data.pengajuan.id);
        for (const file of pendingPhotos) photoBody.append("photos", file);
        const photoRes = await fetch("/api/pengajuan/photos", {
          method: "POST",
          body: photoBody,
        });
        const photoData = await photoRes.json().catch(() => ({}));
        if (!photoRes.ok) {
          setError(
            typeof photoData.error === "string"
              ? `Pengajuan tersimpan, tetapi foto gagal diunggah: ${photoData.error}`
              : "Pengajuan tersimpan, tetapi foto gagal diunggah",
          );
          setLoading(false);
          router.push(savedPath(def.type, data.pengajuan.id));
          router.refresh();
          return;
        }
      }

      clearPendingPhotos();
      router.push(savedPath(def.type, data.pengajuan.id));
      router.refresh();
    } catch {
      setError("Koneksi gagal — coba lagi");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onInput={(e) => {
        const target = e.target;
        if (
          def.type === "customer" &&
          target instanceof HTMLInputElement &&
          target.name === "namaCustomer"
        ) {
          setCustomerName(target.value);
        }
      }}
      className="panel space-y-4 p-5 md:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {def.fields.map((field) => (
          <div
            key={field.key}
            className={field.wide || field.kind === "textarea" ? "md:col-span-2" : ""}
          >
            {(def.type === "customer_ubah" && field.key === "kodeCustomer") ||
            (def.type === "void" && field.key === "namaCustomer") ? (
              <label className="block">
                <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  {field.label}
                  {field.required ? "" : " (opsional)"}
                </span>
                <select
                  name={field.key}
                  required={field.required}
                  value={pickedCode}
                  onChange={(e) => pickCustomer(e.target.value)}
                  className={inputClass}
                >
                  <option value="">
                    {customers && customers.length > 0
                      ? "Pilih dari master customer"
                      : "Belum ada customer di master"}
                  </option>
                  {(customers ?? []).map((customer) => (
                    <option key={customer.code} value={customer.code}>
                      {customer.code} — {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <FieldControl
                field={field}
                readOnly={def.type === "customer_ubah" && field.key === "namaCustomer"}
                value={
                  def.type === "customer_ubah" && field.key in currentData
                    ? currentData[field.key as keyof typeof currentData]
                    : undefined
                }
                onValue={
                  def.type === "customer_ubah" && field.key in currentData
                    ? (next) =>
                        setCurrentData((prev) => ({ ...prev, [field.key]: next }))
                    : undefined
                }
              />
            )}
            {def.type === "customer" && field.key === "namaCustomer" ? (
              <div className="mt-3 rounded-xl border border-line bg-bg px-3 py-2.5">
                <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Kode customer
                </span>
                <p className="mt-1 text-sm font-semibold tracking-wide">
                  {codePreview || "Menunggu nama customer"}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Dibuat otomatis: 2 huruf depan nama + nomor 3 digit. Nomor
                  akhir ditetapkan saat pengajuan disimpan.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {def.photos ? (
          <div className="block space-y-2 md:col-span-2">
            <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              Foto (opsional)
            </span>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-bg-elevated px-4 py-6 text-center transition hover:border-brand">
              <span className="text-sm font-medium text-ink">
                Pilih / unggah beberapa foto
              </span>
              <span className="text-[11px] text-ink-muted">
                Toko, KTP, NPWP, atau dokumen pendukung · JPG, PNG, WebP, GIF ·
                max 5MB · maks {PENGAJUAN_MAX_PHOTOS} foto
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(e) => {
                  onPickPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {pendingPreview.length > 0 ? (
              <div>
                <p className="text-xs text-ink-muted">
                  Preview ({pendingPreview.length}/{PENGAJUAN_MAX_PHOTOS})
                </p>
                <ActivityPhotoSlider photos={pendingPreview} layout="thumbs" />
                <button
                  type="button"
                  onClick={clearPendingPhotos}
                  className="mt-1 text-xs text-danger hover:underline"
                >
                  Buang semua foto
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Catatan tambahan (opsional)
          </span>
          <textarea
            name="note"
            rows={2}
            placeholder="Informasi lain yang membantu proses."
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Nama pemohon
          </span>
          <select
            required
            value={staffId}
            disabled={lockRequester}
            onChange={(e) => setStaffId(e.target.value)}
            className={`${inputClass} disabled:opacity-70`}
          >
            {staffList.length === 0 ? (
              <option value="">Belum ada master staf</option>
            ) : (
              staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.employeeCode} — {s.name}
                </option>
              ))
            )}
          </select>
          {selectedStaff ? (
            <p className="mt-1 text-xs text-ink-muted">{selectedStaff.position}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Departemen
          </span>
          <input
            readOnly
            value={
              selectedDept
                ? `${selectedDept.code} — ${selectedDept.name}`
                : "Pilih pemohon terlebih dahulu"
            }
            className="mt-1.5 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-ink-muted outline-none"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-muted">
          Pengajuan masuk antrean persetujuan. IT memproses setelah status disetujui.
        </p>
        <button
          type="submit"
          disabled={loading || staffList.length === 0 || !selectedStaff}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-deep disabled:opacity-60 sm:w-auto sm:py-2.5"
        >
          {loading ? "Menyimpan..." : "Kirim Pengajuan"}
        </button>
      </div>
    </form>
  );
}
