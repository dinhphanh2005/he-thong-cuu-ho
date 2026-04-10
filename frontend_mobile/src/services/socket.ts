import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5001';

let socket: Socket | null = null;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('access_token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('✅ Socket connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('❌ Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.log('⚠️ Socket error:', err.message));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

export const joinIncidentRoom = (incidentId: string) => {
  socket?.emit('chat:join', incidentId);
};

export const leaveIncidentRoom = (incidentId: string) => {
  socket?.emit('chat:leave', incidentId);
};

export const trackIncident = (code: string) => {
  socket?.emit('track:join', code);
};

export const updateRescueLocation = (lat: number, lng: number) => {
  socket?.emit('rescue:updateLocation', { lat, lng });
};
