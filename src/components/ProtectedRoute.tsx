import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SpiritLoadingScreen } from './ui/Loading';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <SpiritLoadingScreen 
        message="Đang xác thực Thần Sứ..." 
        subMessage="Đang kết nối Thần Điện và kiểm tra linh thú bảo hộ"
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force users without a starter spirit to select one, unless they are already on the selection page
  if (!user.hasStarter && location.pathname !== '/select-spirit') {
    return <Navigate to="/select-spirit" replace />;
  }

  // Prevent users who already have a starter from revisiting the selection page
  if (user.hasStarter && location.pathname === '/select-spirit') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
