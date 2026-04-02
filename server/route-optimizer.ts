/**
 * Enhanced Route Optimizer Service
 * 
 * Generates multiple route alternatives using different strategies:
 * 1. OSRM alternatives (fastest, shortest, balanced)
 * 2. Via waypoints through major cities
 * 3. Different routing profiles (avoiding highways, preferring highways)
 */

import { discoverRoutes, type RouteData, type Coordinate } from './route-discovery';
import { analyzeRoutes, type AnalyzedRoute } from './route-analysis';

/**
 * Route generation strategies
 */
enum RouteStrategy {
  FASTEST = 'fastest',
  SHORTEST = 'shortest', 
  SAFEST = 'safest',
  SCENIC = 'scenic',
  HIGHWAY_PREFERRED = 'highway_preferred',
  HIGHWAY_AVOIDED = 'highway_avoided'
}

/**
 * Major cities in South India for waypoint routing
 */
const MAJOR_CITIES = {
  // Karnataka
  'Bengaluru': { lat: 12.9716, lng: 77.5946 },
  'Mysuru': { lat: 12.2958, lng: 76.6394 },
  'Hubli': { lat: 15.3647, lng: 75.1240 },
  'Mangaluru': { lat: 12.9141, lng: 74.8560 },
  
  // Tamil Nadu
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Coimbatore': { lat: 11.0168, lng: 76.9558 },
  'Madurai': { lat: 9.9252, lng: 78.1198 },
  'Salem': { lat: 11.6643, lng: 78.1460 },
  'Tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
  'Tirunelveli': { lat: 8.7139, lng: 77.7567 },
  'Vellore': { lat: 12.9165, lng: 79.1325 },
  'Erode': { lat: 11.3410, lng: 77.7172 },
  'Tirupur': { lat: 11.1085, lng: 77.3411 },
  'Dindigul': { lat: 10.3673, lng: 77.9803 },
  'Thanjavur': { lat: 10.7870, lng: 79.1378 },
  
  // Andhra Pradesh
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Vijayawada': { lat: 16.5062, lng: 80.6480 },
  'Visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'Guntur': { lat: 16.3067, lng: 80.4365 },
  'Nellore': { lat: 14.4426, lng: 79.9865 },
  'Kurnool': { lat: 15.8281, lng: 78.0373 },
  'Rajahmundry': { lat: 17.0005, lng: 81.8040 },
  'Kadapa': { lat: 14.4673, lng: 78.8242 },
  'Anantapur': { lat: 14.6819, lng: 77.6006 },
  'Eluru': { lat: 16.7107, lng: 81.0953 },
  
  // Kerala
  'Kochi': { lat: 9.9312, lng: 76.2673 },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'Kozhikode': { lat: 11.2588, lng: 75.7804 },
  'Thrissur': { lat: 10.5276, lng: 76.2144 },
  'Kollam': { lat: 8.8932, lng: 76.6141 },
  'Palakkad': { lat: 10.7867, lng: 76.6548 },
  'Alappuzha': { lat: 9.4981, lng: 76.3388 },
  'Kannur': { lat: 11.8745, lng: 75.3704 },
  'Kottayam': { lat: 9.5916, lng: 76.5222 },
  'Malappuram': { lat: 11.0510, lng: 76.0711 },
  
  // Telangana
  'Warangal': { lat: 17.9689, lng: 79.5941 },
  'Nizamabad': { lat: 18.6725, lng: 78.0941 },
  'Khammam': { lat: 17.2473, lng: 80.1514 },
  'Karimnagar': { lat: 18.4386, lng: 79.1288 },
  'Mahbubnagar': { lat: 16.7393, lng: 77.9993 },
  'Nalgonda': { lat: 17.0568, lng: 79.2663 },
  'Adilabad': { lat: 19.6669, lng: 78.5316 },
  'Suryapet': { lat: 17.1404, lng: 79.6190 },
  'Miryalaguda': { lat: 16.8747, lng: 79.5664 },
  'Jagtial': { lat: 18.7904, lng: 78.9113 },
  
  // Border cities for inter-state routes
  'Hosur': { lat: 12.7409, lng: 77.8253 },
  'Krishnagiri': { lat: 12.5186, lng: 78.2137 },
  'Dharmapuri': { lat: 12.1211, lng: 78.1597 },
  'Shoolagiri': { lat: 12.6481, lng: 77.8986 },
  'Mettur': { lat: 11.7900, lng: 77.8021 },
  'Perambalur': { lat: 11.2342, lng: 78.8809 },
  'Ariyalur': { lat: 11.1401, lng: 79.0782 },
  'Perundhurai': { lat: 11.2733, lng: 77.5833 }
};

