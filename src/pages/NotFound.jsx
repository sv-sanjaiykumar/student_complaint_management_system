import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-center">
      <div>
        <p className="text-sm font-bold text-brand">404</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you requested does not exist.</p>
        <Link to="/login" className="button-primary mt-6"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
      </div>
    </main>
  );
}
