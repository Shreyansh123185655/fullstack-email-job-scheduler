import { useState } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";
import EmailList from "../components/emails/EmailList";
import { useDebounce } from "../hooks/useDebounce";
import { useEmails } from "../hooks/useEmails";
import type { EmailStatus } from "../types";

export default function EmailListPage({ status }: { status: EmailStatus }) {
  const [q, setQ] = useState("");
  const query = useDebounce(q);
  const { emails, loading, error, refresh } = useEmails(status, query);

  return (
    <section>
      <div className="flex items-center gap-4 pb-4">
        <label className="flex flex-1 items-center gap-3 rounded-full bg-field px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search emails"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
        <button className="p-2 text-slate-500 hover:text-slate-800" aria-label="Filter"><Filter size={20} /></button>
        <button onClick={refresh} className="p-2 text-slate-500 hover:text-slate-800" aria-label="Refresh"><RefreshCw size={20} /></button>
      </div>
      <EmailList emails={emails} loading={loading} error={error} status={status} searching={!!query} onRetry={refresh} />
    </section>
  );
}
