# Requirements Document

## Introduction

The Smart Route Optimization and Safety Analytics System enhances an ambulance management platform by providing intelligent route selection, real-time safety analysis, and comprehensive fleet monitoring. The system uses machine learning to analyze route safety based on accident history, crime data, road conditions, and time-based risk factors. It provides managers with route comparison tools during trip assignment and drivers with real-time safety alerts during navigation.

## Glossary

- **Trip_Assignment_System**: The component that allows managers to assign ambulance trips to drivers
- **Route_Analyzer**: The component that discovers and compares all possible routes between two locations
- **Safety_ML_Engine**: The machine learning component that calculates safety scores for routes and zones
- **Manager_Dashboard**: The web interface used by managers to monitor and assign trips
- **Driver_Dashboard**: The mobile/web interface used by drivers to view assigned routes and navigate
- **Live_Monitoring_Page**: The manager dashboard page that displays real-time vehicle locations and status
- **Danger_Zone**: A geographic area identified as high-risk based on accident frequency, crime rate, or road conditions
- **Route_Comparison_View**: The interface that displays multiple route options with safety metrics
- **Facility_Detector**: The component that identifies and displays nearby service facilities
- **GPS_Location_Service**: The service that captures and tracks vehicle positions
- **Travel_Path_History**: The recorded trail of vehicle movement during a trip
- **Safety_Alert**: A warning notification displayed when a vehicle approaches or enters a danger zone
- **Accident_Frequency_Score**: A metric representing the historical number of accidents in a zone
- **Crime_Zone_Weight**: A metric representing the crime risk level in a geographic area
- **Road_Condition_Score**: A metric representing the quality and safety of road infrastructure
- **Time_Risk_Factor**: A metric representing time-based risk variations (day/night, rush hour, etc.)

## Requirements

### Requirement 1: Trip Location Input

**User Story:** As a manager, I want to specify trip start and drop locations using GPS or manual input, so that I can quickly assign trips with accurate location data.

#### Acceptance Criteria

1. WHEN assigning a trip, THE Trip_Assignment_System SHALL automatically populate the start location with the ambulance's current GPS coordinates
2. THE Trip_Assignment_System SHALL allow the manager to manually override the start location by entering an address
3. THE Trip_Assignment_System SHALL allow the manager to manually override the start location by selecting a point on an interactive map
4. THE Trip_Assignment_System SHALL allow the manager to enter the drop location as a full address
5. THE Trip_Assignment_System SHALL allow the manager to search and select the drop location on an interactive map
6. WHEN a location is entered manually, THE Trip_Assignment_System SHALL validate that the location is geocodable
7. WHEN a location is selected on the map, THE Trip_Assignment_System SHALL display the corresponding address

### Requirement 2: Multi-Route Discovery and Display

**User Story:** As a manager, I want to see all possible routes between start and drop locations, so that I can make informed decisions about trip assignments.

#### Acceptance Criteria

1. WHEN a manager assigns a trip with valid start and drop locations, THE Route_Analyzer SHALL discover all available routes between the locations
2. THE Route_Analyzer SHALL display all discovered routes simultaneously on the map interface
3. WHEN multiple routes exist, THE Route_Comparison_View SHALL display each route with a distinct visual identifier
4. THE Route_Comparison_View SHALL display the estimated travel time for each route
5. THE Route_Comparison_View SHALL display the total distance for each route

### Requirement 3: ML-Based Safety Analysis for Multiple Routes

**User Story:** As a manager, I want the system to analyze and compare route safety using machine learning, so that I can assign the safest route to drivers.

#### Acceptance Criteria

1. WHEN multiple routes exist between two locations, THE Safety_ML_Engine SHALL calculate an Accident_Frequency_Score for each route
2. WHEN multiple routes exist between two locations, THE Safety_ML_Engine SHALL calculate a Crime_Zone_Weight for each route
3. WHEN multiple routes exist between two locations, THE Safety_ML_Engine SHALL calculate a Road_Condition_Score for each route
4. WHEN multiple routes exist between two locations, THE Safety_ML_Engine SHALL calculate a Time_Risk_Factor for each route based on current time
5. THE Safety_ML_Engine SHALL compute an overall safety score for each route by combining all calculated metrics
6. THE Route_Comparison_View SHALL visually highlight the route with the highest safety score as the recommended safest route
7. THE Route_Comparison_View SHALL display all safety metrics for each route in a comparable format
8. WHEN a route passes through identified danger zones, THE Route_Comparison_View SHALL mark those zones on the map
9. THE Route_Comparison_View SHALL display accident-prone areas along each route with visual indicators

### Requirement 4: Single Route Safety Analysis

**User Story:** As a manager, I want the system to identify danger zones even when only one route exists, so that drivers can be warned about hazardous areas.

#### Acceptance Criteria

1. WHEN only one route exists between two locations, THE Safety_ML_Engine SHALL analyze the route for accident-prone zones
2. WHEN only one route exists between two locations, THE Safety_ML_Engine SHALL mark all identified danger zones on the route map
3. WHEN danger zones are detected on a single route, THE Route_Comparison_View SHALL display visual markers at each danger zone location
4. WHEN danger zones are detected on a single route, THE Route_Comparison_View SHALL display the safety metrics for the route
5. THE Route_Comparison_View SHALL display a warning message indicating the presence of danger zones on the route

