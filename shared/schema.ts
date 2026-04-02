import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  driverNumber: text("driver_number").notNull().unique(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  licenseNumber: text("license_number").notNull(),
  bloodGroup: text("blood_group"),
  medicalConditions: text("medical_conditions"),
  emergencyContact: text("emergency_contact"),
  emergencyContactPhone: text("emergency_contact_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  fuelCapacity: integer("fuel_capacity").notNull(),
  currentFuel: integer("current_fuel").default(100), // percentage 0-100
  lastServiceDate: timestamp("last_service_date"),
  nextServiceMileage: integer("next_service_mileage"),
  currentMileage: integer("current_mileage").default(0),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  insuranceNumber: text("insurance_number"),
  insuranceExpiry: timestamp("insurance_expiry"),
  registrationExpiry: timestamp("registration_expiry"),
  medicalInfo: text("medical_info"), // JSON string for medical conditions of regular users
  iceContacts: text("ice_contacts"), // JSON string for In Case of Emergency contacts
  createdAt: timestamp("created_at").defaultNow(),
});

export const emergencyFacilities = pgTable("emergency_facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["hospital", "police", "fuel_station", "service_center", "mechanic", "pharmacy", "clinic", "fire_station"] }).notNull(),
  brand: text("brand"), // For fuel stations: Indian Oil, HP, BPCL, Shell, Reliance, etc.
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  phoneNumber: text("phone_number").notNull(),
  emergencyPhone: text("emergency_phone"),
  services: text("services"), // JSON array of services offered
  availability: text("availability").default("24x7"),
  rating: numeric("rating"), // 1-5 stars
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const locationHistory = pgTable("location_history", {
  id: serial("id").primaryKey(),
  driverNumber: text("driver_number").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const fuelLogs = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  amount: numeric("amount").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  location: text("location"),
  date: timestamp("date").defaultNow(),
});

export const serviceLogs = pgTable("service_logs", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  description: text("description").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  serviceCenter: text("service_center"),
  location: text("location"),
  date: timestamp("date").defaultNow(),
});