/**
 * Generate multiple route alternatives using different strategies
 */
export class RouteOptimizer {
  
  /**
   * Generate multiple routes with comprehensive alternatives
   */
  static async generateRoutes(
    start: Coordinate & { address?: string },
    end: Coordinate & { address?: string },
    vehicleType: string = 'Car'
  ): Promise<{
    routes: AnalyzedRoute[];
    safestRoute: AnalyzedRoute;
    fastestRoute: AnalyzedRoute;
    shortestRoute: AnalyzedRoute;
    recommendedRoute: AnalyzedRoute;
  }> {
    console.log(`[Route Optimizer] Generating multiple routes from ${start.address || `${start.lat}, ${start.lng}`} to ${end.address || `${end.lat}, ${end.lng}`}`);
    
    const allRoutes: RouteData[] = [];
    
    try {
      // Strategy 1: Direct OSRM alternatives
      console.log('[Route Optimizer] Strategy 1: Direct OSRM alternatives');
      const directRoutes = await discoverRoutes(start, end);
      allRoutes.push(...directRoutes);
      
      // Strategy 2: Via major cities (waypoint routing)
      console.log('[Route Optimizer] Strategy 2: Waypoint routing via major cities');
      const waypointRoutes = await this.generateWaypointRoutes(start, end);
      allRoutes.push(...waypointRoutes);
      
      // Strategy 3: Alternative routing profiles
      console.log('[Route Optimizer] Strategy 3: Alternative routing profiles');
      const profileRoutes = await this.generateProfileRoutes(start, end);
      allRoutes.push(...profileRoutes);
      
    } catch (error) {
      console.error('[Route Optimizer] Error generating routes:', error);
      // Fallback to basic route discovery
      const fallbackRoutes = await discoverRoutes(start, end);
      allRoutes.push(...fallbackRoutes);
    }
    
    // Remove duplicates and analyze all routes
    const uniqueRoutes = this.removeDuplicateRoutes(allRoutes);
    console.log(`[Route Optimizer] Generated ${uniqueRoutes.length} unique routes`);
    
    // Analyze all routes for safety
    const analyzedRoutes = await analyzeRoutes(
      start,
      end,
      Date.now(),
      start.address,
      end.address
    );
    
    // Find best routes by different criteria
    const safestRoute = this.findSafestRoute(analyzedRoutes);
    const fastestRoute = this.findFastestRoute(analyzedRoutes);
    const shortestRoute = this.findShortestRoute(analyzedRoutes);
    const recommendedRoute = this.findRecommendedRoute(analyzedRoutes);
    
    return {
      routes: analyzedRoutes,
      safestRoute,
      fastestRoute,
      shortestRoute,
      recommendedRoute
    };
  }
  
  /**
   * Generate routes via major cities as waypoints
   */
  private static async generateWaypointRoutes(
    start: Coordinate,
    end: Coordinate
  ): Promise<RouteData[]> {
    const waypointRoutes: RouteData[] = [];
    
    // Find cities between start and end
    const intermediateCities = this.findIntermediateCities(start, end);
    
    for (const city of intermediateCities.slice(0, 3)) { // Limit to 3 waypoint routes
      try {
        console.log(`[Route Optimizer] Generating route via ${city.name}`);
        
        // Route: Start -> City -> End
        const leg1 = await discoverRoutes(start, city.coord);
        const leg2 = await discoverRoutes(city.coord, end);
        
        if (leg1.length > 0 && leg2.length > 0) {
          // Combine the two legs into one route
          const combinedRoute = this.combineRouteLegs(leg1[0], leg2[0], city.name);
          waypointRoutes.push(combinedRoute);
        }
      } catch (error) {
        console.warn(`[Route Optimizer] Failed to generate route via ${city.name}:`, error);
      }
    }
    
    return waypointRoutes;
  }
  
  /**
   * Generate routes with different routing profiles
   */
  private static async generateProfileRoutes(
    start: Coordinate,
    end: Coordinate
  ): Promise<RouteData[]> {
    // For now, return empty array as OSRM public server has limited profile options
    // In production, you would use different routing services or profiles
    return [];
  }
  
