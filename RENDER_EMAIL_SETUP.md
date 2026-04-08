# 📧 Render + Neon DB Email Setup Guide

## 🚀 Quick Setup for Render Deployment

### 1. **Render Environment Variables**
In your Render dashboard, add these environment variables:

```
EMAIL_USER = kiruthikashekar1@gmail.com
EMAIL_APP_PASSWORD = jwzscyxvpcfsjxzo  
EMERGENCY_EMAIL_RECIPIENTS = drspk15@gmail.com,drspk15@gmail.com
```

### 2. **Database Migration (Neon DB)**
Since you're using Neon DB, you need to add the email field to the drivers table:

**Option A: Using Drizzle (Recommended)**
```bash
# Run this locally (it will connect to your Neon DB)
npm run db:push
```

**Option B: Direct SQL (If Drizzle fails)**
Connect to your Neon DB console and run:
```sql
ALTER TABLE drivers ADD COLUMN email TEXT NOT NULL DEFAULT '';
```

### 3. **Test Email Configuration**
After deployment, test the email service:

**Method 1: Use the test script**
```bash
# Run locally (will test against production env vars)
node test-email.cjs
```

**Method 2: Register a test driver**
1. Go to your deployed app
2. Login as manager
3. Register a new driver with email
4. Assign a trip → Driver should receive email

## 🔧 Deployment Steps

### 1. **Push Your Code**
```bash
git add .
git commit -m "Add email functionality"
git push origin main
```

### 2. **Set Environment Variables in Render**
- Go to your Render dashboard
- Select your web service
- Go to "Environment" tab
- Add the email environment variables above

### 3. **Deploy**
Render will automatically redeploy when you push to GitHub.

### 4. **Run Database Migration**
After deployment, run the database migration:
```bash
# This connects to your Neon DB
npm run db:push
```

## 📧 Email Flow Testing

### **Trip Assignment Email Test:**
1. Login to manager dashboard
2. Register new driver with email address
3. Assign trip to that driver
4. Check driver's email for trip assignment

### **Emergency Email Test:**
1. Login as driver (use trip credentials)
2. Trigger emergency (SOS button)
3. Manager dashboard shows popup
4. Click "Real Emergency"
5. Check `drspk15@gmail.com` for emergency alert

## 🐛 Troubleshooting

### **Email Not Sending:**
1. **Check Gmail Settings:**
   - 2FA must be enabled
   - App password must be valid
   - Less secure app access disabled

2. **Check Render Logs:**
   ```bash
   # Look for email errors in logs
   ```

3. **Test Connection:**
   ```bash
   node test-email.cjs
   ```

### **Database Migration Issues:**
1. **Check Neon DB Connection:**
   - Verify DATABASE_URL in Render
   - Check Neon DB is accessible

2. **Manual SQL:**
   ```sql
   -- Connect to Neon DB console
   ALTER TABLE drivers ADD COLUMN email TEXT NOT NULL DEFAULT '';
   ```

### **Environment Variables Not Loading:**
1. Check Render dashboard environment tab
2. Restart the service after adding variables
3. Check logs for environment variable errors

## ✅ Verification Checklist

After deployment, verify:

- [ ] **Render service is running** (green status)
- [ ] **Database connected** (no connection errors in logs)
- [ ] **Email environment variables set** (check Render dashboard)
- [ ] **Database schema updated** (email field added to drivers)
- [ ] **Trip assignment emails working** (test with new driver)
- [ ] **Emergency emails working** (test emergency flow)

## 🎯 Production Ready

Once everything is working:

1. **Update email recipients** for real police/hospital emails
2. **Consider professional email service** (SendGrid, AWS SES) for production
3. **Monitor email delivery** rates and bounces
4. **Set up email templates** for different languages if needed

Your email system is now fully integrated with Render + Neon DB! 🚀