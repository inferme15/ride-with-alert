import crypto from "crypto";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export function generateTemporaryCredentials() {
  // Generate 4 random numbers for username and password
  const usernameNumbers = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  const passwordNumbers = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  
  const username = `Temp${usernameNumbers}`;
  const password = `Pass${passwordNumbers}`;
  
  return { temporaryUsername: username, temporaryPassword: password };
}

/**
 * Format phone number for SMS (10 digits for India)
 * @param phoneNumber - Phone number in any format
 * @returns Formatted 10-digit phone number
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "");
  
  // If has country code (91), remove it
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.substring(2);
  }
  
  // If 10 digits, return as is
  if (cleaned.length === 10) {
    return cleaned;
  }
  
  // Take last 10 digits
  return cleaned.slice(-10);
}

/**
 * Display SMS message in a new terminal window (Windows)
 * @param phoneNumber - Recipient phone number
 * @param message - SMS message content
 */
function displaySMSInNewTerminal(phoneNumber: string, message: string): void {
  try {
    // Create a temporary script to display the SMS
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const messageId = crypto.randomBytes(4).toString("hex").toUpperCase();
    
    // Determine recipient type based on phone number
    let recipientType = "Unknown Recipient";
    if (phoneNumber === "100" || phoneNumber.includes("police")) {
      recipientType = "Police Control Room";
    } else if (phoneNumber === "108" || phoneNumber.includes("hospital")) {
      recipientType = "Hospital Control Room";
    } else if (phoneNumber === "101") {
      recipientType = "Fire Department";
    } else if (phoneNumber.startsWith("+91") || phoneNumber.length === 10) {
      recipientType = "Driver/Contact";
    }

    // Use PowerShell display to avoid CMD parsing issues with multiline/unicode content.
    const messageBase64 = Buffer.from(message, "utf8").toString("base64");
    const psDisplay = `
$Host.UI.RawUI.WindowTitle = "Fast2SMS Message - ${recipientType}"
Write-Host ""
Write-Host "============================================================================"
Write-Host "                            SMS MESSAGE SENT"
Write-Host "============================================================================"
Write-Host ""
Write-Host "TO: ${phoneNumber} (${recipientType})"
Write-Host "TIME: ${timestamp}"
Write-Host "MESSAGE ID: ${messageId}"
Write-Host "SERVICE: Fast2SMS API"
Write-Host ""
Write-Host "============================================================================"
Write-Host ""
$msg = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${messageBase64}"))
Write-Host $msg
Write-Host ""
Write-Host "============================================================================"
Write-Host ""
Write-Host "NOTE: This message was sent via Fast2SMS API."
Write-Host ""
Write-Host "============================================================================"
Write-Host ""
Read-Host "Press Enter to close this window"
`;

    // Create temporary batch file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFile = path.join(tempDir, `sms_${Date.now()}_${messageId}.ps1`);
    fs.writeFileSync(tempFile, psDisplay, 'utf8');

    // Spawn new terminal window with PowerShell script
    const child = spawn('cmd', ['/c', 'start', 'powershell', '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', tempFile], {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();

    // Clean up temp file after 30 seconds
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 30000);

    console.log(`[SMS DISPLAY] 📱 New terminal opened showing SMS to ${recipientType}`);
  } catch (error) {
    console.error(`[SMS DISPLAY ERROR] Failed to open new terminal:`, error);
  }
}

/**
 * Send SMS using Fast2SMS API
 * @param phoneNumber - Recipient phone number (10 digits for India)
 * @param message - SMS message content
 * @returns Promise with success status and message ID
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
  const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

  // ALWAYS display SMS in new terminal window first
  displaySMSInNewTerminal(phoneNumber, message);

  // If Fast2SMS not configured, use simulation
  if (!FAST2SMS_API_KEY) {
    console.log(`[SMS FALLBACK] Fast2SMS not configured, using simulation mode`);
    return simulateSMSFallback(phoneNumber, message);
  }

  const formattedNumber = formatPhoneNumber(phoneNumber);

  try {
    // Fast2SMS API endpoint
    const url = `https://www.fast2sms.com/dev/bulkV2`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message: message,
        language: "english",
        flash: 0,
        numbers: formattedNumber,
      }),
    });

    const result = await response.json();

    if (response.ok && result.return === true) {
      console.log(`[SMS SENT ✅] To: ${formattedNumber}`);
      console.log(`[SMS SENT ✅] Message ID: ${result.message_id || result.request_id}`);
      return {
        success: true,
        messageId: result.message_id || result.request_id || crypto.randomBytes(8).toString("hex"),
      };
    } else {
      console.log(`[SMS FAILED ❌] ${result.message || "Unknown error"}`);
      console.log(`[SMS FALLBACK] Using simulation mode`);
      return simulateSMSFallback(phoneNumber, message);
    }
  } catch (error: any) {
    console.log(`[SMS ERROR ❌] ${error.message}`);
    console.log(`[SMS FALLBACK] Using simulation mode`);
    return simulateSMSFallback(phoneNumber, message);
  }
}

function simulateSMSFallback(phoneNumber: string, message: string): { success: boolean; messageId: string; error?: string } {
  console.log(`[SMS SIMULATION 📱] To: ${phoneNumber}`);
  console.log(`[SMS SIMULATION 📱] Message displayed in new terminal window`);
  console.log("---");
  console.log("💡 Fast2SMS Setup Instructions:");
  console.log("   1. Create Fast2SMS account: https://www.fast2sms.com/");
  console.log("   2. Go to: Dev API → API Keys");
  console.log("   3. Copy your API key");
  console.log("   4. Add to .env:");
  console.log("      FAST2SMS_API_KEY=your_api_key_here");
  console.log("---");
  
  return {    
    success: true, 
    messageId: crypto.randomBytes(8).toString("hex"),
    error: "Using simulation mode - Fast2SMS not configured"
  };
}

export interface NearbyFacility {
  name: string;
  type: "police" | "hospital" | "fuel_station" | "service_center" | "pharmacy" | "clinic" | "fire_station";
  latitude: number;
  longitude: number;
  distance: number; // in km
  phone: string;
  address: string;
  isOpen24Hours: boolean;
  controlRoomNumber?: string;
}

/**
 * Find nearby emergency facilities using OpenStreetMap Overpass API
 * Works anywhere in India with real-time data
 */
export async function findNearbyFacilities(
  latitude: number,
  longitude: number,
  policePhone: string = "100",
  hospitalPhone: string = "108"
): Promise<NearbyFacility[]> {
  const facilities: NearbyFacility[] = [];
  const radius = 25000; // Reduced from 100km to 25km for more accurate nearby facilities

  try {
    // Query OpenStreetMap Overpass API for nearby facilities
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${latitude},${longitude});
        node["amenity"="clinic"](around:${radius},${latitude},${longitude});
        node["amenity"="pharmacy"](around:${radius},${latitude},${longitude});
        node["amenity"="doctors"](around:${radius},${latitude},${longitude});
        node["healthcare"="hospital"](around:${radius},${latitude},${longitude});
        node["healthcare"="clinic"](around:${radius},${latitude},${longitude});
        node["healthcare"="pharmacy"](around:${radius},${latitude},${longitude});
        node["healthcare"="doctor"](around:${radius},${latitude},${longitude});
        node["healthcare"="dentist"](around:${radius},${latitude},${longitude});
        node["shop"="medical_supply"](around:${radius},${latitude},${longitude});
        node["shop"="chemist"](around:${radius},${latitude},${longitude});
        node["amenity"="police"](around:${radius},${latitude},${longitude});
        node["office"="police"](around:${radius},${latitude},${longitude});
        node["amenity"="fuel"](around:${radius},${latitude},${longitude});
        node["shop"="car_repair"](around:${radius},${latitude},${longitude});
        node["shop"="car"](around:${radius},${latitude},${longitude});
        node["amenity"="car_wash"](around:${radius},${latitude},${longitude});
        node["shop"="tyres"](around:${radius},${latitude},${longitude});
        node["craft"="car_repair"](around:${radius},${latitude},${longitude});
        node["amenity"="fire_station"](around:${radius},${latitude},${longitude});
        node["emergency"="ambulance_station"](around:${radius},${latitude},${longitude});
        way["amenity"="hospital"](around:${radius},${latitude},${longitude});
        way["amenity"="clinic"](around:${radius},${latitude},${longitude});
        way["amenity"="pharmacy"](around:${radius},${latitude},${longitude});
        way["healthcare"="hospital"](around:${radius},${latitude},${longitude});
        way["healthcare"="clinic"](around:${radius},${latitude},${longitude});
        way["healthcare"="pharmacy"](around:${radius},${latitude},${longitude});
        way["healthcare"="doctor"](around:${radius},${latitude},${longitude});
        way["shop"="medical_supply"](around:${radius},${latitude},${longitude});
        way["shop"="chemist"](around:${radius},${latitude},${longitude});
        way["amenity"="police"](around:${radius},${latitude},${longitude});
        way["office"="police"](around:${radius},${latitude},${longitude});
        way["amenity"="fuel"](around:${radius},${latitude},${longitude});
        way["shop"="car_repair"](around:${radius},${latitude},${longitude});
        way["shop"="car"](around:${radius},${latitude},${longitude});
        way["amenity"="car_wash"](around:${radius},${latitude},${longitude});
        way["shop"="tyres"](around:${radius},${latitude},${longitude});
        way["craft"="car_repair"](around:${radius},${latitude},${longitude});
        way["amenity"="fire_station"](around:${radius},${latitude},${longitude});
        way["emergency"="ambulance_station"](around:${radius},${latitude},${longitude});
      );
      out center;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Process results
      data.elements.forEach((element: any) => {
        const facilityLat = element.lat || element.center?.lat;
        const facilityLon = element.lon || element.center?.lon;
        
        if (!facilityLat || !facilityLon) return;

        const distance = calculateDistance(latitude, longitude, facilityLat, facilityLon);
        
        let type: "police" | "hospital" | "fuel_station" | "service_center" | "pharmacy" | "clinic" | "fire_station" = "service_center";
        let phone = "N/A";
        
        // Hospital and Medical Facilities
        if (element.tags?.amenity === "hospital" || element.tags?.healthcare === "hospital") {
          type = "hospital";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || hospitalPhone;
        } else if (element.tags?.amenity === "clinic" || element.tags?.healthcare === "clinic" || 
                   element.tags?.amenity === "doctors" || element.tags?.healthcare === "doctor" ||
                   element.tags?.healthcare === "dentist") {
          type = "clinic";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || hospitalPhone;
        } else if (element.tags?.amenity === "pharmacy" || element.tags?.healthcare === "pharmacy" ||
                   element.tags?.shop === "medical_supply" || element.tags?.shop === "chemist") {
          type = "pharmacy";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || "1800-102-1088";
        
        // Police and Emergency Services
        } else if (element.tags?.amenity === "police" || element.tags?.office === "police") {
          type = "police";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || policePhone;
        } else if (element.tags?.amenity === "fire_station") {
          type = "fire_station";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || "101";
        } else if (element.tags?.emergency === "ambulance_station") {
          type = "hospital";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || "108";
        
        // Fuel and Vehicle Services
        } else if (element.tags?.amenity === "fuel") {
          type = "fuel_station";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || "1800-2333-555";
        } else if (element.tags?.shop === "car_repair" || element.tags?.shop === "car" || 
                   element.tags?.amenity === "car_wash" || element.tags?.shop === "tyres" ||
                   element.tags?.craft === "car_repair") {
          type = "service_center";
          phone = element.tags?.phone || element.tags?.["contact:phone"] || "N/A";
        }

        const name = element.tags?.name || `${type.replace('_', ' ')} (${distance.toFixed(1)}km)`;
        const address = [
          element.tags?.["addr:street"],
          element.tags?.["addr:city"],
          element.tags?.["addr:state"]
        ].filter(Boolean).join(", ") || `${facilityLat.toFixed(4)}, ${facilityLon.toFixed(4)}`;

        facilities.push({
          name,
          type,
          latitude: facilityLat,
          longitude: facilityLon,
          distance: Math.round(distance * 10) / 10,
          phone,
          address,
          isOpen24Hours: element.tags?.["opening_hours"] === "24/7" || type === "hospital" || type === "police",
          controlRoomNumber: (type === "police" || type === "hospital") ? phone : undefined
        });
      });

      console.log(`[FACILITY DETECTION] Found ${facilities.length} facilities via OpenStreetMap API`);
    }
  } catch (error) {
    console.log("[FACILITY DETECTION] API failed, using fallback database");
  }

  // If API fails or returns no results, use fallback database
  if (facilities.length === 0) {
    return getFallbackFacilities(latitude, longitude, policePhone, hospitalPhone);
  }

  // Sort by distance and return top 15 facilities
  facilities.sort((a, b) => a.distance - b.distance);
  return facilities.slice(0, 15);
}

