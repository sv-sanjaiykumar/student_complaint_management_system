import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlusCircle, Search } from "lucide-react";
import { getStudentRequests } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";

export default function StudentRequests() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const load = () => {
    setError(""); setItems(null);
    getStudentRequests(user.id).then(setItems).catch((err) => setError(err.message));
  };
  useEffect(load, [user.id]);

  const filtered = useMemo(() => (items || []).filter((item) =>
    (filter === "All" || item.status === filter) &&
    `${item.subject} ${item.id} ${item.category}`.toLowerCase().includes(query.toLowerCase())
  ), [items, filter, query]);

  if (error) return <ErrorState message={error} retry={load} />;
  if (!items) return <Loading />;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-brand">SUPPORT</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">My requests</h1><p className="mt-2 text-sm text-muted">{items.length} submitted requests</p></div>
        <Link to="/student/requests/new" className="button-primary"><PlusCircle className="h-4 w-4" /> New request</Link>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1 sm:max-w-sm"><span className="sr-only">Search requests</span><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-10" placeholder="Search requests..." /></label>
        <label><span className="sr-only">Filter by status</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="input sm:w-44"><option>All</option><option>Pending</option><option>In Progress</option><option>Resolved</option><option>Rejected</option></select></label>
      </div>
      {filtered.length === 0 ? (
        <div className="mt-6"><EmptyState title="No requests found" description="Try changing your search or status filter." action={<Link to="/student/requests/new" className="button-primary">Create a request</Link>} /></div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <Link key={item.id} to={`/student/requests/${item.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:border-indigo-200">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-muted">{item.id}</p><h2 className="mt-1 truncate font-bold text-ink group-hover:text-brand">{item.subject}</h2></div><StatusBadge status={item.status} /></div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-muted"><span>{item.category} · {item.priority}</span><span className="flex items-center gap-1 font-semibold text-brand">View <ArrowRight className="h-3.5 w-3.5" /></span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
