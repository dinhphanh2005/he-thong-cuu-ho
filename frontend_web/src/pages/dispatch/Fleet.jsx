import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronRight, MapPin, MessageSquare, Users, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

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

function TeamDetailPanel({ team, onClose }) {
  const navigate = useNavigate();
  const coordinates = team?.currentLocation?.coordinates || [];
  const mapCenter = coordinates.length === 2
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
        <div className="mx-5 mt-4 h-40 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {coordinates.length === 2 && (
              <CircleMarker center={mapCenter} radius={8} pathOptions={{ color: '#496FC0', fillColor: '#496FC0', fillOpacity: 0.95 }}>
                <Popup>{team.name}</Popup>
              </CircleMarker>
            )}
          </MapContainer>
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
                    <div className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-gray-700">
                      <Users size={16} />
                      {members.length} thành viên
                    </div>
                    <div className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-gray-700 border-l border-gray-100">
                      {coordinates.length === 2 ? <MapPin size={16} /> : <Wrench size={16} />}
                      {coordinates.length === 2 ? 'Vị trí' : 'Chưa có GPS'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedTeam && (
        <TeamDetailPanel team={selectedTeam} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
