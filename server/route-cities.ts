/**
 * Route Cities Service
 * 
 * Extracts city names along a route and generates map visualizations
 */

import fetch from 'node-fetch';

export interface CityOnRoute {
  name: string;
  state?: string;
  lat: number;
  lng: number;
  distanceFromStart: number; // km
}

/**
 * Extract major cities along a route using reverse geocoding
 * Samples points along the route and identifies cities
 */
export async function extractCitiesAlongRoute(
  routeGeometry: GeoJSON.LineString,
  maxCities: number = 5
): Promise<CityOnRoute[]> {
  const coordinates = routeGeometry.coordinates;
  const cities: CityOnRoute[] = [];
  const seenCities = new Set<string>();
  
  // Sample points along the route (every ~50km or so)
  const totalPoints = coordinates.length;
  const sampleInterval = Math.max(1, Math.floor(totalPoints / (maxCities + 2)));
  
  console.log(`[Route Cities] Sampling ${Math.floor(totalPoints / sampleInterval)} points from ${totalPoints} total points`);
  
  let cumulativeDistance = 0;
  
  for (let i = 0; i < totalPoints; i += sampleInterval) {
    if (cities.length >= maxCities) break;
    
    const [lng, lat] = coordinates[i];
    
    // Calculate distance from start
    if (i > 0) {
      const [prevLng, prevLat] = coordinates[i - sampleInterval] || coordinates[i - 1];
      cumulativeDistance += calculateDistance(
        { lat: prevLat, lng: prevLng },
        { lat, lng }
      ) / 1000; // Convert to km
    }
    
    try {
      // Reverse geocode to get city name
      const cityName = await reverseGeocode(lat, lng);
      
      if (cityName && !seenCities.has(cityName)) {
        cities.push({
          name: cityName,
          lat,
          lng,
          distanceFromStart: Math.round(cumulativeDistance)
        });
        seenCities.add(cityName);
        console.log(`[Route Cities] Found city: ${cityName} at ${cumulativeDistance.toFixed(1)}km`);
      }
      
      // Small delay to avoid rate limiting
      await sleep(200);
    } catch (error) {
      console.error(`[Route Cities] Failed to geocode point (${lat}, ${lng}):`, error);
    }
  }
  
  return cities;
}

/**
 * Reverse geocode coordinates to city name
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RideWithAlert/1.0'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data: any = await response.json();
    
    // Extract city/town/village name
    const address = data.address || {};
    const cityName = address.city || 
                    address.town || 
                    address.village || 
                    address.municipality ||
                    address.county ||
                    address.state_district;
    
    return cityName || null;
  } catch (error) {
    console.error('[Route Cities] Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Generate a static map URL showing the route
 * Uses OpenStreetMap Static Map API or similar service
 */
export function generateRouteMapUrl(
  routeGeometry: GeoJSON.LineString,
  dangerZones: Array<{ location: { lat: number; lng: number }; riskLevel: string }>,
  isRecommended: boolean = false
): string {
  // For MVP, we'll generate a Google Maps-style URL that shows the route
  // In production, you might use a proper static map service
  
  const coordinates = routeGeometry.coordinates;
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  
  // Create a simple map URL (this will open in Google Maps)
  const startStr = `${start[1]},${start[0]}`;
  const endStr = `${end[1]},${end[0]}`;
  
  // Google Maps directions URL
  const mapUrl = `https://www.google.com/maps/dir/${startStr}/${endStr}`;
  
  return mapUrl;
}

/**
 * Generate a detailed route description with city names
 */
export function generateRouteDescription(
  startLocation: string,
  endLocation: string,
  cities: CityOnRoute[],
  distance: number,
  estimatedTime: number
): string {
  const distanceKm = (distance / 1000).toFixed(1);
  const timeHours = Math.floor(estimatedTime / 3600);
  const timeMinutes = Math.round((estimatedTime % 3600) / 60);
  
  let description = `📍 Route: ${startLocation} → ${endLocation}\n`;
  description += `📏 Distance: ${distanceKm} km\n`;
  description += `⏱️ Estimated Time: ${timeHours}h ${timeMinutes}min\n\n`;
  
  if (cities.length > 0) {
    description += `🛣️ Route via:\n`;
    cities.forEach((city, index) => {
      description += `  ${index + 1}. ${city.name}`;
      if (city.distanceFromStart > 0) {
        description += ` (${city.distanceFromStart}km)`;
      }
      description += `\n`;
    });
  }
  
  return description;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
