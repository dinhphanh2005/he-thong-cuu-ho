import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Tự động gắn token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Tự động refresh token khi hết hạn
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        await AsyncStorage.setItem('access_token', data.accessToken);
        await AsyncStorage.setItem('refresh_token', data.refreshToken);

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role']);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  login: (loginId: string, password: string) =>
    api.post('/auth/login', { loginId, password }),

  register: (name: string, email: string, phone: string, password: string) =>
    api.post('/auth/register', { name, email, phone, password }),

  getMe: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),

  changePassword: (newPassword: string) =>
    api.post('/auth/change-password', { newPassword }),
};

// ==================== INCIDENTS ====================
export const incidentAPI = {
  create: (formData: FormData) =>
    api.post('/incidents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAll: (params?: object) => api.get('/incidents', { params }),

  getById: (id: string) => api.get(`/incidents/${id}`),

  getMy: (params?: object) => api.get('/incidents/my', { params }),

  track: (code: string) => api.get(`/incidents/track/${code}`),

  getActiveRescue: () => api.get('/incidents/rescue/active'),

  updateStatus: (id: string, status: string, note?: string, estimatedArrivalMinutes?: number) =>
    api.patch(`/incidents/${id}/status`, { status, note, estimatedArrivalMinutes }),

  refuse: (id: string, reason?: string) =>
    api.patch(`/incidents/${id}/refuse`, { reason }),

  sos: (coordinates: number[], description?: string) =>
    api.post('/incidents/sos', { coordinates, description }),
};

// ==================== RESCUE TEAMS ====================
export const rescueAPI = {
  getActiveTeams: (lat: number, lng: number) => api.get('/rescue-teams/active', { params: { lat, lng } }),

  getMyTeam: () => api.get('/rescue-teams/my-team'),

  updateLocation: (coordinates: number[]) =>
    api.patch('/rescue-teams/location', { coordinates }),

  updateAvailability: (status: 'ONLINE' | 'OFFLINE') =>
    api.patch('/rescue-teams/availability', { status }),
};

// ==================== NOTIFICATIONS ====================
export const notificationAPI = {
  getAll: (params?: object) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ==================== CHAT ====================
export const chatAPI = {
  getMessages: (incidentId: string) => api.get(`/chat/${incidentId}/messages`),
  sendMessage: (incidentId: string, text: string) =>
    api.post(`/chat/${incidentId}/messages`, { text }),
};

export default api;
