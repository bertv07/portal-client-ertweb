import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../lib/roles';

export default function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role if they try to access wrong area
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <Outlet />;
}
