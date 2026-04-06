import { useEffect, useState, useRef, Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, LayerGroup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Fix for default Leaflet marker icons
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Delete default icon to prevent conflicts
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Vehicle icon with animation
const vehicleIcon = L.divIcon({
  html: '<div style="font-size: 24px; text-align: center; line-height: 1;">🚗</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const emergencyIcon = L.divIcon({
  html: '<div style="font-size: 24px; text-align: center; line-height: 1; animation: pulse 1s ease-in-out infinite;">🚨</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// Facility icons
const facilityIcons = {
  hospital: L.divIcon({
    html: '<div style="font-size: 20px; text-align: center; line-height: 1;">🏥</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  }),
  police: L.divIcon({
    html: '<div style="font-size: 20px; text-align: center; line-height: 1;">🚓</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  }),
  fuel: L.divIcon({
    html: '<div style="font-size: 20px; text-align: center; line-height: 1;">⛽</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  }),
  service: L.divIcon({
    html: '<div style="font-size: 20px; text-align: center; line-height: 1;">🔧</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  }),
  pharmacy: L.divIcon({
    html: '<div style="font-size: 20px; text-align: center; line-height: 1;">💊</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  }),
  fire: L.divIcon({
    html: '<div style="font-size: 20px; text-align: center; line-height: 1;">🚒</div>',
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  })
};

function normalizeFacilityType(rawType: string): keyof typeof facilityIcons {
  const type = (rawType || "").toLowerCase();
  if (type === "hospital") return "hospital";
  if (type === "police") return "police";
  if (type === "fuel" || type === "fuel_station") return "fuel";
  if (type === "service" || type === "service_center") return "service";
  if (type === "pharmacy") return "pharmacy";
  if (type === "fire" || type === "fire_station") return "fire";
  // Backend may return clinic/ambulance station; show as hospital marker.
  if (type === "clinic" || type === "ambulance_station") return "hospital";
  return "service";
}

// Danger zone icon
const dangerZoneIcon = (riskLevel: string) => {
  const colors = {
    low: '#fbbf24',
    medium: '#f97316', 
    high: '#ef4444',
    critical: '#dc2626'
  };
  const color = colors[riskLevel as keyof typeof colors] || '#ef4444';
  
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    ">⚠</div>`,
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

interface FixedVehicleTrackingMapProps {
  vehicleNumber: string;
  driverName: string;
  currentLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  isRealGPS: boolean;
  showRoute?: boolean;
  showAlternativeRoutes?: boolean;
  autoFollow?: boolean;
  simulatedPosition?: [number, number] | null;
  simulationProgress?: number;
  isEmergency?: boolean;
  isPaused?: boolean;
  // Enhanced route data - ALL ROUTES from analysis
  routeGeometry?: GeoJSON.LineString | null; // Selected route (GREEN)
  allRoutes?: Array<{
    routeId: string;
    geometry: GeoJSON.LineString;
    isRecommended: boolean;
    safetyScore: number;
    distance: number;
    estimatedTime: number;
  }>; // All route options for display
  dangerZones?: Array<{
    location: { lat: number; lng: number };
    radius: number;
    riskLevel: string;
    description: string;
  }>;
  safetyMetrics?: {
    overallSafetyScore: number;
    accidentFrequencyScore: number;
    crimeZoneWeight: number;
    roadConditionScore: number;
    timeRiskFactor: number;
  };
  facilities?: Array<{
    id: string;
    name: string;
    type: string;
    location: { lat: number; lng: number };
    distance: number;
  }>;
}

function FitToSimulationBounds({
  routePath,
  facilities,
  currentLocation,
  destination
}: {
  routePath: [number, number][];
  facilities: Array<{ location: { lat: number; lng: number } }>;
  currentLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (hasFittedRef.current) return;
    const points: [number, number][] = [];
    if (routePath.length > 1) points.push(...routePath);
    if (currentLocation && destination) {
      points.push([currentLocation.lat, currentLocation.lng], [destination.lat, destination.lng]);
    }
    facilities.forEach((f) => points.push([f.location.lat, f.location.lng]));

    if (points.length >= 2) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
      hasFittedRef.current = true;
    }
  }, [map, routePath, facilities, currentLocation, destination]);

  return null;
}

export function FixedVehicleTrackingMap({
  vehicleNumber,
  driverName,
  currentLocation,
  destination,
  isRealGPS,
  showRoute = true,
  showAlternativeRoutes = true,
  autoFollow = true,
  simulatedPosition,
  simulationProgress = 0,
  isEmergency = false,
  isPaused = false,
  routeGeometry,
  allRoutes = [], // All routes from analysis
  dangerZones = [],
  safetyMetrics,
  facilities = []
}: FixedVehicleTrackingMapProps) {
  const initialCenterRef = useRef<[number, number]>(
    currentLocation ? [currentLocation.lat, currentLocation.lng] : [12.9716, 77.5946]
  );
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [allRoutePaths, setAllRoutePaths] = useState<Array<{
    path: [number, number][];
    isRecommended: boolean;
    routeId: string;
    safetyScore: number;
  }>>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Enhanced vehicle position with smooth transitions
  const [smoothVehiclePosition, setSmoothVehiclePosition] = useState<[number, number] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Generate ALL route paths for visualization (like route analysis map)
  useEffect(() => {
    console.log('[DEBUG] FixedVehicleTrackingMap - Route data:', {
      showRoute,
      hasRouteGeometry: !!routeGeometry,
      routeGeometryType: routeGeometry?.type,
      routeCoordinatesLength: routeGeometry?.coordinates?.length,
      allRoutesCount: allRoutes.length,
      dangerZonesCount: dangerZones.length,
      facilitiesCount: facilities.length,
      hasSafetyMetrics: !!safetyMetrics
    });

    if (showRoute && currentLocation && destination) {
      // Process ALL routes from analysis
      if (allRoutes && allRoutes.length > 0) {
        console.log('[DEBUG] Processing', allRoutes.length, 'routes from analysis');
        const processedRoutes = allRoutes.map(route => ({
          path: route.geometry.coordinates
            .map(([lng, lat]) => [lat, lng] as [number, number])
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)),
          isRecommended: route.isRecommended,
          routeId: route.routeId,
          safetyScore: route.safetyScore
        })).filter(route => route.path.length > 1);
        setAllRoutePaths(processedRoutes);
        
        // Set main route path (recommended route for vehicle movement)
        const recommendedRoute = processedRoutes.find(r => r.isRecommended);
        if (recommendedRoute) {
          setRoutePath(recommendedRoute.path);
          console.log('[DEBUG] Using recommended route with', recommendedRoute.path.length, 'coordinates');
        }
      } else if (routeGeometry && routeGeometry.coordinates) {
        // Fallback to single route geometry
        console.log('[DEBUG] Using single route geometry with', routeGeometry.coordinates.length, 'coordinates');
        const path: [number, number][] = routeGeometry.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        ).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
        setRoutePath(path);
        setAllRoutePaths([{
          path,
          isRecommended: true,
          routeId: 'main-route',
          safetyScore: safetyMetrics?.overallSafetyScore || 85
        }]);
      } else {
        console.log('[DEBUG] No route geometry, using fallback straight line');
        // Fallback to simple straight line route
        const steps = 20;
        const path: [number, number][] = [];
        
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const lat = currentLocation.lat + (destination.lat - currentLocation.lat) * ratio;
          const lng = currentLocation.lng + (destination.lng - currentLocation.lng) * ratio;
          path.push([lat, lng]);
        }
        
        setRoutePath(path);
        setAllRoutePaths([{
          path,
          isRecommended: true,
          routeId: 'fallback-route',
          safetyScore: 70
        }]);
      }
    }
  }, [currentLocation, destination, showRoute, routeGeometry, allRoutes, safetyMetrics]);

  // Smooth vehicle position animation
  useEffect(() => {
    const newPosition = simulatedPosition || (currentLocation ? [currentLocation.lat, currentLocation.lng] : null);
    
    if (!newPosition) {
      setSmoothVehiclePosition(null);
      return;
    }

    // If this is the first position or we're not animating, set immediately
    if (!smoothVehiclePosition || !isRealGPS) {
      setSmoothVehiclePosition(newPosition as [number, number]);
      return;
    }

    // Animate smooth transition for real GPS updates
    const startPosition = smoothVehiclePosition;
    const endPosition = newPosition as [number, number];
    
    // Calculate distance to determine animation duration
    const distance = Math.sqrt(
      Math.pow(endPosition[0] - startPosition[0], 2) + 
      Math.pow(endPosition[1] - startPosition[1], 2)
    );
    
    // Skip animation if distance is too small (less than ~1 meter in degrees)
    if (distance < 0.00001) {
      setSmoothVehiclePosition(endPosition);
      return;
    }
    
    // Animation duration based on distance (faster for short distances)
    const animationDuration = Math.min(Math.max(distance * 100000, 500), 2000); // 500ms to 2s
    
    setIsAnimating(true);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Easing function for smooth animation
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      
      const currentLat = startPosition[0] + (endPosition[0] - startPosition[0]) * easeProgress;
      const currentLng = startPosition[1] + (endPosition[1] - startPosition[1]) * easeProgress;
      
      setSmoothVehiclePosition([currentLat, currentLng]);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setSmoothVehiclePosition(endPosition);
      }
    };
    
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentLocation, simulatedPosition, smoothVehiclePosition, isRealGPS]);

  const vehiclePosition = smoothVehiclePosition || (currentLocation ? [currentLocation.lat, currentLocation.lng] : [12.9716, 77.5946]);
  const mapFacilities = (facilities || [])
    .map((facility: any, index: number) => {
      const lat = facility?.location?.lat ?? facility?.latitude;
      const lng = facility?.location?.lng ?? facility?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        id: String(facility?.id || facility?.name || `facility-${index}`),
        name: facility?.name || "Nearby Facility",
        type: facility?.type || "service_center",
        location: { lat: Number(lat), lng: Number(lng) },
        distance: Number(facility?.distance ?? 0)
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      name: string;
      type: string;
      location: { lat: number; lng: number };
      distance: number;
    }>;
  const displayedSafetyScore =
    allRoutes.find((r) => r.isRecommended)?.safetyScore ||
    safetyMetrics?.overallSafetyScore ||
    0;
  const facilityNames = mapFacilities.map((f) => f.name);

  // Validate coordinates
  if (!currentLocation || !destination || 
      isNaN(currentLocation.lat) || isNaN(currentLocation.lng) ||
      isNaN(destination.lat) || isNaN(destination.lng)) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-500 mb-2">⚠️ Invalid coordinates</div>
          <div className="text-xs text-slate-400">Please check trip data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full map-container">
      <MapContainer 
        center={initialCenterRef.current}
        zoom={13}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
        whenReady={() => setIsMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToSimulationBounds
          routePath={routePath}
          facilities={mapFacilities}
          currentLocation={currentLocation}
          destination={destination}
        />

        {/* ALL ROUTES - Like route analysis map - FORCE DISPLAY */}
        {showRoute && isMapReady && (
          <>
            {/* Main route path - ALWAYS SHOW GREEN LINE */}
            {routePath.length > 0 && (
              <Polyline
                positions={routePath}
                color="#22c55e" // BRIGHT GREEN
                weight={6}
                opacity={1.0}
              />
            )}
            
            {/* Alternative routes if available */}
            {showAlternativeRoutes && allRoutePaths.length > 1 && allRoutePaths.map((route, index) => 
              !route.isRecommended ? (
                <Polyline
                  key={`alt-route-${route.routeId}-${index}`}
                  positions={route.path}
                  color="#3b82f6" // BLUE for alternatives
                  weight={4}
                  opacity={0.7}
                  dashArray="10, 5"
                />
              ) : null
            )}
            
            {/* FALLBACK: If no routes, show simple line */}
            {routePath.length === 0 && (
              <Polyline
                positions={[[currentLocation.lat, currentLocation.lng], [destination.lat, destination.lng]]}
                color="#22c55e" // GREEN
                weight={6}
                opacity={1.0}
              />
            )}
          </>
        )}

        {/* Danger zones */}
        {isMapReady && dangerZones.map((zone, index) => (
          <LayerGroup key={`danger-${index}`}>
            <Marker 
              position={[zone.location.lat, zone.location.lng]}
              icon={dangerZoneIcon(zone.riskLevel)}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-red-600">⚠️ Danger Zone</h3>
                  <p className="text-sm"><strong>Risk Level:</strong> {zone.riskLevel.toUpperCase()}</p>
                  <p className="text-sm"><strong>Description:</strong> {zone.description}</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[zone.location.lat, zone.location.lng]}
              radius={zone.radius}
              color={zone.riskLevel === 'critical' ? '#dc2626' : zone.riskLevel === 'high' ? '#ef4444' : zone.riskLevel === 'medium' ? '#f97316' : '#fbbf24'}
              fillColor={zone.riskLevel === 'critical' ? '#dc2626' : zone.riskLevel === 'high' ? '#ef4444' : zone.riskLevel === 'medium' ? '#f97316' : '#fbbf24'}
              fillOpacity={0.1}
              weight={2}
              opacity={0.5}
            />
          </LayerGroup>
        ))}

        {/* Facility markers */}
        {isMapReady && mapFacilities.map((facility) => (
          <Marker 
            key={facility.id}
            position={[facility.location.lat, facility.location.lng]}
            icon={facilityIcons[normalizeFacilityType(facility.type)]}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-blue-600">{facility.name}</h3>
                <p className="text-sm"><strong>Type:</strong> {facility.type.replace(/_/g, ' ')}</p>
                <p className="text-sm"><strong>Distance:</strong> {facility.distance.toFixed(1)} km</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Start marker */}
        {isMapReady && (
          <Marker position={[currentLocation.lat, currentLocation.lng]}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-green-600">🏁 Start</h3>
                <p className="text-sm">Trip Origin</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {isMapReady && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-red-600">🎯 Destination</h3>
                <p className="text-sm">Trip End Point</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Vehicle marker with enhanced real-time info */}
        {isMapReady && vehiclePosition && (
          <Marker
            position={vehiclePosition as [number, number]}
            icon={isEmergency ? emergencyIcon : vehicleIcon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-lg">
                  {isEmergency ? "🚨 EMERGENCY" : "🚗"} {vehicleNumber}
                </h3>
                <p className="text-sm text-gray-600">Driver: {driverName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  📍 {vehiclePosition[0].toFixed(6)}, {vehiclePosition[1].toFixed(6)}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant={isRealGPS ? "default" : "secondary"}>
                    {isRealGPS ? "📡 Real GPS" : "🎯 Simulated"}
                  </Badge>
                  {isPaused && <Badge variant="outline">⏸️ Paused</Badge>}
                  {isEmergency && <Badge variant="destructive">🚨 Emergency</Badge>}
                  {isAnimating && <Badge variant="outline" className="text-green-600">🔄 Moving</Badge>}
                </div>
                {showRoute && (
                  <p className="text-xs mt-1">Progress: {Math.round(simulationProgress * 100)}%</p>
                )}
                {isRealGPS && (
                  <div className="text-xs text-gray-500 mt-2">
                    <p>🕒 Last Update: {new Date().toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Status overlay */}
      <Card className="absolute top-4 right-4 shadow-lg z-[1000] bg-white/95 backdrop-blur min-w-[220px]">
        <CardContent className="p-4">
          <div className="text-base font-semibold">{vehicleNumber}</div>
          <div className="text-sm text-gray-700">{driverName}</div>
          <div className="flex gap-1 mt-2">
            <Badge variant={isRealGPS ? "default" : "secondary"} className="text-sm">
              {isRealGPS ? "📡 GPS" : "🎯 SIM"}
            </Badge>
            {isPaused && <Badge variant="outline" className="text-sm">⏸️</Badge>}
            {isEmergency && <Badge variant="destructive" className="text-sm">🚨</Badge>}
          </div>
          {showRoute && (
            <div className="text-sm mt-2">
              Progress: {Math.round(simulationProgress * 100)}%
            </div>
          )}
          <div className="text-sm mt-2 pt-2 border-t border-gray-200">
            <div className="font-semibold text-gray-700">Nearby Facilities: {mapFacilities.length}</div>
            {facilityNames.length > 0 ? (
              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                {facilityNames.slice(0, 4).map((name, idx) => (
                  <div key={`${name}-${idx}`}>{idx + 1}. {name}</div>
                ))}
                {facilityNames.length > 4 && <div>+{facilityNames.length - 4} more</div>}
              </div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">No facilities found nearby</div>
            )}
          </div>
          {displayedSafetyScore > 0 && (
            <div className="text-sm mt-2 pt-2 border-t border-gray-200">
              <div className="font-semibold text-gray-700 mb-1">Safety Score</div>
              <div className="text-xl font-bold text-blue-600">
                {Math.round(displayedSafetyScore)}/100
              </div>
              <div className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1 ${
                displayedSafetyScore >= 80 ? "bg-green-100 text-green-700" :
                displayedSafetyScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                {displayedSafetyScore >= 80 ? "LOW RISK" : displayedSafetyScore >= 60 ? "MEDIUM RISK" : "HIGH RISK"}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Danger Zones: {dangerZones.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}