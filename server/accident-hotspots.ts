// All-India Accident Hotspots Database
// Based on MORTH (Ministry of Road Transport & Highways) data

import { AccidentHotspot } from "@shared/schema";

export const ACCIDENT_HOTSPOTS: AccidentHotspot[] = [
  // Tamil Nadu
  {
    name: "Salem Bypass - NH44",
    coordinates: { lat: 11.6643, lng: 78.1460 },
    radius: 5,
    accidentCount: 45,
    severity: "HIGH",
    reason: "High-speed zone, poor visibility at night",
    state: "Tamil Nadu"
  },
  {
    name: "Vellore Junction - NH48",
    coordinates: { lat: 12.9165, lng: 79.1325 },
    radius: 3,
    accidentCount: 28,
    severity: "MEDIUM",
    reason: "Heavy traffic, multiple intersections",
    state: "Tamil Nadu"
  },
  {
    name: "Coimbatore-Mettupalayam Road",
    coordinates: { lat: 11.0168, lng: 76.9558 },
    radius: 4,
    accidentCount: 32,
    severity: "MEDIUM",
    reason: "Winding roads, truck traffic",
    state: "Tamil Nadu"
  },
  
  // Karnataka
  {
    name: "Bangalore-Mysore Highway",
    coordinates: { lat: 12.5789, lng: 76.9123 },
    radius: 6,
    accidentCount: 52,
    severity: "HIGH",
    reason: "Overspeeding, foggy conditions",
    state: "Karnataka"
  },
  {
    name: "Tumkur Road - NH48",
    coordinates: { lat: 13.3379, lng: 77.1173 },
    radius: 4,
    accidentCount: 38,
    severity: "MEDIUM",
    reason: "Industrial traffic, poor road conditions",
    state: "Karnataka"
  },
  
  // Maharashtra
  {
    name: "Mumbai-Pune Expressway - Lonavala",
    coordinates: { lat: 18.7537, lng: 73.4086 },
    radius: 7,
    accidentCount: 67,
    severity: "CRITICAL",
    reason: "High-speed crashes, weather conditions",
    state: "Maharashtra"
  },
  {
    name: "Mumbai-Nashik Highway",
    coordinates: { lat: 19.5937, lng: 73.0479 },
    radius: 5,
    accidentCount: 41,
    severity: "HIGH",
    reason: "Heavy vehicle traffic, narrow sections",
    state: "Maharashtra"
  },
  
  // Delhi NCR
  {
    name: "Delhi-Jaipur Highway - Gurgaon",
    coordinates: { lat: 28.4595, lng: 77.0266 },
    radius: 6,
    accidentCount: 55,
    severity: "HIGH",
    reason: "High traffic density, lane violations",
    state: "Haryana"
  },
  {
    name: "Yamuna Expressway",
    coordinates: { lat: 28.0229, lng: 77.7085 },
    radius: 8,
    accidentCount: 48,
    severity: "HIGH",
    reason: "Overspeeding, animal crossings",
    state: "Uttar Pradesh"
  },
  
  // Gujarat
  {
    name: "Ahmedabad-Vadodara Expressway",
    coordinates: { lat: 22.6708, lng: 72.8856 },
    radius: 5,
    accidentCount: 36,
    severity: "MEDIUM",
    reason: "High-speed zone, vehicle breakdowns",
    state: "Gujarat"
  },
  
  // Rajasthan
  {
    name: "Jaipur-Ajmer Highway",
    coordinates: { lat: 26.4499, lng: 75.3897 },
    radius: 4,
    accidentCount: 29,
    severity: "MEDIUM",
    reason: "Poor visibility, animal crossings",
    state: "Rajasthan"
  },
  
  // West Bengal
  {
    name: "Durgapur Expressway",
    coordinates: { lat: 23.5204, lng: 87.3119 },
    radius: 5,
    accidentCount: 33,
    severity: "MEDIUM",
    reason: "Truck traffic, narrow lanes",
    state: "West Bengal"
  },
  
  // Andhra Pradesh
  {
    name: "Vijayawada-Hyderabad Highway",
    coordinates: { lat: 16.5062, lng: 80.6480 },
    radius: 6,
    accidentCount: 42,
    severity: "HIGH",
    reason: "Heavy traffic, poor road maintenance",
    state: "Andhra Pradesh"
  },
  
  // Kerala
  {
    name: "Kochi-Thrissur NH66",
    coordinates: { lat: 10.3528, lng: 76.2114 },
    radius: 4,
    accidentCount: 31,
    severity: "MEDIUM",
    reason: "Narrow roads, heavy rain",
    state: "Kerala"
  },
  
  // Telangana
  {
    name: "Hyderabad Outer Ring Road",
    coordinates: { lat: 17.4065, lng: 78.4772 },
    radius: 5,
    accidentCount: 39,
    severity: "MEDIUM",
    reason: "High-speed zone, construction work",
    state: "Telangana"
  },
  
  // Punjab
  {
    name: "Ludhiana-Jalandhar Highway",
    coordinates: { lat: 31.1471, lng: 75.3412 },
    radius: 4,
    accidentCount: 27,
    severity: "MEDIUM",
    reason: "Fog, poor visibility in winter",
    state: "Punjab"
  },
  
  // Madhya Pradesh
  {
    name: "Indore-Bhopal Highway",
    coordinates: { lat: 23.1765, lng: 77.4126 },
    radius: 5,
    accidentCount: 34,
    severity: "MEDIUM",
    reason: "Truck traffic, poor lighting",
    state: "Madhya Pradesh"
  },
  
  // Uttar Pradesh
  {
    name: "Agra-Lucknow Expressway",
    coordinates: { lat: 26.8467, lng: 80.9462 },
    radius: 7,
    accidentCount: 44,
    severity: "HIGH",
    reason: "Overspeeding, animal crossings",
    state: "Uttar Pradesh"
  }
];

// Helper function to check if location is in accident hotspot
export function isInAccidentZone(lat: number, lng: number): AccidentHotspot | null {
  for (const hotspot of ACCIDENT_HOTSPOTS) {
    const distance = calculateDistance(lat, lng, hotspot.coordinates.lat, hotspot.coordinates.lng);
    if (distance <= hotspot.radius) {
      return hotspot;
    }
  }
  return null;
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}