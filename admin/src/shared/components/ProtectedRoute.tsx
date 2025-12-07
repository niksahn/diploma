import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../state/auth";

type Props = {
  children: ReactNode;
};

function ProtectedRoute({ children }: Props) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

