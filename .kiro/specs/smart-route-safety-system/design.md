# Design Document: Smart Route Optimization and Safety Analytics System

## Overview

The Smart Route Optimization and Safety Analytics System is a comprehensive enhancement to an existing ambulance management platform that provides intelligent route selection, real-time safety analysis, and fleet monitoring capabilities. The system leverages machine learning to analyze route safety based on multiple risk factors including accident history, crime data, road conditions, and time-based patterns.

### System Goals

1. **Intelligent Route Selection**: Discover and compare multiple routes between locations with comprehensive safety analysis
2. **Proactive Safety Management**: Identify and warn about danger zones before vehicles encounter them
3. **Real-Time Monitoring**: Track vehicle positions and trip progress with complete visibility
4. **Driver Safety**: Provide drivers with navigation guidance and timely safety alerts
5. **Continuous Improvement**: Learn from new safety data to improve predictions over time

### Key Capabilities

- Multi-route discovery and comparison with ML-based safety scoring
- Real-time vehicle tracking with historical path visualization
- Danger zone identification and proximity-based alerting
- Nearby facility detection (fuel stations, garages, hospitals, police stations)
- Interactive map interfaces for both managers and drivers
- Automated route recommendation based on safety scores

### Integration Context

The system integrates with an existing ambulance management platform, extending the trip assignment workflow and adding new monitoring and navigation capabilities. It operates as a set of microservices that communicate with the existing platform through well-defined APIs.

## Architecture

### System Architecture Overview

The system follows a microservices architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├──────────────────────────┬──────────────────────────────────────┤
│   Manager Dashboard      │      Driver Dashboard                │
│   (Web Application)      │      (Mobile/Web Application)        │
└──────────────┬───────────┴──────────────────┬───────────────────┘
               │                               │
               │         API Gateway           │
               │    (Authentication & Routing) │
               └───────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
│ Trip Assignment│  │  Route Analysis  │  │  Live Monitoring │
│    Service     │  │     Service      │  │     Service      │
└───────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
        │                     │                      │
        │           ┌─────────▼────────┐             │
        │           │  Safety ML       │             │
        │           │    Engine        │             │
        │           └─────────┬────────┘             │
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
┌───────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
│  GPS Tracking  │  │  Facility        │  │  External Data   │
│    Service     │  │  Detection       │  │  Integration     │
└───────┬────────┘  │  Service         │  │  Service         │
        │           └─────────┬────────┘  └─────────┬────────┘
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
                    ┌─────────▼────────┐
                    │   Data Layer     │
                    │  - PostgreSQL    │
                    │  - Redis Cache   │
                    │  - TimescaleDB   │
                    └──────────────────┘
```

### Technology Stack

**Backend Services:**
- Language: Python 3.11+ (for ML integration) or Node.js (for API services)
- Framework: FastAPI (Python) or Express.js (Node.js)
- ML Framework: scikit-learn, TensorFlow/PyTorch for safety scoring models
- Task Queue: Celery with Redis for async processing

**Data Storage:**
- Primary Database: PostgreSQL 15+ with PostGIS extension for geospatial data
- Time-Series Data: TimescaleDB for GPS tracking history
- Cache Layer: Redis for real-time data and session management
- ML Model Storage: MLflow or local filesystem with versioning

**Frontend:**
- Manager Dashboard: React 18+ with TypeScript
- Driver Dashboard: React Native or Progressive Web App
- Mapping Library: Mapbox GL JS or Google Maps API
- State Management: Redux Toolkit or Zustand
- Real-Time Updates: WebSocket (Socket.io)

**External Integrations:**
- Routing Engine: OpenStreetMap with OSRM or Google Maps Directions API
- Geocoding: Google Geocoding API or Nominatim
- Facility Data: Google Places API or OpenStreetMap Overpass API
- Safety Data Sources: Government accident databases, crime statistics APIs

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌──────▼──────┐ ┌───────▼────────┐
│  API Gateway   │ │  WebSocket  │ │  Static Assets │
│   Container    │ │   Server    │ │   (CDN)        │
└───────┬────────┘ └──────┬──────┘ └────────────────┘
        │                 │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐  ┌────▼────┐  ┌────▼────┐
│Service│  │Service  │  │Service  │
│  Pod  │  │  Pod    │  │  Pod    │
└───┬───┘  └────┬────┘  └────┬────┘
    │           │            │
    └───────────┼────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│PostGIS │ │ Redis  │ │TimescaleDB│
└────────┘ └────────┘ └────────┘
```

## Components and Interfaces

### 1. Trip Assignment Service

**Responsibility:** Manages trip creation, location input, and route assignment to drivers.

**Key Functions:**
- Accept trip start/drop locations via GPS, address, or map selection
- Validate and geocode location inputs
- Coordinate with Route Analysis Service for route discovery
- Assign selected routes to drivers
- Transmit route data to Driver Dashboard

**API Endpoints:**

```typescript
POST /api/trips
  Request: {
    ambulanceId: string,
    startLocation: {
      type: 'gps' | 'address' | 'coordinates',
      value: string | { lat: number, lng: number }
    },
    dropLocation: {
      type: 'address' | 'coordinates',
      value: string | { lat: number, lng: number }
    }
  }
  Response: {
    tripId: string,
    routes: Route[],
    recommendedRouteId: string
  }

POST /api/trips/{tripId}/assign-route
  Request: {
    routeId: string,
    driverId: string
  }
  Response: {
    success: boolean,
    assignedAt: timestamp
  }

GET /api/trips/{tripId}/geocode
  Query: { address: string }
  Response: {
    coordinates: { lat: number, lng: number },
    formattedAddress: string,
    isValid: boolean
  }
```

