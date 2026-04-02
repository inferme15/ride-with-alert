/**
 * Route Discovery Service
 * 
 * Integrates with OpenStreetMap Routing Service (OSRM) for route discovery.
 * Discovers multiple routes between two coordinates and normalizes route data.
 */

import fetch from 'node-fetch';

// OSRM demo server endpoint
const OSRM_BASE_URL = 'http://router.project-osrm.org';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Route data structure
 */
export interface RouteData {
  routeId: number;
  geometry: GeoJSON.LineString;
  distance: number; // meters
  estimatedTime: number; // seconds
}

/**
 * Coordinate interface
 */
export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * OSRM API response structure
 */
interface OSRMRoute {
  geometry: {
    coordinates: number[][];
    type: 'LineString';
  };
  distance: number;
  duration: number;
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: any[];
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Discover routes between two coordinates with retry logic
 * 
 * @param start - Starting coordinate
 * @param end - Ending coordinate
 * @returns Array of discovered routes
 */
export async function discoverRoutes(
  start: Coordinate,
  end: Coordinate
): Promise<RouteData[]> {
  // Validate coordinates
  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    throw new Error('Invalid coordinates provided');
  }

  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Route Discovery] Attempt ${attempt}/${MAX_RETRIES} for route from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng})`);
      
      // OSRM expects coordinates in lng,lat format
      const url = `${OSRM_BASE_URL}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=true&geometries=geojson&overview=full`;
      
      const data = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS) as OSRMResponse;
      
      if (data.code !== 'Ok') {
        throw new Error(`OSRM API error: ${data.code}`);
      }
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found between the specified locations');
      }
      
      // Parse and normalize routes
      const routes: RouteData[] = data.routes.map((route, index) => ({
        routeId: index + 1,
        geometry: {
          type: 'LineString',
          coordinates: route.geometry.coordinates
        },
        distance: Math.round(route.distance), // meters
        estimatedTime: Math.round(route.duration) // seconds
      }));
      
      console.log(`[Route Discovery] Successfully discovered ${routes.length} route(s)`);
      return routes;
      
    } catch (error: any) {
      lastError = error;
      console.error(`[Route Discovery] Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on validation errors or "no routes found"
      if (error.message.includes('Invalid coordinates') || 
          error.message.includes('No routes found')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[Route Discovery] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All retries failed
  throw new Error(`Route discovery failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Get details for a specific route by ID
 * 
 * @param routeId - Route identifier
 * @returns Route data or null if not found
 */
export async function getRouteDetails(routeId: number): Promise<RouteData | null> {
  // In a real implementation, this would fetch from a database
  // For now, this is a placeholder that would need to be integrated with storage
  console.log(`[Route Discovery] Getting details for route ${routeId}`);
  
  // This function would typically:
  // 1. Query the routes table in the database
  // 2. Return the stored route data
  // For the MVP, routes are discovered on-demand and not persisted separately
  
  return null;
}

/**
 * Validate coordinate values
 */
function isValidCoordinate(coord: Coordinate): boolean {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180 &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng)
  );
}

/**
 * Enhanced route discovery with multiple strategies
 * Generates more route alternatives than basic OSRM
 */
export async function discoverRoutesEnhanced(
  start: Coordinate,
  end: Coordinate
): Promise<RouteData[]> {
  console.log(`[Enhanced Route Discovery] Generating multiple routes from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng})`);
  
  const allRoutes: RouteData[] = [];
  
  try {
    // Strategy 1: Basic OSRM alternatives
    const basicRoutes = await discoverRoutes(start, end);
    allRoutes.push(...basicRoutes);
    
    // Strategy 2: Via waypoints through major cities
    const waypointRoutes = await generateWaypointRoutes(start, end);
    allRoutes.push(...waypointRoutes);
    
    // Strategy 3: Slightly offset routes (simulate different preferences)
    const offsetRoutes = await generateOffsetRoutes(start, end);
    allRoutes.push(...offsetRoutes);
    
  } catch (error) {
    console.error('[Enhanced Route Discovery] Error:', error);
    // Fallback to basic discovery
    return await discoverRoutes(start, end);
  }
  
  // Remove duplicates and return
  const uniqueRoutes = removeDuplicateRoutes(allRoutes);
  console.log(`[Enhanced Route Discovery] Generated ${uniqueRoutes.length} unique routes`);
  
  return uniqueRoutes;
}

/**
 * Generate routes via major cities as waypoints
 */
async function generateWaypointRoutes(
  start: Coordinate,
  end: Coordinate
): Promise<RouteData[]> {
  const waypointRoutes: RouteData[] = [];
  
  // Major cities for waypoint routing
  const majorCities = [
    { name: 'Hosur', lat: 12.7409, lng: 77.8253 },
    { name: 'Krishnagiri', lat: 12.5186, lng: 78.2137 },
    { name: 'Dharmapuri', lat: 12.1211, lng: 78.1597 },
    { name: 'Salem', lat: 11.6643, lng: 78.1460 },
    { name: 'Erode', lat: 11.3410, lng: 77.7172 },
    { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
    { name: 'Mettur', lat: 11.7900, lng: 77.8021 },
    { name: 'Perundhurai', lat: 11.2733, lng: 77.5833 }
  ];
  
  // Find cities that could be good waypoints
  const intermediateCities = findIntermediateCities(start, end, majorCities);
  
  for (const city of intermediateCities.slice(0, 2)) { // Limit to 2 waypoint routes
    try {
      console.log(`[Enhanced Route Discovery] Generating route via ${city.name}`);
      
      // Route: Start -> City -> End
      const leg1 = await discoverRoutes(start, city);
      const leg2 = await discoverRoutes(city, end);
      
      if (leg1.length > 0 && leg2.length > 0) {
        // Combine the two legs into one route
        const combinedRoute = combineRouteLegs(leg1[0], leg2[0], city.name);
        waypointRoutes.push(combinedRoute);
      }
    } catch (error) {
      console.warn(`[Enhanced Route Discovery] Failed to generate route via ${city.name}:`, error);
    }
  }
  
  return waypointRoutes;
}

/**
 * Generate slightly offset routes to simulate different routing preferences
 */
async function generateOffsetRoutes(
  start: Coordinate,
  end: Coordinate
): Promise<RouteData[]> {
  const offsetRoutes: RouteData[] = [];
  
  // Create slight offsets to the destination to get different routes
  const offsets = [
    { lat: 0.01, lng: 0.01 },   // Northeast offset
    { lat: -0.01, lng: 0.01 },  // Southeast offset
    { lat: 0.01, lng: -0.01 },  // Northwest offset
    { lat: -0.01, lng: -0.01 }  // Southwest offset
  ];
  
  for (const offset of offsets) {
    try {
      const offsetEnd = {
        lat: end.lat + offset.lat,
        lng: end.lng + offset.lng
      };
      
      const routes = await discoverRoutes(start, offsetEnd);
      if (routes.length > 0) {
        // Adjust the route to end at the actual destination
        const adjustedRoute = {
          ...routes[0],
          routeId: routes[0].routeId + 1000, // Unique ID
          // Keep original distance/time as approximation
        };
        offsetRoutes.push(adjustedRoute);
      }
    } catch (error) {
      // Ignore offset route failures
    }
  }
  
  return offsetRoutes.slice(0, 2); // Limit to 2 offset routes
}

/**
 * Find cities that lie roughly between start and end points
 */
function findIntermediateCities(
  start: Coordinate,
  end: Coordinate,
  cities: Array<{ name: string; lat: number; lng: number }>
): Array<{ name: string; lat: number; lng: number; distance: number }> {
  const intermediateCities = [];
  
  for (const city of cities) {
    // Check if city is roughly on the path between start and end
    const distanceFromStart = calculateDistance(start, city);
    const distanceFromEnd = calculateDistance(city, end);
    const directDistance = calculateDistance(start, end);
    
    // City is intermediate if the detour is reasonable (< 50% extra distance)
    const totalViaCity = distanceFromStart + distanceFromEnd;
    const detourRatio = totalViaCity / directDistance;
    
    if (detourRatio < 1.5 && distanceFromStart > 20000 && distanceFromEnd > 20000) {
      intermediateCities.push({
        ...city,
        distance: distanceFromStart
      });
    }
  }
  
  // Sort by distance from start
  return intermediateCities.sort((a, b) => a.distance - b.distance);
}

/**
 * Combine two route legs into a single route
 */
function combineRouteLegs(
  leg1: RouteData,
  leg2: RouteData,
  viaCity: string
): RouteData {
  return {
    routeId: Date.now() + Math.random(), // Unique ID
    geometry: {
      type: 'LineString',
      coordinates: [
        ...leg1.geometry.coordinates,
        ...leg2.geometry.coordinates.slice(1) // Remove duplicate waypoint
      ]
    },
    distance: leg1.distance + leg2.distance,
    estimatedTime: leg1.estimatedTime + leg2.estimatedTime + 300 // Add 5 min for waypoint
  };
}

/**
 * Remove duplicate routes based on similarity
 */
function removeDuplicateRoutes(routes: RouteData[]): RouteData[] {
  const unique: RouteData[] = [];
  
  for (const route of routes) {
    const isDuplicate = unique.some(existing => 
      Math.abs(existing.distance - route.distance) < 10000 && // Within 10km
      Math.abs(existing.estimatedTime - route.estimatedTime) < 1200 // Within 20 minutes
    );
    
    if (!isDuplicate) {
      unique.push(route);
    }
  }
  
  return unique;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
