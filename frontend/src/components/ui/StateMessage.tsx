import type { ReactNode } from "react";

/** One component for both empty and error screens, so tables stay consistent. */
export default function StateMessage({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}
