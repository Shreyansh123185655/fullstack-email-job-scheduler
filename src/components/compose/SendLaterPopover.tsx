import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toLocalInput, tomorrowAt } from "../../utils/date";
import Button from "../ui/Button";

interface Props { value: string | null; onDone: (iso: string | null) => void; onCancel: () => void }

const presets: [string, number][] = [["Tomorrow", 9], ["Tomorrow, 10:00 AM", 10], ["Tomorrow, 11:00 AM", 11], ["Tomorrow, 3:00 PM", 15]];

export default function SendLaterPopover({ value, onDone, onCancel }: Props) {
  const [picked, setPicked] = useState(value ? toLocalInput(new Date(value)) : "");
  const invalid = picked !== "" && new Date(picked) <= new Date();

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border bg-white p-5 shadow-xl" role="dialog" aria-label="Send later">
      <h2 className="mb-4 font-medium">Send Later</h2>
      <label className="flex items-center border-b pb-2">
        <input type="datetime-local" value={picked} onChange={(e) => setPicked(e.target.value)} aria-label="Pick date and time" className="flex-1 bg-transparent text-sm outline-none" />
        <CalendarDays size={16} className="text-slate-400" />
      </label>
      {invalid && <p className="mt-2 text-xs text-red-600">Pick a time in the future.</p>}
      <ul className="mt-4 space-y-1">
        {presets.map(([label, h]) => (
          <li key={label}><button type="button" onClick={() => setPicked(toLocalInput(tomorrowAt(h)))} className="w-full rounded px-1 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">{label}</button></li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={!picked || invalid} onClick={() => onDone(new Date(picked).toISOString())}>Done</Button>
      </div>
    </div>
  );
}
