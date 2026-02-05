# ParkPulse Setup Guide

Complete step-by-step setup instructions for running ParkPulse locally.

## Prerequisites

Install the following before starting:

### macOS
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Python
brew install python@3.10

# Install PostgreSQL with PostGIS
brew install postgresql postgis

# Start PostgreSQL
brew services start postgresql
```

### Ubuntu/Linux
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt-get install python3.10 python3.10-venv python3-pip

# Install PostgreSQL with PostGIS
sudo apt-get install postgresql postgresql-contrib postgis
sudo systemctl start postgresql
```

### Windows
- Install Node.js from https://nodejs.org
- Install Python 3.10 from https://python.org
- Install PostgreSQL from https://www.postgresql.org/download/windows/
- Install PostGIS extension during PostgreSQL setup

## Step 1: Clone or Navigate to Project

```bash
cd /path/to/parkpulse-v0
```

## Step 2: Backend Setup

### 2.1 Create Virtual Environment

```bash
cd backend
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate
```

### 2.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2.3 Set Up Database

```bash
# Create database (adjust username as needed)
createdb parkpulse

# Or using psql:
psql -U postgres -c "CREATE DATABASE parkpulse;"

# Enable PostGIS extension
psql -U postgres -d parkpulse -c "CREATE EXTENSION postgis;"

# Run migrations
psql -U postgres -d parkpulse -f migrations/001_initial_schema.sql
```

### 2.4 Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/parkpulse
SECRET_KEY=generate-with-openssl-rand-hex-32
STRIPE_SECRET_KEY=sk_test_YOUR_KEY  # Get from Stripe dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
GOOGLE_MAPS_API_KEY=YOUR_KEY  # Get from Google Cloud Console
```

**Generate SECRET_KEY:**
```bash
openssl rand -hex 32
```

### 2.5 Seed Database

```bash
python scripts/seed.py
```

This creates test users:
- `driver@test.com` / `password123`
- `pulser@test.com` / `password123`
- `both@test.com` / `password123`

### 2.6 Start Backend Server

```bash
uvicorn app.main:app --reload
```

Backend running at: http://localhost:8000

Verify by visiting: http://localhost:8000/docs

## Step 3: Mobile App Setup

### 3.1 Install Dependencies

```bash
cd ../mobile
npm install
```

### 3.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
API_BASE_URL=http://localhost:8000  # Or your IP for physical device
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
```

### 3.3 Update Google Maps API Key

Edit `app.json` and replace `AIzaSyDummy_Key_Replace_With_Real` with your actual Google Maps API key in both `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`.

### 3.4 Start Expo

```bash
npx expo start
```

### 3.5 Run on Device

- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Physical Device**: Scan QR code with Expo Go app

## Step 4: Get API Keys

### Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable these APIs:
   - Maps SDK for iOS
   - Maps SDK for Android
   - Geocoding API
   - Places API
4. Create API key in Credentials section
5. Copy key to `.env` files and `app.json`

### Stripe API Keys

1. Go to https://dashboard.stripe.com
2. Create account (use test mode)
3. Get API keys from Developers → API keys
4. Copy:
   - Secret key (sk_test_...) → backend `.env`
   - Publishable key (pk_test_...) → mobile `.env`

For marketplace payouts (optional for MVP):
1. Set up Stripe Connect
2. Create Connect platform account
3. Test with Test mode

## Step 5: Test the Flow

### 5.1 Login as Pulser

1. Open mobile app
2. Login: `pulser@test.com` / `password123`
3. Go to Pulser tab
4. Tap "Report Open Spot"
5. Allow location permissions
6. Spot reported successfully

### 5.2 Login as Driver (Second Device/Simulator)

1. Open mobile app (second instance)
2. Login: `driver@test.com` / `password123`
3. Go to Driver tab
4. Enter nearby destination
5. Set radius: 500m, Max price: $10
6. Tap "Find Parking"
7. Match should appear on map

### 5.3 Verify Match

1. As driver, review matched spot
2. Tap "✅ Found It" or "❌ Not There"
3. Payment processed/refunded
4. Check Account tab for updated balance/reputation

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
brew services list  # macOS
systemctl status postgresql  # Linux

# Verify credentials
psql -U postgres -d parkpulse -c "SELECT 1;"
```

### PostGIS Not Found

```bash
psql -U postgres -d parkpulse -c "CREATE EXTENSION postgis;"
```

### Backend Won't Start

```bash
# Check port 8000 not in use
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Check Python virtual environment activated
which python  # Should show venv path
```

### Mobile App Can't Connect

**iOS Simulator:**
- Use `API_BASE_URL=http://localhost:8000`

**Android Emulator:**
- Use `API_BASE_URL=http://10.0.2.2:8000`

**Physical Device:**
- Find your computer's IP: `ifconfig | grep inet` (macOS/Linux)
- Use `APIBASE_URL=http://YOUR_IP:8000`
- Ensure firewall allows port 8000

### Maps Not Showing

1. Verify Google Maps API key in both `.env` and `app.json`
2. Enable required APIs in Google Cloud Console
3. Check API key restrictions allow your app bundle ID
4. Restart Expo after changing `app.json`

### Location Permission Denied

- iOS: Check Settings → Privacy → Location Services
- Android: Check Settings → Apps → ParkPulse → Permissions
- Simulator: Debug → Location → Custom Location

## Next Steps

- Deploy backend to production server
- Build iOS/Android apps for TestFlight/Play Store
- Set up production Stripe account
- Configure production database
- Add monitoring and analytics

See individual README files in `backend/` and `mobile/` for more details.
