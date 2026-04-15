import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Routes, Route } from 'react-router-dom';

const Login = React.lazy(() => import('./pages/auth/Login'));
const FirstTimePassword = React.lazy(() => import('./pages/auth/FirstTimePassword'));
const Home = React.lazy(() => import('./pages/dispatch/Home'));
const Incidents = React.lazy(() => import('./pages/dispatch/Incidents'));
const Fleet = React.lazy(() => import('./pages/dispatch/Fleet'));
const Contacts = React.lazy(() => import('./pages/dispatch/Contacts'));
const Settings = React.lazy(() => import('./pages/dispatch/Settings'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminTeams = React.lazy(() => import('./pages/admin/Teams'));
const AdminUsers = React.lazy(() => import('./pages/admin/Users'));
const AdminReports = React.lazy(() => import('./pages/admin/Reports'));
const AdminSettings = React.lazy(() => import('./pages/admin/Settings'));

import DispatchLayout from './components/DispatchLayout';
import AdminLayout from './components/AdminLayout';
import { canAccessWebRole, getStoredUser, hasAccessToken, isPasswordChangeRequired } from './services/api';

function ProtectedRoutes() {
  const user = getStoredUser();

  if (!hasAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  if (isPasswordChangeRequired()) {
    return <Navigate to="/change-password" replace />;
  }

  if (!canAccessWebRole(user)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function LoginRoute() {
  const user = getStoredUser();

  if (hasAccessToken() && isPasswordChangeRequired()) {
    return <Navigate to="/change-password" replace />;
  }

  if (hasAccessToken() && canAccessWebRole(user)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;
  }

  return <Login />;
}

function ChangePasswordRoute() {
  if (!hasAccessToken() || !isPasswordChangeRequired()) {
    return <Navigate to="/login" replace />;
  }

  return <FirstTimePassword />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center p-4"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div></div>}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/change-password" element={<ChangePasswordRoute />} />

          <Route element={<ProtectedRoutes />}>
            {/* Dispatcher Portal */}
            <Route path="/" element={<DispatchLayout />}>
              <Route index element={<Home />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="fleet" element={<Fleet />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Admin Portal */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="teams" element={<AdminTeams />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
