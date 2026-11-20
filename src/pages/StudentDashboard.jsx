import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, CircleDashed, PlusCircle } from "lucide-react";
import { getStudentDashboard } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import StatusBadge from "../components/StatusBadge";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    setData(null);
    getStudentDashboard(user.id).then(setData).catch((err) => setError(err.message));
  };
  useEffect(load, [user.id]);

  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return <Loading />;

  const cards = [
    { label: "Pending", value: data.counts.Pending, icon: Clock3, style: "bg-amber-50 text-amber-700" },
    { label: "In Progress", value: data.counts["In Progress"], icon: CircleDashed, style: "bg-blue-50 text-blue-700" },
    { label: "Resolved", value: data.counts.Resolved, icon: CheckCircle2, style: "bg-emerald-50 text-emerald-700" },
  ];
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-brand">STUDENT DASHBOARD</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Good morning, {user.name.split(" ")[0]}</h1><p className="mt-2 text-sm text-muted">Here is an overview of your support requests.</p></div>
        <Link to="/student/requests/new" className="button-primary"><PlusCircle className="h-4 w-4" /> New request</Link>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, style }) => (
          <section key={label} className="card p-5">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted">{label}</p><p className="mt-2 text-3xl font-bold text-ink">{value}</p></div><div className={`grid h-11 w-11 place-items-center rounded-xl ${style}`}><Icon className="h-5 w-5" /></div></div>
          </section>
        ))}
      </div>
      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-bold text-ink">Recent requests</h2><p className="mt-0.5 text-sm text-muted">Your latest activity</p></div><Link to="/student/requests" className="text-sm font-semibold text-brand hover:text-indigo-700">View all</Link></div>
        {data.recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No requests yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {data.recent.map((item) => (
              <Link key={item.id} to={`/student/requests/${item.id}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.subject}</p><p className="mt-1 text-xs text-muted">{item.id} · {item.category}</p></div>
                <StatusBadge status={item.status} />
                <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
