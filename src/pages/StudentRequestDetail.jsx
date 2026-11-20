import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { getRequest } from "../services/api";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import StatusBadge from "../components/StatusBadge";

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function StudentRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const load = () => {
    setError(""); setItem(null);
    getRequest(id).then(setItem).catch((err) => setError(err.message));
  };
  useEffect(load, [id]);

  if (error) return <ErrorState message={error} retry={load} />;
  if (!item) return <Loading />;

  return (
    <div className="mx-auto max-w-5xl">
      <button type="button" onClick={() => navigate("/student/requests")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> All requests</button>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><p className="text-sm font-semibold text-brand">{item.id}</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{item.subject}</h1><p className="mt-2 text-sm text-muted">Submitted {formatDate(item.createdAt)}</p></div>
        <StatusBadge status={item.status} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-bold text-ink">Request details</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-b border-line pb-5 sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Category</dt><dd className="mt-1 text-sm font-semibold">{item.category}</dd></div>
              <div><dt className="text-xs text-muted">Priority</dt><dd className="mt-1 text-sm font-semibold">{item.priority}</dd></div>
              <div><dt className="text-xs text-muted">Assigned specialist</dt><dd className="mt-1 text-sm font-semibold">{item.assignedStaff?.name || "Not assigned"}</dd>{item.assignedStaff && <dd className="mt-1 text-xs capitalize text-muted">{item.assignedStaff.specialization}</dd>}</div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.description}</p>
            {item.attachment && <div className="mt-5 flex items-center justify-between rounded-xl border border-line p-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-brand"><Paperclip className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.attachment.name}</p><p className="text-xs text-muted">{item.attachment.size}</p></div></div><button type="button" className="icon-button ml-3" aria-label={`Download ${item.attachment.name}`} onClick={() => window.alert("Demo attachment: real file download will be provided by the backend.")}><Download className="h-4 w-4" /></button></div>}
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="font-bold text-ink">Admin replies</h2>
            {item.replies.length === 0
              ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-muted">No replies yet. The support team will respond here.</p>
              : <div className="mt-5 space-y-4">{item.replies.map((reply) => <article key={reply.id} className="rounded-xl border border-line p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{reply.author}</p><time className="text-xs text-muted">{formatDate(reply.createdAt)}</time></div>{reply.assignedStaff && <p className="mt-1 text-xs font-semibold text-brand">Specialist working on your request: {reply.assignedStaff.name} · <span className="capitalize">{reply.assignedStaff.specialization}</span></p>}<p className="mt-3 text-sm leading-6 text-slate-700">{reply.message}</p></article>)}</div>}
          </section>
        </div>
        <aside className="card h-fit p-5"><h2 className="font-bold text-ink">Status timeline</h2><ol className="mt-5">{item.timeline.map((entry, index) => <li key={`${entry.status}-${entry.date}`} className="relative flex gap-3 pb-6 last:pb-0"><div className="flex flex-col items-center"><span className={`h-3 w-3 rounded-full ring-4 ${index === item.timeline.length - 1 ? "bg-brand ring-indigo-100" : "bg-slate-300 ring-slate-100"}`} />{index < item.timeline.length - 1 && <span className="mt-1 h-full w-px bg-line" />}</div><div className="-mt-1"><p className="text-sm font-semibold">{entry.status}</p><time className="mt-0.5 block text-xs text-muted">{formatDate(entry.date)}</time><p className="mt-1 text-xs leading-5 text-muted">{entry.detail}</p></div></li>)}</ol></aside>
      </div>
    </div>
  );
}
