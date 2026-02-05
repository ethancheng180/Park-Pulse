# ParkPulse v0

**A production-ready MVP for a two-sided parking marketplace.**

## Overview

ParkPulse connects drivers looking for parking with "Pulsers" who report available spots in real-time. Pulsers earn money for reporting spots, and drivers pay for instant parking location information.

### Core Features

- **Two-Sided Marketplace**: Drivers request parking, Pulsers report spots
- **Real-Time Matching**: Automatic matching algorithm based on distance, freshness, and reputation
- **Stripe Payments**: Secure payments with 80/20 revenue split
- **Reputation System**: Dynamic ratings reward accurate reporting
- **GPS Integration**: PostGIS-powered location matching
- **Fraud Prevention**: GPS validation, rate limiting, and reputation thresholds

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL + PostGIS** - Spatial database
- **SQLAlchemy** - ORM
- **Stripe** - Payments and Connect payouts
- **JWT** - Authentication

### Mobile
- **Expo React Native** - Cross-platform iOS/Android
- **React Navigation** - Tab-based navigation
- **Google Maps SDK** - Maps and geocoding
- **Axios** - API client

## Project Structure

```
parkpulse-v0/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # Application entry
│   │   ├── models.py    # Database models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── auth.py      # JWT authentication
│   │   ├── matching.py  # Matching algorithm
│   │   ├── reputation.py # Reputation scoring
│   │   ├── stripe_utils.py # Stripe integration
│   │   ├── fraud.py     # Fraud detection
│   │   └── routers/     # API endpoints
│   ├── migrations/      # Database migrations
│   └── scripts/         # Utility scripts
│
├── mobile/              # Expo React Native app
│   ├── src/
│   │   ├── screens/     # UI screens
│   │   ├── services/    # API & location services
│   │   └── types/       # TypeScript interfaces
│   └── App.tsx          # Main app component
│
└── docs/                # Documentation
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- Stripe account (test mode)
- Google Maps API key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database and API keys

# Run database migrations
psql -U postgres -c "CREATE DATABASE parkpulse;"
psql -U postgres -d parkpulse -f migrations/001_initial_schema.sql

# Seed database with test users
python scripts/seed.py

# Start server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

API docs: `http://localhost:8000/docs`

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API URL and keys

# Start Expo
npx expo start
```

Scan the QR code with the Expo Go app to run on your device.

## Test Credentials

The seed script creates three test users:

- **Driver**: `driver@test.com` / `password123`
- **Pulser**: `pulser@test.com` / `password123`
- **Both**: `both@test.com` / `password123`

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://parkpulse:parkpulse123@localhost:5432/parkpulse
SECRET_KEY=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
PLATFORM_FEE_PERCENT=20
SPOT_EXPIRATION_MINUTES=4
```

### Mobile (.env)

```env
API_BASE_URL=http://localhost:8000
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Spots (Pulser)
- `POST /spots` - Report a parking spot
- `GET /spots` - Get my reported spots

### Requests (Driver)
- `POST /requests` - Create parking request (returns match)
- `POST /requests/verify` - Verify spot (found/gone)

### User
- `GET /users/me` - Get profile
- `GET /users/history` - Get transaction history

### Admin
- `POST /admin/refund` - Manual refund
- `POST /admin/ban` - Ban user

See [docs/API.md](docs/API.md) for detailed API documentation.

## Core Flow

1. **Pulser reports spot** → GPS captured, photo optional, expires in 4 min
2. **Driver requests parking** → Destination + radius + max price
3. **Backend matches** → Finds best spot by distance/freshness/reputation
4. **Payment intent created** → Funds held (Stripe)
5. **Driver confirms** → ✅ Spot found OR ❌ Spot gone
6. **Payout/refund** → 80% to Pulser if successful, full refund if failed
7. **Reputation updated** → Rating adjusted based on outcome

## Matching Algorithm

```python
score = (
    distance_weight * distance_meters +
    freshness_weight * seconds_since_report -
    reputation_weight * pulser_rating
)
```

Lower score = better match. Only considers:
- Spots within radius
- Not expired (< 4 minutes old)
- Available status

## Stripe Integration

- **PaymentIntents**: Hold driver payment
- **Capture**: Release funds after verification
- **Connect**: Marketplace payouts to pulsers
- **Platform Fee**: 20% kept by platform

## Reputation System

- Starts at 5.0
- Success: +0.1 rating
- Failure: -0.3 rating
- Throttled if rating < 2.0 or success rate < 50%

## Deployment

### Backend (Production ready)

```bash
# Use gunicorn for production
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Mobile (TestFlight)

See [docs/TESTFLIGHT.md](docs/TESTFLIGHT.md) for iOS deployment instructions.

## Development

### Run Backend Tests

```bash
cd backend
pytest  # Tests not included in MVP, but structure supports it
```

### Lint & Format

```bash
# Backend
black app/
flake8 app/

# Mobile
cd mobile
npm run lint
```

## Next Steps (Not MVP)

- ML prediction models
- City-wide scaling
- Sensor integrations
- Analytics dashboards
- Parking reservations > 5 min
- Advanced UI polish

## Troubleshooting

**Database connection fails**: Check PostgreSQL is running and credentials are correct

**PostGIS not found**: `CREATE EXTENSION postgis;` in PostgreSQL

**Stripe errors**: Ensure test mode keys and mock payments work without real account

**Mobile map not showing**: Verify Google Maps API key in app.json and .env

**Location permission denied**: Check device settings and Info.plist permissions

## License

MIT

## Support

For issues or questions, see documentation in `/docs`
