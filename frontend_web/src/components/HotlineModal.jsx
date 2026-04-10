import React, { useState } from 'react';
import { X, Phone, MapPin, AlertTriangle, ChevronDown } from 'lucide-react';
import { incidentAPI } from '../services/api';

const INCIDENT_TYPES = [
  { value: 'ACCIDENT', label: 'Tai nạn giao thông' },
  { value: 'BREAKDOWN', label: 'Hỏng xe / Chết máy' },
  { value: 'FLOOD', label: 'Ngập nước' },
  { value: 'FIRE', label: 'Cháy nổ' },
  { value: 'OTHER', label: 'Sự cố khác' },
];

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Nhẹ', color: 'text-green-600' },
  { value: 'MEDIUM', label: 'Bình thường', color: 'text-yellow-600' },
  { value: 'HIGH', label: 'Nghiêm trọng', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Khẩn cấp', color: 'text-red-600' },
];

export default function HotlineModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: form, 2: success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    callerPhone: '',
    callerName: '',
    address: '',
    type: 'ACCIDENT',
    severity: 'MEDIUM',
    description: '',
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.callerPhone.trim()) { setError('Vui lòng nhập số điện thoại'); return; }
    if (!form.address.trim()) { setError('Vui lòng nhập địa chỉ'); return; }

    setLoading(true);
    setError('');
    try {
      // Geocode address to get coordinates (Hanoi fallback)
      let coordinates = [105.804817, 21.028511];
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.address + ', Hà Nội')}&format=json&limit=1`
        );
        const geoData = await geoRes.json();
        if (geoData[0]) {
          coordinates = [parseFloat(geoData[0].lon), parseFloat(geoData[0].lat)];
        }
      } catch {}

      await incidentAPI.create({
        type: form.type,
        severity: form.severity,
        description: form.description || `Gọi từ Hotline: ${form.callerPhone} - ${form.callerName}`,
        coordinates,
        address: form.address,
        reporterPhone: form.callerPhone,
        reporterName: form.callerName,
        source: 'HOTLINE',
      });

      setStep(2);
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tạo sự cố');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Tạo sự cố từ Hotline</h3>
            <p className="text-xs text-gray-500 mt-0.5">Hệ thống sẽ tự động tìm đội cứu hộ sau khi tạo.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-5 space-y-5">
            {/* Caller Info */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Phone size={12} /> 1. Thông tin người gọi
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Số điện thoại *</label>
                  <input
                    type="tel"
                    value={form.callerPhone}
                    onChange={e => set('callerPhone', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 0235..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Họ và tên</label>
                  <input
                    type="text"
                    value={form.callerName}
                    onChange={e => set('callerName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên người báo cáo"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin size={12} /> 2. Vị trí hiện trường
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Địa chỉ chính xác hoặc mô tả *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Ngã tư Tôn Thất Thuyết, Cầu Giấy..."
                />
              </div>
            </div>

            {/* Incident Details */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={12} /> 3. Chi tiết sự cố
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Loại sự cố *</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={e => set('type', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {INCIDENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Mức độ ưu tiên *</label>
                  <div className="relative">
                    <select
                      value={form.severity}
                      onChange={e => set('severity', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {SEVERITY_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Mô tả thêm</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Mô tả chi tiết sự cố..."
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {loading ? 'Đang tạo...' : 'Đẩy lên hệ thống'}
              </button>
            </div>
          </div>
        ) : (
          /* Success */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl font-bold">✓</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Tạo sự cố thành công</h4>
            <p className="text-sm text-gray-500 mb-6">Hệ thống đang tự động tìm đội cứu hộ phù hợp.</p>
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-[#F1C40F] hover:bg-[#F39C12] text-gray-900 font-bold rounded-lg transition-colors"
            >
              Thoát
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
