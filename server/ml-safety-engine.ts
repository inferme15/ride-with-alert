/**
 * Safety ML Engine
 * 
 * Calculates safety scores for routes using rule-based scoring with sample data.
 * For MVP, uses simplified algorithms based on:
 * - Accident frequency (proximity to known accident hotspots)
 * - Crime zones (sample high-crime area data)
 * - Road conditions (default scores based on road type)
 * - Time risk (higher risk at night and during rush hours)
 */

import { ACCIDENT_HOTSPOTS } from './accident-hotspots';

/**
 * Safety metrics result structure
 */
export interface SafetyMetricsResult {
  accidentFrequencyScore: number; // 0-100
  crimeZoneWeight: number; // 0-100
  roadConditionScore: number; // 0-100
  timeRiskFactor: number; // 0-100
  overallSafetyScore: number; // 0-100
}

/**
 * Danger zone structure
 */
export interface DangerZone {
  zoneId: string;
  location: { lat: number; lng: number };
  radius: number; // meters
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskType: 'accident_prone' | 'high_crime' | 'poor_road' | 'combined';
  accidentCount: number;
  crimeIncidents: number;
  roadConditionIssues: string[];
  alertThresholdDistance: number; // meters
  description: string;
}

/**
 * Sample high-crime zones in India (for MVP)
 */
const HIGH_CRIME_ZONES = [
  { lat: 28.6139, lng: 77.2090, radius: 5000, crimeRate: 85, area: 'Delhi Central' },
  { lat: 19.0760, lng: 72.8777, radius: 4000, crimeRate: 78, area: 'Mumbai Downtown' },
  { lat: 12.9716, lng: 77.5946, radius: 3500, crimeRate: 65, area: 'Bangalore City' },
  { lat: 22.5726, lng: 88.3639, radius: 4500, crimeRate: 72, area: 'Kolkata Central' },
  { lat: 13.0827, lng: 80.2707, radius: 3000, crimeRate: 60, area: 'Chennai City' },
];

/**
 * Calculate safety metrics for a route
 * 
 * @param routeGeometry - GeoJSON LineString representing the route
 * @param timestamp - Current timestamp in milliseconds
 * @returns Safety metrics result
 */
export async function calculateSafetyMetrics(
  routeGeometry: GeoJSON.LineString,
  timestamp: number
): Promise<SafetyMetricsResult> {
  // Extract route points
  const routePoints = routeGeometry.coordinates.map(coord => ({
    lat: coord[1],
    lng: coord[0]
  }));

  // Calculate individual metrics
  const accidentFrequencyScore = calculateAccidentFrequencyScore(routePoints);
  const crimeZoneWeight = calculateCrimeZoneWeight(routePoints);
  const roadConditionScore = calculateRoadConditionScore(routePoints);
  const timeRiskFactor = calculateTimeRiskFactor(timestamp);

  // Calculate overall safety score (weighted average)
  const overallSafetyScore = calculateOverallSafetyScore({
    accidentFrequencyScore,
    crimeZoneWeight,
    roadConditionScore,
    timeRiskFactor
  });

  return {
    accidentFrequencyScore,
    crimeZoneWeight,
    roadConditionScore,
    timeRiskFactor,
    overallSafetyScore
  };
}

/**
 * Detect danger zones along a route
 * 
 * @param routeGeometry - GeoJSON LineString representing the route
 * @returns Array of danger zones
 */
export async function detectDangerZones(
  routeGeometry: GeoJSON.LineString
): Promise<DangerZone[]> {
  const dangerZones: DangerZone[] = [];
  const routePoints = routeGeometry.coordinates.map(coord => ({
    lat: coord[1],
    lng: coord[0]
  }));

  // Check for accident-prone zones
  for (const hotspot of ACCIDENT_HOTSPOTS) {
    const isNearRoute = routePoints.some(point => {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        hotspot.coordinates.lat,
        hotspot.coordinates.lng
      );
      return distance <= hotspot.radius * 1000; // Convert km to meters
    });

    if (isNearRoute) {
      const riskLevel = mapSeverityToRiskLevel(hotspot.severity);
      dangerZones.push({
        zoneId: `accident-${hotspot.name.replace(/\s+/g, '-').toLowerCase()}`,
        location: hotspot.coordinates,
        radius: hotspot.radius * 1000, // Convert km to meters
        riskLevel,
        riskType: 'accident_prone',
        accidentCount: hotspot.accidentCount,
        crimeIncidents: 0,
        roadConditionIssues: [],
        alertThresholdDistance: hotspot.radius * 1000 + 500, // Add 500m buffer
        description: `${hotspot.name}: ${hotspot.reason} (${hotspot.accidentCount} accidents recorded)`
      });
    }
  }

  // Check for high-crime zones
  for (const crimeZone of HIGH_CRIME_ZONES) {
    const isNearRoute = routePoints.some(point => {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        crimeZone.lat,
        crimeZone.lng
      );
      return distance <= crimeZone.radius;
    });

    if (isNearRoute) {
      const riskLevel = crimeZone.crimeRate >= 80 ? 'high' : 
                       crimeZone.crimeRate >= 60 ? 'medium' : 'low';
      dangerZones.push({
        zoneId: `crime-${crimeZone.area.replace(/\s+/g, '-').toLowerCase()}`,
        location: { lat: crimeZone.lat, lng: crimeZone.lng },
        radius: crimeZone.radius,
        riskLevel,
        riskType: 'high_crime',
        accidentCount: 0,
        crimeIncidents: Math.floor(crimeZone.crimeRate * 1.5), // Estimated incidents
        roadConditionIssues: [],
        alertThresholdDistance: crimeZone.radius + 1000, // Add 1km buffer
        description: `High crime area: ${crimeZone.area} (Crime rate: ${crimeZone.crimeRate}%)`
      });
    }
  }

  return dangerZones;
}