### Requirement 5: Live Vehicle Monitoring Enhancement

**User Story:** As a manager, I want to view detailed real-time information about each vehicle, so that I can monitor trip progress and safety.

#### Acceptance Criteria

1. THE Live_Monitoring_Page SHALL display all active vehicles on an interactive map
2. WHEN a manager clicks on a vehicle marker, THE Live_Monitoring_Page SHALL display the vehicle's complete assigned route
3. WHEN a manager clicks on a vehicle marker, THE Live_Monitoring_Page SHALL display the vehicle's current GPS location
4. WHEN a manager clicks on a vehicle marker, THE Live_Monitoring_Page SHALL display the Travel_Path_History showing where the vehicle has traveled
5. WHEN a manager clicks on a vehicle marker, THE Live_Monitoring_Page SHALL display all marked danger zones along the vehicle's route
6. THE Live_Monitoring_Page SHALL update vehicle positions in real-time as GPS data is received
7. THE Live_Monitoring_Page SHALL visually distinguish between the planned route, traveled path, and remaining route

### Requirement 6: Driver Navigation Interface

**User Story:** As a driver, I want to see my assigned route with safety warnings, so that I can navigate safely and be prepared for dangerous areas.

#### Acceptance Criteria

1. WHEN a trip is assigned to a driver, THE Driver_Dashboard SHALL display the complete route as a line on the map
2. THE Driver_Dashboard SHALL display a moving vehicle marker representing the driver's current location
3. THE Driver_Dashboard SHALL update the vehicle marker position in real-time as GPS location changes
4. THE Driver_Dashboard SHALL highlight all danger zones along the route with visual indicators
5. WHEN the vehicle approaches within a defined threshold distance of a danger zone, THE Driver_Dashboard SHALL display a Safety_Alert with the message "Slow down – High accident zone ahead"
6. THE Driver_Dashboard SHALL maintain the Safety_Alert visibility while the vehicle is within the danger zone
7. WHEN the vehicle exits a danger zone, THE Driver_Dashboard SHALL remove the Safety_Alert for that zone

### Requirement 7: Nearby Facilities Detection

**User Story:** As a driver or manager, I want to see nearby service facilities on the map, so that I can quickly locate assistance if needed.

#### Acceptance Criteria

1. THE Facility_Detector SHALL identify fuel stations within a configurable radius of the current route
2. THE Facility_Detector SHALL identify vehicle garages within a configurable radius of the current route
3. THE Facility_Detector SHALL identify service centres within a configurable radius of the current route
4. THE Facility_Detector SHALL identify mechanic shops within a configurable radius of the current route
5. THE Facility_Detector SHALL identify police stations within a configurable radius of the current route
6. THE Facility_Detector SHALL identify hospitals within a configurable radius of the current route
7. THE Manager_Dashboard SHALL display all detected facilities on the map with distinct icons for each facility type
8. THE Driver_Dashboard SHALL display all detected facilities on the map with distinct icons for each facility type
9. WHEN a user clicks on a facility marker, THE system SHALL display the facility name, type, and contact information if available

### Requirement 8: Route Recommendation to Driver

**User Story:** As a manager, I want to send the recommended safest route to the driver, so that the driver follows the optimal path.

#### Acceptance Criteria

1. WHEN a manager selects a route from the Route_Comparison_View, THE Trip_Assignment_System SHALL assign that route to the driver
2. WHEN multiple routes exist and the manager does not manually select a route, THE Trip_Assignment_System SHALL automatically assign the route with the highest safety score
3. WHEN a route is assigned to a driver, THE Trip_Assignment_System SHALL transmit the complete route data to the Driver_Dashboard
4. WHEN a route is assigned to a driver, THE Trip_Assignment_System SHALL transmit all identified danger zones to the Driver_Dashboard
5. THE Driver_Dashboard SHALL receive and display the assigned route within 5 seconds of assignment

### Requirement 9: Safety Data Collection and Learning

**User Story:** As a system administrator, I want the ML engine to continuously learn from new safety data, so that route safety predictions improve over time.

#### Acceptance Criteria

1. THE Safety_ML_Engine SHALL accept updates to accident frequency data from external data sources
2. THE Safety_ML_Engine SHALL accept updates to crime zone data from external data sources
3. THE Safety_ML_Engine SHALL accept updates to road condition data from external data sources
4. WHEN new safety data is received, THE Safety_ML_Engine SHALL update its safety scoring models within 24 hours
5. THE Safety_ML_Engine SHALL maintain a historical record of safety scores for audit purposes

### Requirement 10: Map Interaction and Visualization

**User Story:** As a user, I want intuitive map controls and clear visual distinctions, so that I can easily understand route information and safety indicators.

#### Acceptance Criteria

1. THE Manager_Dashboard SHALL support map zoom, pan, and rotation controls
2. THE Driver_Dashboard SHALL support map zoom, pan, and rotation controls
3. THE system SHALL use distinct colors to differentiate between multiple route options
4. THE system SHALL use a consistent visual style to mark danger zones across all interfaces
5. THE system SHALL use a consistent visual style to mark accident-prone areas across all interfaces
6. WHEN displaying overlapping routes, THE system SHALL ensure all routes remain visually distinguishable
7. THE system SHALL display a legend explaining all map symbols, colors, and markers
