import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points, radius = 25, blur = 15, maxZoom = 17, max = 1.0 }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Convert points to [lat, lng, intensity]
    const heatPoints = points.map(p => {
      if (Array.isArray(p.coordinates)) {
        return [p.coordinates[1], p.coordinates[0], p.intensity || 1]; // GeoJSON format
      }
      if (Array.isArray(p) && p.length >= 2) {
        return [p[0], p[1], p[2] || 1]; // Array format
      }
      if (p.lat && p.lng) {
        return [p.lat, p.lng, p.intensity || 1]; // Object format
      }
      return null;
    }).filter(p => p !== null && !isNaN(p[0]) && !isNaN(p[1]));

    if (heatPoints.length === 0) return;

    const heatLayer = L.heatLayer(heatPoints, {
      radius,
      blur,
      maxZoom,
      max
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, radius, blur, maxZoom, max]);

  return null;
}