export const trips = pgTable("trips", {
  tripId: serial("trip_id").primaryKey(),
  driverNumber: text("driver_number").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  temporaryUsername: text("temporary_username").notNull().unique(),
  temporaryPassword: text("temporary_password").notNull(),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  startLatitude: numeric("start_latitude"),
  startLongitude: numeric("start_longitude"),
  endLatitude: numeric("end_latitude"),
  endLongitude: numeric("end_longitude"),
  currentLatitude: numeric("current_latitude"),
  currentLongitude: numeric("current_longitude"),
  routeData: text("route_data"), // JSON array of route points
  assignedRouteId: integer("assigned_route_id"), // Foreign key to routes table
  status: text("status", { enum: ["ACTIVE", "COMPLETED"] }).default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const emergencies = pgTable("emergencies", {
  emergencyId: serial("emergency_id").primaryKey(),
  driverNumber: text("driver_number").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  emergencyType: text("emergency_type", { 
    enum: ["accident", "medical", "breakdown", "fire", "other"] 
  }).default("other"),
  description: text("description"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  videoUrl: text("video_url"),
  status: text("status", { enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"] }).default("ACTIVE").notNull(),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  nearbyFacilities: text("nearby_facilities"), // JSON string of nearby facilities
  createdAt: timestamp("created_at").defaultNow(),
});

// === ROUTE SAFETY TABLES ===

export const routes = pgTable("routes", {
  routeId: serial("route_id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  geometry: text("geometry").notNull(), // GeoJSON LineString stored as text
  distance: numeric("distance").notNull(), // meters
  estimatedTime: integer("estimated_time").notNull(), // seconds
  safetyScore: numeric("safety_score"), // 0-100
  isRecommended: boolean("is_recommended").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const safetyMetrics = pgTable("safety_metrics", {
  metricId: serial("metric_id").primaryKey(),
  routeId: integer("route_id").notNull(),
  accidentFrequencyScore: numeric("accident_frequency_score"), // 0-100
  crimeZoneWeight: numeric("crime_zone_weight"), // 0-100
  roadConditionScore: numeric("road_condition_score"), // 0-100
  timeRiskFactor: numeric("time_risk_factor"), // 0-100
  overallSafetyScore: numeric("overall_safety_score").notNull(), // 0-100
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const dangerZones = pgTable("danger_zones", {
  zoneId: serial("zone_id").primaryKey(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  radius: numeric("radius").notNull(), // meters
  riskLevel: text("risk_level", { 
    enum: ["low", "medium", "high", "critical"] 
  }).notNull(),
  riskType: text("risk_type", { 
    enum: ["accident_prone", "high_crime", "poor_road", "combined"] 
  }).notNull(),
  accidentCount: integer("accident_count").default(0),
  crimeIncidents: integer("crime_incidents").default(0),
  alertThresholdDistance: numeric("alert_threshold_distance").notNull(), // meters
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const routeDangerZones = pgTable("route_danger_zones", {
  routeId: integer("route_id").notNull(),
  zoneId: integer("zone_id").notNull(),
});

export const accidentRecords = pgTable("accident_records", {
  recordId: serial("record_id").primaryKey(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  severity: text("severity", { 
    enum: ["minor", "moderate", "severe", "fatal"] 
  }).notNull(),
  roadType: text("road_type"),
  weatherCondition: text("weather_condition"),
  timeOfDay: text("time_of_day", { 
    enum: ["morning", "afternoon", "evening", "night"] 
  }),
  dayOfWeek: text("day_of_week"),
  vehiclesInvolved: integer("vehicles_involved"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crimeRecords = pgTable("crime_records", {
  recordId: serial("record_id").primaryKey(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  crimeType: text("crime_type").notNull(),
  severity: text("severity", { 
    enum: ["low", "medium", "high"] 
  }).notNull(),
  timeOfDay: text("time_of_day", { 
    enum: ["morning", "afternoon", "evening", "night"] 
  }),
  dayOfWeek: text("day_of_week"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roadConditionRecords = pgTable("road_condition_records", {
  recordId: serial("record_id").primaryKey(),
  roadSegmentId: text("road_segment_id"),
  geometry: text("geometry").notNull(), // GeoJSON LineString stored as text
  surfaceQuality: text("surface_quality", { 
    enum: ["excellent", "good", "fair", "poor"] 
  }),
  maintenanceDate: timestamp("maintenance_date"),
  trafficVolume: text("traffic_volume", { 
    enum: ["low", "medium", "high"] 
  }),
  roadWidth: numeric("road_width"), // meters
  laneCount: integer("lane_count"),
  hasStreetLights: boolean("has_street_lights"),
  issues: jsonb("issues"), // Array of issues: potholes, cracks, flooding, etc.
  lastInspected: timestamp("last_inspected"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===

export const driversRelations = relations(drivers, ({ many }) => ({
  trips: many(trips),
  emergencies: many(emergencies),
  locationHistory: many(locationHistory),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  trips: many(trips),
  fuelLogs: many(fuelLogs),
  serviceLogs: many(serviceLogs),
  emergencies: many(emergencies),
  locationHistory: many(locationHistory),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [trips.driverNumber],
    references: [drivers.driverNumber],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
  locationHistory: many(locationHistory),
  routes: many(routes),
  assignedRoute: one(routes, {
    fields: [trips.assignedRouteId],
    references: [routes.routeId],
  }),
}));

export const emergenciesRelations = relations(emergencies, ({ one }) => ({
  driver: one(drivers, {
    fields: [emergencies.driverNumber],
    references: [drivers.driverNumber],
  }),
  vehicle: one(vehicles, {
    fields: [emergencies.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const locationHistoryRelations = relations(locationHistory, ({ one }) => ({
  driver: one(drivers, {
    fields: [locationHistory.driverNumber],
    references: [drivers.driverNumber],
  }),
  vehicle: one(vehicles, {
    fields: [locationHistory.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [fuelLogs.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const serviceLogsRelations = relations(serviceLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [serviceLogs.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  trip: one(trips, {
    fields: [routes.tripId],
    references: [trips.tripId],
  }),
  safetyMetrics: one(safetyMetrics, {
    fields: [routes.routeId],
    references: [safetyMetrics.routeId],
  }),
  routeDangerZones: many(routeDangerZones),
}));

export const safetyMetricsRelations = relations(safetyMetrics, ({ one }) => ({
  route: one(routes, {
    fields: [safetyMetrics.routeId],
    references: [routes.routeId],
  }),
}));

export const dangerZonesRelations = relations(dangerZones, ({ many }) => ({
  routeDangerZones: many(routeDangerZones),
}));

export const routeDangerZonesRelations = relations(routeDangerZones, ({ one }) => ({
  route: one(routes, {
    fields: [routeDangerZones.routeId],
    references: [routes.routeId],
  }),
  dangerZone: one(dangerZones, {
    fields: [routeDangerZones.zoneId],
    references: [dangerZones.zoneId],
  }),
}));

// === SCHEMAS ===

export const insertManagerSchema = createInsertSchema(managers).omit({ id: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ tripId: true, createdAt: true, completedAt: true });
export const insertEmergencySchema = createInsertSchema(emergencies).omit({ emergencyId: true, createdAt: true, timestamp: true, status: true });
export const insertFuelLogSchema = createInsertSchema(fuelLogs).omit({ id: true, date: true });
export const insertServiceLogSchema = createInsertSchema(serviceLogs).omit({ id: true, date: true });
export const insertEmergencyFacilitySchema = createInsertSchema(emergencyFacilities).omit({ id: true, createdAt: true });
export const insertLocationHistorySchema = createInsertSchema(locationHistory).omit({ id: true, timestamp: true });

// Route safety insert schemas
export const insertRouteSchema = createInsertSchema(routes).omit({ routeId: true, createdAt: true });
export const insertSafetyMetricsSchema = createInsertSchema(safetyMetrics).omit({ metricId: true, calculatedAt: true });
export const insertDangerZoneSchema = createInsertSchema(dangerZones).omit({ zoneId: true, createdAt: true, updatedAt: true });
export const insertRouteDangerZoneSchema = createInsertSchema(routeDangerZones);
export const insertAccidentRecordSchema = createInsertSchema(accidentRecords).omit({ recordId: true, createdAt: true });
export const insertCrimeRecordSchema = createInsertSchema(crimeRecords).omit({ recordId: true, createdAt: true });
export const insertRoadConditionRecordSchema = createInsertSchema(roadConditionRecords).omit({ recordId: true, createdAt: true });

// === TYPES ===

export type Manager = typeof managers.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Emergency = typeof emergencies.$inferSelect;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type ServiceLog = typeof serviceLogs.$inferSelect;
export type EmergencyFacility = typeof emergencyFacilities.$inferSelect;
export type LocationHistory = typeof locationHistory.$inferSelect;

// Route safety types
export type Route = typeof routes.$inferSelect;
export type SafetyMetrics = typeof safetyMetrics.$inferSelect;
export type DangerZone = typeof dangerZones.$inferSelect;
export type RouteDangerZone = typeof routeDangerZones.$inferSelect;
export type AccidentRecord = typeof accidentRecords.$inferSelect;
export type CrimeRecord = typeof crimeRecords.$inferSelect;
export type RoadConditionRecord = typeof roadConditionRecords.$inferSelect;

// Enhanced Trip type with additional route data
export type EnhancedTrip = Trip & {
  driver: Driver;
  vehicle: Vehicle;
  routeGeometry?: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
  allRoutes?: Array<{
    routeId: string;
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    };
    isRecommended: boolean;
    safetyScore: number;
    distance: number;
    estimatedTime: number;
  }>;
  dangerZones?: Array<{
    location: { lat: number; lng: number };
    radius: number;
    riskLevel: string;
    description: string;
  }>;
  safetyMetrics?: {
    overallSafetyScore: number;
    accidentFrequencyScore: number;
    crimeZoneWeight: number;
    roadConditionScore: number;
    timeRiskFactor: number;
  } | null;
  facilities?: Array<{
    id: string;
    name: string;
    type: 'hospital' | 'police' | 'fuel' | 'service' | 'pharmacy' | 'fire';
    location: { lat: number; lng: number };
    distance: number;
  }>;
};

export type InsertManager = z.infer<typeof insertManagerSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertEmergency = z.infer<typeof insertEmergencySchema>;
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;
export type InsertServiceLog = z.infer<typeof insertServiceLogSchema>;
export type InsertEmergencyFacility = z.infer<typeof insertEmergencyFacilitySchema>;
export type InsertLocationHistory = z.infer<typeof insertLocationHistorySchema>;

// Route safety insert types
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertSafetyMetrics = z.infer<typeof insertSafetyMetricsSchema>;
export type InsertDangerZone = z.infer<typeof insertDangerZoneSchema>;
export type InsertRouteDangerZone = z.infer<typeof insertRouteDangerZoneSchema>;
export type InsertAccidentRecord = z.infer<typeof insertAccidentRecordSchema>;
export type InsertCrimeRecord = z.infer<typeof insertCrimeRecordSchema>;
export type InsertRoadConditionRecord = z.infer<typeof insertRoadConditionRecordSchema>;

// Auth Types
export type LoginRequest = { username: string; password: string };
export type DriverLoginRequest = { temporaryUsername: string; temporaryPassword: string };

// Enhanced Types for Vehicle Records
export interface VehicleRecord {
  vehicleNumber: string;
  ownerInfo: {
    name: string;
    phone: string;
  };
  insurance: {
    number: string;
    expiry: Date;
  };
  registration: {
    expiry: Date;
  };
  medicalInfo?: {
    conditions: string[];
    medications: string[];
    allergies: string[];
  };
  iceContacts: {
    name: string;
    relationship: string;
    phone: string;
    priority: number;
  }[];
}

// Location Services Types
export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  accuracy?: number;
}

export interface NearbyFacility {
  id: number;
  name: string;
  type: "hospital" | "police" | "fuel_station" | "service_center" | "mechanic" | "pharmacy" | "clinic" | "fire_station";
  brand?: string; // For fuel stations
  address: string;
  city: string;
  state: string;
  phoneNumber: string;
  emergencyPhone?: string;
  distance: number; // in km
  latitude: number;
  longitude: number;
  services?: string[];
  availability: string;
  rating?: number;
}

// Accident Hotspot Types
export interface AccidentHotspot {
  name: string;
  coordinates: { lat: number; lng: number };
  radius: number; // km
  accidentCount: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
  state: string;
}

// Route Types
export interface RoutePoint {
  lat: number;
  lng: number;
  address?: string;
}

// Indian States
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh"
] as const;

// Fuel Brands
export const FUEL_BRANDS = [
  "Indian Oil",
  "Bharat Petroleum (BPCL)",
  "Hindustan Petroleum (HPCL)",
  "Shell",
  "Reliance Petroleum",
  "Essar Oil",
  "Nayara Energy",
  "Jio-BP"
] as const;