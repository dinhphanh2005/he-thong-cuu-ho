import { BrowserRouter, Navigate, Outlet, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import FirstTimePassword from './pages/auth/FirstTimePassword';
import Home from './pages/dispatch/Home';
import Incidents from './pages/dispatch/Incidents';
import Fleet from './pages/dispatch/Fleet';
import Contacts from './pages/dispatch/Contacts';
import Settings from './pages/dispatch/Settings';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTeams from './pages/admin/Teams';
import AdminUsers from './pages/admin/Users';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
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
    </BrowserRouter>
  );
}

export default App;
