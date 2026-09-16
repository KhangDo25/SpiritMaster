import React, { Suspense } from 'react';
import { Outlet, useNavigation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { PageSkeleton, TopProgressBar } from '../ui/Loading';
import { LoadingProvider } from '../../contexts/LoadingContext';

export const AppLayout: React.FC = () => {
  return (
    <LoadingProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />
        <main className="flex-1 flex flex-col relative">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </LoadingProvider>
  );
};
