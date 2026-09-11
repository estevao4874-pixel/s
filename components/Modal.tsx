"use client";

import { useEffect } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${
          wide ? "max-w-lg" : "max-w-md"
        } bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-up`}
      >
        <div className="sticky top-0 bg-white border-b border-primary-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-ink text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-primary-soft text-ink grid place-items-center text-lg"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-ink mb-1.5">{label}</label>
      {children}
      {error && <p className="text-danger text-xs mt-1 font-medium">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full min-h-11 px-3 rounded-xl border-2 border-primary-border bg-white text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
