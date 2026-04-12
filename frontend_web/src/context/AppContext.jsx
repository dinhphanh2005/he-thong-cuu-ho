import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { incidentAPI, rescueAPI, reportAPI, adminAPI, authAPI } from '../services/api';
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

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      if (data.success && data.data.settings) {
        setPersonalSettings(data.data.settings);
      }
    } catch (e) {
      console.error('fetchMe:', e.message);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const { data } = await incidentAPI.getAll({ limit: 100 });
      const list = data.data || [];
      setIncidents(list);
      setPendingCount(list.filter(i => i.status === 'PENDING').length);
    } catch (e) {
      console.error('fetchIncidents:', e.message);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await rescueAPI.getAll();
      setTeams(data.data || []);
    } catch (e) {
      console.error('fetchTeams:', e.message);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await reportAPI.getDashboard();
      setDashboard(data.data);
    } catch (e) {
      console.error('fetchDashboard:', e.message);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await adminAPI.getConfig();
      setConfig(data.data);
    } catch (e) {
      console.error('fetchConfig:', e.message);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMe(), fetchIncidents(), fetchTeams(), fetchDashboard(), fetchConfig()]);
    setLoading(false);
  }, [fetchMe, fetchIncidents, fetchTeams, fetchDashboard, fetchConfig]);

  const updatePersonalSettings = async (updates) => {
    try {
      const { data } = await authAPI.updateSettings(updates);
      if (data.success) {
        setPersonalSettings(data.data);
      }
    } catch (e) {
      console.error('updatePersonalSettings:', e.message);
    }
  };

  // ── Socket.IO realtime ──────────────────────────────────────────────────────
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
        const next = exists
          ? prev.map(i => i._id === incident._id ? incident : i)
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
      setTeams(prev => prev.map(t =>
        t._id === teamId ? { ...t, status } : t
      ));
      fetchTeams();
    });

    // Rescue team assigned to incident
    socket.on('rescue:assigned', ({ incidentId, rescueTeam }) => {
      setIncidents(prev => {
        const next = prev.map(i =>
          i._id === incidentId
            ? { ...i, status: 'ASSIGNED', assignedTeam: rescueTeam }
            : i
        );
        setPendingCount(next.filter(i => i.status === 'PENDING').length);
        return next;
      });
      fetchTeams();
      fetchDashboard();
    });

    // System configuration updated
    socket.on('system:config-updated', (newConfig) => {
      setConfig(newConfig);
    });

    return () => {
      socket.off('incident:new');
      socket.off('incident:updated');
      socket.off('alert:sos');
      socket.off('rescue:location');
      socket.off('rescue:status-changed');
      socket.off('rescue:assigned');
    };
  }, [fetchAll, fetchDashboard, fetchTeams]);

  // ── Derived data ────────────────────────────────────────────────────────────
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
      personalSettings, updatePersonalSettings,
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
