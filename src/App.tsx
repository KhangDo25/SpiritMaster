/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SinglePlayer from './pages/SinglePlayer';
import Collection from './pages/Collection';
import BossRun from './pages/BossRun';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import RoomLobby from './pages/RoomLobby';
import Leaderboard from './pages/Leaderboard';
import Achievements from './pages/Achievements';
import Shop from './pages/Shop';
import Events from './pages/Events';
import BattlePass from './pages/BattlePass';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/single-player" element={<SinglePlayer />} />
              <Route path="/boss" element={<BossRun />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/multiplayer/create" element={<CreateRoom />} />
              <Route path="/rooms/create" element={<CreateRoom />} />
              <Route path="/multiplayer/join" element={<JoinRoom />} />
              <Route path="/rooms/join" element={<JoinRoom />} />
              <Route path="/multiplayer/lobby/:roomId" element={<RoomLobby />} />
              <Route path="/rooms/lobby/:roomId" element={<RoomLobby />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/events" element={<Events />} />
              <Route path="/battlepass" element={<BattlePass />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}