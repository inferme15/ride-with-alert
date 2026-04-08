# Email Setup Guide for RideWithAlert

This guide explains how to set up email notifications using Gmail for trip assignments and emergency alerts.

## Gmail Setup

### 1. Enable 2-Factor Authentication
- Go to your Google Account settings
- Navigate to Security
- Enable 2-Step Verification

### 2. Generate App Password
- In Google Account settings, go to Security
- Under "2-Step Verification", click on "App passwords"
- Select "Mail" and your device
- Copy the generated 16-character password

### 3. Update Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-16-character-app-password
EMERGENCY_EMAIL_RECIPIENTS=police@example.com,hospital@example.com
```

## Email Features

### Trip Assignment Emails
- **To**: Driver's email address
- **Content**: 
  - Trip details (ID, vehicle, route)
  - Login credentials
  - Interactive Google Maps route link
  - Safety reminders
  - Professional HTML formatting

### Emergency Alert Emails
- **To**: Police stations and hospitals (configured recipients)
- **Content**:
  - Emergency type and location
  - Driver and vehicle details
  - Medical information (if available)
  - Interactive location map
  - Nearby facilities list
  - Emergency contact information

### Emergency Contact Alerts
- **To**: Driver's emergency contact
- **Content**:
  - Emergency notification
  - Location details
  - Contact information
  - Map link

## Testing Email Service

The system includes a test endpoint to verify email configuration:

```javascript
// Test email connection
const isReady = await EmailService.testConnection();
console.log('Email service ready:', isReady);
```

## Email Templates

All emails use responsive HTML templates with:
- Professional styling
- Mobile-friendly design
- Interactive buttons and links
- Emergency color coding (red for emergencies)
- Company branding

## Security Notes

1. **Never commit real credentials** to version control
2. Use **App Passwords**, not your regular Gmail password
3. **Rotate passwords** regularly
4. **Monitor email usage** for suspicious activity

## Fallback Strategy

- Email is primary for detailed notifications
- SMS remains as backup for critical alerts
- System continues to work even if email fails

## Production Considerations

For production deployment:

1. **Use professional email service** (SendGrid, AWS SES, etc.)
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor delivery rates** and bounces
4. **Implement email queuing** for high volume
5. **Add unsubscribe functionality** for non-critical emails

## Troubleshooting

### Common Issues:

1. **"Invalid login"** - Check app password is correct
2. **"Less secure app access"** - Use app password instead
3. **Emails not sending** - Check Gmail SMTP settings
4. **Emails in spam** - Set up proper DNS records

### Debug Steps:

1. Test email connection: `EmailService.testConnection()`
2. Check environment variables are loaded
3. Verify Gmail account settings
4. Check server logs for detailed error messages