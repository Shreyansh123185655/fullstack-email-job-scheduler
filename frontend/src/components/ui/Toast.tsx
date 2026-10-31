import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
type Kind = "success" | "error";
interface ToastItem { id: number; kind: Kind; text: string }
const ToastContext = createContext<(kind: Kind, text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${t.kind === "success" ? "bg-brand-600" : "bg-red-600"}`}>{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
