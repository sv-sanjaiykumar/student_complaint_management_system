import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, CircleDashed, Clock3, ListChecks, UsersRound } from "lucide-react";
import { getAdminDashboard } from "../services/api";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import StatusBadge from "../components/StatusBadge";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => { setError(""); setData(null); getAdminDashboard().then(setData).catch((err) => setError(err.message)); };
  useEffect(load, []);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return <Loading />;

  const cards = [
    { label: "Total requests", value: data.counts.total, icon: ListChecks, style: "bg-indigo-50 text-brand" },
    { label: "Pending", value: data.counts.pending, icon: Clock3, style: "bg-amber-50 text-amber-700" },
    { label: "In progress", value: data.counts.inProgress, icon: CircleDashed, style: "bg-blue-50 text-blue-700" },
    { label: "Urgent", value: data.counts.urgent, icon: AlertTriangle, style: "bg-red-50 text-red-700" },
  ];
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-brand">ADMIN DASHBOARD</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Request overview</h1><p className="mt-2 text-sm text-muted">Monitor workload and respond to students.</p></div><Link to="/admin/requests" className="button-primary"><UsersRound className="h-4 w-4" /> Manage requests</Link></div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, style }) => <section key={label} className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted">{label}</p><p className="mt-2 text-3xl font-bold text-ink">{value}</p></div><div className={`grid h-11 w-11 place-items-center rounded-xl ${style}`}><Icon className="h-5 w-5" /></div></div></section>)}</div>
      <section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-bold text-ink">Recent activity</h2><p className="mt-0.5 text-sm text-muted">Latest updates across all requests</p></div><Link to="/admin/requests" className="text-sm font-semibold text-brand">View all</Link></div>
        <div className="divide-y divide-line">{data.recent.map((item) => <Link key={item.id} to={`/admin/requests/${item.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.subject}</p><p className="mt-1 text-xs text-muted">{item.studentName} · {item.id}</p></div><StatusBadge status={item.status} /><ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" /></Link>)}</div>
      </section>
    </div>
  );
}
