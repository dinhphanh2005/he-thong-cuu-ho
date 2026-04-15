import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, AlertCircle, Users, Phone, Search, Bell, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { AppProvider, useApp } from '../context/AppContext';
import { authAPI, clearAuth, getStoredUser } from '../services/api';
import { disconnectSocket } from '../services/socket';
import ServerStatusBanner from './ServerStatusBanner';
import MaintenancePage from './MaintenancePage';

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();
  const { pendingCount, config, user } = useApp();

  const menuItems = [
    { name: 'Bản đồ trực tiếp', icon: MapPin, path: '/', exact: true },
    { name: 'Sự cố', icon: AlertCircle, path: '/incidents', badge: pendingCount > 0 ? pendingCount : null },
    { name: 'Quản lý đội xe', icon: Users, path: '/fleet' },
    { name: 'Liên lạc tổng đài', icon: Phone, path: '/contacts' },
  ];

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    disconnectSocket();
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Brand */}
      <div className="h-16 flex items-center shrink-0 px-6 border-b border-gray-100">
        <h1 className="text-[#1A1A1A] text-lg font-bold tracking-tight truncate">
          {config?.systemName || 'Trung Tâm Điều Phối'}
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className="shrink-0" />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.badge != null && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="mt-auto p-4 border-t border-gray-100">
        <div className="bg-gray-50/50 rounded-2xl p-3 flex items-center justify-between group transition-all hover:bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Dispatcher')}&background=F1C40F&color=333&bold=true`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate tracking-tight">{user?.name || 'Điều phối viên'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trực tuyến</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `p-2 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100 scale-110' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`
              }
              title="Cài đặt"
            >
              <SettingsIcon size={18} />
            </NavLink>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header() {
  const location = useLocation();
  const { config } = useApp();
  const { pendingCount } = useApp();

  const titles = {
    '/': 'Trung Tâm Điều Phối',
    '/incidents': 'Quản lý sự cố',
    '/fleet': 'Quản lý đội xe',
    '/contacts': 'Liên lạc tổng đài',
    '/settings': 'Cài đặt hệ thống',
  };

  const title = titles[location.pathname] || 'Trung Tâm Điều Phối';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Hà Nội, Việt Nam • Cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-72 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <NavLink to="/incidents" className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={22} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </NavLink>
      </div>
    </header>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────
function LayoutInner() {
  const { isMaintenanceMode, isServerOffline, config } = useApp();

  // Dispatcher thấy trang bảo trì khi admin bật maintenance mode
  if (isMaintenanceMode) {
    return <MaintenancePage systemName={config?.systemName} />;
  }

  return (
    <>
      {/* Banner mất kết nối — hiển thị phía trên cùng */}
      <ServerStatusBanner isOffline={isServerOffline} />

      <div
        className="flex h-screen bg-[#F5F7FA] overflow-hidden"
        style={{ paddingTop: isServerOffline ? '36px' : '0' }}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8F9FA] p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <LayoutInner />
    </AppProvider>
  );
}
