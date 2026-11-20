export default function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
    "In Progress": "bg-blue-50 text-blue-700 ring-blue-600/20",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Rejected: "bg-red-50 text-red-700 ring-red-600/20",
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] || "bg-slate-50 text-slate-700 ring-slate-500/20"}`}>
      {status}
    </span>
  );
}
