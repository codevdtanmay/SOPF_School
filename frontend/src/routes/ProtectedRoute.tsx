import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Loader from '../components/common/Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, loading, role } = useAuth();

  // Show a clean center loader while verifying state
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3 select-none">
        <Loader size="lg" />
        <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          Verifying Credentials...
        </h4>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If not authenticated, redirect straight to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Role mismatch: Redirect to an unauthorized path or fall back
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;
