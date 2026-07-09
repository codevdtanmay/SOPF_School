import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import { useAuth, AuthProvider } from '../context/AuthContext';

const AppRoutesContent: React.FC = () => {
  const { isAuthenticated, role, logout } = useAuth();
  
  // Shared Layout tab state to coordinate sidebar clicks and parent layouts
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Routes>
      {/* Auth Entrance */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/unauthorized" replace />
          ) : (
            <LoginPage />
          )
        } 
      />

      {/* Admin Operations under Layout Shell */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout 
              currentTab={currentTab} 
              setCurrentTab={setCurrentTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            >
              <AdminDashboard 
                currentTab={currentTab} 
                setCurrentTab={setCurrentTab}
                searchQuery={searchQuery}
              />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />

      {/* Unauthorized fallback */}
      <Route 
        path="/unauthorized" 
        element={
          <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-50 gap-4 text-center">
            <h1 className="text-xl font-black text-red-500">Access Restricted</h1>
            <p className="text-xs text-slate-505 max-w-sm">
              Your profile does not hold necessary credentials for this operations desk. Please log in with a authorized administration node.
            </p>
            <button 
              onClick={() => logout()} 
              className="text-xs text-blue-600 font-bold underline hover:text-blue-800 transition-colors cursor-pointer"
            >
              Return to Entrance
            </button>
          </div>
        } 
      />

      {/* Global Fallback Redirect */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? (
            role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/unauthorized" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutesContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
