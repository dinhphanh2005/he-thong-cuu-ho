import React, { useMemo, useRef, useState, useEffect } from 'react';
import { User, Bell, Lock, MapPin, Layers, Check, Shield } from 'lucide-react';
import { getStoredUser } from '../../services/api';
import { useApp } from '../../context/AppContext';

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

const tabs = [
  { id: 'PROFILE', label: 'Thông tin cá nhân', icon: User },
  { id: 'NOTIFICATIONS', label: 'Thông báo', icon: Bell },
  { id: 'SECURITY', label: 'Bảo mật & Phân quyền', icon: Lock },
  { id: 'MAP', label: 'Cấu hình bản đồ', icon: MapPin },
];

export default function Settings() {
  const { personalSettings, updatePersonalSettings } = useApp();
  const storedUser = useMemo(() => getStoredUser(), []);
  
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [saveStatus, setSaveStatus] = useState('IDLE'); // IDLE, SAVING, SAVED, ERROR
  const saveTimeoutRef = useRef(null);
  
  // Local form states
  const [profile, setProfile] = useState({
    name: storedUser?.name || 'Nguyễn Văn A',
    employeeCode: storedUser?.employeeCode || storedUser?.code || '001',
    phone: storedUser?.phone || '091 10101 11',
    email: storedUser?.email || 'dispatcher@cuuho.vn',
  });
  
  const [notifications, setNotifications] = useState({
    sosSound: true,
    browser: false,
    assignment: true,
    summary: true,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
  });

  const [mapConfig, setMapConfig] = useState({
    defaultMap: 'TRAFFIC',
    trafficLayer: true,
    showTeams: true,
    autoCenter: true,
  });

  // Sync with context
  useEffect(() => {
    if (personalSettings) {
      if (personalSettings.notifications) setNotifications(personalSettings.notifications);
      if (personalSettings.mapConfig) setMapConfig(personalSettings.mapConfig);
    }
  }, [personalSettings]);

  const performSync = async (payload) => {
    setSaveStatus('SAVING');
    try {
      await updatePersonalSettings(payload);
      setSaveStatus('SAVED');
      setTimeout(() => setSaveStatus('IDLE'), 3000);
    } catch (err) {
      console.error('Dispatcher sync error:', err);
      setSaveStatus('ERROR');
    }
  };

  const debouncedSync = (payload) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performSync(payload);
    }, 1000);
  };

  const updateProfileField = (field, value) => {
    const next = { ...profile, [field]: value };
    setProfile(next);
    debouncedSync({ [field]: value });
  };

  const updateNotiField = (field, value) => {
    const next = { ...notifications, [field]: value };
    setNotifications(next);
    debouncedSync({ notifications: next });
  };

  const updateMapField = (field, value) => {
    const next = { ...mapConfig, [field]: value };
    setMapConfig(next);
    debouncedSync({ mapConfig: next });
  };

  const updateSecurityField = (field, value) => {
    const next = { ...security, [field]: value };
    setSecurity(next);
    // Security field persistence could be added here
    setSaveStatus('SAVED');
    setTimeout(() => setSaveStatus('IDLE'), 2000);
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

        <div className="flex-1 flex flex-col bg-[#F9FAFB] relative overflow-hidden">
          {/* Sync Status Overlay */}
          <div className={`absolute top-6 right-8 z-30 flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-bold shadow-sm transition-all duration-300 ${saveStatus === 'SAVING' ? 'bg-amber-50 border-amber-200 text-amber-600' :
            saveStatus === 'SAVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
            saveStatus === 'ERROR' ? 'bg-red-50 border-red-200 text-red-600' :
            'bg-white border-gray-100 text-gray-400 opacity-60'
            }`}>
            {saveStatus === 'SAVING' ? (
              <>
                <RefreshCcw size={14} className="animate-spin" />
                <span>Đang đồng bộ...</span>
              </>
            ) : saveStatus === 'SAVED' ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span>Đã lưu lên mây</span>
              </>
            ) : saveStatus === 'ERROR' ? (
              <>
                <Shield size={14} className="text-red-500" />
                <span>Lỗi kết nối!</span>
              </>
            ) : (
              <>
                <Check size={14} className="text-gray-300" />
                <span>Đã đồng bộ</span>
              </>
            )}
          </div>

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
                    onChange={(event) => updateProfileField('name', event.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Mã nhân sự</label>
                  <input
                    type="text"
                    value={profile.employeeCode}
                    onChange={(event) => setProfile((prev) => ({ ...prev, employeeCode: event.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed text-gray-400"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(event) => updateProfileField('phone', event.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => updateProfileField('email', event.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-start max-w-2xl mt-8">
                <p className="text-[11px] font-bold text-gray-400 italic">Mọi thay đổi hồ sơ sẽ được cập nhật và đồng bộ ngay lập tức.</p>
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
                      onToggle={() => updateNotiField(key, !notifications[key])}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-start max-w-2xl mt-8">
                <p className="text-[11px] font-bold text-gray-400 italic">Cấu hình thông báo sẽ được áp dụng cho toàn bộ phiên làm việc của bạn.</p>
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

                  <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); }}>
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
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed"
                        disabled
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
                    onToggle={() => updateSecurityField('twoFactor', !security.twoFactor)}
                  />
                </div>
              </div>

              <div className="flex justify-start max-w-2xl mt-8">
                <p className="text-[11px] font-bold text-gray-400 italic">Tính năng đổi mật khẩu yêu cầu xác thực Admin.</p>
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
                        onClick={() => updateMapField('defaultMap', option.id)}
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
                      onToggle={() => updateMapField(key, !mapConfig[key])}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-start max-w-2xl mt-8">
                <p className="text-[11px] font-bold text-gray-400 italic">Bản đồ sẽ tự động làm mới khi bạn thay đổi cấu hình hiển thị.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