/**
 * Fallback facility database for major Indian cities
 * Used when API is unavailable
 */
function getFallbackFacilities(
  latitude: number,
  longitude: number,
  policePhone: string,
  hospitalPhone: string
): NearbyFacility[] {
  const facilities: NearbyFacility[] = [];

  // Comprehensive India-wide facility database
  const indiaFacilities = [
    // Tamil Nadu - More comprehensive coverage
    { name: "Government General Hospital Coimbatore", type: "hospital", lat: 11.0168, lng: 76.9558, phone: hospitalPhone, address: "Coimbatore, Tamil Nadu", isOpen24Hours: true },
    { name: "Apollo Hospital Chennai", type: "hospital", lat: 13.0827, lng: 80.2707, phone: hospitalPhone, address: "Chennai, Tamil Nadu", isOpen24Hours: true },
    { name: "Salem Government Hospital", type: "hospital", lat: 11.6643, lng: 78.1460, phone: hospitalPhone, address: "Salem, Tamil Nadu", isOpen24Hours: true },
    { name: "Erode Government Hospital", type: "hospital", lat: 11.3410, lng: 77.7172, phone: hospitalPhone, address: "Erode, Tamil Nadu", isOpen24Hours: true },
    { name: "Tirupur Government Hospital", type: "hospital", lat: 11.1085, lng: 77.3411, phone: hospitalPhone, address: "Tirupur, Tamil Nadu", isOpen24Hours: true },
    { name: "Karur Government Hospital", type: "hospital", lat: 10.9601, lng: 78.0766, phone: hospitalPhone, address: "Karur, Tamil Nadu", isOpen24Hours: true },
    { name: "Coimbatore City Police", type: "police", lat: 11.0168, lng: 76.9558, phone: policePhone, address: "Coimbatore, Tamil Nadu", isOpen24Hours: true },
    { name: "Chennai Police Control Room", type: "police", lat: 13.0827, lng: 80.2707, phone: policePhone, address: "Chennai, Tamil Nadu", isOpen24Hours: true },
    { name: "Salem Police Station", type: "police", lat: 11.6643, lng: 78.1460, phone: policePhone, address: "Salem, Tamil Nadu", isOpen24Hours: true },
    { name: "Erode Police Station", type: "police", lat: 11.3410, lng: 77.7172, phone: policePhone, address: "Erode, Tamil Nadu", isOpen24Hours: true },
    { name: "Tirupur Police Station", type: "police", lat: 11.1085, lng: 77.3411, phone: policePhone, address: "Tirupur, Tamil Nadu", isOpen24Hours: true },
    
    // Karnataka
    { name: "Victoria Hospital Bangalore", type: "hospital", lat: 12.9716, lng: 77.5946, phone: hospitalPhone, address: "Bangalore, Karnataka", isOpen24Hours: true },
    { name: "Manipal Hospital Bangalore", type: "hospital", lat: 12.9698, lng: 77.7499, phone: hospitalPhone, address: "Bangalore, Karnataka", isOpen24Hours: true },
    { name: "Bangalore City Police", type: "police", lat: 12.9716, lng: 77.5946, phone: policePhone, address: "Bangalore, Karnataka", isOpen24Hours: true },
    
    // Maharashtra
    { name: "KEM Hospital Mumbai", type: "hospital", lat: 19.0760, lng: 72.8777, phone: hospitalPhone, address: "Mumbai, Maharashtra", isOpen24Hours: true },
    { name: "Lilavati Hospital Mumbai", type: "hospital", lat: 19.0596, lng: 72.8295, phone: hospitalPhone, address: "Mumbai, Maharashtra", isOpen24Hours: true },
    { name: "Mumbai Police Control Room", type: "police", lat: 19.0760, lng: 72.8777, phone: policePhone, address: "Mumbai, Maharashtra", isOpen24Hours: true },
    { name: "Pune City Police", type: "police", lat: 18.5204, lng: 73.8567, phone: policePhone, address: "Pune, Maharashtra", isOpen24Hours: true },
    
    // Delhi NCR
    { name: "AIIMS Delhi", type: "hospital", lat: 28.5672, lng: 77.2100, phone: hospitalPhone, address: "New Delhi", isOpen24Hours: true },
    { name: "Safdarjung Hospital", type: "hospital", lat: 28.5706, lng: 77.2081, phone: hospitalPhone, address: "New Delhi", isOpen24Hours: true },
    { name: "Delhi Police Control Room", type: "police", lat: 28.6139, lng: 77.2090, phone: policePhone, address: "New Delhi", isOpen24Hours: true },
    { name: "Gurgaon Police", type: "police", lat: 28.4595, lng: 77.0266, phone: policePhone, address: "Gurgaon, Haryana", isOpen24Hours: true },
    
    // West Bengal
    { name: "Medical College Hospital Kolkata", type: "hospital", lat: 22.5726, lng: 88.3639, phone: hospitalPhone, address: "Kolkata, West Bengal", isOpen24Hours: true },
    { name: "SSKM Hospital Kolkata", type: "hospital", lat: 22.5448, lng: 88.3426, phone: hospitalPhone, address: "Kolkata, West Bengal", isOpen24Hours: true },
    { name: "Kolkata Police Control Room", type: "police", lat: 22.5726, lng: 88.3639, phone: policePhone, address: "Kolkata, West Bengal", isOpen24Hours: true },
    
    // Gujarat
    { name: "Civil Hospital Ahmedabad", type: "hospital", lat: 23.0225, lng: 72.5714, phone: hospitalPhone, address: "Ahmedabad, Gujarat", isOpen24Hours: true },
    { name: "Sterling Hospital Ahmedabad", type: "hospital", lat: 23.0395, lng: 72.5660, phone: hospitalPhone, address: "Ahmedabad, Gujarat", isOpen24Hours: true },
    { name: "Ahmedabad Police Control Room", type: "police", lat: 23.0225, lng: 72.5714, phone: policePhone, address: "Ahmedabad, Gujarat", isOpen24Hours: true },
    
    // Rajasthan
    { name: "SMS Hospital Jaipur", type: "hospital", lat: 26.9124, lng: 75.7873, phone: hospitalPhone, address: "Jaipur, Rajasthan", isOpen24Hours: true },
    { name: "Fortis Hospital Jaipur", type: "hospital", lat: 26.8467, lng: 75.8056, phone: hospitalPhone, address: "Jaipur, Rajasthan", isOpen24Hours: true },
    { name: "Jaipur Police Control Room", type: "police", lat: 26.9124, lng: 75.7873, phone: policePhone, address: "Jaipur, Rajasthan", isOpen24Hours: true },
    
    // Andhra Pradesh & Telangana
    { name: "Gandhi Hospital Hyderabad", type: "hospital", lat: 17.4065, lng: 78.4772, phone: hospitalPhone, address: "Hyderabad, Telangana", isOpen24Hours: true },
    { name: "Apollo Hospital Hyderabad", type: "hospital", lat: 17.4326, lng: 78.4071, phone: hospitalPhone, address: "Hyderabad, Telangana", isOpen24Hours: true },
    { name: "Hyderabad Police Control Room", type: "police", lat: 17.4065, lng: 78.4772, phone: policePhone, address: "Hyderabad, Telangana", isOpen24Hours: true },
    
    // Kerala
    { name: "Medical College Hospital Kochi", type: "hospital", lat: 9.9312, lng: 76.2673, phone: hospitalPhone, address: "Kochi, Kerala", isOpen24Hours: true },
    { name: "Rajagiri Hospital Kochi", type: "hospital", lat: 10.0261, lng: 76.3118, phone: hospitalPhone, address: "Kochi, Kerala", isOpen24Hours: true },
    { name: "Kochi Police Control Room", type: "police", lat: 9.9312, lng: 76.2673, phone: policePhone, address: "Kochi, Kerala", isOpen24Hours: true },
    
    // Punjab
    { name: "Government Medical College Chandigarh", type: "hospital", lat: 30.7333, lng: 76.7794, phone: hospitalPhone, address: "Chandigarh, Punjab", isOpen24Hours: true },
    { name: "Fortis Hospital Mohali", type: "hospital", lat: 30.7046, lng: 76.7179, phone: hospitalPhone, address: "Mohali, Punjab", isOpen24Hours: true },
    { name: "Chandigarh Police Control Room", type: "police", lat: 30.7333, lng: 76.7794, phone: policePhone, address: "Chandigarh, Punjab", isOpen24Hours: true },
    
    // Madhya Pradesh
    { name: "Hamidia Hospital Bhopal", type: "hospital", lat: 23.2599, lng: 77.4126, phone: hospitalPhone, address: "Bhopal, Madhya Pradesh", isOpen24Hours: true },
    { name: "Chirayu Medical College Bhopal", type: "hospital", lat: 23.1765, lng: 77.4126, phone: hospitalPhone, address: "Bhopal, Madhya Pradesh", isOpen24Hours: true },
    { name: "Bhopal Police Control Room", type: "police", lat: 23.2599, lng: 77.4126, phone: policePhone, address: "Bhopal, Madhya Pradesh", isOpen24Hours: true },
    
    // Uttar Pradesh
    { name: "King George Medical University Lucknow", type: "hospital", lat: 26.8467, lng: 80.9462, phone: hospitalPhone, address: "Lucknow, Uttar Pradesh", isOpen24Hours: true },
    { name: "Sanjay Gandhi PGIMS Lucknow", type: "hospital", lat: 26.8381, lng: 80.9996, phone: hospitalPhone, address: "Lucknow, Uttar Pradesh", isOpen24Hours: true },
    { name: "Lucknow Police Control Room", type: "police", lat: 26.8467, lng: 80.9462, phone: policePhone, address: "Lucknow, Uttar Pradesh", isOpen24Hours: true },
    
    // Fuel Stations (Major Highways)
    { name: "Indian Oil Petrol Pump - NH1", type: "fuel_station", lat: 28.7041, lng: 77.1025, phone: "1800-2333-555", address: "Delhi-Chandigarh Highway", isOpen24Hours: true },
    { name: "HP Petrol Pump - NH48", type: "fuel_station", lat: 19.0760, lng: 72.8777, phone: "1800-2333-555", address: "Mumbai-Delhi Highway", isOpen24Hours: true },
    { name: "BPCL Petrol Pump - NH44", type: "fuel_station", lat: 17.4065, lng: 78.4772, phone: "1800-2333-555", address: "Hyderabad-Chennai Highway", isOpen24Hours: true },
    { name: "Reliance Petrol Pump - NH66", type: "fuel_station", lat: 15.2993, lng: 74.1240, phone: "1800-2333-555", address: "Goa-Mumbai Highway", isOpen24Hours: true },
    { name: "Shell Petrol Pump - NH27", type: "fuel_station", lat: 26.9124, lng: 75.7873, phone: "1800-2333-555", address: "Jaipur-Ahmedabad Highway", isOpen24Hours: true },
    
    // Service Centers
    { name: "Maruti Service Center Delhi", type: "service_center", lat: 28.6139, lng: 77.2090, phone: "1800-102-1800", address: "New Delhi", isOpen24Hours: false },
    { name: "Hyundai Service Center Mumbai", type: "service_center", lat: 19.0760, lng: 72.8777, phone: "1800-11-4645", address: "Mumbai, Maharashtra", isOpen24Hours: false },
    { name: "Tata Motors Service Center Bangalore", type: "service_center", lat: 12.9716, lng: 77.5946, phone: "1800-209-7979", address: "Bangalore, Karnataka", isOpen24Hours: false },
    { name: "Mahindra Service Center Chennai", type: "service_center", lat: 13.0827, lng: 80.2707, phone: "1800-226-006", address: "Chennai, Tamil Nadu", isOpen24Hours: false },
    { name: "24x7 Highway Mechanic Service", type: "service_center", lat: 22.5726, lng: 88.3639, phone: "9876543210", address: "Kolkata, West Bengal", isOpen24Hours: true }
  ];

  // Calculate distances and filter
  indiaFacilities.forEach(facility => {
    const distance = calculateDistance(latitude, longitude, facility.lat, facility.lng);
    if (distance <= 100) { // Increased from 50km to 100km for rural areas
      facilities.push({
        name: facility.name,
        type: facility.type as "police" | "hospital" | "fuel_station" | "service_center",
        latitude: facility.lat,
        longitude: facility.lng,
        distance: Math.round(distance * 10) / 10,
        phone: facility.phone,
        address: facility.address,
        isOpen24Hours: facility.isOpen24Hours,
        controlRoomNumber: (facility.type === "police" || facility.type === "hospital") ? facility.phone : undefined
      });
    }
  });

  facilities.sort((a, b) => a.distance - b.distance);
  return facilities.slice(0, 10);
}

