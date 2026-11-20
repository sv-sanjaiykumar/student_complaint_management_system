import { CircleAlert } from "lucide-react";

export default function ErrorState({ message = "Something went wrong.", retry }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800" role="alert">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">Unable to load data</p>
          <p className="mt-1 text-sm text-red-700">{message}</p>
        </div>
        {retry && <button type="button" onClick={retry} className="button-secondary border-red-200">Try again</button>}
      </div>
    </div>
  );
}
