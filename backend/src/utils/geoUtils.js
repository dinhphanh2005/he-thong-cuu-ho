/**
 * Tính khoảng cách giữa 2 điểm GPS theo công thức Haversine
 * @param {number[]} coord1 - [lng, lat] điểm 1
 * @param {number[]} coord2 - [lng, lat] điểm 2
 * @returns {number} Khoảng cách tính bằng mét
 */
const haversineDistance = (coord1, coord2) => {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const toRad = (deg) => (deg * Math.PI) / 180;

  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Kiểm tra tọa độ hợp lệ
 * @param {number[]} coords - [lng, lat]
 */
const isValidCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};

/**
 * Format khoảng cách thành chuỗi dễ đọc
 * @param {number} meters
 */
const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

module.exports = { haversineDistance, isValidCoordinates, formatDistance };
