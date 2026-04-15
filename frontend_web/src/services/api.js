import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
const ALLOWED_WEB_ROLES = ['DISPATCHER', 'ADMIN'];

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('password_change_required');
}

export function storeAuthSession({ accessToken, refreshToken, user, mustChangePassword = false }) {
  if (accessToken) localStorage.setItem('access_token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('auth_user');
  }

  if (mustChangePassword) {
    localStorage.setItem('password_change_required', 'true');
  } else {
    localStorage.removeItem('password_change_required');
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
}

export function isPasswordChangeRequired() {
  return localStorage.getItem('password_change_required') === 'true';
}

export function hasAccessToken() {
  return Boolean(localStorage.getItem('access_token'));
}

export function canAccessWebRole(user) {
  return Boolean(user?.role && ALLOWED_WEB_ROLES.includes(user.role));
}

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto refresh on 401 + xử lý 503 bảo trì + network offline
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;

    // ── Bảo trì hệ thống (503) ────────────────────────────────────
    // Backend trả 503 + maintenanceMode: true khi đang bảo trì
    if (error.response?.status === 503 && error.response?.data?.maintenanceMode) {
      error.isMaintenanceMode = true;
      return Promise.reject(error);
    }

    // ── Server ngoại tuyến / mất kết nối mạng ────────────────────
    // Không có response = server sập hoặc mất mạng hoàn toàn
    if (!error.response) {
      error.isServerOffline = true;
      return Promise.reject(error);
    }

    // ── Phải đổi mật khẩu ─────────────────────────────────────────
    if (error.response?.status === 403 && error.response?.data?.mustChangePassword) {
      localStorage.setItem('password_change_required', 'true');
      if (window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
      return Promise.reject(error);
    }

    // ── Auto refresh token khi 401 ────────────────────────────────
    if (error.response?.status === 401 && !orig._retry) {
      // Bỏ qua interceptor cho route login — lỗi 401 ở login là "sai mật khẩu"
      const isLoginRoute = orig.url?.includes('/auth/login');
      if (isLoginRoute) {
        return Promise.reject(error);
      }

      orig._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          clearAuth();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch {
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (loginId, password) => api.post('/auth/login', { loginId, password }),
  sendOTP: (loginId) => api.post('/auth/send-otp', { loginId }),
  verify2FA: (userId, otpCode) => api.post('/auth/verify-2fa', { userId, otpCode }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword }),
  requestAccess: (formData) => api.post('/auth/request-access', formData),
  getMe: () => api.get('/auth/me'),
  changePassword: (newPassword) => api.post('/auth/change-password', { newPassword }),
  logout: () => api.post('/auth/logout'),
  updateSettings: (settings) => api.patch('/auth/settings', settings),
};

export const incidentAPI = {
  getAll: (params) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  updateStatus: (id, status, note) => api.patch(`/incidents/${id}/status`, { status, note }),
  assignTeam: (id, teamId) => api.patch(`/rescue-teams/${teamId}/assign/${id}`),
  // FIX BUG-05: Thêm cancel incident
  cancel: (id, reason) => api.patch(`/incidents/${id}/cancel`, { reason }),
  // Track public (không cần auth)
  track: (code) => api.get(`/incidents/track/${code}`),
};

export const rescueAPI = {
  getAll: () => api.get('/rescue-teams'),
  assignToIncident: (incidentId, teamId) =>
    api.patch(`/rescue-teams/${teamId}/assign/${incidentId}`),
};

export const reportAPI = {
  // Admin-only: thống kê đầy đủ (totalUsers, activeTeams,...)
  getDashboard: () => api.get('/admin/dashboard'),
  // Dispatcher + Admin: thống kê sự cố (byStatus, byType, avgResponseTime)
  getSummary: (params) => api.get('/reports/summary', { params }),
  getTimeline: (params) => api.get('/reports/timeline', { params }),
  getHeatmap: (params) => api.get('/reports/heatmap', { params }),
  getTeamPerformance: () => api.get('/reports/team-performance'),
};

export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  createDispatcher: (data) => api.post('/admin/dispatchers', data),
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  // Sửa và xóa tài khoản (FIX: thiếu chức năng này)
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteRescueTeam: (id) => api.delete(`/admin/rescue-teams/${id}`),
  updateRescueTeam: (id, payload) => api.put(`/admin/rescue-teams/${id}`, payload),
  toggleSuspendTeam: (id) => api.patch(`/admin/rescue-teams/${id}/toggle-suspend`),
  triggerReports: (data) => api.post('/admin/reports/trigger', data),
  createRescueTeam: (data) => api.post('/admin/rescue-teams', data),
  createRescueMember: (data) => api.post('/admin/rescue-members', data),
  getPartnerHistory: (id) => api.get(`/admin/rescue-teams/${id}/history`),
  getConfig: () => api.get('/admin/config'),
  updateConfig: (data) => api.patch('/admin/config', data),
};

export const chatAPI = {
  getMessages: (incidentId) => api.get(`/chat/${incidentId}/messages`),
  sendMessage: (incidentId, text) => api.post(`/chat/${incidentId}/messages`, { text }),
};

export default api;
