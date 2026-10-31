import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 pr-6"><Outlet /></main>
    </div>
  );
}
