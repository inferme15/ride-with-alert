import L from 'leaflet';

// Facility Icons and Emojis
export const FACILITY_EMOJIS = {
  hospital: "🏥",
  police: "👮",
  fuel_station: "⛽",
  service_center: "🔧",
  mechanic: "🛠️",
  restaurant: "🍽️",
  hotel: "🏨",
  pharmacy: "💊"
} as const;

export const FACILITY_COLORS = {
  hospital: "#ff4444",
  police: "#4444ff",
  fuel_station: "#ffaa00",
  service_center: "#44ff44",
  mechanic: "#ff8800"
} as const;

export const FACILITY_LABELS = {
  hospital: "Hospital",
  police: "Police Station",
  fuel_station: "Fuel Station",
  service_center: "Service Center",
  mechanic: "Mechanic Shop"
} as const;

/**
 * Get emoji for facility type
 */
export function getFacilityEmoji(type: string): string {
  return FACILITY_EMOJIS[type as keyof typeof FACILITY_EMOJIS] || "📍";
}

/**
 * Get color for facility type
 */
export function getFacilityColor(type: string): string {
  return FACILITY_COLORS[type as keyof typeof FACILITY_COLORS] || "#888888";
}

/**
 * Get label for facility type
 */
export function getFacilityLabel(type: string): string {
  return FACILITY_LABELS[type as keyof typeof FACILITY_LABELS] || "Facility";
}

/**
 * Create custom Leaflet icon with emoji
 */
export function createFacilityIcon(type: string) {
  const emoji = getFacilityEmoji(type);
  const color = getFacilityColor(type);
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-facility-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
}

/**
 * Create accident zone marker
 */
export function createAccidentZoneIcon() {
  return L.divIcon({
    html: `
      <div style="
        background: #ff0000;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        border: 4px solid #ffff00;
        box-shadow: 0 0 20px rgba(255,0,0,0.8);
        animation: pulse 2s infinite;
      ">
        ⚠️
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `,
    className: 'accident-zone-marker',
    iconSize: [50, 50],
    iconAnchor: [25, 50]
  });
}

/**
 * Create car/vehicle icon for current position
 */
export function createVehicleIcon() {
  return L.divIcon({
    html: `
      <div style="
        background: #00ff00;
        border-radius: 50%;
        width: 35px;
        height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 0 15px rgba(0,255,0,0.6);
      ">
        🚗
      </div>
    `,
    className: 'vehicle-marker',
    iconSize: [35, 35],
    iconAnchor: [17, 35]
  });
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  const colors = {
    CRITICAL: "#8B0000",
    HIGH: "#FF0000",
    MEDIUM: "#FFA500",
    LOW: "#FFFF00"
  };
  return colors[severity as keyof typeof colors] || "#888888";
}
