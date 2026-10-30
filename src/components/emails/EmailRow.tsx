import { Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Email } from "../../types";
import { chipLabel } from "../../utils/date";

const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export default function EmailRow({ email }: { email: Email }) {
  const scheduled = email.status === "scheduled";
  return (
    <Link to={`/email/${email.id}`} className="flex items-center gap-4 border-b px-4 py-4 hover:bg-slate-50">
      <span className="w-48 shrink-0 truncate text-sm">To: {email.to}</span>
      {scheduled ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chip-bg px-2.5 py-0.5 text-xs font-medium text-chip-text">
          <Clock size={12} /> {chipLabel(email.scheduledAt)}
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-700">Sent</span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium">{email.subject}</span>
        <span className="text-slate-400"> - {text(email.body)}</span>
      </span>
      <Star size={16} className="shrink-0 text-slate-300" aria-hidden />
    </Link>
  );
}
