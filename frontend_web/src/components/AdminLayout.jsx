import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, FileText, Settings, Search, Bell, LogOut } from 'lucide-react';
import { AppProvider, useApp } from '../context/AppContext';
import { authAPI, clearAuth, getStoredUser } from '../services/api';
import { disconnectSocket } from '../services/socket';

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { config } = useApp();

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    disconnectSocket();
    clearAuth();
    navigate('/login', { replace: true });
  };

  const NavItem = ({ to, icon: Icon, name, exact = false }) => {
    const isActive = exact 
      ? location.pathname === to 
      : location.pathname.startsWith(to);

    return (
      <NavLink
        to={to}
        end={exact}
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${
          isActive
            ? 'bg-blue-50 text-blue-600 font-black shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-bold'
        }`}
      >
        <Icon size={20} className="shrink-0" />
        <span className="text-[13px]">{name}</span>
      </NavLink>
    );
  };

  return (
    <div className="w-[280px] bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Brand */}
      <div className="h-20 flex items-center shrink-0 px-8">
        <h1 className="text-gray-900 text-2XL font-black tracking-tight font-sans truncate">
          {config?.systemName || 'Admin System'}
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/admin" icon={LayoutDashboard} name="Tổng quan (Dashboard)" exact />
        
        <div className="pt-6 pb-2 px-4">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Quản lý hệ thống</p>
        </div>

        <NavItem to="/admin/teams" icon={Truck} name="Đối tác cứu hộ" />
        <NavItem to="/admin/users" icon={Users} name="Người dùng & ĐPV" />
        <NavItem to="/admin/reports" icon={FileText} name="Báo cáo & Xuất dữ liệu" />
      </nav>

      {/* Footer Nav */}
      <div className="px-4 py-4 border-t border-gray-50">
        <NavItem to="/admin/settings" icon={Settings} name="Cài đặt hệ thống" />
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-50 shrink-0">
        <div className="flex items-center justify-between p-2 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getStoredUser()?.name || 'Admin')}&background=1f2937&color=fff`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-black text-gray-900 truncate">{getStoredUser()?.name || 'Quản trị viên'}</p>
              <p className="text-[11px] font-bold text-gray-400 italic">Quản trị hệ thống</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header() {
  const location = useLocation();

  const titles = {
    '/admin': 'Thống kê tổng quan',
    '/admin/users': 'Quản lý người dùng',
    '/admin/teams': 'Quản lý đội cứu hộ',
    '/admin/logs': 'Nhật ký hệ thống',
    '/admin/settings': 'Cài đặt hệ thống',
  };

  const title = titles[location.pathname] || 'Quản trị hệ thống';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Trang quản trị • {new Date().toLocaleDateString('vi-VN')}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài khoản, đội xe..."
            className="w-72 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={22} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────
function LayoutInner() {
  return (
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-[280px] overflow-hidden">
        {/* Removed global Header to allow page-specific headers */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 lg:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AppProvider>
      <LayoutInner />
    </AppProvider>
  );
}
