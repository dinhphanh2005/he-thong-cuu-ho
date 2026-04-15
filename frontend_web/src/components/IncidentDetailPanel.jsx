import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, User, AlertCircle, Zap, TriangleAlert } from 'lucide-react';
import { incidentAPI, rescueAPI } from '../services/api';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import incidentFallbackImg from '../assets/images/incident.jpg';

/**
 * GPS Accuracy Warning — hiển thị khi tọa độ có thể không chính xác
 *
 * Hệ thống dùng nhiều nguồn tọa độ:
 * 1. Browser Geolocation API (độ chính xác 3–50m, cao nhất)
 * 2. Reverse geocoding từ địa chỉ nhập tay (có thể lệch hàng trăm mét)
 * 3. GPS thủ công từ Dispatcher (nhập địa chỉ → Nominatim geocode)
 *
 * Dấu hiệu cần cảnh báo:
 * - Tọa độ được nhập qua địa chỉ text (không phải GPS thực)
 * - Địa chỉ không rõ ràng (chỉ có quận/huyện, không có số nhà/phố)
 */
function GpsAccuracyWarning({ incident }) {
  // Cảnh báo nếu không có photos (likely not a real GPS report) hoặc
  // địa chỉ chỉ có cấp quận trở lên (không có số cụ thể)
  const address = incident?.location?.address || '';
  const hasSpecificAddress = /\d/.test(address); // Địa chỉ cụ thể có chứa số
  const source = incident?.callerPhone ? 'hotline' : 'app';
  const isHotlineWithoutGPS = source === 'hotline';

  if (!isHotlineWithoutGPS && hasSpecificAddress) return null;

  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs">
      <TriangleAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-amber-700">Tọa độ có thể chưa chính xác</p>
        <p className="text-amber-600 mt-0.5">
          {isHotlineWithoutGPS
            ? 'Sự cố báo qua hotline — tọa độ geocode từ địa chỉ, có thể lệch 50–500m. Đội cứu hộ nên liên lạc để xác nhận vị trí chính xác.'
            : 'Địa chỉ không có số nhà cụ thể — vui lòng xác nhận với người báo cáo trước khi điều động.'}
        </p>
      </div>
    </div>
  );
}

const STATUS_LABELS = {
  PENDING:            { label: 'Chờ xử lý',             color: 'bg-yellow-100 text-yellow-700' },
  OFFERING:           { label: 'Đang đề xuất đội',       color: 'bg-orange-100 text-orange-600' }, // FIX BUG-04
  ASSIGNED:           { label: 'Đã phân công',           color: 'bg-blue-100 text-blue-700' },
  ARRIVED:            { label: 'Đã đến hiện trường',     color: 'bg-violet-100 text-violet-700' },
  PROCESSING:         { label: 'Đang xử lý',             color: 'bg-purple-100 text-purple-700' },
  IN_PROGRESS:        { label: 'Đang xử lý',             color: 'bg-purple-100 text-purple-700' },
  COMPLETED:          { label: 'Hoàn thành',             color: 'bg-green-100 text-green-700' },
  CANCELLED:          { label: 'Đã hủy',                 color: 'bg-gray-100 text-gray-600' },
  HANDLED_BY_EXTERNAL:{ label: 'Chuyển ngoài xử lý',    color: 'bg-slate-100 text-slate-500' },
};

const TYPE_LABELS = {
  ACCIDENT: 'Tai nàn giao thông',
  BREAKDOWN: 'Hỏng xe / Chết máy',
  FLOOD: 'Ngập nước',
  FIRE: 'Cháy nổ',
  OTHER: 'Sự cố khác',
};

function DetailMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export default function IncidentDetailPanel({ incidentId, onClose }) {
  const navigate = useNavigate();
  const { teams, fetchIncidents } = useApp();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');

  useEffect(() => {
    if (!incidentId) return;
    const load = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const { data } = await incidentAPI.getById(incidentId);
        setIncident(data.data);
      } catch (e) {
        console.error(e);
        setIncident(null);
        setErrorMessage(e.response?.data?.message || 'Không thể tải chi tiết sự cố');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [incidentId]);

  const handleForceAssign = async () => {
    if (!selectedTeam) { alert('Chọn đội cứu hộ trước'); return; }
    const team = teams.find((item) => item._id === selectedTeam);
    if (!team) {
      alert('Không tìm thấy đội cứu hộ đã chọn');
      return;
    }
    if (team.status !== 'AVAILABLE') {
      alert(
        team.status === 'BUSY'
          ? 'Đội này đang bận xử lý nhiệm vụ khác'
          : `Đội này đang offline. Cần tối thiểu ${team.minimumOnlineMembers || 2} thành viên online để nhận nhiệm vụ`
      );
      return;
    }
    setAssigning(true);
    try {
      await rescueAPI.assignToIncident(incidentId, selectedTeam);
      const { data } = await incidentAPI.getById(incidentId);
      setIncident(data.data);
      fetchIncidents();
    } catch (e) {
      alert(e.response?.data?.message || 'Không thể phân công');
    } finally {
      setAssigning(false);
    }
  };

  const assignedTeamLive = incident?.assignedTeam?._id
    ? teams.find((team) => team._id === incident.assignedTeam._id)
    : null;
  const incidentCoords = incident?.location?.coordinates?.length === 2
    ? [incident.location.coordinates[1], incident.location.coordinates[0]]
    : null;
  const teamCoords = assignedTeamLive?.currentLocation?.coordinates?.length === 2
    ? [assignedTeamLive.currentLocation.coordinates[1], assignedTeamLive.currentLocation.coordinates[0]]
    : null;
  const mapPoints = [incidentCoords, teamCoords].filter(Boolean);
  const teamOptions = teams.map((team) => ({
    ...team,
    label: `${team.name} (${team.code}) - ${team.zone || 'Chưa gán khu vực'}`,
    statusText: team.status === 'AVAILABLE'
      ? 'Sẵn sàng'
      : team.status === 'BUSY'
        ? 'Đang làm nhiệm vụ'
        : `Offline (${team.onlineMembersCount || 0}/${team.minimumOnlineMembers || 2} online)`,
  }));

  if (loading) return (
    <div className="w-96 bg-white border-l border-gray-200 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (errorMessage) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Chi tiết sự cố</p>
            <p className="text-xs text-gray-500 mt-1">Không thể tải dữ liệu</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-5">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
                <p className="text-xs text-red-500 mt-1">Kiểm tra dữ liệu sự cố hoặc thử tải lại danh sách.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const statusInfo = STATUS_LABELS[incident.status] || STATUS_LABELS.PENDING;
  const isSOS = incident.severity === 'CRITICAL' || incident.code?.toUpperCase?.().startsWith('SOS');

  const handleCancelIncident = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn huỷ sự cố này không? Hành động này sẽ giải phóng đội cứu hộ nếu có.')) return;
    setAssigning(true);
    try {
      await incidentAPI.updateStatus(incidentId, 'CANCELLED', 'Dispatcher huỷ sự cố');
      const { data } = await incidentAPI.getById(incidentId);
      setIncident(data.data);
      fetchIncidents();
    } catch (e) {
      alert(e.response?.data?.message || 'Không thể huỷ sự cố');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          {isSOS && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide inline-block mb-2">
              SOS KHẨN CẤP
            </span>
          )}
          <h3 className="font-bold text-gray-900 text-sm leading-snug">
            {TYPE_LABELS[incident.type] || incident.type}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Mã: {incident.code}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status */}
        <div className="px-5 py-3 border-b border-gray-50">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* GPS Accuracy Warning */}
        <div className="px-5 pt-3">
          <GpsAccuracyWarning incident={incident} />
        </div>

        {/* Live map */}
        <div className="mx-5 mt-4 mb-3 h-44 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
          {incidentCoords ? (
            <MapContainer center={incidentCoords} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DetailMapBounds points={mapPoints} />
              <CircleMarker center={incidentCoords} radius={9} pathOptions={{ color: '#E74C3C', fillColor: '#E74C3C', fillOpacity: 1 }}>
                <Popup>Vị trí sự cố</Popup>
              </CircleMarker>
              
              {teamCoords && (
                <CircleMarker center={teamCoords} radius={8} pathOptions={{ color: '#496FC0', fillColor: '#496FC0', fillOpacity: 0.95 }}>
                  <Popup>{assignedTeamLive?.name || incident.assignedTeam?.name || 'Đội cứu hộ'}</Popup>
                </CircleMarker>
              )}

              {/* Tùy chọn hiển thị: Phổ biến là đường đi thực tế (routingPath) */}
              {incident.routingPath?.length > 0 ? (
                <Polyline 
                  positions={incident.routingPath.map(p => [p[1], p[0]])} 
                  pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} 
                />
              ) : (
                incidentCoords && teamCoords && (
                  <Polyline positions={[teamCoords, incidentCoords]} pathOptions={{ color: '#496FC0', dashArray: '6 8' }} />
                )
              )}
            </MapContainer>
          ) : null}
        </div>

        {/* ETA Display */}
        {incident.estimatedArrival && !['COMPLETED', 'CANCELLED'].includes(incident.status) && (
          <div className="px-5 mb-3">
             <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Thời gian dự kiến đến</p>
                   <p className="text-sm font-black text-blue-700">
                      {new Date(incident.estimatedArrival).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                   </p>
                </div>
                <Zap size={20} className="text-blue-500 animate-pulse" />
             </div>
          </div>
        )}

        {/* Location */}
        <div className="px-5 mb-4">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              {incident.location?.address || 'Không có địa chỉ'}
            </p>
          </div>
        </div>

        {/* Reporter Section - Updated (Message button removed) */}
        {incident.reportedBy && (
          <div className="px-5 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Người báo cáo</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{incident.reportedBy.name}</p>
                <p className="text-xs text-gray-500">{incident.reportedBy.phone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {incident.description && (
          <div className="px-5 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chi tiết & Tình trạng</p>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
              {incident.description}
            </p>
          </div>
        )}

        {/* Photos Section - Updated with Empty State & Placeholder Logic */}
        <div className="px-5 mb-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hình ảnh hiện trường</p>
          {incident.photos?.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {incident.photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`photo-${i}`}
                  className="w-24 h-24 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-90 border border-gray-100"
                  onClick={() => window.open(photo, '_blank')}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = incidentFallbackImg;
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic bg-gray-50 rounded-lg px-3 py-4 text-center border border-dashed border-gray-200">
              Không có hình ảnh nào được cung cấp
            </div>
          )}
        </div>

        {/* Timeline */}
        {incident.timeline?.length > 0 && (
          <div className="px-5 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tiến trình xử lý</p>
            <div className="space-y-3">
              {incident.timeline.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    i === 0 ? 'bg-green-500' : i === 1 ? 'bg-red-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">{item.note || item.status}</p>
                    {item.timestamp && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned team */}
        {incident.assignedTeam && (
          <div className="px-5 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Đội cứu hộ</p>
            <div className="bg-blue-50 rounded-lg px-3 py-2">
              <p className="text-sm font-bold text-blue-800">{incident.assignedTeam.name}</p>
              <p className="text-xs text-blue-600">{incident.assignedTeam.code} • {assignedTeamLive?.zone || incident.assignedTeam.zone || 'Chưa gán khu vực'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {['PENDING', 'ASSIGNED', 'OFFERING', 'PROCESSING', 'ARRIVED'].includes(incident.status) && (
        <div className="px-5 py-4 border-t border-gray-100 bg-amber-50">
          <p className="text-xs text-amber-700 mb-2 font-medium flex items-center gap-1">
            <AlertCircle size={12} />
            Hành động điều phối
          </p>
          {['PENDING', 'ASSIGNED', 'OFFERING'].includes(incident.status) && (
             <>
               <select
                 value={selectedTeam}
                 onChange={e => setSelectedTeam(e.target.value)}
                 className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                 <option value="">-- Chọn đội cứu hộ (Force Assign) --</option>
                 {teamOptions.map(t => (
                   <option key={t._id} value={t._id} disabled={t.status !== 'AVAILABLE'}>
                     {t.label} - {t.statusText}
                   </option>
                 ))}
               </select>
               {selectedTeam && (() => {
                 const chosenTeam = teams.find((team) => team._id === selectedTeam);
                 if (!chosenTeam) return null;
                 return (
                   <p className="text-[11px] text-amber-800 mb-2">
                     {chosenTeam.status === 'AVAILABLE'
                       ? 'Đội này đang đủ điều kiện nhận nhiệm vụ.'
                       : chosenTeam.status === 'BUSY'
                         ? 'Đội này đang có nhiệm vụ khác.'
                         : `Đội này đang offline vì chưa đủ ${chosenTeam.minimumOnlineMembers || 2} thành viên online.`}
                   </p>
                 );
               })()}
               <button
                 onClick={handleForceAssign}
                 disabled={assigning || !selectedTeam}
                 className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
               >
                 <Zap size={14} />
                 {assigning ? 'Đang phân công...' : 'Chỉ định đội (Ghi đè)'}
               </button>
             </>
          )}

          <button
            onClick={handleCancelIncident}
            disabled={assigning}
            className="w-full py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Huỷ sự cố này
          </button>
        </div>
      )}
    </div>
  );
}