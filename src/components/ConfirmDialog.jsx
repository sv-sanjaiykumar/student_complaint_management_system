import { useEffect, useRef } from "react";
import { CircleAlert, X } from "lucide-react";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger = false, onConfirm, onCancel, busy = false }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className={`grid h-10 w-10 place-items-center rounded-full ${danger ? "bg-red-50 text-red-600" : "bg-indigo-50 text-brand"}`}><CircleAlert className="h-5 w-5" /></div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-700" aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="confirm-title" className="mt-4 text-lg font-bold text-ink">{title}</h2>
        <p id="confirm-description" className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className="button-secondary" disabled={busy}>Cancel</button>
          <button type="button" onClick={onConfirm} className={danger ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" : "button-primary"} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
