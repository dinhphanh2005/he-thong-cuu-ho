import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronRight, MapPin, MessageSquare, Users, Wrench, X, Navigation, ExternalLink, Clock, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

// ── FlyTo helper — tự động căn map về tọa độ đội ────────────────────────────
function FlyToCenter({ center, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

// ── Location Modal — bản đồ lớn centered vào đội cứu hộ ─────────────────────
function LocationModal({ team, onClose }) {
  const coordinates = team?.currentLocation?.coordinates || [];
  const hasGPS = coordinates.length === 2;
  const center = hasGPS ? [coordinates[1], coordinates[0]] : [21.028511, 105.804817];
  const statusMeta = STATUS_META[team?.status] || STATUS_META.OFFLINE;

  // Tính thời gian GPS cũ bao lâu
  const gpsAge = team?.lastLocationUpdate
    ? Math.round((Date.now() - new Date(team.lastLocationUpdate)) / 60000)
    : null;
  const isStale = gpsAge !== null && gpsAge > 10; // Stale nếu > 10 phút

  const googleMapsUrl = hasGPS
    ? `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}&z=16`
    : null;

  // Đóng khi nhấn Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${statusMeta.bgClass}`}>
              <Navigation size={16} className={statusMeta.textClass} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base leading-tight">{team.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {team.code} • {team.zone || 'Chưa gán khu vực'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Info bar */}
        <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 border-b border-gray-100 shrink-0 flex-wrap">
          {/* Status */}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${statusMeta.bgClass} ${statusMeta.textClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </span>

          {/* GPS coords */}
          {hasGPS ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <MapPin size={13} className="text-blue-500" />
              {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
              <Wrench size={13} /> Chưa có GPS
            </span>
          )}

          {/* GPS freshness */}
          {gpsAge !== null && (
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${isStale ? 'text-amber-600' : 'text-green-600'}`}>
              {isStale ? <Wifi size={13} className="opacity-50" /> : <Wifi size={13} />}
              {gpsAge < 1 ? 'Vừa cập nhật' : `Cập nhật ${gpsAge} phút trước`}
              {isStale && ' ⚠'}
            </span>
          )}

          {/* Open in Google Maps */}
          {googleMapsUrl && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              onClick={e => e.stopPropagation()}>
              <ExternalLink size={13} />
              Mở Google Maps
            </a>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative" style={{ minHeight: '380px' }}>
          {hasGPS ? (
            <MapContainer
              center={center}
              zoom={15}
              style={{ height: '100%', width: '100%', minHeight: '380px' }}
              zoomControl={true}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToCenter center={center} zoom={15} />

              {/* Marker chính — vị trí đội */}
              <CircleMarker
                center={center}
                radius={12}
                pathOptions={{ color: '#496FC0', fillColor: '#496FC0', fillOpacity: 0.9, weight: 3 }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">{team.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{team.code} • {team.zone}</p>
                    <p className={`font-semibold mt-1 text-xs ${
                      team.status === 'AVAILABLE' ? 'text-green-600' :
                      team.status === 'BUSY' ? 'text-yellow-600' : 'text-gray-500'
                    }`}>{statusMeta.label}</p>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Vòng tròn bán kính phục vụ (~1km) */}
              <CircleMarker
                center={center}
                radius={60}
                pathOptions={{ color: '#496FC0', fillColor: '#496FC0', fillOpacity: 0.05, weight: 1, dashArray: '4 4' }}
              />
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 gap-3 py-16">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <Wrench size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-semibold text-sm">Đội chưa có dữ liệu GPS</p>
              <p className="text-gray-400 text-xs max-w-xs text-center">
                Yêu cầu thành viên mở App cứu hộ và bật GPS để cập nhật vị trí.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {isStale && hasGPS && (
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 shrink-0">
            <p className="text-xs text-amber-700 font-semibold flex items-center gap-2">
              <Clock size={13} />
              Dữ liệu GPS đã cũ ({gpsAge} phút) — vị trí thực tế có thể khác. Liên hệ đội để xác nhận.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_META = {
  AVAILABLE: {
    label: 'Sẵn sàng',
    textClass: 'text-[#2ECC71]',
    bgClass: 'bg-[#E8F8F5]',
    dotClass: 'bg-[#2ECC71]',
  },
  BUSY: {
    label: 'Đang bận',
    textClass: 'text-[#F39C12]',
    bgClass: 'bg-[#FEF5E7]',
    dotClass: 'bg-[#F39C12]',
  },
  OFFLINE: {
    label: 'Thiếu nhân sự',
    textClass: 'text-gray-500',
    bgClass: 'bg-gray-100',
    dotClass: 'bg-gray-400',
  },
  // FIX BUG-03: Thêm SUSPENDED — khi Admin đình chỉ đội
  SUSPENDED: {
    label: 'Đang đình chỉ',
    textClass: 'text-red-500',
    bgClass: 'bg-red-50',
    dotClass: 'bg-red-400',
  },
  // FIX: Thêm PROPOSED (trạng thái trung gian nội bộ)
  PROPOSED: {
    label: 'Đang đề xuất',
    textClass: 'text-blue-500',
    bgClass: 'bg-blue-50',
    dotClass: 'bg-blue-400',
  },
};

const TEAM_TYPE_LABELS = {
  AMBULANCE: 'Cứu thương',
  TOW_TRUCK: 'Xe kéo',
  FIRE: 'Cứu hỏa',
  POLICE: 'Cảnh sát',
  MULTI: 'Đa năng',
};

const MEMBER_ROLE_LABELS = {
  LEADER: 'Đội trưởng',
  DRIVER: 'Lái xe',
  MEDIC: 'Y tế',
  MEMBER: 'Thành viên',
};

function formatLastUpdate(value) {
  if (!value) return 'Chưa có GPS';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có GPS';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function TeamDetailPanel({ team, onClose, onOpenLocation }) {
  const navigate = useNavigate();
  const coordinates = team?.currentLocation?.coordinates || [];
  const hasGPS = coordinates.length === 2;
  const mapCenter = hasGPS
    ? [coordinates[1], coordinates[0]]
    : [21.028511, 105.804817];

  const handleMessage = (event, member) => {
    event.stopPropagation();
    const incidentId = team.activeIncident?._id || team.activeIncident;
    if (!incidentId) {
      alert(`Đội ${team.name} hiện đang không xử lý sự cố nào nên không thể liên lạc qua kênh Incident.`);
      return;
    }
    navigate('/dispatch/contacts', {
      state: {
        prefillMessage: `Liên hệ đội ${team.name} / ${member.userId?.name || 'thành viên cứu hộ'}`,
        incidentId: incidentId.toString(),
      },
    });
  };

  if (!team) return null;

  return (
    <div className="w-[24rem] bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
        <div>
          <span className={`px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1.5 ${STATUS_META[team.status]?.bgClass || STATUS_META.OFFLINE.bgClass} ${STATUS_META[team.status]?.textClass || STATUS_META.OFFLINE.textClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[team.status]?.dotClass || STATUS_META.OFFLINE.dotClass}`} />
            {STATUS_META[team.status]?.label || 'Không xác định'}
          </span>
          <h3 className="font-bold text-gray-900 text-sm mt-3">{team.name}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {team.code} • {team.zone || 'Chưa gán khu vực'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 shrink-0 cursor-pointer">
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Mini map ─────────────────────────────────────────────────── */}
        <div className="mx-5 mt-4 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative"
          style={{ height: '160px' }}>

          {hasGPS ? (
            <>
              {/* key={team._id} bắt buộc — React-Leaflet v3 không cập nhật
                  center prop sau khi khởi tạo. key khác nhau giữa các team
                  sẽ force unmount + remount để map đúng vị trí.              */}
              <MapContainer
                key={team._id}
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {/* FlyToCenter đảm bảo map luôn đúng tọa độ ngay cả khi React giữ instance cũ */}
                <FlyToCenter center={mapCenter} zoom={15} />

                {/* Marker vị trí đội */}
                <CircleMarker
                  center={mapCenter}
                  radius={10}
                  pathOptions={{ color: '#496FC0', fillColor: '#496FC0', fillOpacity: 1, weight: 3 }}
                >
                  <Popup>{team.name}</Popup>
                </CircleMarker>

                {/* Vòng tròn bán kính mờ */}
                <CircleMarker
                  center={mapCenter}
                  radius={40}
                  pathOptions={{ color: '#496FC0', fillColor: '#496FC0', fillOpacity: 0.08, weight: 1 }}
                />
              </MapContainer>

              {/* Overlay: nút phóng to bản đồ */}
              <button
                onClick={() => onOpenLocation(team)}
                className="absolute bottom-2 right-2 z-[400] bg-white/90 hover:bg-white backdrop-blur-sm border border-gray-200 shadow-md rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all"
                title="Xem bản đồ đầy đủ"
              >
                <Navigation size={12} />
                Phóng to
              </button>

              {/* Tọa độ GPS */}
              <div className="absolute top-2 left-2 z-[400] bg-white/85 backdrop-blur-sm border border-gray-200 rounded-lg px-2 py-1">
                <p className="text-[10px] font-bold text-gray-600">
                  {coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}
                </p>
              </div>
            </>
          ) : (
            /* Không có GPS */
            <div className="h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
              <Wrench size={22} className="text-gray-300" />
              <p className="text-xs font-bold text-gray-400">Chưa có dữ liệu GPS</p>
              <p className="text-[10px] text-gray-400">Yêu cầu đội mở App và bật GPS</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Nhân sự online</p>
              <p className="text-lg font-black text-gray-900 mt-1">{team.onlineMembersCount || 0}/{team.members?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Sự cố hiện tại</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{team.activeIncident?.code || 'Không có'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 space-y-2">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">Loại đội</span>
              <span className="font-semibold text-gray-900 text-right">{TEAM_TYPE_LABELS[team.type] || team.type}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">GPS</span>
              <span className="font-semibold text-gray-900 text-right">
                {coordinates.length === 2 ? `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}` : 'Chưa có'}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">Cập nhật cuối</span>
              <span className="font-semibold text-gray-900 text-right">{formatLastUpdate(team.lastLocationUpdate)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">Điều kiện nhận</span>
              <span className="font-semibold text-gray-900 text-right">
                {(team.onlineMembersCount || 0) >= (team.minimumOnlineMembers || 2) ? 'Đủ nhân sự' : `Cần ${team.minimumOnlineMembers || 2}+ online`}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nhân sự trực</p>
            <div className="space-y-2">
              {(team.members || []).map((member) => (
                <div
                  key={member.userId?._id || `${team._id}-${member.role}`}
                  className="rounded-xl border border-gray-100 bg-white px-3 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{member.userId?.name || 'Chưa liên kết user'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {MEMBER_ROLE_LABELS[member.role] || member.role}
                      {member.userId?.phone ? ` • ${member.userId.phone}` : ''}
                    </p>
                    <p className={`text-[11px] mt-1 font-semibold ${member.userId?.availabilityStatus === 'ONLINE' ? 'text-green-600' : 'text-gray-400'}`}>
                      {member.userId?.availabilityStatus === 'ONLINE' ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => handleMessage(event, member, team)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    <MessageSquare size={13} />
                    Message
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Fleet() {
  const { teams, loading } = useApp();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [locationTeam, setLocationTeam] = useState(null); // Đội đang xem vị trí

  const filters = useMemo(() => {
    const availableCount = teams.filter((team) => team.status === 'AVAILABLE').length;
    const busyCount = teams.filter((team) => team.status === 'BUSY').length;
    const offlineCount = teams.filter((team) => team.status === 'OFFLINE').length;

    return [
      { id: 'ALL', label: `Tất cả (${teams.length})` },
      { id: 'AVAILABLE', label: `Sẵn sàng (${availableCount})` },
      { id: 'BUSY', label: `Đang bận (${busyCount})` },
      { id: 'OFFLINE', label: `Thiếu nhân sự (${offlineCount})` },
    ];
  }, [teams]);

  const displayedTeams = useMemo(() => {
    if (activeFilter === 'ALL') return teams;
    return teams.filter((team) => team.status === activeFilter);
  }, [activeFilter, teams]);

  const selectedTeam = teams.find((team) => team._id === selectedTeamId) || null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-wrap gap-3 mb-6">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeFilter === filter.id
                ? 'bg-[#1C294F] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-72 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : displayedTeams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500 font-medium">
            Không có đội cứu hộ nào trong bộ lọc này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedTeams.map((team) => {
              const statusMeta = STATUS_META[team.status] || STATUS_META.OFFLINE;
              const members = team.members || [];
              const coordinates = team.currentLocation?.coordinates || [];

              return (
                <button
                  type="button"
                  key={team._id}
                  onClick={() => setSelectedTeamId(team._id)}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group ${selectedTeamId === team._id ? 'ring-2 ring-blue-200 border-blue-300' : ''
                    }`}
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                        {statusMeta.label}
                      </span>
                      <ChevronRight size={18} className={`text-gray-300 transition-colors ${selectedTeamId === team._id ? 'text-blue-500' : 'group-hover:text-gray-500'}`} />
                    </div>

                    <h4 className="font-bold text-gray-900 mb-1">{team.name}</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      {TEAM_TYPE_LABELS[team.type] || team.type} • {team.zone || 'Chưa gán khu vực'}
                    </p>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5 border border-gray-100">
                      <div className="flex justify-between items-start text-sm gap-3">
                        <span className="text-gray-500">Nhân sự online</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {team.onlineMembersCount || 0}/{members.length} Online
                        </span>
                      </div>
                      <div className="flex justify-between items-start text-sm gap-3">
                        <span className="text-gray-500">Sự cố hiện tại</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {team.activeIncident?.code || 'Không có'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start text-sm gap-3">
                        <span className="text-gray-500">GPS</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {coordinates.length === 2
                            ? `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`
                            : 'Chưa có'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-gray-500">
                      {(team.onlineMembersCount || 0) >= (team.minimumOnlineMembers || 2)
                        ? 'Đủ điều kiện nhận nhiệm vụ'
                        : `Cần tối thiểu ${team.minimumOnlineMembers || 2} người online`}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 grid grid-cols-2">
                    {/* Thành viên — click để mở detail panel */}
                    <div className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-gray-700">
                      <Users size={16} />
                      {members.length} thành viên
                    </div>

                    {/* Vị trí — button riêng, stopPropagation để không trigger card click */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Không mở TeamDetailPanel
                        setLocationTeam(team);
                      }}
                      className={`flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-l border-gray-100 transition-colors ${
                        coordinates.length === 2
                          ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer'
                          : 'text-gray-400 cursor-default'
                      }`}
                      title={coordinates.length === 2
                        ? `Xem vị trí ${team.name} trên bản đồ`
                        : 'Đội chưa có GPS'}
                    >
                      {coordinates.length === 2
                        ? <><MapPin size={15} className="shrink-0" /> Xem vị trí</>
                        : <><Wrench size={15} className="shrink-0 opacity-50" /> Chưa có GPS</>
                      }
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedTeam && (
        <TeamDetailPanel
          team={selectedTeam}
          onClose={() => setSelectedTeamId(null)}
          onOpenLocation={(t) => setLocationTeam(t)}
        />
      )}

      {/* Modal xem vị trí đội cứu hộ trên bản đồ lớn */}
      {locationTeam && (
        <LocationModal
          team={locationTeam}
          onClose={() => setLocationTeam(null)}
        />
      )}
    </div>
  );
}