/**
 * Calculate accident frequency score (0-100, higher is safer)
 * Based on proximity to known accident hotspots
 */
function calculateAccidentFrequencyScore(routePoints: Array<{ lat: number; lng: number }>): number {
  let totalRisk = 0;
  let riskCount = 0;

  for (const point of routePoints) {
    for (const hotspot of ACCIDENT_HOTSPOTS) {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        hotspot.coordinates.lat,
        hotspot.coordinates.lng
      );

      // If within hotspot radius, calculate risk
      if (distance <= hotspot.radius * 1000) {
        // Risk increases with accident count and decreases with distance
        const proximityFactor = 1 - (distance / (hotspot.radius * 1000));
        const severityMultiplier = getSeverityMultiplier(hotspot.severity);
        const risk = (hotspot.accidentCount * severityMultiplier * proximityFactor) / 100;
        totalRisk += Math.min(risk, 1); // Cap at 1
        riskCount++;
      }
    }
  }

  // Calculate average risk and convert to safety score
  if (riskCount === 0) {
    return 100; // No accident hotspots nearby
  }

  const averageRisk = totalRisk / riskCount;
  const safetyScore = Math.max(0, 100 - (averageRisk * 100));
  return Math.round(safetyScore);
}

/**
 * Calculate crime zone weight (0-100, higher is safer)
 * Based on proximity to high-crime areas
 */
function calculateCrimeZoneWeight(routePoints: Array<{ lat: number; lng: number }>): number {
  let totalRisk = 0;
  let riskCount = 0;

  for (const point of routePoints) {
    for (const crimeZone of HIGH_CRIME_ZONES) {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        crimeZone.lat,
        crimeZone.lng
      );

      // If within crime zone radius, calculate risk
      if (distance <= crimeZone.radius) {
        const proximityFactor = 1 - (distance / crimeZone.radius);
        const risk = (crimeZone.crimeRate / 100) * proximityFactor;
        totalRisk += risk;
        riskCount++;
      }
    }
  }

  // Calculate average risk and convert to safety score
  if (riskCount === 0) {
    return 100; // No high-crime zones nearby
  }

  const averageRisk = totalRisk / riskCount;
  const safetyScore = Math.max(0, 100 - (averageRisk * 100));
  return Math.round(safetyScore);
}

/**
 * Calculate road condition score (0-100, higher is better)
 * For MVP, uses default scores based on road type estimation
 */
function calculateRoadConditionScore(routePoints: Array<{ lat: number; lng: number }>): number {
  // For MVP, assume average road conditions
  // In production, this would query actual road condition data
  
  // Base score for average Indian road conditions
  let baseScore = 70;

  // Adjust based on route length (longer routes may have more varied conditions)
  const routeLength = routePoints.length;
  if (routeLength > 100) {
    baseScore -= 5; // Longer routes have more variability
  }

  // Add some randomness to simulate real-world variation
  const variation = Math.random() * 10 - 5; // -5 to +5
  
  return Math.round(Math.max(0, Math.min(100, baseScore + variation)));
}

/**
 * Calculate time risk factor (0-100, higher is safer)
 * Based on current time (hour/day affects risk)
 */
function calculateTimeRiskFactor(timestamp: number): number {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  let riskScore = 100;

  // Night time risk (8PM - 6AM)
  if (hour >= 20 || hour < 6) {
    riskScore -= 30; // Higher risk at night
    
    // Extra risk late at night (midnight - 4AM)
    if (hour >= 0 && hour < 4) {
      riskScore -= 10;
    }
  }

  // Rush hour risk (7-10AM and 5-8PM)
  if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    riskScore -= 15; // Higher risk during rush hours
  }

  // Weekend risk (slightly higher on Saturday nights)
  if (dayOfWeek === 6 && hour >= 20) {
    riskScore -= 10;
  }

  return Math.max(0, Math.round(riskScore));
}

/**
 * Calculate overall safety score using weighted average
 * 
 * Weights:
 * - Accident frequency: 35%
 * - Crime zone: 25%
 * - Road condition: 20%
 * - Time risk: 20%
 */
function calculateOverallSafetyScore(metrics: {
  accidentFrequencyScore: number;
  crimeZoneWeight: number;
  roadConditionScore: number;
  timeRiskFactor: number;
}): number {
  const weights = {
    accident: 0.35,
    crime: 0.25,
    road: 0.20,
    time: 0.20
  };

  const weightedScore = 
    metrics.accidentFrequencyScore * weights.accident +
    metrics.crimeZoneWeight * weights.crime +
    metrics.roadConditionScore * weights.road +
    metrics.timeRiskFactor * weights.time;

  return Math.round(weightedScore);
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

/**
 * Map severity string to risk level
 */
function mapSeverityToRiskLevel(severity: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
    default:
      return 'low';
  }
}

/**
 * Get severity multiplier for risk calculation
 */
function getSeverityMultiplier(severity: string): number {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 2.0;
    case 'HIGH':
      return 1.5;
    case 'MEDIUM':
      return 1.0;
    case 'LOW':
    default:
      return 0.5;
  }
}