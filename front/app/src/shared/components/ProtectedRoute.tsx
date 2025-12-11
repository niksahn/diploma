import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../state/auth'

const ProtectedRoute = () => {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute





