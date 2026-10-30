import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking your session…" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
