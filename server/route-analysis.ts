/**
 * Route Analysis Service
 * 
 * Coordinates route discovery and safety analysis to provide comprehensive
 * route comparison with safety metrics and danger zone identification.
 */

import { discoverRoutes, discoverRoutesEnhanced, type RouteData, type Coordinate } from './route-discovery';
import { 
  calculateSafetyMetrics, 
  detectDangerZones,
  type SafetyMetricsResult,
  type DangerZone 
} from './ml-safety-engine';
import { extractCitiesAlongRoute, generateRouteDescription, generateRouteMapUrl, type CityOnRoute } from './route-cities';

/**
 * Analyzed route with complete safety information
 */
export interface AnalyzedRoute {
  routeId: string;
  geometry: GeoJSON.LineString;
  distance: number; // meters
  estimatedTime: number; // seconds
  safetyMetrics: SafetyMetricsResult;
  dangerZones: DangerZone[];
  isRecommended: boolean;
  citiesOnRoute: CityOnRoute[];
  routeDescription: string;
  mapUrl: string;
}

/**
 * Analyze routes between two coordinates
 * 
 * Discovers all available routes and performs comprehensive safety analysis
 * on each route, including danger zone detection and safety scoring.
 * 
 * @param start - Starting coordinate
 * @param end - Ending coordinate
 * @param timestamp - Current timestamp for time-based risk calculation
 * @returns Array of analyzed routes with safety metrics
 */
export async function analyzeRoutes(
  start: Coordinate,
  end: Coordinate,
  timestamp: number,
  startLocationName?: string,
  endLocationName?: string
): Promise<AnalyzedRoute[]> {
  console.log(`[Route Analysis] Starting analysis from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng})`);
  
  // Step 1: Discover all available routes with enhanced discovery
  let discoveredRoutes;
  try {
    // Enhanced route discovery with multiple strategies
    discoveredRoutes = await discoverRoutesEnhanced(start, end);
    console.log(`[Route Analysis] Enhanced discovery found ${discoveredRoutes.length} route(s)`);
  } catch (error) {
    console.warn(`[Route Analysis] Enhanced discovery failed, falling back to basic discovery:`, error);
    // Fallback to basic route discovery
    discoveredRoutes = await discoverRoutes(start, end);
    console.log(`[Route Analysis] Basic discovery found ${discoveredRoutes.length} route(s)`);
  }
  
  if (discoveredRoutes.length === 0) {
    throw new Error('No routes found between the specified locations');
  }
  
  // Step 2: Analyze each route for safety
  const analyzedRoutes: AnalyzedRoute[] = [];
  
  for (const route of discoveredRoutes) {
    console.log(`[Route Analysis] Analyzing route ${route.routeId}...`);
    
    // Calculate safety metrics
    const safetyMetrics = await calculateSafetyMetrics(route.geometry, timestamp);
    
    // Detect danger zones along the route
    const dangerZones = await detectDangerZones(route.geometry);
    
    // Extract cities along the route
    console.log(`[Route Analysis] Extracting cities for route ${route.routeId}...`);
    const citiesOnRoute = await extractCitiesAlongRoute(route.geometry, 5);
    
    // Generate route description
    const routeDescription = generateRouteDescription(
      startLocationName || 'Start',
      endLocationName || 'Destination',
      citiesOnRoute,
      route.distance,
      route.estimatedTime
    );
    
    // Generate map URL
    const mapUrl = generateRouteMapUrl(route.geometry, dangerZones, false);
    
    // Create analyzed route object
    const analyzedRoute: AnalyzedRoute = {
      routeId: `route-${route.routeId}`,
      geometry: route.geometry,
      distance: route.distance,
      estimatedTime: route.estimatedTime,
      safetyMetrics,
      dangerZones,
      isRecommended: false, // Will be set after comparison
      citiesOnRoute,
      routeDescription,
      mapUrl
    };
    
    analyzedRoutes.push(analyzedRoute);
    
    console.log(`[Route Analysis] Route ${route.routeId} - Safety Score: ${safetyMetrics.overallSafetyScore}/100, Cities: ${citiesOnRoute.length}, Danger Zones: ${dangerZones.length}`);
  }
  
  // Step 3: Identify recommended route (highest safety score)
  const recommendedRoute = getRecommendedRoute(analyzedRoutes);
  recommendedRoute.isRecommended = true;
  
  // Update map URL for recommended route
  recommendedRoute.mapUrl = generateRouteMapUrl(recommendedRoute.geometry, recommendedRoute.dangerZones, true);
  
  console.log(`[Route Analysis] Recommended route: ${recommendedRoute.routeId} with safety score ${recommendedRoute.safetyMetrics.overallSafetyScore}/100`);
  
  return analyzedRoutes;
}

/**
 * Get the recommended route from a list of analyzed routes
 * 
 * Selects the route with the highest overall safety score.
 * In case of a tie, prefers the route with shorter distance.
 * 
 * @param routes - Array of analyzed routes
 * @returns The recommended route
 */
export function getRecommendedRoute(routes: AnalyzedRoute[]): AnalyzedRoute {
  if (routes.length === 0) {
    throw new Error('Cannot determine recommended route from empty array');
  }
  
  if (routes.length === 1) {
    return routes[0];
  }
  
  // Sort by safety score (descending), then by distance (ascending)
  const sortedRoutes = [...routes].sort((a, b) => {
    const scoreDiff = b.safetyMetrics.overallSafetyScore - a.safetyMetrics.overallSafetyScore;
    
    // If safety scores are equal, prefer shorter route
    if (Math.abs(scoreDiff) < 0.01) {
      return a.distance - b.distance;
    }
    
    return scoreDiff;
  });
  
  return sortedRoutes[0];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}