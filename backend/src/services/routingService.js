const logger = require('../utils/logger');

/**
 * Fetch routing path from OSRM public API
 * @param {Array} start - [lng, lat]
 * @param {Array} end - [lng, lat]
 * @returns {Object|null} { path: [[lng, lat]], distance: meters, duration: seconds }
 */
const getRoute = async (start, end) => {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OSRM API responded with status ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      logger.warn('OSRM: No route found');
      return null;
    }

    const route = data.routes[0];
    return {
      path: route.geometry.coordinates, // Array of [lng, lat]
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
    };
  } catch (err) {
    logger.error(`OSRM Routing Error: ${err.message}`);
    return null;
  }
};

module.exports = { getRoute };
