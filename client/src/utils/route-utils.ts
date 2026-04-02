// Route utilities for demo and visualization

export interface RoutePoint {
  lat: number;
  lng: number;
  address?: string;
}

// Facility emoji icons
export const FACILITY_ICONS = {
  hospital: '🏥',
  police: '👮',
  fuel_station: '⛽',
  service_center: '🔧',
  mechanic: '🛠️'
} as const;

// Demo routes for presentation
export const DEMO_ROUTES = {
  coimbatore_to_chennai: [
    { lat: 11.0168, lng: 76.9558, address: 'Coimbatore Start' },
    { lat: 11.3410, lng: 77.7172, address: 'Salem (High Risk Zone)' },
    { lat: 12.2958, lng: 78.1594, address: 'Krishnagiri' },
    { lat: 12.9165, lng: 79.1325, address: 'Vellore' },
    { lat: 13.0827, lng: 80.2707, address: 'Chennai End' }
  ],
  
  mumbai_to_pune: [
    { lat: 19.0760, lng: 72.8777, address: 'Mumbai Start' },
    { lat: 18.9894, lng: 73.1175, address: 'Lonavala (Accident Zone)' },
    { lat: 18.5204, lng: 73.8567, address: 'Pune End' }
  ],
  
  delhi_to_jaipur: [
    { lat: 28.7041, lng: 77.1025, address: 'Delhi Start' },
    { lat: 28.4595, lng: 77.0266, address: 'Gurgaon (High Risk)' },
    { lat: 27.5706, lng: 76.6413, address: 'Alwar' },
    { lat: 26.9124, lng: 75.7873, address: 'Jaipur End' }
  ],
  
  bangalore_to_mysore: [
    { lat: 12.9716, lng: 77.5946, address: 'Bangalore Start' },
    { lat: 12.5789, lng: 76.9123, address: 'Ramanagara (Accident Zone)' },
    { lat: 12.3051, lng: 76.6551, address: 'Mysore End' }
  ]
};

// Route simulator class for demo
export class RouteSimulator {
  private route: RoutePoint[];
  private currentIndex: number = 0;
  private intervalId: any;
  private speed: number;
  
  constructor(route: RoutePoint[], speed: number = 2000) {
    this.route = route;
    this.speed = speed;
  }
  
  start(onLocationUpdate: (location: RoutePoint, progress: number) => void) {
    this.currentIndex = 0;
    this.intervalId = setInterval(() => {
      if (this.currentIndex < this.route.length) {
        const progress = (this.currentIndex / (this.route.length - 1)) * 100;
        onLocationUpdate(this.route[this.currentIndex], progress);
        this.currentIndex++;
      } else {
        this.stop();
      }
    }, this.speed);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  
  pause() {
    this.stop();
  }
  
  resume(onLocationUpdate: (location: RoutePoint, progress: number) => void) {
    this.start(onLocationUpdate);
  }
  
  reset() {
    this.stop();
    this.currentIndex = 0;
  }
}

// Generate route points between two locations
export function generateRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  numPoints: number = 10
): RoutePoint[] {
  const points: RoutePoint[] = [start];
  
  const latDiff = end.lat - start.lat;
  const lngDiff = end.lng - start.lng;

  for (let i = 1; i < numPoints - 1; i++) {
    const ratio = i / (numPoints - 1);
    points.push({
      lat: start.lat + (latDiff * ratio),
      lng: start.lng + (lngDiff * ratio)
    });
  }

  points.push(end);
  return points;
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Estimate travel time based on distance
export function estimateTravelTime(distanceKm: number, avgSpeedKmh: number = 60): number {
  return (distanceKm / avgSpeedKmh) * 60; // Returns minutes
}
