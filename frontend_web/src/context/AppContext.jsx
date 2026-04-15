import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { incidentAPI, rescueAPI, reportAPI, adminAPI, authAPI, getStoredUser } from '../services/api';
import { connectSocket } from '../services/socket';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [incidents, setIncidents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [config, setConfig] = useState(null);
  const [personalSettings, setPersonalSettings] = useState(null);
  // ── Trạng thái hệ thống ──────────────────────────────────────────────────────
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const offlineRetryRef = useRef(null);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); }
    catch { return null; }
  });

  // Lấy role của user đang đăng nhập
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // ── Helper: xử lý lỗi chung ─────────────────────────────────────────────────
  const handleFetchError = useCallback((e, label) => {
    if (e.isMaintenanceMode) {
      // Server đang bảo trì — chỉ hiện page bảo trì cho non-admin
      if (!isAdmin) setIsMaintenanceMode(true);
    } else if (e.isServerOffline) {
      // Server sập / mất mạng
      setIsServerOffline(true);
    } else {
      // Lỗi thông thường (403, 404, ...) — reset offline flag nếu có response
      setIsServerOffline(false);
      console.error(`[AppContext] ${label}:`, e.message);
    }
  }, [isAdmin]);

  // ── Fetch all data ───────────────────────────────────────────────────────────
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      if (data.success) {
        if (data.data.settings) setPersonalSettings(data.data.settings);
        // Cập nhật user info nếu thay đổi
        setUser(prev => {
          const updated = { ...prev, name: data.data.name, role: data.data.role };
          localStorage.setItem('auth_user', JSON.stringify(updated));
          return updated;
        });
        setIsServerOffline(false);
      }
    } catch (e) {
      handleFetchError(e, 'fetchMe');
    }
  }, [handleFetchError]);

  const fetchIncidents = useCallback(async () => {
    try {
      const { data } = await incidentAPI.getAll({ limit: 100 });
      const list = data.data || [];
      setIncidents(list);
      setPendingCount(list.filter(i => i.status === 'PENDING').length);
      setIsServerOffline(false);
    } catch (e) {
      handleFetchError(e, 'fetchIncidents');
    }
  }, [handleFetchError]);

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await rescueAPI.getAll();
      setTeams(data.data || []);
      setIsServerOffline(false);
    } catch (e) {
      handleFetchError(e, 'fetchTeams');
    }
  }, [handleFetchError]);

  const fetchDashboard = useCallback(async () => {
    try {
      // ── FIX BUG-01 ──────────────────────────────────────────────────────────
      // Admin dùng /admin/dashboard (có thêm totalUsers, activeTeams)
      // Dispatcher dùng /reports/summary (không bị 403)
      let data;
      if (isAdmin) {
        const res = await reportAPI.getDashboard(); // GET /admin/dashboard
        data = res.data;
      } else {
        const res = await reportAPI.getSummary();   // GET /reports/summary
        // Map summary sang cấu trúc dashboard
        const s = res.data?.data || {};
        const totalIncidents = s.total || 0;
        const activeIncidents = (s.byStatus || [])
          .filter(b => ['ASSIGNED', 'ARRIVED', 'PROCESSING'].includes(b._id))
          .reduce((acc, b) => acc + b.count, 0);
        const todayIncidents = s.todayIncidents || 0;
        data = {
          success: true,
          data: { totalIncidents, activeIncidents, todayIncidents, totalTeams: 0, activeTeams: 0, totalUsers: 0 },
        };
      }
      setDashboard(data.data);
      setIsServerOffline(false);
    } catch (e) {
      handleFetchError(e, 'fetchDashboard');
    }
  }, [isAdmin, handleFetchError]);

  const fetchConfig = useCallback(async () => {
    // ── FIX BUG-02 ────────────────────────────────────────────────────────────
    // Chỉ gọi /admin/config khi là ADMIN — DISPATCHER không có quyền
    if (!isAdmin) return;
    try {
      const { data } = await adminAPI.getConfig();
      setConfig(data.data);
      setIsServerOffline(false);
    } catch (e) {
      handleFetchError(e, 'fetchConfig');
    }
  }, [isAdmin, handleFetchError]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMe(), fetchIncidents(), fetchTeams(), fetchDashboard(), fetchConfig()]);
    setLoading(false);
  }, [fetchMe, fetchIncidents, fetchTeams, fetchDashboard, fetchConfig]);

  const updatePersonalSettings = async (updates) => {
    try {
      const { data } = await authAPI.updateSettings(updates);
      if (data.success) setPersonalSettings(data.data);
    } catch (e) {
      handleFetchError(e, 'updatePersonalSettings');
    }
  };

  // ── Tự động thử kết nối lại khi server offline ───────────────────────────────
  useEffect(() => {
    if (isServerOffline) {
      // Thử kết nối lại sau mỗi 10 giây
      offlineRetryRef.current = setInterval(async () => {
        try {
          await authAPI.getMe();
          // Thành công → server đã online trở lại
          setIsServerOffline(false);
          fetchAll(); // Reload toàn bộ dữ liệu
          clearInterval(offlineRetryRef.current);
        } catch (e) {
          if (!e.isServerOffline) {
            // Có response (dù là lỗi) = server đã up
            setIsServerOffline(false);
            clearInterval(offlineRetryRef.current);
            fetchAll();
          }
        }
      }, 10000);
    } else {
      clearInterval(offlineRetryRef.current);
    }
    return () => clearInterval(offlineRetryRef.current);
  }, [isServerOffline]);

  // ── Socket.IO realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
    const socket = connectSocket();

    // New incident created
    socket.on('incident:new', (payload) => {
      const incident = payload?.incident || payload;
      if (!incident?._id) return;
      setIncidents(prev => {
        const exists = prev.find(i => i._id === incident._id);
        if (exists) return prev;
        const next = [incident, ...prev];
        setPendingCount(next.filter(i => i.status === 'PENDING').length);
        return next;
      });
    });

    // Incident updated
    socket.on('incident:updated', (incident) => {
      setIncidents(prev => {
        const incidentId = incident._id || incident.id;
        const exists = prev.find(i => i._id === incidentId);
        if (!exists) { setTimeout(fetchIncidents, 0); return prev; }
        const next = prev.map(i => i._id === incidentId ? { ...i, ...incident, _id: incidentId } : i);
        setPendingCount(next.filter(i => i.status === 'PENDING').length);
        return next;
      });
    });

    // SOS alert
    socket.on('alert:sos', (payload) => {
      const incident = payload?.incident || payload;
      if (!incident?._id) return;
      setIncidents(prev => {
        const exists = prev.find(i => i._id === incident._id);
        if (!exists) setTimeout(fetchIncidents, 0);
        const next = exists
          ? prev.map(i => i._id === incident._id ? { ...i, ...incident } : i)
          : [incident, ...prev];
        setPendingCount(next.filter(i => i.status === 'PENDING').length);
        return next;
      });
    });

    // Rescue team location updated
    socket.on('rescue:location', ({ teamId, coordinates, updatedAt }) => {
      setTeams(prev => prev.map(t =>
        t._id === teamId
          ? { ...t, currentLocation: { type: 'Point', coordinates }, lastLocationUpdate: updatedAt }
          : t
      ));
    });

    // Team status changed
    socket.on('rescue:status-changed', ({ teamId, status }) => {
      setTeams(prev => prev.map(t => t._id === teamId ? { ...t, status } : t));
      fetchTeams();
    });

    // Rescue team assigned to incident
    socket.on('rescue:assigned', ({ incidentId, rescueTeam }) => {
      setIncidents(prev => {
        const exists = prev.find(i => i._id === incidentId);
        if (!exists) { setTimeout(fetchIncidents, 0); return prev; }
        const next = prev.map(i =>
          i._id === incidentId ? { ...i, status: 'ASSIGNED', assignedTeam: rescueTeam } : i
        );
        setPendingCount(next.filter(i => i.status === 'PENDING').length);
        return next;
      });
      fetchTeams();
      fetchDashboard();
    });

    // System configuration updated — bao gồm maintenanceMode
    socket.on('system:config-updated', (newConfig) => {
      setConfig(newConfig);
      // Nếu admin tắt bảo trì → ẩn maintenance page
      if (newConfig?.maintenanceMode === false) {
        setIsMaintenanceMode(false);
        fetchAll(); // Reload dữ liệu sau khi bảo trì kết thúc
      }
      // Nếu admin bật bảo trì → non-admin sẽ thấy page bảo trì
      if (newConfig?.maintenanceMode === true && !isAdmin) {
        setIsMaintenanceMode(true);
      }
    });

    // Personal settings updated
    socket.on('user:settings-updated', ({ settings, name }) => {
      setPersonalSettings(settings);
      if (name) {
        setUser(prev => {
          if (!prev || prev.name === name) return prev;
          const updated = { ...prev, name };
          localStorage.setItem('auth_user', JSON.stringify(updated));
          return updated;
        });
      }
    });

    // Concurrent session → force logout
    socket.on('auth:session-invalidated', ({ reason }) => {
      console.warn('[Socket] Session invalidated:', reason);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('password_change_required');
      window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
    });

    // Socket reconnect thành công → refresh dữ liệu
    socket.on('connect', () => {
      if (isServerOffline) {
        setIsServerOffline(false);
        fetchAll();
      }
    });

    return () => {
      socket.off('incident:new');
      socket.off('incident:updated');
      socket.off('alert:sos');
      socket.off('rescue:location');
      socket.off('rescue:status-changed');
      socket.off('rescue:assigned');
      socket.off('system:config-updated');
      socket.off('user:settings-updated');
      socket.off('auth:session-invalidated');
      socket.off('connect');
    };
  }, [fetchAll, fetchDashboard, fetchTeams, fetchIncidents, isAdmin, isServerOffline]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const availableTeams = teams.filter(t => t.status === 'AVAILABLE');
  const busyTeams = teams.filter(t => t.status === 'BUSY');
  const pendingIncidents = incidents.filter(i => i.status === 'PENDING');
  const activeIncidents = incidents.filter(i => ['ASSIGNED', 'ARRIVED', 'PROCESSING'].includes(i.status));

  return (
    <AppContext.Provider value={{
      incidents, teams, dashboard, loading, pendingCount,
      availableTeams, busyTeams, pendingIncidents, activeIncidents,
      fetchIncidents, fetchTeams, fetchDashboard, fetchConfig, fetchAll,
      setIncidents, config, setConfig,
      personalSettings, updatePersonalSettings, user, setUser,
      // Trạng thái hệ thống
      isMaintenanceMode, setIsMaintenanceMode,
      isServerOffline, setIsServerOffline,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