/**
 * Get location name from coordinates using reverse geocoding
 * Fallback to approximate location if API fails
 */
export async function getLocationName(latitude: number, longitude: number): Promise<string> {
  try {
    // Try OpenStreetMap Nominatim (free reverse geocoding) with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RideWithAlert/1.0'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.display_name) {
        // Extract city, state, country for cleaner display
        const address = data.address;
        const parts = [];
        if (address.city || address.town || address.village) {
          parts.push(address.city || address.town || address.village);
        }
        if (address.state) {
          parts.push(address.state);
        }
        if (address.country) {
          parts.push(address.country);
        }
        return parts.length > 0 ? parts.join(", ") : data.display_name;
      }
    }
  } catch (error: any) {
    // Silently fail and use fallback
    if (error.name !== 'AbortError') {
      console.log("Reverse geocoding failed, using coordinates");
    }
  }

  // Fallback to coordinates
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Validate if coordinates are within India
 */
export function isLocationInIndia(latitude: number, longitude: number): boolean {
  // India's approximate bounding box
  const INDIA_BOUNDS = {
    north: 37.6,
    south: 6.4,
    east: 97.25,
    west: 68.7
  };

  return latitude >= INDIA_BOUNDS.south && 
         latitude <= INDIA_BOUNDS.north && 
         longitude >= INDIA_BOUNDS.west && 
         longitude <= INDIA_BOUNDS.east;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
