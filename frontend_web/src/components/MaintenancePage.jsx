import React, { useEffect, useState } from 'react';
import { Wrench, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

/**
 * MaintenancePage — Trang bảo trì hệ thống
 *
 * Hiển thị khi Admin bật chế độ bảo trì.
 * - Non-admin: thấy trang này, không thể thao tác
 * - Admin: backend bypass middleware → không bao giờ thấy trang này
 *
 * Hệ thống tự ẩn trang khi admin tắt bảo trì (via socket system:config-updated)
 */
export default function MaintenancePage({ systemName = 'Hệ Thống Cứu Hộ Giao Thông' }) {
  const [elapsed, setElapsed] = useState(0);

  // Đếm thời gian chờ
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-500/5 animate-pulse"
            style={{
              width: `${120 + i * 80}px`,
              height: `${120 + i * 80}px`,
              top: `${10 + i * 12}%`,
              left: `${5 + i * 15}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-[2rem] bg-blue-600/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm">
              <Wrench size={52} className="text-blue-400 animate-[spin_3s_linear_infinite]" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900">
              <ShieldCheck size={14} className="text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
          Hệ thống đang bảo trì
        </h1>
        <p className="text-blue-300 font-semibold text-lg mb-2">{systemName}</p>
        <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">
          Chúng tôi đang nâng cấp hệ thống để cải thiện dịch vụ.
          <br />
          Vui lòng quay lại sau khi bảo trì hoàn tất.
        </p>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</span>
            </div>
            <p className="text-white font-bold text-sm">Đang bảo trì</p>
            <p className="text-slate-400 text-xs mt-0.5">Bởi Quản trị viên</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={12} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian chờ</span>
            </div>
            <p className="text-white font-bold text-sm font-mono">{formatTime(elapsed)}</p>
            <p className="text-slate-400 text-xs mt-0.5">Kể từ khi bảo trì</p>
          </div>
        </div>

        {/* Auto check note */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
          <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '3s' }} />
          <span>Hệ thống tự động kiểm tra mỗi 10 giây</span>
        </div>

        {/* Hotline */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-slate-500 text-xs">
            Cần hỗ trợ khẩn cấp? Gọi hotline{' '}
            <a href="tel:19001234" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
              1900 1234
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
