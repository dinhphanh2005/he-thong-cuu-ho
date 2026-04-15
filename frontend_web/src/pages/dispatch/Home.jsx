import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Filter, ChevronRight, ShieldCheck, AlertTriangle, Phone, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import IncidentDetailPanel from '../../components/IncidentDetailPanel';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored marker
const createTeamIcon = (status) => {
  const colors = { AVAILABLE: '#2ecc71', BUSY: '#f39c12', OFFLINE: '#95a5a6' };
  const color = colors[status] || '#95a5a6';
  return L.divIcon({
    html: `
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:${color};border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createIncidentIcon = (severity) => {
  const colors = { CRITICAL: '#e74c3c', HIGH: '#e67e22', MEDIUM: '#f39c12', LOW: '#2ecc71' };
  const color = colors[severity] || '#e74c3c';
  return L.divIcon({
    html: `
      <div style="
        width:24px;height:24px;border-radius:50%;
        background:${color};border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        animation:pulse 2s infinite;
      ">
        <span style="color:white;font-size:11px;font-weight:900">!</span>
      </div>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Auto-fit map to markers
function MapBounds({ teams, incidents }) {
  const map = useMap();
  useEffect(() => {
    const pts = [
      ...teams.filter(t => t.currentLocation?.coordinates).map(t => [
        t.currentLocation.coordinates[1],
        t.currentLocation.coordinates[0],
      ]),
      ...incidents.filter(i => i.location?.coordinates).map(i => [
        i.location.coordinates[1],
        i.location.coordinates[0],
      ]),
    ];
    if (pts.length > 0) {
      try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 }); } catch { }
    }
  }, [teams.length, incidents.length]);
  return null;
}

const INCIDENT_TYPE_LABELS = {
  ACCIDENT: 'Tai nạn giao thông',
  BREAKDOWN: 'Hỏng xe / Chết máy',
  FLOOD: 'Ngập nước',
  FIRE: 'Cháy nổ',
  OTHER: 'Sự cố khác',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  return `${Math.floor(mins / 60)} giờ trước`;
}