**Internal Interfaces:**
- `LocationValidator`: Validates and geocodes location inputs
- `TripRepository`: Persists trip data to database
- `RouteAssignmentPublisher`: Publishes route assignments to message queue

### 2. Route Analysis Service

**Responsibility:** Discovers multiple routes between locations and coordinates safety analysis.

**Key Functions:**
- Query routing engine for all available routes
- Calculate route metrics (distance, estimated time)
- Coordinate with Safety ML Engine for safety scoring
- Identify and mark danger zones on routes
- Provide route comparison data

**API Endpoints:**

```typescript
POST /api/routes/discover
  Request: {
    start: { lat: number, lng: number },
    end: { lat: number, lng: number },
    vehicleType: string,
    timestamp: number
  }
  Response: {
    routes: Route[],
    dangerZones: DangerZone[]
  }

GET /api/routes/{routeId}/details
  Response: {
    routeId: string,
    geometry: GeoJSON,
    distance: number,
    estimatedTime: number,
    safetyScore: number,
    safetyMetrics: SafetyMetrics,
    dangerZones: DangerZone[]
  }
```

**Internal Interfaces:**
- `RoutingEngineClient`: Interfaces with external routing API
- `RouteComparator`: Compares and ranks routes
- `DangerZoneMapper`: Maps danger zones to route segments

### 3. Safety ML Engine

**Responsibility:** Calculates safety scores for routes using machine learning models.

**Key Functions:**
- Calculate Accident Frequency Score for route segments
- Calculate Crime Zone Weight for route areas
- Calculate Road Condition Score based on infrastructure data
- Calculate Time Risk Factor based on current time
- Combine metrics into overall safety score
- Identify danger zones along routes
- Update models with new safety data

**API Endpoints:**

```typescript
POST /api/safety/analyze-route
  Request: {
    routeGeometry: GeoJSON,
    timestamp: number,
    routeSegments: RouteSegment[]
  }
  Response: {
    overallSafetyScore: number,
    accidentFrequencyScore: number,
    crimeZoneWeight: number,
    roadConditionScore: number,
    timeRiskFactor: number,
    dangerZones: DangerZone[]
  }

POST /api/safety/update-data
  Request: {
    dataType: 'accident' | 'crime' | 'road_condition',
    data: SafetyDataUpdate[]
  }
  Response: {
    success: boolean,
    recordsProcessed: number,
    modelUpdateScheduled: boolean
  }
```

**ML Model Architecture:**

The Safety ML Engine uses an ensemble approach combining multiple models:

1. **Accident Prediction Model** (Random Forest Classifier)
   - Features: Historical accident counts, road type, weather patterns, time of day
   - Output: Accident probability score per route segment

2. **Crime Risk Model** (Gradient Boosting Regressor)
   - Features: Crime statistics, area demographics, time of day, day of week
   - Output: Crime risk score per geographic zone

3. **Road Condition Model** (Neural Network)
   - Features: Road surface quality, maintenance records, traffic volume, road width
   - Output: Road safety score per segment

4. **Time Risk Model** (Time-Series Model)
   - Features: Hour of day, day of week, season, special events
   - Output: Time-based risk multiplier

5. **Ensemble Aggregator** (Weighted Average)
   - Combines all model outputs with learned weights
   - Output: Final safety score (0-100 scale)

**Internal Interfaces:**
- `ModelRegistry`: Manages ML model versions and loading
- `FeatureExtractor`: Extracts features from route and context data
- `ScoreAggregator`: Combines individual model scores
- `DangerZoneDetector`: Identifies high-risk zones from scores

### 4. Live Monitoring Service

**Responsibility:** Provides real-time vehicle tracking and trip monitoring for managers.

**Key Functions:**
- Stream real-time vehicle positions to Manager Dashboard
- Maintain and serve vehicle travel history
- Display assigned routes and danger zones for each vehicle
- Aggregate fleet status information

**API Endpoints:**

```typescript
GET /api/monitoring/vehicles
  Response: {
    vehicles: VehicleStatus[]
  }

GET /api/monitoring/vehicles/{vehicleId}
  Response: {
    vehicleId: string,
    currentLocation: { lat: number, lng: number },
    assignedRoute: Route,
    travelHistory: GeoJSON,
    dangerZones: DangerZone[],
    status: 'active' | 'idle' | 'emergency',
    lastUpdate: timestamp
  }

WebSocket /ws/monitoring
  Events: {
    'vehicle:position': VehiclePositionUpdate,
    'vehicle:status': VehicleStatusUpdate,
    'trip:completed': TripCompletionEvent
  }
```

**Internal Interfaces:**
- `VehicleTracker`: Maintains current vehicle states
- `PathHistoryManager`: Stores and retrieves travel paths
- `WebSocketBroadcaster`: Pushes updates to connected clients

### 5. GPS Tracking Service

**Responsibility:** Captures, validates, and stores vehicle GPS data.

