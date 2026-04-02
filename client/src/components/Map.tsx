import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { type Emergency, type Vehicle, type Driver } from "@shared/schema";

// Fix for default Leaflet marker icons not loading in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons with emojis
const emergencyIcon = L.divIcon({
  html: '<div style="font-size: 32px; text-align: center; line-height: 1;">🚨</div>',
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const vehicleIcon = L.divIcon({
  html: '<div style="font-size: 32px; text-align: center; line-height: 1;">🚗</div>',
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    id: number;
    lat: number;
    lng: number;
    title: string;
    type: "vehicle" | "emergency";
    details?: any;
  }>;
  className?: string;
}

export function Map({ center, zoom = 13, markers = [], className = "h-full w-full rounded-xl map-container" }: MapProps) {
  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker 
            key={`${marker.type}-${marker.id}`} 
            position={[marker.lat, marker.lng]}
            icon={marker.type === "emergency" ? emergencyIcon : vehicleIcon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-lg mb-1">{marker.title}</h3>
                {marker.details && (
                  <div className="text-sm text-gray-600">
                    {marker.type === "emergency" && (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold mb-2">
                        ACTIVE EMERGENCY
                      </span>
                    )}
                    <p>{marker.details}</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
