export const COLORS = {
  primary: '#496FC0',
  primaryDark: '#3A5A9A',
  danger: '#e74c3c',
  success: '#2ecc71',
  warning: '#f39c12',
  info: '#3498db',
  dark: '#1a1a1a',
  gray: '#666',
  lightGray: '#aaa',
  border: '#ddd',
  background: '#fafafa',
  white: '#fff',
  black: '#000',
};

export const INCIDENT_TYPES = {
  ACCIDENT: 'Tai nạn giao thông',
  BREAKDOWN: 'Hỏng xe / Chết máy',
  FLOOD: 'Ngập nước',
  FIRE: 'Cháy nổ',
  OTHER: 'Sự cố khác',
};

export const INCIDENT_STATUS = {
  PENDING: 'Đang chờ',
  ASSIGNED: 'Đã phân công',
  ARRIVED: 'Đã đến hiện trường',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  HANDLED_BY_EXTERNAL: 'Chuyển ngoài',
};

export const SEVERITY_COLORS = {
  LOW: '#2ecc71',
  MEDIUM: '#f39c12',
  HIGH: '#e67e22',
  CRITICAL: '#e74c3c',
};

export const STATUS_COLORS = {
  PENDING: '#f39c12',
  ASSIGNED: '#3498db',
  ARRIVED: '#8e44ad',
  PROCESSING: '#9b59b6',
  COMPLETED: '#2ecc71',
  CANCELLED: '#95a5a6',
  HANDLED_BY_EXTERNAL: '#34495e',
};
