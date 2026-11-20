export default function Loading({ label = "Loading..." }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted" role="status">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-100 border-t-brand" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
