import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardLayout from "./pages/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import EmailListPage from "./pages/EmailListPage";
import ComposePage from "./pages/ComposePage";
import EmailDetailPage from "./pages/EmailDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/scheduled" replace />} />
          <Route path="dashboard" element={<Navigate to="/scheduled" replace />} />
          <Route path="scheduled" element={<EmailListPage status="scheduled" />} />
          <Route path="sent" element={<EmailListPage status="sent" />} />
          <Route path="email/:id" element={<EmailDetailPage />} />
          <Route path="compose" element={<ComposePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