**Key Functions:**
- Receive GPS coordinates from vehicle devices
- Validate and filter GPS data quality
- Store location history in time-series database
- Detect proximity to danger zones
- Trigger safety alerts when approaching danger zones

**API Endpoints:**

```typescript
POST /api/gps/location
  Request: {
    vehicleId: string,
    location: { lat: number, lng: number },
    timestamp: number,
    accuracy: number,
    speed: number,
    heading: number
  }
  Response: {
    success: boolean,
    proximityAlerts: SafetyAlert[]
  }

GET /api/gps/history/{vehicleId}
  Query: { startTime: number, endTime: number }
  Response: {
    locations: LocationPoint[],
    totalDistance: number
  }
```

**Internal Interfaces:**
- `GPSValidator`: Validates GPS data quality
- `LocationRepository`: Stores GPS data in TimescaleDB
- `ProximityDetector`: Checks distance to danger zones
- `AlertTrigger`: Generates safety alerts

### 6. Facility Detection Service

**Responsibility:** Identifies and provides information about nearby service facilities.

**Key Functions:**
- Query external APIs for facility locations
- Filter facilities by type and proximity to route
- Cache facility data for performance
- Provide facility details and contact information

**API Endpoints:**

```typescript
POST /api/facilities/search
  Request: {
    routeGeometry: GeoJSON,
    radius: number,
    facilityTypes: ('fuel' | 'garage' | 'service' | 'mechanic' | 'police' | 'hospital')[]
  }
  Response: {
    facilities: Facility[]
  }

GET /api/facilities/{facilityId}
  Response: {
    facilityId: string,
    name: string,
    type: string,
    location: { lat: number, lng: number },
    address: string,
    phone: string,
    hours: string,
    rating: number
  }
```

**Internal Interfaces:**
- `FacilityAPIClient`: Interfaces with external facility APIs
- `FacilityCache`: Caches facility data in Redis
- `ProximityCalculator`: Calculates distances to route

### 7. External Data Integration Service

**Responsibility:** Ingests safety data from external sources for ML model training.

**Key Functions:**
- Fetch accident data from government databases
- Fetch crime statistics from law enforcement APIs
- Fetch road condition data from transportation departments
- Transform and normalize data for ML engine
- Schedule periodic data updates

**API Endpoints:**

```typescript
POST /api/data-integration/sync
  Request: {
    dataSource: string,
    dataType: 'accident' | 'crime' | 'road_condition',
    dateRange: { start: string, end: string }
  }
  Response: {
    jobId: string,
    status: 'queued' | 'processing' | 'completed'
  }

GET /api/data-integration/jobs/{jobId}
  Response: {
    jobId: string,
    status: string,
    recordsProcessed: number,
    errors: string[]
  }
```

**Internal Interfaces:**
- `DataSourceConnector`: Connects to external data sources
- `DataTransformer`: Normalizes data formats
- `DataValidator`: Validates data quality
- `MLDataPipeline`: Prepares data for ML training

## Data Models

### Core Entities

#### Trip
```typescript
interface Trip {
  tripId: string;
  ambulanceId: string;
  driverId: string;
  startLocation: Location;
  dropLocation: Location;
  assignedRoute: Route | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: timestamp;
  assignedAt: timestamp | null;
  completedAt: timestamp | null;
  createdBy: string; // Manager ID
}
```

#### Location
```typescript
interface Location {
  lat: number;
  lng: number;
  address: string | null;
  inputType: 'gps' | 'address' | 'map_selection';
}
```

#### Route
```typescript
interface Route {
  routeId: string;
  tripId: string;
  geometry: GeoJSON; // LineString
  distance: number; // meters
  estimatedTime: number; // seconds
  safetyScore: number; // 0-100
  safetyMetrics: SafetyMetrics;
  dangerZones: DangerZone[];
  isRecommended: boolean;
  createdAt: timestamp;
}
```

#### SafetyMetrics
```typescript
interface SafetyMetrics {
  accidentFrequencyScore: number; // 0-100
  crimeZoneWeight: number; // 0-100
  roadConditionScore: number; // 0-100
  timeRiskFactor: number; // 0-100
  overallSafetyScore: number; // 0-100
  calculatedAt: timestamp;
}
```

#### DangerZone
```typescript
interface DangerZone {
  zoneId: string;
  location: { lat: number, lng: number };
  radius: number; // meters
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskType: 'accident_prone' | 'high_crime' | 'poor_road' | 'combined';
  accidentCount: number;
  crimeIncidents: number;
  roadConditionIssues: string[];
  alertThresholdDistance: number; // meters
  description: string;
}
```

#### VehicleStatus
```typescript
interface VehicleStatus {
  vehicleId: string;
  ambulanceId: string;
  currentLocation: Location;
  assignedTrip: Trip | null;
  assignedRoute: Route | null;
  travelHistory: GeoJSON; // LineString of traveled path
  status: 'active' | 'idle' | 'emergency' | 'offline';
  speed: number; // km/h
  heading: number; // degrees
  lastUpdate: timestamp;
}
```

#### LocationPoint
```typescript
interface LocationPoint {
  vehicleId: string;
  location: { lat: number, lng: number };
  timestamp: timestamp;
  accuracy: number; // meters
  speed: number; // km/h
  heading: number; // degrees
  altitude: number | null; // meters
}
```

