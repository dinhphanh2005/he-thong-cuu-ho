import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;
  const token = localStorage.getItem('access_token');
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });
  socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
  socket.on('disconnect', (r) => console.log('❌ Socket disconnected:', r));
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
