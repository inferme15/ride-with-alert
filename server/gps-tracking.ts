/**
 * GPS Tracking Service
 * 
 * Handles GPS location updates, validates data quality, stores location history,
 * and triggers proximity alerts for danger zones.
 */

import { storage } from './storage';
import { detectDangerZones, type DangerZone } from './ml-safety-engine';

/**
 * GPS location data structure
 */
export interface GPSLocation {
  vehicleId: string;
  driverNumber: string;
  vehicleNumber: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number; // meters
  speed?: number; // km/h
  heading?: number; // degrees
}

/**
 * Proximity alert structure
 */
export interface ProximityAlert {
  alertId: string;
  dangerZone: DangerZone;
  distance: number; // meters to danger zone
  message: string;
  severity: 'warning' | 'critical';
  triggeredAt: number;
}

/**
 * GPS data quality thresholds
 */
const GPS_QUALITY_THRESHOLDS = {
  MAX_ACCURACY: 100, // meters - reject if accuracy worse than this
  MAX_SPEED: 200, // km/h - reject if speed exceeds this (likely error)
  MAX_JUMP_DISTANCE: 5000, // meters - reject if jump is too large between updates
};

/**
 * Danger zone proximity thresholds
 */
const PROXIMITY_THRESHOLDS = {
  WARNING_DISTANCE: 2000, // meters - show warning
  CRITICAL_DISTANCE: 500, // meters - show critical alert
};

/**
 * Process GPS location update
 * 
 * Validates GPS data, stores location history, and checks for danger zone proximity.
 * 
 * @param location - GPS location data
 * @returns Proximity alerts if any danger zones are nearby
 */
export async function processGPSUpdate(location: GPSLocation): Promise<ProximityAlert[]> {
  console.log(`[GPS Tracking] Processing update for vehicle ${location.vehicleNumber} at (${location.latitude}, ${location.longitude})`);
  
  // Step 1: Validate GPS data quality
  const validationResult = validateGPSData(location);
  if (!validationResult.isValid) {
    console.warn(`[GPS Tracking] Invalid GPS data: ${validationResult.reason}`);
    throw new Error(`Invalid GPS data: ${validationResult.reason}`);
  }
  
  // Step 2: Check for impossible jumps (compare with last known location)
  const lastLocation = await getLastKnownLocation(location.vehicleNumber);
  if (lastLocation) {
    const jumpDistance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      location.latitude,
      location.longitude
    );
    
    const timeDiff = (location.timestamp - lastLocation.timestamp) / 1000; // seconds
    const impliedSpeed = (jumpDistance / 1000) / (timeDiff / 3600); // km/h
    
    if (jumpDistance > GPS_QUALITY_THRESHOLDS.MAX_JUMP_DISTANCE && impliedSpeed > GPS_QUALITY_THRESHOLDS.MAX_SPEED) {
      console.warn(`[GPS Tracking] Suspicious jump detected: ${jumpDistance}m in ${timeDiff}s (${impliedSpeed.toFixed(1)} km/h)`);
      // Don't reject, but log for monitoring
    }
  }
  
  // Step 3: Store location in history
  await storeLocationHistory(location);
  
  // Step 4: Check proximity to danger zones
  const proximityAlerts = await checkDangerZoneProximity(location);
  
  if (proximityAlerts.length > 0) {
    console.log(`[GPS Tracking] ${proximityAlerts.length} proximity alert(s) triggered for vehicle ${location.vehicleNumber}`);
  }
  
  return proximityAlerts;
}

/**
 * Validate GPS data quality
 */
function validateGPSData(location: GPSLocation): { isValid: boolean; reason?: string } {
  // Check coordinate ranges
  if (location.latitude < -90 || location.latitude > 90) {
    return { isValid: false, reason: 'Latitude out of range (-90 to 90)' };
  }
  
  if (location.longitude < -180 || location.longitude > 180) {
    return { isValid: false, reason: 'Longitude out of range (-180 to 180)' };
  }
  
  // Check accuracy if provided
  if (location.accuracy && location.accuracy > GPS_QUALITY_THRESHOLDS.MAX_ACCURACY) {
    return { isValid: false, reason: `GPS accuracy too low: ${location.accuracy}m` };
  }
  
  // Check speed if provided
  if (location.speed && location.speed > GPS_QUALITY_THRESHOLDS.MAX_SPEED) {
    return { isValid: false, reason: `Speed too high: ${location.speed} km/h` };
  }
  
  // Check timestamp
  const now = Date.now();
  const timeDiff = Math.abs(now - location.timestamp);
  if (timeDiff > 300000) { // 5 minutes
    console.warn(`[GPS Tracking] Timestamp is ${timeDiff / 1000}s off from current time`);
  }
  
  return { isValid: true };
}

/**
 * Store location in history
 */
async function storeLocationHistory(location: GPSLocation): Promise<void> {
  try {
    await storage.createLocationHistory({
      driverNumber: location.driverNumber,
      vehicleNumber: location.vehicleNumber,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      address: undefined, // Will be geocoded later if needed
      timestamp: new Date(location.timestamp)
    });
  } catch (error) {
    console.error('[GPS Tracking] Failed to store location history:', error);
    throw error;
  }
}

/**
 * Get last known location for a vehicle
 */
async function getLastKnownLocation(vehicleNumber: string): Promise<GPSLocation | null> {
  try {
    const history = await storage.getLocationHistory(vehicleNumber, 1);
    if (history.length === 0) return null;
    
    const record = history[0];
    return {
      vehicleId: record.vehicleNumber,
      driverNumber: record.driverNumber,
      vehicleNumber: record.vehicleNumber,
      latitude: parseFloat(record.latitude),
      longitude: parseFloat(record.longitude),
      timestamp: record.timestamp.getTime()
    };
  } catch (error) {
    console.error('[GPS Tracking] Failed to get last known location:', error);
    return null;
  }
}

/**
 * Check proximity to danger zones
 */
async function checkDangerZoneProximity(location: GPSLocation): Promise<ProximityAlert[]> {
  try {
    const routeGeometry: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [[location.longitude, location.latitude], [location.longitude, location.latitude]]
    };
    const dangerZones = await detectDangerZones(routeGeometry);
    const alerts: ProximityAlert[] = [];
    
    for (const zone of dangerZones) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        zone.location.lat,
        zone.location.lng
      );
      
      let severity: 'warning' | 'critical' | null = null;
      
      if (distance <= PROXIMITY_THRESHOLDS.CRITICAL_DISTANCE) {
        severity = 'critical';
      } else if (distance <= PROXIMITY_THRESHOLDS.WARNING_DISTANCE) {
        severity = 'warning';
      }
      
      if (severity) {
        alerts.push({
          alertId: `${location.vehicleNumber}-${zone.riskType}-${Date.now()}`,
          dangerZone: zone,
          distance,
          message: `${severity === 'critical' ? 'CRITICAL' : 'WARNING'}: ${zone.riskType} detected ${distance.toFixed(0)}m ahead`,
          severity,
          triggeredAt: Date.now()
        });
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('[GPS Tracking] Failed to check danger zone proximity:', error);
    return [];
  }
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}