export default function Home() {
  const { incidents, teams, availableTeams, busyTeams, pendingIncidents, loading, personalSettings } = useApp();
  const mapConfig = personalSettings?.mapConfig || {};
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL | SOS | NORMAL

  const mapCenter = [21.028511, 105.804817];

  const displayedIncidents = incidents.filter(i => {
    if (filter === 'SOS') return i.severity === 'CRITICAL';
    if (filter === 'NORMAL') return i.severity !== 'CRITICAL';
    return ['PENDING', 'OFFERING', 'ASSIGNED', 'ARRIVED', 'PROCESSING'].includes(i.status);
  }).slice(0, 5);

  const handleCall = (num) => window.open(`tel:${num}`, '_self');

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">

      {/* ── Left: Map ─────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-800">Bản đồ thời gian thực</h3>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Sẵn sàng ({availableTeams.length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Đang bận ({busyTeams.length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Sự cố
              </span>
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 text-sm text-blue-600 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Filter size={16} />
              Lọc hiển thị
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            {mapConfig.defaultMap === 'SATELLITE' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            ) : (
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}
            
            {mapConfig.trafficLayer && (
              <TileLayer
                attribution='&copy; OpenStreetMap contributors, &copy; ODbL, BBD'
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                opacity={0.4}
              />
            )}
            <MapBounds teams={teams} incidents={pendingIncidents} />

            {/* Rescue team markers */}
            {mapConfig.showTeams !== false && teams.filter(t => t.currentLocation?.coordinates).map(team => (
              <Marker
                key={team._id}
                position={[team.currentLocation.coordinates[1], team.currentLocation.coordinates[0]]}
                icon={createTeamIcon(team.status)}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">{team.name}</p>
                    <p className="text-gray-500">{team.code} • {team.zone}</p>
                    <p className={`font-semibold mt-1 ${team.status === 'AVAILABLE' ? 'text-green-600' :
                      team.status === 'BUSY' ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                      {team.status === 'AVAILABLE' ? '✅ Sẵn sàng' : team.status === 'BUSY' ? '🔶 Đang bận' : '⭕ Offline'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Incident markers */}
            {incidents.filter(i => i.location?.coordinates && ['PENDING', 'ASSIGNED', 'ARRIVED', 'PROCESSING'].includes(i.status)).map(inc => (
              <Marker
                key={inc._id}
                position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
                icon={createIncidentIcon(inc.severity)}
                eventHandlers={{ click: () => setSelectedIncident(inc._id) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">{INCIDENT_TYPE_LABELS[inc.type]}</p>
                    <p className="text-gray-500 text-xs">{inc.location.address}</p>
                    <button
                      className="mt-2 text-blue-600 text-xs font-semibold underline"
                      onClick={() => setSelectedIncident(inc._id)}
                    >
                      Xem chi tiết →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Routing path for selected incident */}
            {selectedIncident && (() => {
              const selectedInc = incidents.find(i => i._id === selectedIncident);
              if (selectedInc?.routingPath?.length > 0) {
                // Convert [lng, lat] to [lat, lng] for Leaflet
                const path = selectedInc.routingPath.map(p => [p[1], p[0]]);
                return (
                  <Polyline 
                    positions={path} 
                    color="#3b82f6" 
                    weight={5} 
                    opacity={0.6} 
                    dashArray="10, 10"
                    lineJoin="round"
                    className="animate-pulse"
                  />
                );
              }
              return null;
            })()}
          </MapContainer>
        </div>
      </div>

      {/* ── Right column ─────────────────────────────────────────────────── */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto pb-4">

        {/* Quick call buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Đường dây khẩn cấp</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: '113', label: 'Cảnh sát', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { num: '114', label: 'Cứu hỏa', color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { num: '115', label: 'Cứu thương', color: 'bg-red-50 text-red-700 border-red-200' },
            ].map(({ num, label, color }) => (
              <button
                key={num}
                onClick={() => handleCall(num)}
                className={`flex flex-col items-center py-2.5 rounded-xl border font-bold text-xs transition-all hover:scale-105 ${color}`}
              >
                <Phone size={16} className="mb-1" />
                <span className="text-base font-black">{num}</span>
                <span className="text-[10px] font-medium mt-0.5">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live incidents */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-bold text-gray-800">Sự cố cần xử lý</h3>
            {pendingIncidents.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {pendingIncidents.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : displayedIncidents.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Không có sự cố nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedIncidents.map(inc => {
                const isCritical = inc.severity === 'CRITICAL';
                return (
                  <div
                    key={inc._id}
                    className={`rounded-xl p-4 cursor-pointer transition-all ${isCritical
                      ? 'border-[1.5px] border-red-400 bg-red-50/30 hover:bg-red-50'
                      : 'border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20'
                      }`}
                    onClick={() => setSelectedIncident(inc._id)}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      {isCritical ? (
                        <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded">SOS KHẨN CẤP</span>
                      ) : inc.status === 'OFFERING' ? (
                        <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded">ĐANG ĐỀ XUẤT</span>
                      ) : (
                        <span className="text-blue-600 text-[10px] font-bold">Bình thường</span>
                      )}
                      <span className="text-[10px] text-gray-400">{timeAgo(inc.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-bold text-gray-900 text-sm">
                        {inc.location?.address?.split(',')[0] || 'Không có địa chỉ'}
                      </h4>
                      {inc.assignmentAttempts > 0 && (
                        <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">
                          Lần {inc.assignmentAttempts}/3
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{inc.reportedBy?.name || 'Ẩn danh'}</p>

                    {isCritical && (
                      <button
                        className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                        onClick={e => { e.stopPropagation(); setSelectedIncident(inc._id); }}
                      >
                        <Zap size={12} />
                        Điều phối xe cứu hộ
                      </button>
                    )}
                    {!isCritical && (
                      <div className="flex justify-end mt-2">
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fleet status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 shrink-0">
          <h3 className="font-bold text-gray-800 mb-4">Trạng thái đội xe</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-green-600" />
                <span className="text-xs font-bold text-green-700">Sẵn sàng</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{availableTeams.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-yellow-600" />
                <span className="text-xs font-bold text-yellow-700">Đang bận</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{busyTeams.length}</p>
            </div>
          </div>
          <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Tổng số đội</span>
              <span className="font-bold text-gray-800">{teams.length}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">Đang xử lý sự cố</span>
              <span className="font-bold text-gray-800">
                {teams.filter(t => t.status === 'BUSY').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Incident detail panel ─────────────────────────────────────────── */}
      {selectedIncident && (
        <IncidentDetailPanel
          incidentId={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}
