const logger = require('../utils/logger');

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'CuuHoGiaoThong/1.0 (contact@cuuho.vn)' };

/**
 * Lấy địa chỉ từ tọa độ GPS (Reverse Geocoding)
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 * @returns {string} Địa chỉ hoặc chuỗi tọa độ nếu thất bại
 */
const reverseGeocode = async (lat, lng) => {
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return data.display_name || `${lat}, ${lng}`;
  } catch (err) {
    logger.warn(`Reverse geocode thất bại (${lat}, ${lng}): ${err.message}`);
    return `${lat}, ${lng}`; // Fallback về tọa độ
  }
};

/**
 * Tìm kiếm địa điểm theo tên (Forward Geocoding)
 * @param {string} query - Tên địa điểm
 * @returns {Array} Danh sách kết quả
 */
const searchPlace = async (query) => {
  try {
    const encoded = encodeURIComponent(query);
    const url = `${NOMINATIM_BASE}/search?q=${encoded}&format=json&limit=5&countrycodes=vn&accept-language=vi`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return data.map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (err) {
    logger.warn(`Forward geocode thất bại (${query}): ${err.message}`);
    return [];
  }
};

module.exports = { reverseGeocode, searchPlace };
