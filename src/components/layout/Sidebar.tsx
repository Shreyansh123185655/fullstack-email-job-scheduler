import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Clock, LogOut, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { emailService } from "../../services/emailService";
import type { EmailCounts } from "../../types";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [counts, setCounts] = useState<EmailCounts>({ scheduled: 0, sent: 0 });
  const [menu, setMenu] = useState(false);

  useEffect(() => { emailService.counts().then(setCounts).catch(() => {}); }, [pathname]);

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? "bg-brand-50 font-semibold text-slate-800" : "text-slate-600 hover:bg-slate-50"}`;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 p-4">
      <span className="px-1 font-mono text-4xl font-black tracking-tighter">ONB</span>

      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="flex w-full items-center gap-3 rounded-xl bg-field p-3 text-left" aria-expanded={menu}>
          <Avatar name={user!.name} src={user!.avatarUrl} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user!.name}</span>
            <span className="block truncate text-xs text-slate-500">{user!.email}</span>
          </span>
          <ChevronDown size={16} className="text-slate-500" />
        </button>
        {menu && (
          <button onClick={() => logout()} className="absolute left-0 right-0 top-full z-10 mt-1 flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-50">
            <LogOut size={16} /> Log out
          </button>
        )}
      </div>

      <Button className="w-full py-2.5" onClick={() => navigate("/compose")}>Compose</Button>

      <nav className="flex flex-col gap-1">
        <span className="px-3 pb-1 pt-2 text-xs text-slate-400">Core</span>
        <NavLink to="/scheduled" className={link}><Clock size={18} /><span className="flex-1">Scheduled</span><span className="text-slate-500">{counts.scheduled}</span></NavLink>
        <NavLink to="/sent" className={link}><Send size={18} /><span className="flex-1">Sent</span><span className="text-slate-500">{counts.sent}</span></NavLink>
      </nav>
    </aside>
  );
}
