import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { categories, statuses, priorities, getAdminRequests } from "../services/api";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";

const PAGE_SIZE = 6;

export default function AdminRequests() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [priority, setPriority] = useState("All");
  const [date, setDate] = useState("All");
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [page, setPage] = useState(1);

  const load = () => { setError(""); setItems(null); getAdminRequests().then(setItems).catch((err) => setError(err.message)); };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const now = Date.now();
    return [...items].filter((item) => {
      const matchesQuery = `${item.id} ${item.subject} ${item.studentName} ${item.studentEmail}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "All" || item.status === status;
      const matchesCategory = category === "All" || item.category === category;
      const matchesPriority = priority === "All" || item.priority === priority;
      const age = now - new Date(item.createdAt).getTime();
      const matchesDate = date === "All" || (date === "Today" && age < 86400000) || (date === "7 days" && age < 604800000) || (date === "30 days" && age < 2592000000);
      return matchesQuery && matchesStatus && matchesCategory && matchesPriority && matchesDate;
    }).sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      const result = sort.field.includes("At") ? new Date(av) - new Date(bv) : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? result : -result;
    });
  }, [items, query, status, category, priority, date, sort]);

  useEffect(() => setPage(1), [query, status, category, priority, date]);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!items) return <Loading />;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggleSort = (field) => setSort((current) => ({ field, direction: current.field === field && current.direction === "asc" ? "desc" : "asc" }));

  return (
    <div>
      <div><p className="text-sm font-semibold text-brand">REQUEST MANAGEMENT</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">All requests</h1><p className="mt-2 text-sm text-muted">{items.length} total requests</p></div>
      <div className="card mt-6 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(130px,150px))]">
          <label className="relative"><span className="sr-only">Search requests</span><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-10" placeholder="Search student or request..." /></label>
          <label><span className="sr-only">Filter status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="input"><option>All</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="sr-only">Filter category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="input"><option>All</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="sr-only">Filter priority</span><select value={priority} onChange={(event) => setPriority(event.target.value)} className="input"><option>All</option>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="sr-only">Filter date</span><select value={date} onChange={(event) => setDate(event.target.value)} className="input"><option>All</option><option>Today</option><option>7 days</option><option>30 days</option></select></label>
        </div>
      </div>
      {filtered.length === 0 ? <div className="mt-6"><EmptyState title="No matching requests" description="Clear or change the active filters." /></div> : (
        <>
          <div className="card mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-line bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-muted"><tr>
                  <th className="px-5 py-3"><button type="button" onClick={() => toggleSort("id")} className="flex items-center gap-1">Request <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3"><button type="button" onClick={() => toggleSort("priority")} className="flex items-center gap-1">Priority <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => toggleSort("status")} className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => toggleSort("updatedAt")} className="flex items-center gap-1">Updated <ArrowUpDown className="h-3 w-3" /></button></th>
                </tr></thead>
                <tbody className="divide-y divide-line">{pageItems.map((item) => <tr key={item.id} className="text-sm hover:bg-slate-50"><td className="px-5 py-4"><Link to={`/admin/requests/${item.id}`} className="font-bold text-brand hover:underline">{item.id}</Link><p className="mt-1 max-w-[220px] truncate text-xs text-muted">{item.subject}</p></td><td className="px-4 py-4"><p className="font-semibold text-ink">{item.studentName}</p><p className="mt-0.5 text-xs text-muted">{item.studentEmail}</p></td><td className="px-4 py-4 text-muted">{item.category}</td><td className="px-4 py-4"><span className={`text-xs font-semibold ${item.priority === "Urgent" ? "text-red-600" : item.priority === "High" ? "text-orange-600" : "text-slate-600"}`}>{item.priority}</span></td><td className="px-4 py-4"><StatusBadge status={item.status} /></td><td className="px-4 py-4 text-xs text-muted">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.updatedAt))}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted"><p>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="icon-button disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages} className="icon-button disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div>
        </>
      )}
    </div>
  );
}
