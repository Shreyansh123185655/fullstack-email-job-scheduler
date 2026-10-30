import { useRef } from "react";
import { AlignCenter, Bold, ChevronsUpDown, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Type, Underline, Undo2, type LucideIcon } from "lucide-react";

const tools: (null | [string, LucideIcon, string?])[] = [
  ["undo", Undo2], ["redo", Redo2], null,
  ["fontSize", Type, "4"], null,
  ["bold", Bold], ["italic", Italic], ["underline", Underline], null,
  ["justifyCenter", AlignCenter], ["justifyFull", ChevronsUpDown], null,
  ["insertOrderedList", ListOrdered], ["insertUnorderedList", List],
  ["indent", IndentIncrease], ["outdent", IndentDecrease], ["formatBlock", Quote, "blockquote"], null,
  ["strikeThrough", Strikethrough],
];

export default function RichTextEditor({ onChange }: { onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const exec = (cmd: string, arg?: string) => { ref.current?.focus(); document.execCommand(cmd, false, arg); onChange(ref.current?.innerHTML ?? ""); };

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl bg-[#fafafa] p-6">
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Type your reply…" role="textbox" aria-label="Email body" aria-multiline
        onInput={() => onChange(ref.current?.innerHTML ?? "")} className="editor min-h-[80px] outline-none" />
      <div className="mt-4 flex flex-wrap items-center gap-1 rounded-full bg-white px-3 py-2">
        {tools.map((t, i) => {
          if (t === null) return <span key={i} className="mx-2 h-5 w-px bg-slate-200" />;
          const Icon = t[1];
          return (
            <button key={i} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec(t[0], t[2])} aria-label={t[0]}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Icon size={18} /></button>
          );
        })}
      </div>
    </div>
  );
}