#### SafetyAlert
```typescript
interface SafetyAlert {
  alertId: string;
  vehicleId: string;
  dangerZone: DangerZone;
  distance: number; // meters to danger zone
  message: string;
  severity: 'warning' | 'critical';
  triggeredAt: timestamp;
  acknowledgedAt: timestamp | null;
}
```

#### Facility
```typescript
interface Facility {
  facilityId: string;
  name: string;
  type: 'fuel' | 'garage' | 'service' | 'mechanic' | 'police' | 'hospital';
  location: { lat: number, lng: number };
  address: string;
  phone: string | null;
  hours: string | null;
  rating: number | null;
  distanceFromRoute: number; // meters
  externalId: string; // ID from external API
  lastUpdated: timestamp;
}
```

### ML Training Data Models

#### AccidentRecord
```typescript
interface AccidentRecord {
  recordId: string;
  location: { lat: number, lng: number };
  timestamp: timestamp;
  severity: 'minor' | 'moderate' | 'severe' | 'fatal';
  roadType: string;
  weatherCondition: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  vehiclesInvolved: number;
  source: string;
}
```

#### CrimeRecord
```typescript
interface CrimeRecord {
  recordId: string;
  location: { lat: number, lng: number };
  timestamp: timestamp;
  crimeType: string;
  severity: 'low' | 'medium' | 'high';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  source: string;
}
```

#### RoadConditionRecord
```typescript
interface RoadConditionRecord {
  recordId: string;
  roadSegmentId: string;
  geometry: GeoJSON; // LineString
  surfaceQuality: 'excellent' | 'good' | 'fair' | 'poor';
  maintenanceDate: timestamp | null;
  trafficVolume: 'low' | 'medium' | 'high';
  roadWidth: number; // meters
  laneCount: number;
  hasStreetLights: boolean;
  issues: string[]; // potholes, cracks, flooding, etc.
  lastInspected: timestamp;
}
```

### Database Schema

**PostgreSQL with PostGIS:**

```sql
-- Trips table
CREATE TABLE trips (
  trip_id UUID PRIMARY KEY,
  ambulance_id VARCHAR(50) NOT NULL,
  driver_id VARCHAR(50),
  start_location GEOGRAPHY(POINT, 4326) NOT NULL,
  start_address TEXT,
  drop_location GEOGRAPHY(POINT, 4326) NOT NULL,
  drop_address TEXT,
  assigned_route_id UUID,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(50) NOT NULL
);

-- Routes table
CREATE TABLE routes (
  route_id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(trip_id),
  geometry GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  distance NUMERIC NOT NULL,
  estimated_time INTEGER NOT NULL,
  safety_score NUMERIC(5,2),
  is_recommended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
);

-- Safety metrics table
CREATE TABLE safety_metrics (
  metric_id UUID PRIMARY KEY,
  route_id UUID REFERENCES routes(route_id),
  accident_frequency_score NUMERIC(5,2),
  crime_zone_weight NUMERIC(5,2),
  road_condition_score NUMERIC(5,2),
  time_risk_factor NUMERIC(5,2),
  overall_safety_score NUMERIC(5,2),
  calculated_at TIMESTAMPTZ NOT NULL
);

-- Danger zones table
CREATE TABLE danger_zones (
  zone_id UUID PRIMARY KEY,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius NUMERIC NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  risk_type VARCHAR(50) NOT NULL,
  accident_count INTEGER DEFAULT 0,
  crime_incidents INTEGER DEFAULT 0,
  alert_threshold_distance NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Route danger zones junction table
CREATE TABLE route_danger_zones (
  route_id UUID REFERENCES routes(route_id),
  zone_id UUID REFERENCES danger_zones(zone_id),
  PRIMARY KEY (route_id, zone_id)
);

-- Facilities table
CREATE TABLE facilities (
  facility_id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  hours TEXT,
  rating NUMERIC(2,1),
  external_id VARCHAR(255),
  last_updated TIMESTAMPTZ NOT NULL
);

-- Accident records table
CREATE TABLE accident_records (
  record_id UUID PRIMARY KEY,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  severity VARCHAR(20) NOT NULL,
  road_type VARCHAR(50),
  weather_condition VARCHAR(50),
  time_of_day VARCHAR(20),
  day_of_week VARCHAR(20),
  vehicles_involved INTEGER,
  source VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL
);

-- Crime records table
CREATE TABLE crime_records (
  record_id UUID PRIMARY KEY,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  crime_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  time_of_day VARCHAR(20),
  day_of_week VARCHAR(20),
  source VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL
);

-- Road condition records table
CREATE TABLE road_condition_records (
  record_id UUID PRIMARY KEY,
  road_segment_id VARCHAR(100),
  geometry GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  surface_quality VARCHAR(20),
  maintenance_date TIMESTAMPTZ,
  traffic_volume VARCHAR(20),
  road_width NUMERIC,
  lane_count INTEGER,
  has_street_lights BOOLEAN,
  issues JSONB,
  last_inspected TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

-- Spatial indexes
CREATE INDEX idx_trips_start_location ON trips USING GIST(start_location);
CREATE INDEX idx_trips_drop_location ON trips USING GIST(drop_location);
CREATE INDEX idx_routes_geometry ON routes USING GIST(geometry);
CREATE INDEX idx_danger_zones_location ON danger_zones USING GIST(location);
CREATE INDEX idx_facilities_location ON facilities USING GIST(location);
CREATE INDEX idx_accident_records_location ON accident_records USING GIST(location);
CREATE INDEX idx_crime_records_location ON crime_records USING GIST(location);
CREATE INDEX idx_road_condition_records_geometry ON road_condition_records USING GIST(geometry);
```

