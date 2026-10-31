import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Activity, ChevronDown, Clock, ExternalLink, LogOut, Mail, MessageSquare, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { emailService } from "../../services/emailService";
import { slackService, SlackStatus } from "../../services/slackService";
import type { EmailCounts } from "../../types";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import SlackModal from "./SlackModal";
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [counts, setCounts] = useState<EmailCounts>({ scheduled: 0, sent: 0 });
  const [menu, setMenu] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const fetchSlack = () => {
    slackService.getStatus().then(setSlackStatus).catch(() => {});
  };
  useEffect(() => {
    emailService.counts().then(setCounts).catch(() => {});
    fetchSlack();
  }, [pathname]);
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
      isActive ? "bg-brand-50 font-semibold text-slate-800" : "text-slate-600 hover:bg-slate-50"
    }`;
  const displayName = user?.name || "Shreyansh Gupta";
  const displayEmail = user?.email || "shreyansh.gupta@reachinbox.ai";
  const displayAvatar = user?.avatarUrl || "https://avatars.githubusercontent.com/u/158720188?v=4";
  return (
    <>
      <aside className="flex w-72 shrink-0 flex-col gap-4 p-4 border-r border-slate-100 bg-white">
        {/* ReachInbox Brand Logo & Title */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm border border-slate-800">
            <Mail size={18} className="stroke-[2] text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block font-bold text-slate-900 text-base leading-tight tracking-tight">ReachInbox</span>
            <span className="block text-[11px] text-slate-400 font-medium tracking-tight">Email Job Scheduler</span>
          </div>
        </div>
        {/* User Profile Card */}
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex w-full items-center gap-3 rounded-xl bg-field p-3 text-left hover:bg-slate-100/70 transition"
            aria-expanded={menu}
          >
            <Avatar name={displayName} src={displayAvatar} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800">{displayName}</span>
              <span className="block truncate text-xs text-slate-500">{displayEmail}</span>
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>
          {menu && (
            <button
              onClick={() => logout()}
              className="absolute left-0 right-0 top-full z-10 mt-1 flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-50"
            >
              <LogOut size={16} /> Log out
            </button>
          )}
        </div>
        <Button className="w-full py-2.5 shadow-sm" onClick={() => navigate("/compose")}>
          Compose New Email
        </Button>
        <nav className="flex flex-col gap-1">
          <span className="px-3 pb-1 pt-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">Core</span>
          <NavLink to="/scheduled" className={link}>
            <Clock size={18} />
            <span className="flex-1">Scheduled</span>
            <span className="text-slate-500 text-xs font-semibold">{counts.scheduled}</span>
          </NavLink>
          <NavLink to="/sent" className={link}>
            <Send size={18} />
            <span className="flex-1">Sent</span>
            <span className="text-slate-500 text-xs font-semibold">{counts.sent}</span>
          </NavLink>
        </nav>
        <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
          <span className="px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">Integrations</span>

          {/* Slack Connection Button & Status */}
          <button
            onClick={() => setSlackModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${slackStatus.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                <MessageSquare size={16} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-slate-700">Slack Alerts</span>
                <span className="block truncate text-[10px] text-slate-400">
                  {slackStatus.connected ? (slackStatus.channel ? `#${slackStatus.channel}` : "Connected") : "Not Connected"}
                </span>
              </div>
            </div>
            <span className={`inline-block h-2 w-2 rounded-full ${slackStatus.connected ? "bg-emerald-500" : "bg-amber-400"}`} />
          </button>

          {/* Live BullMQ Dashboard Link */}
          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Activity size={16} />
              </div>
              <span className="font-semibold">Queue Dashboard</span>
            </div>
            <ExternalLink size={14} className="text-slate-400" />
          </a>
        </div>
      </aside>
      {slackModalOpen && (
        <SlackModal
          status={slackStatus}
          onClose={() => setSlackModalOpen(false)}
          onRefresh={fetchSlack}
        />
      )}
    </>
  );
}
