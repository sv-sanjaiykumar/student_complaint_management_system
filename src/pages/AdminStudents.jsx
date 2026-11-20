import { useCallback, useEffect, useState } from "react";
import { MailPlus, UsersRound } from "lucide-react";
import { createStudent, getStudents } from "../services/api";
import { useToast } from "../context/ToastContext";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import Avatar from "../components/Avatar";

const initialForm = { name: "", email: "", password: "" };

export default function AdminStudents() {
  const { toast } = useToast();
  const [students, setStudents] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoadError("");
    try {
      setStudents(await getStudents());
    } catch (error) {
      setLoadError(error.message || "Unable to load student accounts.");
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = "Enter the student's full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 12) nextErrors.password = "Use a temporary password with at least 12 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await createStudent({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setForm(initialForm);
      toast("Student account created. Share the temporary password securely.");
      await loadStudents();
    } catch (error) {
      toast(error.message || "Could not create the student account.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div>
        <p className="text-sm font-semibold text-brand">ACCOUNT MANAGEMENT</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Student accounts</h1>
        <p className="mt-2 text-sm text-muted">Create login credentials for students who need portal access.</p>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="card p-5 sm:p-6" aria-labelledby="create-student-title">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-brand"><MailPlus className="h-5 w-5" /></div>
            <div><h2 id="create-student-title" className="font-bold text-ink">Create student login</h2><p className="text-xs text-muted">The password is hashed and cannot be viewed later.</p></div>
          </div>
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="student-name" className="label">Full name</label>
              <input id="student-name" autoComplete="name" className="input" value={form.name} onChange={(event) => update("name", event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "student-name-error" : undefined} />
              {errors.name && <p id="student-name-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="student-email" className="label">Student email</label>
              <input id="student-email" type="email" autoComplete="email" className="input" value={form.email} onChange={(event) => update("email", event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "student-email-error" : undefined} />
              {errors.email && <p id="student-email-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="student-password" className="label">Temporary password</label>
              <input id="student-password" type="password" autoComplete="new-password" className="input" value={form.password} onChange={(event) => update("password", event.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "student-password-error" : "student-password-help"} />
              {errors.password
                ? <p id="student-password-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>
                : <p id="student-password-help" className="mt-1.5 text-xs text-muted">At least 12 characters. Share with the student using a secure channel.</p>}
            </div>
            <button type="submit" className="button-primary w-full" disabled={busy}>{busy ? "Creating account..." : "Create student account"}</button>
          </form>
        </section>

        <section className="card overflow-hidden" aria-labelledby="students-list-title">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><h2 id="students-list-title" className="font-bold text-ink">Existing students</h2><p className="mt-0.5 text-sm text-muted">{students ? `${students.length} accounts` : "Student portal accounts"}</p></div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><UsersRound className="h-5 w-5" /></div>
          </div>
          {loadError ? <div className="p-5"><ErrorState message={loadError} retry={loadStudents} /></div>
            : !students ? <Loading label="Loading student accounts..." />
              : students.length === 0 ? <div className="p-5"><EmptyState title="No student accounts yet" description="Create an account to give a student access to the portal." /></div>
                : <ul className="divide-y divide-line">{students.map((student) => (
                  <li key={student.id} className="flex items-center gap-3 px-5 py-4">
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{student.name}</p><p className="truncate text-xs text-muted">{student.email}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{student.active ? "Active" : "Inactive"}</span>
                  </li>
                ))}</ul>}
        </section>
      </div>
    </div>
  );
}
