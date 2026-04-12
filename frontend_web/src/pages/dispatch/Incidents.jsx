import React, { useState, useMemo } from 'react';
import { AlertTriangle, Car, Flame, Droplets, Siren, MapPin, MessageSquare, Search, RefreshCw, ChevronRight, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import HotlineModal from '../../components/HotlineModal';
import IncidentDetailPanel from '../../components/IncidentDetailPanel';

const TYPE_ICONS = {
  ACCIDENT: <AlertTriangle size={18} className="text-red-500" />,
  BREAKDOWN: <Car size={18} className="text-blue-500" />,
  FIRE: <Flame size={18} className="text-orange-500" />,
  FLOOD: <Droplets size={18} className="text-cyan-500" />,
  SOS_EMERGENCY: <Siren size={18} className="text-red-600" />,
  OTHER: <MapPin size={18} className="text-gray-500" />,
};

const TYPE_BG = {
  ACCIDENT: 'bg-red-50 border-red-100',
  BREAKDOWN: 'bg-blue-50 border-blue-100',
  FIRE: 'bg-orange-50 border-orange-100',
  FLOOD: 'bg-cyan-50 border-cyan-100',
  SOS_EMERGENCY: 'bg-red-50 border-red-200',
  OTHER: 'bg-gray-50 border-gray-100',
};

const TYPE_LABELS = {
  ACCIDENT: 'Tai nạn giao thông',
  BREAKDOWN: 'Hỏng xe / Chết máy',
  FIRE: 'Cháy nổ',
  FLOOD: 'Ngập nước',
  SOS_EMERGENCY: 'SOS Khẩn cấp',
  OTHER: 'Sự cố khác',
};

const STATUS_LABELS = {
  PENDING: { label: 'Chưa xử lý', dot: 'bg-yellow-400' },
  ASSIGNED: { label: 'Đã phân công', dot: 'bg-blue-500' },
  ARRIVED: { label: 'Đã đến hiện trường', dot: 'bg-violet-500' },
  PROCESSING: { label: 'Đang xử lý', dot: 'bg-yellow-500' },
  COMPLETED: { label: 'Hoàn thành', dot: 'bg-green-500' },
  CANCELLED: { label: 'Đã hủy', dot: 'bg-gray-400' },
  HANDLED_BY_EXTERNAL: { label: 'Chuyển ngoài', dot: 'bg-gray-500' },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  return `${Math.floor(mins / 60)} giờ trước`;
}

// Detect SOS by code prefix — backend may store type as null or 'OTHER' for SOS
function isSOS(inc) {
  return inc.code?.startsWith('SOS') || inc.type === 'SOS_EMERGENCY';
}

function getTypeLabel(inc) {
  if (isSOS(inc)) return 'SOS Khẩn cấp';
  return TYPE_LABELS[inc.type] || 'Sự cố khác';
}

function getTypeIcon(inc) {
  if (isSOS(inc)) return TYPE_ICONS.SOS_EMERGENCY;
  return TYPE_ICONS[inc.type] || TYPE_ICONS.OTHER;
}

function getTypeBg(inc) {
  if (isSOS(inc)) return TYPE_BG.SOS_EMERGENCY;
  return TYPE_BG[inc.type] || TYPE_BG.OTHER;
}

// Extract first meaningful street name segment (skip pure house numbers)
function getShortAddress(address) {
  if (!address) return 'Không có địa chỉ';
  const parts = address.split(',').map(s => s.trim());
  // Find first part that isn't purely numeric
  const street = parts.find(p => isNaN(Number(p.replace(/[\s-]/g, ''))));
  return street || parts[0];
}


export default function Incidents() {
  const navigate = useNavigate();
  const { incidents, loading, fetchIncidents } = useApp();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showHotline, setShowHotline] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Live counts
  const counts = useMemo(() => ({
    ALL: incidents.length,
    PENDING: incidents.filter(i => i.status === 'PENDING').length,
    ACTIVE: incidents.filter(i => ['ASSIGNED', 'ARRIVED', 'PROCESSING'].includes(i.status)).length,
    COMPLETED: incidents.filter(i => i.status === 'COMPLETED').length,
  }), [incidents]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = incidents;
    if (activeFilter === 'PENDING') list = list.filter(i => i.status === 'PENDING');
    else if (activeFilter === 'ACTIVE') list = list.filter(i => ['ASSIGNED', 'ARRIVED', 'PROCESSING', 'OFFERING'].includes(i.status));
    else if (activeFilter === 'COMPLETED') list = list.filter(i => i.status === 'COMPLETED');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.code || '').toLowerCase().includes(q) ||
        (i.location?.address || '').toLowerCase().includes(q) ||
        (i.reportedBy?.name || '').toLowerCase().includes(q) ||
        (getTypeLabel(i) || '').toLowerCase().includes(q)
      );
    }

    // Newest first always; CRITICAL incidents bubble up within same time window
    return [...list].sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [incidents, activeFilter, search]);

  const filters = [
    { id: 'ALL', label: `Tất cả (${counts.ALL})` },
    { id: 'PENDING', label: `Chưa xử lý (${counts.PENDING})` },
    { id: 'ACTIVE', label: `Đang điều phối (${counts.ACTIVE})` },
    { id: 'COMPLETED', label: `Đã hoàn thành (${counts.COMPLETED})` },
  ];

  const handleMessage = (event, incident) => {
    event.stopPropagation();
    navigate('/contacts', {
      state: {
        prefillMessage: `Trao đổi về sự cố ${incident.code}`,
      },
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeFilter === f.id
                    ? 'bg-[#1C294F] text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchIncidents}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Làm mới"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Hotline button */}
            <button
              onClick={() => setShowHotline(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Phone size={15} />
              Tạo từ Hotline
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Car size={40} className="mb-3 opacity-30" />
              <p className="font-medium">Không có sự cố nào</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(inc => {
                const isCritical = inc.severity === 'CRITICAL';
                const statusInfo = STATUS_LABELS[inc.status] || { label: inc.status, dot: 'bg-gray-400' };
                const Icon = getTypeIcon(inc);
                const bgCls = getTypeBg(inc);

                return (
                  <div
                    key={inc._id}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group ${
                      selectedId === inc._id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedId(inc._id === selectedId ? null : inc._id)}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${bgCls}`}>
                      {Icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-gray-900 text-[14px] truncate">
                          {getTypeLabel(inc)} — {getShortAddress(inc.location?.address)}
                        </h4>
                        {(isCritical || isSOS(inc)) && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">KHẨN CẤP</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        <span className="text-gray-400">{timeAgo(inc.createdAt)}</span>
                        {' • '}Mã: <span className="font-mono font-medium">{inc.code}</span>
                        {' • '}Người báo: <span className="text-gray-700">{inc.reportedBy?.name || 'Ẩn danh'}</span>
                      </p>
                    </div>

                    {/* Status + action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
                        onClick={(event) => handleMessage(event, inc)}
                      >
                        <MessageSquare size={13} />
                        Message
                      </button>
                      {inc.status === 'PENDING' ? (
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                          onClick={e => { e.stopPropagation(); setSelectedId(inc._id); }}
                        >
                          Điều phối xe
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      )}
                      <ChevronRight size={18} className={`text-gray-300 transition-colors ${selectedId === inc._id ? 'text-blue-400' : 'group-hover:text-gray-500'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <IncidentDetailPanel
          incidentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Hotline modal */}
      {showHotline && (
        <HotlineModal
          onClose={() => setShowHotline(false)}
          onSuccess={() => {
            setShowHotline(false);
            fetchIncidents();
          }}
        />
      )}
    </div>
  );
}
