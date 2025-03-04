
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Show loading state while auth is being checked
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  // Render children if user is authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
