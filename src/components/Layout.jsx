import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell, LayoutDashboard, ListChecks, LogOut, Menu, PlusCircle, UsersRound, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "./Avatar";

export default function Layout({ role }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isStudent = role === "student";
  const items = isStudent
    ? [
        { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/student/requests", label: "My Requests", icon: ListChecks },
        { to: "/student/requests/new", label: "New Request", icon: PlusCircle },
      ]
    : [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/admin/requests", label: "All Requests", icon: UsersRound },
        { to: "/admin/students", label: "Student Accounts", icon: PlusCircle },
      ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast(error.message || "Your local session was cleared, but server logout failed.", "error");
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {open && <button type="button" aria-label="Close navigation overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-line px-5 py-4">
          <NavLink to={isStudent ? "/student" : "/admin"} className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">SP</div>
            <div><p className="font-bold leading-tight text-ink">Campus Portal</p><p className="text-xs text-muted">{isStudent ? "Student" : "Administration"}</p></div>
          </NavLink>
          <button type="button" onClick={() => setOpen(false)} className="icon-button lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${isActive ? "bg-indigo-50 text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="icon-button lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted sm:block">{isStudent ? "Student workspace" : "Administration workspace"}</div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="icon-button" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
            <div className="ml-1 flex items-center gap-2 border-l border-line pl-3">
              <Avatar name={user?.name} size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight text-ink">{user?.name}</p>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
