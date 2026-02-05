# ParkPulse Backend

FastAPI backend for ParkPulse parking marketplace.

## Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL with PostGIS**:
   ```bash
   # Install PostgreSQL and PostGIS
   # macOS: brew install postgresql postgis
   # Ubuntu: apt-get install postgresql postgis

   # Create database
   createdb parkpulse
   
   # Enable PostGIS
   psql parkpulse -c "CREATE EXTENSION postgis;"
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration.

5. **Run migrations**:
   ```bash
   psql parkpulse < migrations/001_initial_schema.sql
   ```

6. **Seed database**:
   ```bash
   python scripts/seed.py
   ```

7. **Start server**:
   ```bash
   uvicorn app.main:app --reload
   ```

   API available at: http://localhost:8000
   
   Interactive docs: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app
│   ├── config.py        # Settings
│   ├── database.py      # DB connection
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── auth.py          # JWT auth
│   ├── matching.py      # Matching algorithm
│   ├── reputation.py    # Reputation system
│   ├── stripe_utils.py  # Stripe integration
│   ├── fraud.py         # Fraud detection
│   └── routers/
│       ├── auth.py      # Auth endpoints
│       ├── users.py     # User endpoints
│       ├── spots.py     # Spot endpoints
│       ├── requests.py  # Request endpoints
│       └── admin.py     # Admin endpoints
├── migrations/          # Database migrations
├── scripts/            # Utility scripts
└── requirements.txt    # Python dependencies
```

## Environment Variables

Required in `.env`:

```env
# Database
DATABASE_URL=postgresql://parkpulse:password@localhost:5432/parkpulse

# JWT
SECRET_KEY=your-secret-key-here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Maps
GOOGLE_MAPS_API_KEY=your_key_here

# App Config
PLATFORM_FEE_PERCENT=20
SPOT_EXPIRATION_MINUTES=4
```

## Testing

Use the test credentials created by `seed.py`:

- Driver: `driver@test.com` / `password123`
- Pulser: `pulser@test.com` / `password123`
- Both: `both@test.com` / `password123`

## API Documentation

See `/docs/API.md` for complete API reference.

Interactive API docs available at: http://localhost:8000/docs (when server running)
