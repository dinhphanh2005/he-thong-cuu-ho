import React, { useState, useEffect } from 'react';
import { WifiOff, Loader2, CheckCircle2, X } from 'lucide-react';

/**
 * ServerStatusBanner — Banner trạng thái server
 *
 * Xuất hiện khi:
 * 1. isServerOffline = true → "Mất kết nối — đang thử lại..."
 * 2. Sau khi reconnect thành công → "Đã kết nối lại" (tự ẩn sau 3s)
 *
 * Tích hợp vào DispatchLayout và AdminLayout
 */
export default function ServerStatusBanner({ isOffline }) {
  const [showRecovered, setShowRecovered] = useState(false);
  const [prevOffline, setPrevOffline] = useState(isOffline);
  const [dismissed, setDismissed] = useState(false);

  // Phát hiện khi server phục hồi (offline → online)
  useEffect(() => {
    if (prevOffline && !isOffline) {
      setShowRecovered(true);
      setDismissed(false);
      const t = setTimeout(() => setShowRecovered(false), 4000);
      return () => clearTimeout(t);
    }
    setPrevOffline(isOffline);
  }, [isOffline, prevOffline]);

  // Reset dismissed khi mất kết nối lại
  useEffect(() => {
    if (isOffline) setDismissed(false);
  }, [isOffline]);

  // Không hiển thị gì nếu server bình thường
  if (!isOffline && !showRecovered) return null;
  if (dismissed) return null;

  // ── Server đã phục hồi ──────────────────────────────────────────────────────
  if (showRecovered) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] animate-slide-down">
        <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="text-sm font-bold">
              Kết nối máy chủ đã được khôi phục — Đang tải lại dữ liệu...
            </span>
          </div>
          <button onClick={() => setShowRecovered(false)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Server đang offline ─────────────────────────────────────────────────────
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <WifiOff size={16} className="shrink-0 animate-pulse" />
          <span className="text-sm font-bold">
            Mất kết nối đến máy chủ
          </span>
          <span className="text-red-200 text-sm">
            — Đang tự động thử kết nối lại mỗi 10 giây...
          </span>
          <Loader2 size={14} className="animate-spin text-red-200 shrink-0" />
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-md transition-colors"
          title="Ẩn thông báo"
        >
          <X size={14} />
        </button>
      </div>

      {/* Thin progress bar nhấp nháy */}
      <div className="h-0.5 bg-red-800 overflow-hidden">
        <div
          className="h-full bg-red-300 animate-[slideProgress_10s_linear_infinite]"
          style={{
            animation: 'slideProgress 10s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes slideProgress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </div>
  );
}