  /**
   * Find cities that lie roughly between start and end points
   */
  private static findIntermediateCities(
    start: Coordinate,
    end: Coordinate
  ): Array<{ name: string; coord: Coordinate; distance: number }> {
    const cities = [];
    
    for (const [name, coord] of Object.entries(MAJOR_CITIES)) {
      // Check if city is roughly on the path between start and end
      const distanceFromStart = this.calculateDistance(start, coord);
      const distanceFromEnd = this.calculateDistance(coord, end);
      const directDistance = this.calculateDistance(start, end);
      
      // City is intermediate if the detour is reasonable (< 50% extra distance)
      const totalViaCity = distanceFromStart + distanceFromEnd;
      const detourRatio = totalViaCity / directDistance;
      
      if (detourRatio < 1.5 && distanceFromStart > 50000 && distanceFromEnd > 50000) {
        cities.push({
          name,
          coord,
          distance: distanceFromStart
        });
      }
    }
    
    // Sort by distance from start
    return cities.sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * Combine two route legs into a single route
   */
  private static combineRouteLegs(
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
  private static removeDuplicateRoutes(routes: RouteData[]): RouteData[] {
    const unique: RouteData[] = [];
    
    for (const route of routes) {
      const isDuplicate = unique.some(existing => 
        Math.abs(existing.distance - route.distance) < 5000 && // Within 5km
        Math.abs(existing.estimatedTime - route.estimatedTime) < 600 // Within 10 minutes
      );
      
      if (!isDuplicate) {
        unique.push(route);
      }
    }
    
    return unique;
  }
  
  /**
   * Find the safest route (highest safety score)
   */
  private static findSafestRoute(routes: AnalyzedRoute[]): AnalyzedRoute {
    return routes.reduce((safest, current) => 
      current.safetyMetrics.overallSafetyScore > safest.safetyMetrics.overallSafetyScore 
        ? current : safest
    );
  }
  
  /**
   * Find the fastest route (shortest time)
   */
  private static findFastestRoute(routes: AnalyzedRoute[]): AnalyzedRoute {
    return routes.reduce((fastest, current) => 
      current.estimatedTime < fastest.estimatedTime ? current : fastest
    );
  }
  
  /**
   * Find the shortest route (shortest distance)
   */
  private static findShortestRoute(routes: AnalyzedRoute[]): AnalyzedRoute {
    return routes.reduce((shortest, current) => 
      current.distance < shortest.distance ? current : shortest
    );
  }
  
  /**
   * Find the recommended route (balanced score)
   */
  private static findRecommendedRoute(routes: AnalyzedRoute[]): AnalyzedRoute {
    // Weighted scoring: 40% safety, 30% time, 20% distance, 10% danger zones
    return routes.reduce((recommended, current) => {
      const currentScore = this.calculateRecommendationScore(current);
      const recommendedScore = this.calculateRecommendationScore(recommended);
      return currentScore > recommendedScore ? current : recommended;
    });
  }
  
  /**
   * Calculate recommendation score for a route
   */
  private static calculateRecommendationScore(route: AnalyzedRoute): number {
    const safetyScore = route.safetyMetrics.overallSafetyScore / 100; // 0-1
    const timeScore = Math.max(0, 1 - (route.estimatedTime / 14400)); // Normalize to 4 hours max
    const distanceScore = Math.max(0, 1 - (route.distance / 500000)); // Normalize to 500km max
    const dangerZoneScore = Math.max(0, 1 - (route.dangerZones.length / 10)); // Normalize to 10 zones max
    
    return (safetyScore * 0.4) + (timeScore * 0.3) + (distanceScore * 0.2) + (dangerZoneScore * 0.1);
  }
  
  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
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
  
  /**
   * Check if vehicle is approaching a danger zone
   */
  static checkDangerZoneProximity(
    currentLat: number,
    currentLng: number,
    dangerZones: any[],
    alertRadius: number = 5000 // 5km
  ): any | null {
    for (const zone of dangerZones) {
      const distance = this.calculateDistance(
        { lat: currentLat, lng: currentLng },
        { lat: zone.latitude, lng: zone.longitude }
      );
      
      if (distance <= alertRadius) {
        return {
          ...zone,
          distanceToZone: Math.round(distance),
          alertType: distance <= 1000 ? 'IMMEDIATE' : 'APPROACHING'
        };
      }
    }
    
    return null;
  }
}