import nodemailer from 'nodemailer';
import type { Driver, Emergency, Trip, Vehicle, NearbyFacility } from '../shared/schema';

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password
  },
});

// Email templates
export class EmailService {
  
  // Send trip assignment email with route details
  static async sendTripAssignment(
    driver: Driver,
    trip: Trip,
    vehicle: Vehicle,
    routeData?: any
  ) {
    const routeMapUrl = routeData 
      ? `https://www.google.com/maps/dir/${trip.startLatitude},${trip.startLongitude}/${trip.endLatitude},${trip.endLongitude}`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .trip-details { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .route-map { text-align: center; margin: 20px 0; }
          .btn { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .safety-alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚛 New Trip Assignment</h1>
        </div>
        <div class="content">
          <h2>Hello ${driver.name},</h2>
          <p>You have been assigned a new trip. Please review the details below:</p>
          
          <div class="trip-details">
            <h3>Trip Details</h3>
            <p><strong>Trip ID:</strong> ${trip.tripId}</p>
            <p><strong>Vehicle:</strong> ${vehicle.vehicleNumber} (${vehicle.vehicleType})</p>
            <p><strong>From:</strong> ${trip.startLocation || 'Starting Location'}</p>
            <p><strong>To:</strong> ${trip.endLocation || 'Destination'}</p>
            <p><strong>Login Credentials:</strong></p>
            <ul>
              <li>Username: ${trip.temporaryUsername}</li>
              <li>Password: ${trip.temporaryPassword}</li>
            </ul>
          </div>

          ${routeMapUrl ? `
          <div class="route-map">
            <h3>📍 Route Map</h3>
            <a href="${routeMapUrl}" class="btn" target="_blank">View Route on Google Maps</a>
          </div>
          ` : ''}

          <div class="safety-alert">
            <h3>⚠️ Safety Reminders</h3>
            <ul>
              <li>Check vehicle condition before starting</li>
              <li>Keep emergency contacts handy</li>
              <li>Report any issues immediately</li>
              <li>Follow traffic rules and speed limits</li>
            </ul>
          </div>

          <p>Safe travels!</p>
          <p><strong>Fleet Management Team</strong></p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: driver.email,
      subject: `🚛 Trip Assignment - ${trip.tripId}`,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Trip assignment email sent to ${driver.email}`);
    } catch (error) {
      console.error('Error sending trip assignment email:', error);
      throw error;
    }
  }

  // Send emergency alert to police and hospitals (only for real emergencies)
  static async sendRealEmergencyAlert(
    emergency: Emergency,
    driver: Driver,
    vehicle: Vehicle,
    nearbyFacilities: NearbyFacility[]
  ) {
    const mapUrl = `https://www.google.com/maps?q=${emergency.latitude},${emergency.longitude}`;
    const emergencyTypeEmoji = {
      accident: '🚨',
      medical: '🏥',
      breakdown: '🔧',
      fire: '🔥',
      other: '⚠️'
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .emergency-details { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .location-map { text-align: center; margin: 20px 0; }
          .btn-emergency { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .facilities { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .facility-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .confirmed { background: #dc2626; color: white; padding: 10px; text-align: center; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${emergencyTypeEmoji[emergency.emergencyType as keyof typeof emergencyTypeEmoji]} CONFIRMED REAL EMERGENCY</h1>
        </div>
        <div class="content">
          <div class="confirmed">
            ⚠️ THIS IS A CONFIRMED REAL EMERGENCY - IMMEDIATE ACTION REQUIRED ⚠️
          </div>
          
          <div class="emergency-details">
            <h2>Emergency Details</h2>
            <p><strong>Type:</strong> ${emergency.emergencyType.toUpperCase()}</p>
            <p><strong>Driver:</strong> ${driver.name} (${driver.driverNumber})</p>
            <p><strong>Phone:</strong> ${driver.phoneNumber}</p>
            <p><strong>Vehicle:</strong> ${vehicle.vehicleNumber}</p>
            <p><strong>Location:</strong> ${emergency.address || 'Location coordinates provided'}</p>
            <p><strong>Time:</strong> ${new Date(emergency.timestamp).toLocaleString()}</p>
            ${emergency.description ? `<p><strong>Description:</strong> ${emergency.description}</p>` : ''}
          </div>

          <div class="location-map">
            <h3>📍 Emergency Location</h3>
            <p><strong>Coordinates:</strong> ${emergency.latitude}, ${emergency.longitude}</p>
            <a href="${mapUrl}" class="btn-emergency" target="_blank">View Location on Map</a>
          </div>

          ${driver.medicalConditions ? `
          <div class="emergency-details">
            <h3>🏥 Medical Information</h3>
            <p><strong>Medical Conditions:</strong> ${driver.medicalConditions}</p>
            <p><strong>Blood Group:</strong> ${driver.bloodGroup || 'Not specified'}</p>
            <p><strong>Emergency Contact:</strong> ${driver.emergencyContact} - ${driver.emergencyContactPhone}</p>
          </div>
          ` : ''}

          <div class="facilities">
            <h3>🏥 Nearby Emergency Facilities</h3>
            ${nearbyFacilities.slice(0, 5).map(facility => `
              <div class="facility-item">
                <strong>${facility.name}</strong> (${facility.type.replace('_', ' ').toUpperCase()})<br>
                📍 ${facility.address}, ${facility.city}<br>
                📞 ${facility.phoneNumber}${facility.emergencyPhone ? ` | Emergency: ${facility.emergencyPhone}` : ''}<br>
                📏 Distance: ${facility.distance.toFixed(1)} km
              </div>
            `).join('')}
          </div>

          <div class="emergency-details">
            <h3>⚡ Immediate Actions Required</h3>
            <ul>
              <li>Dispatch emergency services to location immediately</li>
              <li>Contact driver at ${driver.phoneNumber}</li>
              <li>Coordinate with nearby facilities</li>
              <li>Send rescue team to coordinates</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to configured emergency recipients only
    const testRecipients = process.env.EMERGENCY_EMAIL_RECIPIENTS?.split(',') || [process.env.EMAIL_USER];

    for (const recipient of testRecipients) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: `🚨 CONFIRMED REAL EMERGENCY - ${emergency.emergencyType.toUpperCase()} - ${driver.name}`,
        html: htmlContent,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Real emergency alert sent to ${recipient}`);
      } catch (error) {
        console.error(`Error sending real emergency alert to ${recipient}:`, error);
      }
    }
  }

  // Send emergency alert to driver's emergency contact
  static async sendEmergencyContactAlert(
    emergency: Emergency,
    driver: Driver,
    vehicle: Vehicle
  ) {
    if (!driver.emergencyContact || !driver.emergencyContactPhone) return;

    const mapUrl = `https://www.google.com/maps?q=${emergency.latitude},${emergency.longitude}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-box { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Emergency Alert - ${driver.name}</h1>
        </div>
        <div class="content">
          <p>Dear ${driver.emergencyContact},</p>
          
          <div class="alert-box">
            <p>This is an emergency notification regarding <strong>${driver.name}</strong>.</p>
            <p><strong>Emergency Type:</strong> ${emergency.emergencyType.toUpperCase()}</p>
            <p><strong>Location:</strong> ${emergency.address || 'See map link below'}</p>
            <p><strong>Time:</strong> ${new Date(emergency.timestamp).toLocaleString()}</p>
            <p><strong>Vehicle:</strong> ${vehicle.vehicleNumber}</p>
          </div>

          <p><a href="${mapUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Location</a></p>
          
          <p>Emergency services have been notified. Please contact the driver at ${driver.phoneNumber} if possible.</p>
          
          <p>Fleet Management Team</p>
        </div>
      </body>
      </html>
    `;

    // For demo, we'll use the driver's email as emergency contact email
    // In real implementation, you'd have emergency contact email in the schema
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: driver.email, // Replace with actual emergency contact email
      subject: `🚨 Emergency Alert - ${driver.name}`,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Emergency contact alert sent for ${driver.name}`);
    } catch (error) {
      console.error('Error sending emergency contact alert:', error);
    }
  }

  // Test email configuration
  static async testConnection() {
    try {
      await transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }
}