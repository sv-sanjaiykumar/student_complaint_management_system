import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

export default function Login() {
  const [role, setRole] = useState("student");
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, user, ready } = useAuth();
  const navigate = useNavigate();

  if (!ready) return <Loading label="Checking your session..." />;
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const selectRole = (nextRole) => {
    setRole(nextRole);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!values.email.trim() || !values.password) {
      setError("Enter your email and password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const account = await login({ email: values.email.trim(), password: values.password, role });
      navigate(account.role === "admin" ? "/admin" : "/student", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-line bg-white shadow-card md:grid-cols-[0.9fr_1.1fr]" aria-labelledby="login-title">
        <div className="hidden min-h-[560px] flex-col justify-between bg-brand p-8 text-white md:flex">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 font-bold">SP</div><span className="font-bold">Campus Portal</span></div>
          <div>
            <p className="text-sm font-semibold text-indigo-100">STUDENT SUPPORT</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">Help, when you need it.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-indigo-100">Submit requests, track progress, and stay connected with campus services.</p>
          </div>
          <p className="text-xs text-indigo-200">Secure academic support workspace</p>
        </div>
        <div className="flex min-h-[520px] flex-col justify-center p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-bold text-white">SP</div><span className="font-bold">Campus Portal</span></div>
          <p className="text-sm font-semibold text-brand">Welcome back</p>
          <h1 id="login-title" className="mt-2 text-3xl font-bold text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            {role === "student"
              ? "Use the student credentials provided by your administrator."
              : "Sign in with your administrator credentials."}
          </p>

          <fieldset className="mt-7">
            <legend className="label">Select role</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer rounded-2xl border p-4 transition focus-within:ring-4 focus-within:ring-indigo-100 ${role === "student" ? "border-brand bg-indigo-50 ring-2 ring-indigo-100" : "border-line hover:border-slate-300"}`}>
                <input type="radio" name="role" value="student" checked={role === "student"} onChange={() => selectRole("student")} className="sr-only" />
                <GraduationCap className={`h-6 w-6 ${role === "student" ? "text-brand" : "text-slate-400"}`} />
                <span className="mt-3 block text-sm font-bold text-ink">Student</span>
                <span className="mt-1 block text-xs text-muted">Sign in to your account</span>
              </label>
              <label className={`cursor-pointer rounded-2xl border p-4 transition focus-within:ring-4 focus-within:ring-indigo-100 ${role === "admin" ? "border-brand bg-indigo-50 ring-2 ring-indigo-100" : "border-line hover:border-slate-300"}`}>
                <input type="radio" name="role" value="admin" checked={role === "admin"} onChange={() => selectRole("admin")} className="sr-only" />
                <ShieldCheck className={`h-6 w-6 ${role === "admin" ? "text-brand" : "text-slate-400"}`} />
                <span className="mt-3 block text-sm font-bold text-ink">Admin</span>
                <span className="mt-1 block text-xs text-muted">Manage the portal</span>
              </label>
            </div>
          </fieldset>

          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input id="email" type="email" autoComplete="username" value={values.email} onChange={(event) => update("email", event.target.value)} className="input" required />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={values.password} onChange={(event) => update("password", event.target.value)} className="input" minLength={8} required />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" className="button-primary w-full" disabled={busy}>
              {busy ? "Please wait..." : "Sign in"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-5 text-xs leading-5 text-muted">
            {role === "student"
              ? "Student accounts are created by your campus administrator."
              : "Admin accounts are issued by the system owner."}
          </p>
        </div>
      </section>
    </main>
  );
}
