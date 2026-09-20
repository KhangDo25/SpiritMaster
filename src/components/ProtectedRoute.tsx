import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SpiritLoadingScreen } from './ui/Loading';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SpiritLoadingScreen
        message="Đang xác thực Thần Sứ..."
        subMessage="Đang kết nối Thần Điện và kiểm tra tài khoản"
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}