**TimescaleDB (for GPS tracking):**

```sql
-- Location points table (hypertable)
CREATE TABLE location_points (
  vehicle_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  altitude NUMERIC
);

-- Convert to hypertable
SELECT create_hypertable('location_points', 'timestamp');

-- Indexes
CREATE INDEX idx_location_points_vehicle_time ON location_points (vehicle_id, timestamp DESC);
CREATE INDEX idx_location_points_location ON location_points USING GIST(location);

-- Safety alerts table
CREATE TABLE safety_alerts (
  alert_id UUID PRIMARY KEY,
  vehicle_id VARCHAR(50) NOT NULL,
  zone_id UUID NOT NULL,
  distance NUMERIC NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_safety_alerts_vehicle ON safety_alerts (vehicle_id, triggered_at DESC);
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Location Input Acceptance

For any valid location input (GPS coordinates, address string, or map coordinates), the Trip Assignment System should accept and successfully geocode the location, producing valid latitude/longitude coordinates.

**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: Reverse Geocoding Completeness

For any valid geographic coordinates selected on a map, the system should return a human-readable address string through reverse geocoding.

**Validates: Requirements 1.7**

### Property 3: Route Discovery Non-Empty

For any pair of valid, reachable locations, the Route Analyzer should discover at least one valid route between them.

**Validates: Requirements 2.1**

### Property 4: Route Display Completeness

For any discovered route, the Route Comparison View should display all required information: geometry on map, estimated travel time, total distance, and all safety metrics.

**Validates: Requirements 2.2, 2.4, 2.5, 3.7**

### Property 5: Route Visual Distinctiveness

For any set of multiple routes displayed simultaneously, each route should have a unique visual identifier (color, pattern, or style) such that no two routes share the same identifier.

**Validates: Requirements 2.3, 10.3, 10.6**

### Property 6: Safety Metrics Completeness

For any route geometry and timestamp, the Safety ML Engine should calculate all four safety metrics (accident frequency score, crime zone weight, road condition score, and time risk factor) and produce an overall safety score.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1**

### Property 7: Safety Score Composition

For any route with individual safety metric scores, the overall safety score should be a deterministic function of those individual scores (weighted combination), ensuring consistency in scoring.

**Validates: Requirements 3.5**

### Property 8: Recommended Route Selection

For any set of routes with calculated safety scores, the route with the highest safety score should be marked as the recommended route and visually highlighted.

**Validates: Requirements 3.6, 8.2**

### Property 9: Danger Zone Display

For any route that intersects with or passes near identified danger zones, all such danger zones should be displayed on the map with visual markers.

**Validates: Requirements 3.8, 3.9, 4.2, 4.3, 6.4**

### Property 10: Danger Zone Warning Presence

For any route containing one or more danger zones, a warning message should be displayed to alert users of the presence of hazardous areas.

**Validates: Requirements 4.5**

### Property 11: Active Vehicle Display

For any set of vehicles with status 'active', all such vehicles should be displayed on the Live Monitoring Page map.

**Validates: Requirements 5.1**

### Property 12: Vehicle Detail Completeness

For any vehicle clicked on the Live Monitoring Page, the system should display all available vehicle information: current GPS location, assigned route (if any), travel history, and danger zones along the route.

**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

### Property 13: Real-Time Position Update

For any vehicle receiving a new GPS location update, the displayed position on both Manager Dashboard and Driver Dashboard should update to reflect the new location within the real-time update interval.

**Validates: Requirements 5.6, 6.3**

### Property 14: Path Visual Distinction

For any vehicle in progress on a trip, the Live Monitoring Page should visually distinguish between three path types: planned route (not yet traveled), traveled path (already covered), and remaining route (yet to travel), using distinct visual styles.

**Validates: Requirements 5.7**

### Property 15: Driver Route Display

For any route assigned to a driver, the Driver Dashboard should display the complete route geometry as a line on the map.

**Validates: Requirements 6.1**

### Property 16: Driver Position Marker

For any driver with current GPS data, the Driver Dashboard should display a vehicle marker at the driver's current location.

**Validates: Requirements 6.2**

### Property 17: Proximity Alert Triggering

For any vehicle position within the defined threshold distance of a danger zone, the Driver Dashboard should display a safety alert with an appropriate warning message.

**Validates: Requirements 6.5**

### Property 18: Alert Persistence in Zone

For any vehicle whose current position is inside a danger zone boundary, the safety alert for that zone should remain visible on the Driver Dashboard.

**Validates: Requirements 6.6**

### Property 19: Alert Removal on Exit

For any vehicle that moves from inside a danger zone to outside its boundary, the safety alert for that zone should be removed from the Driver Dashboard.

**Validates: Requirements 6.7**

### Property 20: Facility Detection by Type and Proximity

For any route geometry, facility type, and search radius, the Facility Detector should return all facilities of that type whose locations are within the specified radius of any point on the route.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

### Property 21: Facility Display with Type Icons

For any set of detected facilities, both Manager Dashboard and Driver Dashboard should display all facilities on the map with distinct icons corresponding to each facility type.

**Validates: Requirements 7.7, 7.8**

### Property 22: Facility Detail Display

For any facility marker clicked by a user, the system should display the facility's details including name, type, and contact information (if available).

**Validates: Requirements 7.9**

### Property 23: Manual Route Assignment

For any route manually selected by a manager from the Route Comparison View, the Trip Assignment System should assign that specific route to the driver, regardless of safety scores.

**Validates: Requirements 8.1**

### Property 24: Route Data Transmission Completeness

For any route assigned to a driver, the Driver Dashboard should receive the complete route data including geometry, all danger zones, and safety information.

**Validates: Requirements 8.3, 8.4**

### Property 25: Safety Data Update Acceptance

For any valid safety data update (accident, crime, or road condition data) from external sources, the Safety ML Engine should accept and process the data, storing it for model training.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 26: Safety Score Audit Trail

For any safety score calculation performed by the Safety ML Engine, a historical record should be created and persisted, including the route, timestamp, individual metric scores, and overall score.

**Validates: Requirements 9.5**

### Property 27: Visual Style Consistency

For any danger zone or accident-prone area displayed on any interface (Manager Dashboard, Driver Dashboard, or Live Monitoring Page), the visual style (color, icon, marker type) should be consistent across all interfaces.

**Validates: Requirements 10.4, 10.5**

## Error Handling

### Location Input Errors

**Invalid Address Input:**
- Scenario: User enters an address that cannot be geocoded
- Handling: Display clear error message "Unable to locate address. Please verify and try again."
- Recovery: Allow user to retry with corrected address or switch to map selection

**Invalid Coordinates:**
- Scenario: Coordinates are outside valid ranges (lat: -90 to 90, lng: -180 to 180)
- Handling: Reject input with error "Invalid coordinates provided"
- Recovery: Validate input before submission, provide range hints

**Geocoding Service Failure:**
- Scenario: External geocoding API is unavailable or times out
- Handling: Retry with exponential backoff (3 attempts), then display "Geocoding service temporarily unavailable"
- Recovery: Cache recent geocoding results, allow manual coordinate entry as fallback

### Route Discovery Errors

**No Routes Found:**
- Scenario: Routing engine cannot find any path between locations
- Handling: Display "No routes available between selected locations. Please verify locations are accessible."
- Recovery: Allow user to adjust locations, check if locations are on disconnected road networks

**Routing Service Timeout:**
- Scenario: External routing API takes longer than 10 seconds
- Handling: Cancel request, display "Route calculation timed out. Please try again."
- Recovery: Retry with simplified request, use cached routes if available for similar locations

**Partial Route Data:**
- Scenario: Routing service returns incomplete route information
- Handling: Log error, attempt to fill missing data with defaults, display warning if critical data missing
- Recovery: Mark route as "incomplete" and exclude from automatic selection

### Safety Analysis Errors

**ML Model Unavailable:**
- Scenario: Safety ML Engine models fail to load or are corrupted
- Handling: Log critical error, fall back to rule-based safety scoring using historical averages
- Recovery: Alert administrators, attempt model reload, use last known good model version

**Missing Safety Data:**
- Scenario: No accident/crime/road data available for route area
- Handling: Calculate safety score using available data only, mark score as "partial" with confidence level
- Recovery: Display warning "Limited safety data available for this area"

**Safety Score Calculation Failure:**
- Scenario: Exception during score calculation
- Handling: Log error with route details, assign neutral safety score (50/100), flag for review
- Recovery: Allow route to be used but mark as "unscored" in UI

### GPS Tracking Errors

**GPS Signal Loss:**
- Scenario: Vehicle stops sending GPS updates for more than 2 minutes
- Handling: Mark vehicle as "GPS signal lost" on monitoring page, retain last known position
- Recovery: Continue displaying last position with timestamp, alert when signal restored

**Invalid GPS Data:**
- Scenario: GPS coordinates are clearly erroneous (impossible speed, location jumps)
- Handling: Reject invalid points, use GPS accuracy threshold filtering
- Recovery: Interpolate position based on last valid point and expected trajectory

**Location Update Failure:**
- Scenario: Database write fails when storing GPS point
- Handling: Queue update in Redis, retry write, alert if queue grows beyond threshold
- Recovery: Batch write queued updates when database recovers

### Real-Time Communication Errors

**WebSocket Connection Loss:**
- Scenario: Real-time connection between server and client drops
- Handling: Attempt automatic reconnection with exponential backoff
- Recovery: Fall back to polling every 5 seconds until WebSocket reconnects, display connection status

**Message Delivery Failure:**
- Scenario: Route assignment message fails to reach driver
- Handling: Retry delivery 3 times, log failure, alert manager
- Recovery: Provide manual "resend" option for manager, display delivery status

**Stale Data Detection:**
- Scenario: Client receives data with timestamp older than 30 seconds
- Handling: Display warning "Data may be outdated", show last update time
- Recovery: Force refresh from server, check network connectivity

### External Service Errors

**Facility API Failure:**
- Scenario: Facility detection service (Google Places, etc.) is unavailable
- Handling: Use cached facility data if available, display "Facility data may be outdated"
- Recovery: Retry with exponential backoff, degrade gracefully without facilities if necessary

**Safety Data Source Failure:**
- Scenario: External accident/crime data source is unavailable during scheduled sync
- Handling: Log failure, skip update, schedule retry in 1 hour
- Recovery: Continue using existing data, alert administrators if failures persist beyond 24 hours

**Map Tile Loading Failure:**
- Scenario: Map tiles fail to load from provider
- Handling: Retry failed tiles, use lower resolution tiles as fallback
- Recovery: Display error overlay on affected map areas, provide refresh option

### Data Consistency Errors

**Route-Trip Mismatch:**
- Scenario: Assigned route references non-existent trip
- Handling: Log data integrity error, prevent route assignment
- Recovery: Validate foreign key relationships before assignment, provide data repair tools

**Orphaned Danger Zones:**
- Scenario: Danger zones reference deleted or invalid locations
- Handling: Filter out invalid zones during route analysis
- Recovery: Run periodic cleanup job to remove orphaned records

**Concurrent Assignment Conflict:**
- Scenario: Two managers attempt to assign different routes to same driver simultaneously
- Handling: Use optimistic locking, reject second assignment with "Trip already assigned" error
- Recovery: Refresh UI to show current assignment, allow override if needed

### Performance Degradation

**High Load Scenario:**
- Scenario: System experiences high concurrent user load
- Handling: Implement rate limiting, queue non-critical requests, prioritize active trip operations
- Recovery: Scale horizontally, display "System busy" message with estimated wait time

**Slow Query Detection:**
- Scenario: Database queries exceed 5 second threshold
- Handling: Log slow queries, implement query timeout, return partial results if possible
- Recovery: Optimize queries, add database indexes, implement query result caching

**Memory Pressure:**
- Scenario: ML model inference consumes excessive memory
- Handling: Implement batch processing limits, clear model cache periodically
- Recovery: Scale ML service instances, implement model quantization for efficiency

## Testing Strategy

### Dual Testing Approach

The Smart Route Optimization and Safety Analytics System requires comprehensive testing using both unit tests and property-based tests. These approaches are complementary:

- **Unit tests** verify specific examples, edge cases, and error conditions with concrete test data
- **Property-based tests** verify universal properties across all inputs through randomized testing

Together, they provide comprehensive coverage: unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Framework

**Framework Selection:** We will use **Hypothesis** (Python) for backend services and **fast-check** (TypeScript) for frontend components.

**Configuration:**
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `# Feature: smart-route-safety-system, Property {number}: {property_text}`

