import { Inbox } from "lucide-react";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500"><Inbox className="h-6 w-6" /></div>
      <h3 className="mt-4 font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
