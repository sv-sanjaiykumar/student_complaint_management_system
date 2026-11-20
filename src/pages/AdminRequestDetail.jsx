import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, Download, Paperclip, Send, Trash2 } from "lucide-react";
import { addNote, addReply, deleteRequest, getRequest, getStaff, priorities, statuses, updateRequest } from "../services/api";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import Avatar from "../components/Avatar";
import { useToast } from "../context/ToastContext";

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState(null);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [replyError, setReplyError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError("");
    setItem(null);
    Promise.all([getRequest(id), getStaff()])
      .then(([requestData, staffData]) => { setItem(requestData); setStaff(staffData); })
      .catch((err) => setError(err.message));
  };
  useEffect(load, [id]);

  const changeStatus = async (value) => {
    setBusy(true);
    try { const updated = await updateRequest(id, { status: value }); setItem(updated); toast(`Status changed to ${value}.`); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  const changePriority = async (value) => {
    setBusy(true);
    try { const updated = await updateRequest(id, { priority: value }); setItem(updated); toast(`Priority changed to ${value}.`); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  const assign = async (value) => {
    setBusy(true);
    try {
      const updated = await updateRequest(id, { staffId: value || null });
      setItem(updated);
      const assignee = staff.find((member) => member.id === value);
      toast(value ? `Assigned to ${assignee?.name || "staff member"}.` : "Assignment removed.");
    }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (reply.trim().length < 3) { setReplyError("Reply must be at least 3 characters."); return; }
    setReplyError(""); setBusy(true);
    try { await addReply(id, reply.trim()); setItem(await getRequest(id)); setReply(""); toast("Reply sent to the student."); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  const sendNote = async (event) => {
    event.preventDefault();
    if (note.trim().length < 3) { setNoteError("Note must be at least 3 characters."); return; }
    setNoteError(""); setBusy(true);
    try { const updated = await addNote(id, note.trim()); setItem(updated); setNote(""); toast("Internal note added."); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  const archive = async () => {
    setBusy(true);
    try { const updated = await updateRequest(id, { status: "Resolved", archived: true }); setItem(updated); setDialog(null); toast("Request archived."); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await deleteRequest(id); setDialog(null); toast("Request deleted."); navigate("/admin/requests"); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  };

  if (error) return <ErrorState message={error} retry={load} />;
  if (!item) return <Loading />;

  return (
    <div className="mx-auto max-w-6xl">
      <button type="button" onClick={() => navigate("/admin/requests")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> All requests</button>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-sm font-semibold text-brand">{item.id}</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{item.subject}</h1><p className="mt-2 text-sm text-muted">Submitted by {item.studentName} · {formatDate(item.createdAt)}</p></div><StatusBadge status={item.status} /></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <Avatar name={item.studentName} />
              <div><p className="text-sm font-bold text-ink">{item.studentName}</p><p className="text-xs text-muted">{item.studentEmail}</p></div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Category</dt><dd className="mt-1 text-sm font-semibold">{item.category}</dd></div>
              <div><dt className="text-xs text-muted">Priority</dt><dd className="mt-1 text-sm font-semibold">{item.priority}</dd></div>
              <div><dt className="text-xs text-muted">Assigned staff</dt><dd className="mt-1 text-sm font-semibold">{item.assignedStaff?.name || (item.assignedTo ? `${item.assignedTo.name} (admin)` : "Unassigned")}</dd></div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.description}</p>
            {item.attachment && <div className="mt-5 flex items-center justify-between rounded-xl border border-line p-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-brand"><Paperclip className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.attachment.name}</p><p className="text-xs text-muted">{item.attachment.size}</p></div></div><button type="button" className="icon-button ml-3" aria-label={`Download ${item.attachment.name}`} onClick={() => window.alert("Demo attachment: real file download will be provided by the backend.")}><Download className="h-4 w-4" /></button></div>}
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="font-bold text-ink">Conversation</h2>
            {item.replies.length === 0
              ? <p className="mt-4 text-sm text-muted">No replies yet.</p>
              : <div className="mt-4 space-y-3">{item.replies.map((entry) => <article key={entry.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-bold">{entry.author}</p><time className="text-xs text-muted">{formatDate(entry.createdAt)}</time></div>{entry.assignedStaff && <p className="mt-1 text-xs font-semibold text-brand">Assigned specialist: {entry.assignedStaff.name} · <span className="capitalize">{entry.assignedStaff.specialization}</span></p>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.message}</p></article>)}</div>}
            <form onSubmit={sendReply} noValidate className="mt-5">
              <label htmlFor="reply" className="label">Reply to student</label>
              <textarea id="reply" rows="4" value={reply} onChange={(event) => { setReply(event.target.value); setReplyError(""); }} className="input resize-y" placeholder="Write a clear response..." aria-invalid={!!replyError} />
              <div className="mt-1.5">{replyError && <p className="text-xs font-medium text-red-600">{replyError}</p>}</div>
              <div className="mt-3 flex justify-end"><button type="submit" className="button-primary" disabled={busy}><Send className="h-4 w-4" /> Send reply</button></div>
            </form>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold text-ink">Request actions</h2>
            <div className="mt-4 space-y-4">
              <label><span className="label">Status</span><select value={item.status} onChange={(event) => changeStatus(event.target.value)} className="input" disabled={busy}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span className="label">Priority</span><select value={item.priority} onChange={(event) => changePriority(event.target.value)} className="input" disabled={busy}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>
                <span className="label">Assign specialist</span>
                <select value={item.assignedStaff?.id || ""} onChange={(event) => assign(event.target.value)} className="input" disabled={busy}>
                  <option value="">Unassigned</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.specialization}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-5"><button type="button" onClick={() => setDialog("archive")} className="button-secondary px-2"><Archive className="h-4 w-4" /> Archive</button><button type="button" onClick={() => setDialog("delete")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button></div>
          </section>
          <section className="card p-5"><h2 className="font-bold text-ink">Internal notes</h2><p className="mt-1 text-xs text-muted">Only visible to administrators.</p>{item.notes.length > 0 && <div className="mt-4 space-y-2">{item.notes.map((entry, index) => <p key={`${entry}-${index}`} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm leading-5 text-amber-900">{entry}</p>)}</div>}<form onSubmit={sendNote} noValidate className="mt-4"><label htmlFor="note" className="sr-only">Internal note</label><textarea id="note" rows="3" value={note} onChange={(event) => { setNote(event.target.value); setNoteError(""); }} className="input resize-y" placeholder="Add a private note..." aria-invalid={!!noteError} /><div className="mt-1.5">{noteError && <p className="text-xs font-medium text-red-600">{noteError}</p>}</div><button type="submit" className="button-secondary mt-3 w-full" disabled={busy}>Add note</button></form></section>
        </aside>
      </div>
      <ConfirmDialog open={dialog === "delete"} title="Delete this request?" description="This action permanently removes the request and its activity from the demo workspace." confirmLabel="Delete request" danger onConfirm={remove} onCancel={() => setDialog(null)} busy={busy} />
      <ConfirmDialog open={dialog === "archive"} title="Archive this request?" description="The request will be resolved and marked as archived." confirmLabel="Archive request" onConfirm={archive} onCancel={() => setDialog(null)} busy={busy} />
    </div>
  );
}