**Example Property Test Structure (Python with Hypothesis):**

```python
from hypothesis import given, strategies as st
import pytest

# Feature: smart-route-safety-system, Property 1: Location Input Acceptance
@given(
    lat=st.floats(min_value=-90, max_value=90),
    lng=st.floats(min_value=-180, max_value=180)
)
def test_location_input_acceptance(lat, lng):
    """For any valid coordinates, the system should accept and geocode the location."""
    location = {"lat": lat, "lng": lng}
    result = trip_assignment_system.accept_location(location)
    
    assert result.is_valid
    assert result.coordinates.lat == pytest.approx(lat, abs=0.0001)
    assert result.coordinates.lng == pytest.approx(lng, abs=0.0001)

# Feature: smart-route-safety-system, Property 6: Safety Metrics Completeness
@given(
    route=st.builds(generate_random_route),
    timestamp=st.integers(min_value=0, max_value=2147483647)
)
def test_safety_metrics_completeness(route, timestamp):
    """For any route and timestamp, all safety metrics should be calculated."""
    metrics = safety_ml_engine.calculate_safety_metrics(route, timestamp)
    
    assert metrics.accident_frequency_score is not None
    assert 0 <= metrics.accident_frequency_score <= 100
    assert metrics.crime_zone_weight is not None
    assert 0 <= metrics.crime_zone_weight <= 100
    assert metrics.road_condition_score is not None
    assert 0 <= metrics.road_condition_score <= 100
    assert metrics.time_risk_factor is not None
    assert 0 <= metrics.time_risk_factor <= 100
    assert metrics.overall_safety_score is not None
    assert 0 <= metrics.overall_safety_score <= 100
```

