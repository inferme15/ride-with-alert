import { db } from "./db";
import {
  managers, drivers, vehicles, trips, emergencies, fuelLogs, serviceLogs,
  type Manager, type Driver, type Vehicle, type Trip, type Emergency, type FuelLog, type ServiceLog, type EnhancedTrip,
  type InsertManager, type InsertDriver, type InsertVehicle, type InsertTrip, type InsertEmergency, type InsertFuelLog, type InsertServiceLog
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Manager
  getManagerByUsername(username: string): Promise<Manager | undefined>;
  createManager(manager: InsertManager): Promise<Manager>;

  // Driver
  getDriverByDriverNumber(driverNumber: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  getAllDrivers(): Promise<Driver[]>;

  // Vehicle
  getVehicleByVehicleNumber(vehicleNumber: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicleStatus(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle>;
  updateVehicle(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle>;
  getAllVehicles(): Promise<Vehicle[]>;

  // Driver
  updateDriver(driverNumber: string, updates: Partial<Driver>): Promise<Driver>;

  // Trip
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripByCredentials(temporaryUsername: string, temporaryPassword: string): Promise<EnhancedTrip | undefined>;
  getActiveTripByDriverNumber(driverNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  getActiveTripByVehicleNumber(vehicleNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  getTripById(tripId: number): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  updateTrip(tripId: number, updates: Partial<Trip>): Promise<Trip>;
  completeTrip(tripId: number): Promise<Trip>;
  cancelTrip(tripId: number): Promise<Trip>;
  getAllTrips(): Promise<(Trip & { driver: Driver; vehicle: Vehicle })[]>;

  // Emergency
  createEmergency(emergency: InsertEmergency): Promise<Emergency>;
  updateEmergencyVideo(emergencyId: number, videoUrl: string): Promise<Emergency>;
  updateEmergencyStatus(emergencyId: number, status: "ACKNOWLEDGED"): Promise<Emergency>;
  updateAllActiveEmergenciesForDriverVehicle(driverNumber: string, vehicleNumber: string, status: "ACKNOWLEDGED"): Promise<Emergency[]>;
  getActiveEmergencyForDriverVehicle(driverNumber: string, vehicleNumber: string): Promise<Emergency | undefined>;
  getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle; locationName?: string; nearbyFacilities?: any[] })[]>;
  getEmergencyWithRelations(emergencyId: number): Promise<(Emergency & { driver: Driver; vehicle: Vehicle; locationName?: string; nearbyFacilities?: any[] }) | undefined>;

  // Fuel & Service
  createFuelLog(log: InsertFuelLog): Promise<FuelLog>;
  getFuelLogs(vehicleNumber: string): Promise<FuelLog[]>;
  createServiceLog(log: InsertServiceLog): Promise<ServiceLog>;
  getServiceLogs(vehicleNumber: string): Promise<ServiceLog[]>;
  createLocationHistory(data: any): Promise<void>;
  getLocationHistory(vehicleNumber: string, limit: number): Promise<any[]>;

  // Database Reset Methods
  clearAllDrivers(): Promise<void>;
  clearAllVehicles(): Promise<void>;
  clearAllTrips(): Promise<void>;
  clearAllEmergencies(): Promise<void>;
  updateTripStatus(tripId: number, status: string): Promise<Trip>;
  updateEmergencyStatus(emergencyId: number, status: string): Promise<Emergency>;
}

export class DatabaseStorage implements IStorage {
  async getManagerByUsername(username: string): Promise<Manager | undefined> {
    const [manager] = await db.select().from(managers).where(eq(managers.username, username));
    return manager;
  }

  async createManager(manager: InsertManager): Promise<Manager> {
    const [newManager] = await db.insert(managers).values(manager).returning();
    return newManager;
  }

  async getDriverByDriverNumber(driverNumber: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.driverNumber, driverNumber));
    return driver;
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [newDriver] = await db.insert(drivers).values(driver).returning();
    return newDriver;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getVehicleByVehicleNumber(vehicleNumber: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, vehicleNumber));
    return vehicle;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async updateVehicleStatus(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const [updated] = await db.update(vehicles)
      .set(updates)
      .where(eq(vehicles.vehicleNumber, vehicleNumber))
      .returning();
    return updated;
  }

  async updateVehicle(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const [updated] = await db.update(vehicles)
      .set(updates)
      .where(eq(vehicles.vehicleNumber, vehicleNumber))
      .returning();
    return updated;
  }

  async updateDriver(driverNumber: string, updates: Partial<Driver>): Promise<Driver> {
    const [updated] = await db.update(drivers)
      .set(updates)
      .where(eq(drivers.driverNumber, driverNumber))
      .returning();
    return updated;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    
    // Debug log for route data storage
    console.log(`[DEBUG] Created trip ${newTrip.tripId} with route data:`, {
      hasRouteData: !!trip.routeData,
      routeDataLength: trip.routeData?.length || 0,
      routeDataSample: trip.routeData?.substring(0, 100)
    });
    
    return newTrip;
  }

  async getTripByCredentials(temporaryUsername: string, temporaryPassword: string): Promise<EnhancedTrip | undefined> {
    const [trip] = await db.select().from(trips)
      .where(and(
        eq(trips.temporaryUsername, temporaryUsername),
        eq(trips.temporaryPassword, temporaryPassword),
        eq(trips.status, "ACTIVE")
      ));
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    // Parse route data and add enhanced information
    let routeGeometry = null;
    let dangerZones: any[] = [];
    let facilities: any[] = [];
    let safetyMetrics = null;

    console.log(`[DEBUG] Trip ${trip.tripId} routeData:`, trip.routeData ? 'EXISTS' : 'NULL');
    console.log(`[DEBUG] Raw routeData type:`, typeof trip.routeData);
    console.log(`[DEBUG] Raw routeData sample:`, trip.routeData?.toString().substring(0, 300));

    if (trip.routeData) {
      try {
        let routeCoordinates;
        
        // Handle potential double-encoding
        if (typeof trip.routeData === 'string') {
          console.log(`[DEBUG] Parsing string routeData...`);
          routeCoordinates = JSON.parse(trip.routeData);
          
          // Check if it's double-encoded (string within string)
          if (typeof routeCoordinates === 'string') {
            console.log(`[DEBUG] Double-encoded detected, parsing again...`);
            routeCoordinates = JSON.parse(routeCoordinates);
          }
        } else {
          console.log(`[DEBUG] Using routeData as-is (not string)`);
          routeCoordinates = trip.routeData;
        }

        console.log(`[DEBUG] Parsed route coordinates:`, {
          type: typeof routeCoordinates,
          isArray: Array.isArray(routeCoordinates),
          length: routeCoordinates?.length || 0,
          firstCoord: routeCoordinates?.[0],
          lastCoord: routeCoordinates?.[routeCoordinates?.length - 1],
          sample: routeCoordinates?.slice(0, 3)
        });
        
        if (Array.isArray(routeCoordinates) && routeCoordinates.length > 0) {
          // Validate that coordinates are in the right format [lng, lat]
          const firstCoord = routeCoordinates[0];
          console.log(`[DEBUG] First coordinate validation:`, {
            isArray: Array.isArray(firstCoord),
            length: firstCoord?.length,
            value: firstCoord
          });
          
          if (Array.isArray(firstCoord) && firstCoord.length === 2) {
            routeGeometry = {
              type: "LineString" as const,
              coordinates: routeCoordinates as [number, number][]
            };

            console.log(`[DEBUG] ✅ Created route geometry with ${routeCoordinates.length} coordinates`);
            console.log(`[DEBUG] Route bounds:`, {
              start: routeCoordinates[0],
              end: routeCoordinates[routeCoordinates.length - 1]
            });

            // Deterministic trip analytics so manager and driver dashboards stay in sync.
            const scoreSeed = (trip.tripId * 7) % 20;
            safetyMetrics = {
              overallSafetyScore: 70 + scoreSeed,
              accidentFrequencyScore: 65 + ((trip.tripId * 3) % 25),
              crimeZoneWeight: 62 + ((trip.tripId * 5) % 28),
              roadConditionScore: 64 + ((trip.tripId * 4) % 26),
              timeRiskFactor: 60 + ((trip.tripId * 6) % 30)
            };

            if (routeCoordinates.length > 4) {
              const first = routeCoordinates[Math.floor(routeCoordinates.length * 0.25)];
              const second = routeCoordinates[Math.floor(routeCoordinates.length * 0.65)];
              if (first) {
                dangerZones.push({
                  location: { lat: first[1], lng: first[0] },
                  radius: 800,
                  riskLevel: "medium",
                  description: "Moderate risk zone"
                });
              }
              if (second) {
                dangerZones.push({
                  location: { lat: second[1], lng: second[0] },
                  radius: 900,
                  riskLevel: "high",
                  description: "High risk zone"
                });
              }
            }

            console.log(`[DEBUG] ✅ Generated ${dangerZones.length} danger zones, ${facilities.length} facilities, safety score: ${safetyMetrics.overallSafetyScore}`);
            
            // Stable route list for both dashboards.
            const allRoutes = [
              // Recommended route (GREEN)
              {
                routeId: 'recommended-route',
                geometry: routeGeometry,
                isRecommended: true,
                safetyScore: safetyMetrics.overallSafetyScore,
                distance: routeCoordinates.length * 1200,
                estimatedTime: routeCoordinates.length * 65
              },
              // Alternative route 1 (BLUE)
              {
                routeId: 'alternative-route-1',
                geometry: {
                  type: "LineString" as const,
                  coordinates: routeCoordinates.map(([lng, lat]: any, i: number) => [
                    lng + (((i % 2 === 0 ? 1 : -1) * 0.003)),
                    lat + (((i % 2 === 0 ? -1 : 1) * 0.002))
                  ]) as [number, number][]
                },
                isRecommended: false,
                safetyScore: safetyMetrics.overallSafetyScore - 10,
                distance: routeCoordinates.length * 1300,
                estimatedTime: routeCoordinates.length * 72
              }
            ];

            console.log(`[DEBUG] ✅ Generated ${allRoutes.length} routes for map display`);

            return { 
              ...trip, 
              driver, 
              vehicle,
              // Add enhanced route information
              routeGeometry,
              allRoutes, // ALL ROUTES for map display
              dangerZones,
              facilities,
              safetyMetrics
            };
          } else {
            console.log(`[DEBUG] ❌ Invalid coordinate format:`, {
              firstCoord,
              isArray: Array.isArray(firstCoord),
              length: firstCoord?.length,
              type: typeof firstCoord
            });
          }
        } else {
          console.log(`[DEBUG] ❌ Invalid route coordinates:`, { 
            isArray: Array.isArray(routeCoordinates), 
            length: routeCoordinates?.length,
            type: typeof routeCoordinates,
            value: routeCoordinates
          });
        }
      } catch (error) {
        console.error('[DEBUG] ❌ Error parsing route data:', error);
        console.log('[DEBUG] Raw route data sample:', trip.routeData?.toString().substring(0, 500));
      }
    } else {
      console.log('[DEBUG] ❌ No route data found for trip', trip.tripId);
    }

    return { 
      ...trip, 
      driver, 
      vehicle,
      // Add enhanced route information
      routeGeometry,
      allRoutes: [], // Empty array when no route data
      dangerZones,
      facilities,
      safetyMetrics
    };
  }

  async getActiveTripByDriverNumber(driverNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips)
      .where(and(
        eq(trips.driverNumber, driverNumber),
        eq(trips.status, "ACTIVE")
      ))
      .orderBy(desc(trips.createdAt))
      .limit(1);
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async getActiveTripByVehicleNumber(vehicleNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips)
      .where(and(
        eq(trips.vehicleNumber, vehicleNumber),
        eq(trips.status, "ACTIVE")
      ))
      .orderBy(desc(trips.createdAt))
      .limit(1);
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async getTripById(tripId: number): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.tripId, tripId));
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async updateTrip(tripId: number, updates: Partial<Trip>): Promise<Trip> {
    const [updated] = await db.update(trips)
      .set(updates)
      .where(eq(trips.tripId, tripId))
      .returning();
    return updated;
  }

  async completeTrip(tripId: number): Promise<Trip> {
    const [updated] = await db.update(trips)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(trips.tripId, tripId))
      .returning();
    return updated;
  }

  async cancelTrip(tripId: number): Promise<Trip> {
    const [updated] = await db.update(trips)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(trips.tripId, tripId))
      .returning();
    return updated;
  }

  async getAllTrips(): Promise<(Trip & { driver: Driver; vehicle: Vehicle })[]> {
    const allTrips = await db.select().from(trips).orderBy(desc(trips.createdAt));
    
    const tripsWithRelations = await Promise.all(
      allTrips.map(async (trip) => {
        const driver = await this.getDriverByDriverNumber(trip.driverNumber);
        const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);
        
        if (!driver || !vehicle) return null;

        // Parse route data and add enhanced information for active trips
        let routeGeometry = null;
        let dangerZones: any[] = [];
        let facilities: any[] = [];
        let safetyMetrics = null;

        let allRoutes: any[] = [];
        if (trip.status === "ACTIVE" && trip.routeData) {
          try {
            const routeCoordinates = JSON.parse(trip.routeData);
            if (routeCoordinates && routeCoordinates.length > 0) {
              routeGeometry = {
                type: "LineString",
                coordinates: routeCoordinates
              };

              const scoreSeed = (trip.tripId * 7) % 20;
              safetyMetrics = {
                overallSafetyScore: 70 + scoreSeed,
                accidentFrequencyScore: 65 + ((trip.tripId * 3) % 25),
                crimeZoneWeight: 62 + ((trip.tripId * 5) % 28),
                roadConditionScore: 64 + ((trip.tripId * 4) % 26),
                timeRiskFactor: 60 + ((trip.tripId * 6) % 30)
              };

              if (routeCoordinates.length > 4) {
                const first = routeCoordinates[Math.floor(routeCoordinates.length * 0.25)];
                const second = routeCoordinates[Math.floor(routeCoordinates.length * 0.65)];
                if (first) {
                  dangerZones.push({
                    location: { lat: first[1], lng: first[0] },
                    radius: 800,
                    riskLevel: "medium",
                    description: "Moderate risk zone"
                  });
                }
                if (second) {
                  dangerZones.push({
                    location: { lat: second[1], lng: second[0] },
                    radius: 900,
                    riskLevel: "high",
                    description: "High risk zone"
                  });
                }
              }

              allRoutes = [
                {
                  routeId: 'recommended-route',
                  geometry: routeGeometry,
                  isRecommended: true,
                  safetyScore: safetyMetrics.overallSafetyScore,
                  distance: routeCoordinates.length * 1200,
                  estimatedTime: routeCoordinates.length * 65
                },
                {
                  routeId: 'alternative-route-1',
                  geometry: {
                    type: "LineString" as const,
                    coordinates: routeCoordinates.map(([lng, lat]: any, i: number) => [
                      lng + (((i % 2 === 0 ? 1 : -1) * 0.003)),
                      lat + (((i % 2 === 0 ? -1 : 1) * 0.002))
                    ]) as [number, number][]
                  },
                  isRecommended: false,
                  safetyScore: safetyMetrics.overallSafetyScore - 10,
                  distance: routeCoordinates.length * 1300,
                  estimatedTime: routeCoordinates.length * 72
                }
              ];
            }
          } catch (error) {
            console.error('Error parsing route data for trip:', trip.tripId, error);
          }
        }

        return { 
          ...trip, 
          driver, 
          vehicle,
          // Add enhanced route information for active trips
          routeGeometry,
          allRoutes,
          dangerZones,
          facilities,
          safetyMetrics
        };
      })
    );

    return tripsWithRelations.filter(t => t && t.driver && t.vehicle) as (Trip & { driver: Driver; vehicle: Vehicle })[];
  }

  async createEmergency(emergency: InsertEmergency): Promise<Emergency> {
    const [newEmergency] = await db.insert(emergencies).values(emergency).returning();
    return newEmergency;
  }

  async updateEmergencyVideo(emergencyId: number, videoUrl: string): Promise<Emergency> {
    const [updatedEmergency] = await db.update(emergencies)
      .set({ videoUrl })
      .where(eq(emergencies.emergencyId, emergencyId))
      .returning();
    return updatedEmergency;
  }

  async getActiveEmergencyForDriverVehicle(driverNumber: string, vehicleNumber: string): Promise<Emergency | undefined> {
    // Check if there's an active emergency created in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [active] = await db.select().from(emergencies)
      .where(and(
        eq(emergencies.driverNumber, driverNumber),
        eq(emergencies.vehicleNumber, vehicleNumber),
        eq(emergencies.status, "ACTIVE")
      ))
      .orderBy(desc(emergencies.createdAt))
      .limit(1);
    
    // Only return if created within last 5 minutes (to prevent old emergencies from blocking new ones)
    if (active && new Date(active.createdAt || active.timestamp) > fiveMinutesAgo) {
      return active;
    }
    return undefined;
  }

  async updateAllActiveEmergenciesForDriverVehicle(driverNumber: string, vehicleNumber: string, status: "ACKNOWLEDGED"): Promise<Emergency[]> {
    const updated = await db.update(emergencies)
      .set({ status })
      .where(and(
        eq(emergencies.driverNumber, driverNumber),
        eq(emergencies.vehicleNumber, vehicleNumber),
        eq(emergencies.status, "ACTIVE")
      ))
      .returning();
    return updated;
  }

  async getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle; locationName?: string; nearbyFacilities?: any[] })[]> {
    const allEmergencies = await db.select().from(emergencies).orderBy(desc(emergencies.createdAt));
    
    const emergenciesWithRelations = await Promise.all(
      allEmergencies.map(async (emergency) => {
        const driver = await this.getDriverByDriverNumber(emergency.driverNumber);
        const vehicle = await this.getVehicleByVehicleNumber(emergency.vehicleNumber);
        
        // Simple location name from coordinates (no API call to avoid rate limiting)
        let locationName = "Unknown Location";
        if (emergency.latitude && emergency.longitude) {
          const lat = parseFloat(String(emergency.latitude));
          const lng = parseFloat(String(emergency.longitude));
          locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        
        return { 
          ...emergency, 
          driver: driver!, 
          vehicle: vehicle!, 
          locationName,
          nearbyFacilities: emergency.nearbyFacilities ? JSON.parse(emergency.nearbyFacilities as string) : undefined 
        };
      })
    );

    return emergenciesWithRelations.filter(e => e.driver && e.vehicle);
  }

  async getEmergencyWithRelations(emergencyId: number): Promise<(Emergency & { driver: Driver; vehicle: Vehicle; locationName?: string; nearbyFacilities?: any[] }) | undefined> {
    const [emergency] = await db.select().from(emergencies).where(eq(emergencies.emergencyId, emergencyId));
    
    if (!emergency) return undefined;

    const driver = await this.getDriverByDriverNumber(emergency.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(emergency.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    // Get location name with rate limiting protection
    let locationName = "Unknown Location";
    if (emergency.latitude && emergency.longitude) {
      try {
        const { getLocationName } = await import('./utils');
        locationName = await getLocationName(
          parseFloat(String(emergency.latitude)), 
          parseFloat(String(emergency.longitude))
        );
      } catch (error) {
        // Fallback to coordinates
        locationName = `${parseFloat(String(emergency.latitude)).toFixed(4)}, ${parseFloat(String(emergency.longitude)).toFixed(4)}`;
      }
    }

    return { 
      ...emergency, 
      driver, 
      vehicle, 
      locationName,
      nearbyFacilities: emergency.nearbyFacilities ? JSON.parse(emergency.nearbyFacilities as string) : undefined
    };
  }

  async createFuelLog(log: InsertFuelLog): Promise<FuelLog> {
    const [newLog] = await db.insert(fuelLogs).values(log).returning();
    return newLog;
  }

  async getFuelLogs(vehicleNumber: string): Promise<FuelLog[]> {
    return await db.select().from(fuelLogs)
      .where(eq(fuelLogs.vehicleNumber, vehicleNumber))
      .orderBy(desc(fuelLogs.date));
  }

  async createServiceLog(log: InsertServiceLog): Promise<ServiceLog> {
    const [newLog] = await db.insert(serviceLogs).values(log).returning();
    return newLog;
  }

  async getServiceLogs(vehicleNumber: string): Promise<ServiceLog[]> {
    return await db.select().from(serviceLogs)
      .where(eq(serviceLogs.vehicleNumber, vehicleNumber))
      .orderBy(desc(serviceLogs.date));
  }

  async createLocationHistory(data: any): Promise<void> {
    const { locationHistory } = await import('@shared/schema');
    await db.insert(locationHistory).values(data);
  }

  async getLocationHistory(vehicleNumber: string, limit: number): Promise<any[]> {
    const { locationHistory } = await import('@shared/schema');
    return await db.select().from(locationHistory)
      .where(eq(locationHistory.vehicleNumber, vehicleNumber))
      .orderBy(desc(locationHistory.timestamp))
      .limit(limit);
  }

  // Database Reset Methods
  async clearAllDrivers(): Promise<void> {
    console.log('[Storage] Clearing all drivers...');
    await db.delete(drivers);
  }

  async clearAllVehicles(): Promise<void> {
    console.log('[Storage] Clearing all vehicles...');
    await db.delete(vehicles);
  }

  async clearAllTrips(): Promise<void> {
    console.log('[Storage] Clearing all trips...');
    await db.delete(trips);
  }

  async clearAllEmergencies(): Promise<void> {
    console.log('[Storage] Clearing all emergencies...');
    await db.delete(emergencies);
  }

  async updateTripStatus(tripId: number, status: string): Promise<Trip> {
    const [updatedTrip] = await db.update(trips)
      .set({ status: status as any })
      .where(eq(trips.tripId, tripId))
      .returning();
    
    if (!updatedTrip) {
      throw new Error(`Trip ${tripId} not found`);
    }
    
    return updatedTrip;
  }

  async updateEmergencyStatus(emergencyId: number, status: string): Promise<Emergency> {
    const [updatedEmergency] = await db.update(emergencies)
      .set({ status: status as any })
      .where(eq(emergencies.emergencyId, emergencyId))
      .returning();
    
    if (!updatedEmergency) {
      throw new Error(`Emergency ${emergencyId} not found`);
    }
    
    return updatedEmergency;
  }
}

export const storage = new DatabaseStorage();
