import React, { useMemo, useRef, useState } from 'react';
import { User, Bell, Lock, MapPin, Layers, Check, Shield } from 'lucide-react';
import { getStoredUser, storeAuthSession } from '../../services/api';

const SETTINGS_STORAGE_KEY = 'dispatcher_settings';

function Toggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-200 border border-gray-300'
        }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${enabled ? 'right-1' : 'left-1'
          }`}
      />
    </button>
  );
}

export default function Settings() {
  const storedUser = useMemo(() => getStoredUser(), []);
  const toastTimerRef = useRef(null);
  const persistedSettings = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }, []);

  const [activeTab, setActiveTab] = useState('PROFILE');
  const [saveMessage, setSaveMessage] = useState('');
  const [profile, setProfile] = useState({
    name: persistedSettings.profile?.name || storedUser?.name || 'Nguyễn Văn A',
    employeeCode: persistedSettings.profile?.employeeCode || storedUser?.employeeCode || storedUser?.code || '001',
    phone: persistedSettings.profile?.phone || storedUser?.phone || '091 10101 11',
    email: persistedSettings.profile?.email || storedUser?.email || 'dispatcher@cuuho.vn',
  });
  const [notifications, setNotifications] = useState({
    sosSound: persistedSettings.notifications?.sosSound ?? true,
    browser: persistedSettings.notifications?.browser ?? false,
    assignment: persistedSettings.notifications?.assignment ?? true,
    summary: persistedSettings.notifications?.summary ?? true,
  });
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactor: persistedSettings.security?.twoFactor ?? false,
  });
  const [mapConfig, setMapConfig] = useState({
    defaultMap: persistedSettings.mapConfig?.defaultMap || 'TRAFFIC',
    trafficLayer: persistedSettings.mapConfig?.trafficLayer ?? true,
    showTeams: persistedSettings.mapConfig?.showTeams ?? true,
    autoCenter: persistedSettings.mapConfig?.autoCenter ?? true,
  });

  const tabs = [
    { id: 'PROFILE', label: 'Thông tin cá nhân', icon: User },
    { id: 'NOTIFICATIONS', label: 'Thông báo', icon: Bell },
    { id: 'SECURITY', label: 'Bảo mật & Phân quyền', icon: Lock },
    { id: 'MAP', label: 'Cấu hình bản đồ', icon: MapPin },
  ];

  const persistSettings = (nextValues) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextValues));
  };

  const showSaved = (text) => {
    setSaveMessage(text);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setSaveMessage(''), 2400);
  };

  const saveProfile = () => {
    const nextSettings = { profile, notifications, security: { twoFactor: security.twoFactor }, mapConfig };
    persistSettings(nextSettings);

    if (storedUser) {
      storeAuthSession({
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
        user: { ...storedUser, name: profile.name, phone: profile.phone, email: profile.email, employeeCode: profile.employeeCode },
      });
    }
    showSaved('Đã lưu thông tin cá nhân.');
  };

  const saveSecurity = () => {
    if (security.newPassword && security.newPassword.length < 6) {
      showSaved('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      showSaved('Xác nhận mật khẩu chưa khớp.');
      return;
    }

    persistSettings({ profile, notifications, security: { twoFactor: security.twoFactor }, mapConfig });
    setSecurity((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    showSaved('Đã cập nhật cấu hình bảo mật.');
  };

  const saveMap = () => {
    persistSettings({ profile, notifications, security: { twoFactor: security.twoFactor }, mapConfig });
    showSaved('Đã lưu cấu hình bản đồ.');
  };

  const saveNotifications = () => {
    persistSettings({ profile, notifications, security: { twoFactor: security.twoFactor }, mapConfig });
    showSaved('Đã lưu cấu hình thông báo.');
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex overflow-hidden">
        <div className="w-[300px] border-r border-gray-100 flex flex-col bg-white shrink-0">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Cài đặt</h3>
            <p className="text-xs text-gray-500 mt-1">Tùy chỉnh hồ sơ, cảnh báo và màn hình điều phối</p>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <IconComponent size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 flex flex-col bg-[#F9FAFB] relative">
          {saveMessage && (
            <div className="absolute top-5 right-6 z-20 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm">
              <Check size={16} />
              {saveMessage}
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4">Hồ sơ điều phối viên</h2>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 shrink-0">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=FF5252&color=fff&size=128`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Hồ sơ cá nhân</h3>
                  <p className="text-sm text-gray-500">Mã định danh: HC - {profile.employeeCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Họ và tên</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Mã nhân sự</label>
                  <input
                    type="text"
                    value={profile.employeeCode}
                    onChange={(event) => setProfile((prev) => ({ ...prev, employeeCode: event.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end max-w-2xl mt-auto">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="bg-[#00A8FF] text-white font-bold py-2.5 px-8 rounded-lg shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4">Cấu hình cảnh báo sự cố</h2>

              <div className="max-w-2xl space-y-4">
                {[
                  ['sosSound', 'Âm thanh cảnh báo (SOS)', 'Phát chuông báo khi có yêu cầu SOS khẩn cấp'],
                  ['browser', 'Thông báo trình duyệt', 'Nhận Push Notification khi đang mở hệ thống'],
                  ['assignment', 'Thông báo phân công', 'Nhắc khi đội cứu hộ nhận hoặc từ chối nhiệm vụ'],
                  ['summary', 'Bản tin cuối ca', 'Tóm tắt sự cố và hiệu suất theo ca trực'],
                ].map(([key, title, description]) => (
                  <div key={key} className="flex items-center justify-between bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <h4 className="font-bold text-gray-900">{title}</h4>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    <Toggle
                      enabled={notifications[key]}
                      onToggle={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end max-w-2xl mt-12">
                <button
                  type="button"
                  onClick={saveNotifications}
                  className="bg-[#00A8FF] text-white font-bold py-2.5 px-8 rounded-lg shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4">Bảo mật tài khoản</h2>

              <div className="max-w-2xl space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Đổi mật khẩu</h3>
                      <p className="text-sm text-gray-500">Lưu cục bộ cho demo UI. Có kiểm tra xác nhận mật khẩu.</p>
                    </div>
                  </div>

                  <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); saveSecurity(); }}>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        value={security.currentPassword}
                        onChange={(event) => setSecurity((prev) => ({ ...prev, currentPassword: event.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Mật khẩu mới</label>
                      <input
                        type="password"
                        value={security.newPassword}
                        onChange={(event) => setSecurity((prev) => ({ ...prev, newPassword: event.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        value={security.confirmPassword}
                        onChange={(event) => setSecurity((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">Xác thực 2 bước</h4>
                    <p className="text-sm text-gray-500">Bật xác thực lớp bổ sung cho tài khoản điều phối.</p>
                  </div>
                  <Toggle
                    enabled={security.twoFactor}
                    onToggle={() => setSecurity((prev) => ({ ...prev, twoFactor: !prev.twoFactor }))}
                  />
                </div>
              </div>

              <div className="flex justify-end max-w-2xl mt-12">
                <button
                  type="button"
                  onClick={saveSecurity}
                  className="bg-[#00A8FF] text-white font-bold py-2.5 px-8 rounded-lg shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {activeTab === 'MAP' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-8 border-b border-gray-200 pb-4">Hiển thị Bản đồ & Điều phối</h2>

              <div className="max-w-2xl mb-8">
                <h4 className="font-bold text-gray-800 mb-4">Kiểu bản đồ mặc định</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'TRAFFIC', title: 'Bản đồ Giao thông', description: 'Đường xá, luồng xe và điểm nóng giao thông', icon: MapPin },
                    { id: 'SATELLITE', title: 'Vệ tinh', description: 'Ảnh nền thực địa để quan sát hiện trường', icon: Layers },
                  ].map((option) => {
                    const IconComponent = option.icon;
                    const active = mapConfig.defaultMap === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMapConfig((prev) => ({ ...prev, defaultMap: option.id }))}
                        className={`text-left border bg-white p-4 rounded-xl transition-all cursor-pointer relative ${active ? 'border-2 border-blue-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        {active && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                        )}
                        <IconComponent className={active ? 'text-blue-500 mb-2' : 'text-gray-400 mb-2'} />
                        <h5 className={`font-bold ${active ? 'text-gray-900' : 'text-gray-600'}`}>{option.title}</h5>
                        <p className={`text-xs mt-1 ${active ? 'text-gray-500' : 'text-gray-400'}`}>{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-w-2xl space-y-4">
                {[
                  ['trafficLayer', 'Bật lớp dữ liệu tắc đường', 'Trạng thái giao thông trực tiếp, tự động cập nhật'],
                  ['showTeams', 'Hiện vị trí đội cứu hộ', 'Giữ marker đội xe luôn hiển thị khi đang điều phối'],
                  ['autoCenter', 'Tự động focus hiện trường', 'Khi mở chi tiết sự cố, bản đồ tự zoom vào điểm nóng'],
                ].map(([key, title, description]) => (
                  <div key={key} className="border border-gray-200 bg-white p-5 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold text-gray-900">{title}</h4>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    <Toggle
                      enabled={mapConfig[key]}
                      onToggle={() => setMapConfig((prev) => ({ ...prev, [key]: !prev[key] }))}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end max-w-2xl mt-12">
                <button
                  type="button"
                  onClick={saveMap}
                  className="bg-[#00A8FF] text-white font-bold py-2.5 px-8 rounded-lg shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
