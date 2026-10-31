import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Clock, Paperclip } from "lucide-react";
import { emailService } from "../../services/emailService";
import type { ScheduleEmailPayload, Sender } from "../../types";
import { detailLabel } from "../../utils/date";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import RecipientInput from "./RecipientInput";
import RichTextEditor from "./RichTextEditor";
import SendLaterPopover from "./SendLaterPopover";
const numberOrZero = (v: string) => Math.max(0, parseInt(v, 10) || 0);
export default function ComposeForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [delay, setDelay] = useState("");
  const [hourly, setHourly] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    emailService.senders().then((s) => { setSenders(s); setSenderId(s[0]?.id ?? ""); })
      .catch(() => toast("error", "Couldn't load your sender accounts."));
  }, [toast]);
  const submit = async () => {
    if (!recipients.length) return toast("error", "Add at least one recipient.");
    if (!subject.trim()) return toast("error", "Add a subject.");
    if (!body.replace(/<[^>]*>/g, "").trim()) return toast("error", "Write a message first.");
    const payload: ScheduleEmailPayload = {
      senderId, recipients, subject: subject.trim(), body, startTime,
      delaySeconds: numberOrZero(delay), hourlyLimit: numberOrZero(hourly),
    };
    setSending(true);
    try {
      const { count } = await emailService.schedule(payload);
      toast("success", `${count} email${count > 1 ? "s" : ""} scheduled.`);
      navigate("/scheduled");
    } catch (e) { toast("error", (e as Error).message || "Scheduling failed."); } finally { setSending(false); }
  };
  const numField = "w-24 rounded-lg border bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-300";
  return (
    <div>
      <header className="flex items-center gap-4 px-6 py-5">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button>
        <h1 className="flex-1 text-2xl">Compose New Email</h1>

        <input ref={fileRef} type="file" multiple hidden onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])} />
        <button onClick={() => fileRef.current?.click()} className="relative text-brand-600" aria-label="Attach files">
          <Paperclip size={22} />
          {files.length > 0 && <span className="absolute -bottom-2 -right-2 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{files.length}</span>}
        </button>

        <div className="relative">
          <button onClick={() => setPickerOpen((o) => !o)} className={startTime ? "text-brand-600" : "text-slate-500"} aria-label="Send later"><Clock size={22} /></button>
          {pickerOpen && <SendLaterPopover value={startTime} onCancel={() => setPickerOpen(false)} onDone={(iso) => { setStartTime(iso); setPickerOpen(false); }} />}
        </div>

        <Button onClick={submit} loading={sending}>{startTime ? "Send Later" : "Send"}</Button>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 pb-12 pt-4">
        {startTime && <p className="text-sm text-slate-500">Starts {detailLabel(startTime)}</p>}

        <div className="flex items-center gap-6">
          <span className="w-16 text-sm">From</span>
          <div className="relative">
            <select value={senderId} onChange={(e) => setSenderId(e.target.value)} aria-label="From"
              className="appearance-none rounded-xl bg-field py-3 pl-4 pr-10 outline-none">
              {senders.map((s) => <option key={s.id} value={s.id}>{s.email}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
        <div className="flex items-start gap-6"><span className="w-16 pt-1 text-sm">To</span><RecipientInput recipients={recipients} onChange={setRecipients} onError={(m) => toast("error", m)} /></div>
        <div className="flex items-center gap-6 border-b pb-2">
          <label htmlFor="subject" className="w-16 text-sm">Subject</label>
          <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="flex-1 bg-transparent outline-none placeholder:text-slate-400" />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label htmlFor="delay">Delay between 2 emails</label>
          <input id="delay" inputMode="numeric" value={delay} onChange={(e) => setDelay(e.target.value.replace(/\D/g, ""))} placeholder="00" className={numField} />
          <span className="text-slate-400">sec</span>
          <label htmlFor="hourly" className="ml-4">Hourly Limit</label>
          <input id="hourly" inputMode="numeric" value={hourly} onChange={(e) => setHourly(e.target.value.replace(/\D/g, ""))} placeholder="00" className={numField} />
        </div>
        <RichTextEditor onChange={setBody} />
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {files.map((f, i) => (
              <li key={f.name + i} className="flex items-center gap-2 rounded-lg bg-field px-3 py-2 text-sm">
                {f.name}<button aria-label={`Remove ${f.name}`} onClick={() => setFiles((s) => s.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
