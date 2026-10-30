import { useRef, useState, type KeyboardEvent } from "react";
import { Upload, X } from "lucide-react";
import { extractEmails, readFileAsText } from "../../utils/csv";

interface Props { recipients: string[]; onChange: (list: string[]) => void; onError: (msg: string) => void }
const VISIBLE = 3; // Figma shows three chips then "+N"

export default function RecipientInput({ recipients, onChange, onError }: Props) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (text: string) => {
    const found = extractEmails(text);
    if (text.trim() && !found.length) onError("That doesn't look like an email address.");
    onChange(Array.from(new Set([...recipients, ...found])));
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && draft.trim()) { e.preventDefault(); add(draft); }
    if (e.key === "Backspace" && !draft) onChange(recipients.slice(0, -1));
  };
  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const found = extractEmails(await readFileAsText(file));
      if (!found.length) return onError("No email addresses found in that file.");
      onChange(Array.from(new Set([...recipients, ...found])));
    } catch (e) { onError((e as Error).message); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const shown = expanded ? recipients : recipients.slice(0, VISIBLE);
  const hidden = recipients.length - shown.length;

  return (
    <div className="flex flex-1 items-center gap-2 border-b pb-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {shown.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-full border border-brand-500 bg-brand-50 px-3 py-0.5 text-sm">
            {r}<button type="button" aria-label={`Remove ${r}`} onClick={() => onChange(recipients.filter((x) => x !== r))}><X size={12} /></button>
          </span>
        ))}
        {hidden > 0 && <button type="button" onClick={() => setExpanded(true)} className="rounded-full border border-brand-500 bg-brand-50 px-3 py-0.5 text-sm">+{hidden}</button>}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => draft && add(draft)}
          onPaste={(e) => { const t = e.clipboardData.getData("text"); if (extractEmails(t).length > 1) { e.preventDefault(); add(t); } }}
          placeholder={recipients.length ? "" : "recipient@example.com"} aria-label="Recipients"
          className="min-w-[160px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400" />
      </div>
      {recipients.length > 0 && <span className="text-xs text-slate-500">{recipients.length} detected</span>}
      <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 text-brand-600 hover:underline"><Upload size={18} /> Upload List</button>
    </div>
  );
}
