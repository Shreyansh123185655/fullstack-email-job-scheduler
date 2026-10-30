import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArrowLeft, Paperclip, Star, Trash2 } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StateMessage from "../components/ui/StateMessage";
import { useAuth } from "../context/AuthContext";
import { emailService } from "../services/emailService";
import type { Email } from "../types";
import { detailLabel } from "../utils/date";

export default function EmailDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { emailService.get(id).then(setEmail).catch((e: Error) => setError(e.message)); }, [id]);

  if (error) return <StateMessage title="We couldn't open this email" hint={error} action={<Button onClick={() => navigate(-1)}>Go back</Button>} />;
  if (!email) return <Spinner label="Opening email…" />;

  return (
    <article>
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button>
        <h1 className="flex-1 truncate text-2xl">{email.subject}</h1>
        <Star size={20} className="text-slate-400" /><Archive size={20} className="text-slate-400" /><Trash2 size={20} className="text-slate-400" />
        <Avatar name={user!.name} src={user!.avatarUrl} size={36} />
      </header>
      <div className="mx-auto mt-8 max-w-4xl">
        <div className="flex items-start gap-3">
          <Avatar name={email.from} size={48} />
          <div className="flex-1">
            <p className="font-semibold">{email.from}</p>
            <p className="text-sm text-slate-500">to {email.to}</p>
          </div>
          <span className="text-sm text-slate-500">{detailLabel(email.sentAt ?? email.scheduledAt)}</span>
        </div>
        {/* TODO(backend): sanitize HTML server-side (or with DOMPurify) before rendering real user content. */}
        <div className="mt-6 max-w-2xl space-y-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: email.body }} />
        {email.attachments.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-4">
            {email.attachments.map((a) => (
              <li key={a.name} className="flex w-72 items-center gap-3 rounded-xl bg-field p-4">
                <Paperclip size={18} className="text-slate-500" />
                <span><span className="block text-sm">{a.name}</span><span className="text-xs text-slate-500">{a.sizeLabel}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