**Example Property Test Structure (TypeScript with fast-check):**

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

// Feature: smart-route-safety-system, Property 5: Route Visual Distinctiveness
describe('Route Visual Distinctiveness', () => {
  it('should assign unique visual identifiers to all routes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          routeId: fc.uuid(),
          geometry: fc.array(fc.record({ lat: fc.float(), lng: fc.float() }))
        }), { minLength: 2, maxLength: 10 }),
        (routes) => {
          const visualIds = routeComparisonView.assignVisualIdentifiers(routes);
          const uniqueIds = new Set(visualIds.map(r => r.visualId));
          
          // All routes should have unique visual identifiers
          expect(uniqueIds.size).toBe(routes.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: smart-route-safety-system, Property 17: Proximity Alert Triggering
describe('Proximity Alert Triggering', () => {
  it('should trigger alert when vehicle is within threshold distance', () => {
    fc.assert(
      fc.property(
        fc.record({
          vehiclePosition: fc.record({ lat: fc.float(), lng: fc.float() }),
          dangerZone: fc.record({
            location: fc.record({ lat: fc.float(), lng: fc.float() }),
            radius: fc.float({ min: 10, max: 1000 }),
            alertThreshold: fc.float({ min: 50, max: 500 })
          })
        }),
        ({ vehiclePosition, dangerZone }) => {
          const distance = calculateDistance(vehiclePosition, dangerZone.location);
          const alerts = driverDashboard.checkProximityAlerts(vehiclePosition, [dangerZone]);
          
          if (distance <= dangerZone.alertThreshold) {
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].message).toContain('High accident zone ahead');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Unit Test Focus Areas:**

1. **Location Input Validation**
   - Test specific invalid addresses
   - Test boundary coordinates (poles, date line)
   - Test empty/null inputs
   - Test special characters in addresses

2. **Route Discovery Edge Cases**
   - Test identical start and end locations
   - Test locations on different continents
   - Test locations in water bodies
   - Test very close locations (<10 meters apart)

3. **Safety Score Calculation**
   - Test routes with no historical data
   - Test routes through known high-risk areas
   - Test score calculation at different times of day
   - Test score aggregation with missing metrics

4. **Danger Zone Detection**
   - Test vehicle exactly on zone boundary
   - Test vehicle at exact threshold distance
   - Test overlapping danger zones
   - Test zone entry/exit transitions

5. **Facility Detection**
   - Test routes with no nearby facilities
   - Test routes passing directly through facilities
   - Test radius boundary conditions
   - Test multiple facility types simultaneously

6. **Real-Time Updates**
   - Test WebSocket connection establishment
   - Test reconnection after network failure
   - Test message ordering and deduplication
   - Test concurrent updates from multiple vehicles

7. **Error Handling**
   - Test each error scenario documented in Error Handling section
   - Test error recovery mechanisms
   - Test graceful degradation
   - Test error message clarity

**Unit Test Example:**

```python
def test_danger_zone_boundary_detection():
    """Test vehicle detection at exact danger zone boundary."""
    danger_zone = DangerZone(
        location={"lat": 40.7128, "lng": -74.0060},
        radius=100,  # meters
        alert_threshold=150
    )
    
    # Vehicle exactly at boundary
    vehicle_at_boundary = {"lat": 40.7128, "lng": -74.0051}  # ~100m away
    distance = calculate_distance(vehicle_at_boundary, danger_zone.location)
    assert abs(distance - 100) < 1  # Within 1 meter tolerance
    
    alerts = check_proximity_alerts(vehicle_at_boundary, [danger_zone])
    assert len(alerts) == 1  # Should trigger alert (within threshold)
    
    # Vehicle just outside threshold
    vehicle_outside = {"lat": 40.7128, "lng": -74.0045}  # ~151m away
    alerts = check_proximity_alerts(vehicle_outside, [danger_zone])
    assert len(alerts) == 0  # Should not trigger alert
```

### Integration Testing

**Integration Test Scenarios:**

1. **End-to-End Trip Assignment Flow**
   - Manager creates trip → routes discovered → safety analyzed → route assigned → driver receives

2. **Real-Time Monitoring Flow**
   - Vehicle sends GPS → position updated → proximity checked → alerts triggered → dashboard updated

3. **ML Model Update Flow**
   - External data received → data validated → model retrained → new scores calculated → routes re-analyzed

4. **Multi-User Concurrent Operations**
   - Multiple managers assigning trips simultaneously
   - Multiple vehicles sending GPS updates concurrently
   - Concurrent route analysis requests

### Performance Testing

**Performance Requirements:**

1. **Route Discovery:** < 3 seconds for discovering all routes between any two locations
2. **Safety Analysis:** < 2 seconds for analyzing a single route
3. **GPS Update Processing:** < 100ms for processing and broadcasting a location update
4. **Route Assignment Delivery:** < 5 seconds from assignment to driver dashboard display
5. **Facility Search:** < 1 second for searching facilities within 5km radius
6. **Map Rendering:** < 2 seconds for initial map load with all routes and markers

**Load Testing Scenarios:**

1. 100 concurrent vehicles sending GPS updates every 5 seconds
2. 50 concurrent managers viewing live monitoring page
3. 20 concurrent route discovery and analysis requests
4. 1000 danger zones displayed on a single map

### Security Testing

**Security Test Areas:**

1. **Authentication & Authorization**
   - Test manager-only operations cannot be accessed by drivers
   - Test driver can only view their own assigned routes
   - Test API authentication token validation

2. **Input Validation**
   - Test SQL injection in address inputs
   - Test XSS in facility names and descriptions
   - Test coordinate range validation

3. **Data Privacy**
   - Test GPS location data is only accessible to authorized users
   - Test historical travel paths are properly access-controlled
   - Test audit logs capture all data access

4. **Rate Limiting**
   - Test API rate limits prevent abuse
   - Test GPS update rate limiting per vehicle
   - Test route discovery request throttling

### Monitoring and Observability

**Metrics to Track:**

1. **System Health**
   - API response times (p50, p95, p99)
   - Error rates by endpoint
   - Database query performance
   - ML model inference latency

2. **Business Metrics**
   - Routes discovered per day
   - Average safety scores
   - Danger zone alerts triggered
   - Route assignment success rate

3. **User Experience**
   - Time from trip creation to route assignment
   - GPS update frequency and accuracy
   - WebSocket connection stability
   - Map rendering performance

**Alerting Thresholds:**

- API error rate > 5%
- GPS update processing time > 500ms
- Route discovery failure rate > 10%
- ML model inference time > 5 seconds
- WebSocket disconnection rate > 20%

