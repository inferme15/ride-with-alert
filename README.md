# RideWithAlert

Smart emergency alert and vehicle monitoring system with Driver and Manager dashboards.

## Core Flow

1. Manager creates trip assignment (driver + vehicle).
2. Driver logs in and starts trip.
3. Driver location is streamed in real time.
4. Driver presses SOS (`/api/emergency/trigger`) to create an active emergency.
5. Manager gets popup + alarm and can choose:
   - `False Alarm` -> acknowledge only
   - `Real Emergency` -> approve (`/api/emergency/approve`)
6. On **Real Emergency approval**, backend:
   - marks emergency acknowledged,
   - stops active trip,
   - fetches nearby facilities,
   - sends police/hospital notification messages via SMS utility.

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, React-Leaflet, React-Webcam
- Backend: Node.js, Express, Socket.IO
- Database: PostgreSQL (Drizzle ORM)
- Maps/APIs: OpenStreetMap, Overpass, Nominatim
- SMS: Fast2SMS (with simulation fallback)

## Run Locally

### Prerequisites

- Node.js 18+
- PostgreSQL

### Setup

```bash
npm install
npm run db:push
npm run dev
```

Open: `http://localhost:3001`

## Environment Notes

SMS sending uses `FAST2SMS_API_KEY`.

- If key is configured, app attempts real Fast2SMS delivery.
- If key is missing/invalid, app falls back to simulation mode.

## Verify Emergency + SMS Behavior

### UI path

1. Start an active trip.
2. Trigger SOS from Driver dashboard.
3. In Manager emergency popup, click **Real Emergency**.
4. Expected API response behavior:
   - Emergency approve succeeds.
   - Trip is stopped.
   - Police/Hospital message dispatch function is executed.

### API path (quick test)

```bash
# Trigger SOS
curl -X POST http://localhost:3001/api/emergency/trigger ^
  -H "Content-Type: application/json" ^
  -d "{\"driverNumber\":\"d1\",\"vehicleNumber\":\"v1\",\"location\":{\"latitude\":11.0247,\"longitude\":77.0028}}"

# Approve as real emergency (replace ID)
curl -X POST http://localhost:3001/api/emergency/approve ^
  -H "Content-Type: application/json" ^
  -d "{\"emergencyId\":41}"
```

Expected approve response shape:

```json
{
  "message": "Emergency approved - Trip stopped, Police and Hospital notified",
  "emergencyId": 41,
  "tripStopped": true
}
```

## Review Helper Endpoints

- `GET /api/health`
  - Returns API health, uptime, environment, and SMS config flag.
- `POST /api/notifications/test`
  - Triggers test notifications to police/hospital numbers through the same SMS utility path used by real emergency approval.
  - Optional body:

```json
{
  "policePhone": "9342746662",
  "hospitalPhone": "9342746662",
  "message": "Review test message"
}
```

## Current Known Issue

`npm run check` currently reports TypeScript errors in multiple files.  
Dev server can still run via `npm run dev`, but full type-check is not clean yet.
