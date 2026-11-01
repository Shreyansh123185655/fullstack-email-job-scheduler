import { useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const getPageTitle = () => {
    if (pathname.includes("/scheduled")) return "Scheduled Emails";
    if (pathname.includes("/sent")) return "Sent Emails";
    if (pathname.includes("/compose")) return "Compose Email Campaign";
    if (pathname.includes("/email/")) return "Email Details";
    return "Email Scheduler Dashboard";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName = user?.name || "ReachInbox User";
  const displayEmail = user?.email || "user@reachinbox.ai";
  const displayAvatar = user?.avatarUrl;

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-sm shadow-xs">
      {/* Left: Page Title & Queue Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          {getPageTitle()}
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Queue Engine Active
        </span>
      </div>

      {/* Right: User Profile (Avatar, Name, Email) & Logout */}
      <div className="flex items-center gap-4">
        {/* User Profile Info */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 shadow-xs">
          <Avatar name={displayName} src={displayAvatar} size={32} />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-[220px]">
              {displayEmail}
            </span>
          </div>
        </div>

        {/* Dedicated Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign out of ReachInbox"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition shadow-xs cursor-pointer"
        >
          <LogOut size={14} className="stroke-[2.2]" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
