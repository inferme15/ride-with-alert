import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  routes: Array<{
    routeId: string;
    geometry: GeoJSON.LineString;
    isRecommended: boolean;
    safetyMetrics: {
      overallSafetyScore: number;
    };
    dangerZones: Array<{
      location: { lat: number; lng: number };
      radius: number;
      riskLevel: string;
      description: string;
    }>;
  }>;
  selectedRouteId?: string;
}

export function RouteMap({ routes, selectedRouteId }: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize map once per mount.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (container._leaflet_id) {
      container._leaflet_id = undefined;
    }

    const map = L.map(container).setView([12.9716, 77.5946], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update route overlays whenever data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      // Clear existing layers (except tile layer)
      map.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker || layer instanceof L.Circle) {
          map.removeLayer(layer);
        }
      });

      if (!routes || routes.length === 0) return;

      // Collect all coordinates for bounds
      const allCoords: L.LatLngExpression[] = [];

      // Draw all routes
      routes.forEach((route) => {
        if (!route || !route.geometry || !route.geometry.coordinates) return;
        
        const isRecommended = route.isRecommended;
        const isSelected = route.routeId === selectedRouteId;
        
        // Determine route color and style
        let color = '#3b82f6'; // blue for normal routes
        let weight = 4;
        let opacity = 0.6;
        
        if (isRecommended) {
          color = '#22c55e'; // green for recommended route
          weight = 6;
          opacity = 0.9;
        } else if (isSelected) {
          color = '#3b82f6'; // blue for selected
          weight = 5;
          opacity = 0.8;
        }

        // Convert GeoJSON coordinates to Leaflet LatLng
        const latLngs: L.LatLngExpression[] = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as L.LatLngExpression
        );

        // Add to bounds
        allCoords.push(...latLngs);

        // Draw route polyline
        const polyline = L.polyline(latLngs, {
          color,
          weight,
          opacity,
        }).addTo(map);

        // Add popup with route info
        const safetyScore = route.safetyMetrics?.overallSafetyScore || 0;
        const popupContent = `
          <div style="font-family: sans-serif;">
            <strong>${isRecommended ? '✓ RECOMMENDED' : 'Route'}</strong><br/>
            Safety Score: <strong>${safetyScore}/100</strong><br/>
            Danger Zones: <strong>${route.dangerZones?.length || 0}</strong>
          </div>
        `;
        polyline.bindPopup(popupContent);
      });

      // Draw danger zones for all routes
      const drawnZones = new Set<string>();
      routes.forEach((route) => {
        if (!route.dangerZones) return;
        
        route.dangerZones.forEach((zone) => {
          if (!zone || !zone.location) return;
          
          const zoneKey = `${zone.location.lat},${zone.location.lng}`;
          if (drawnZones.has(zoneKey)) return;
          drawnZones.add(zoneKey);

          // Determine marker color based on risk level
          let markerColor = '#ef4444'; // red for high risk
          if (zone.riskLevel === 'low') markerColor = '#fbbf24'; // yellow
          if (zone.riskLevel === 'medium') markerColor = '#f97316'; // orange
          if (zone.riskLevel === 'critical') markerColor = '#dc2626'; // dark red

          // Create custom icon
          const dangerIcon = L.divIcon({
            className: 'custom-danger-marker',
            html: `<div style="
              background-color: ${markerColor};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
            ">⚠</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          // Add danger zone marker
          const marker = L.marker([zone.location.lat, zone.location.lng], {
            icon: dangerIcon,
          }).addTo(map);

          // Add danger zone circle
          L.circle([zone.location.lat, zone.location.lng], {
            radius: zone.radius || 1000,
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.5,
          }).addTo(map);

          // Add popup with danger zone info
          marker.bindPopup(`
            <div style="font-family: sans-serif;">
              <strong style="color: ${markerColor};">⚠️ Danger Zone</strong><br/>
              <strong>Risk Level:</strong> ${zone.riskLevel?.toUpperCase() || 'UNKNOWN'}<br/>
              <strong>Description:</strong> ${zone.description || 'No description available'}
            </div>
          `);

          allCoords.push([zone.location.lat, zone.location.lng]);
        });
      });

      // Fit map to show all routes and danger zones
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('RouteMap error:', error);
    }
  }, [routes, selectedRouteId]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border-2 border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg text-xs z-[1000]">
        <div className="font-bold mb-2">Map Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500"></div>
            <span>Recommended Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-500"></div>
            <span>Other Routes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Danger Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
