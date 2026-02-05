-- ParkPulse Simplified Database Schema (without PostGIS)
-- Uses standard FLOAT columns for lat/lng instead of GEOGRAPHY type

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('driver', 'pulser', 'both')),
    balance NUMERIC(10, 2) DEFAULT 0.00,
    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banned BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_email ON users(email);

-- Reputations table
CREATE TABLE reputations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    successful_reports INTEGER DEFAULT 0,
    failed_reports INTEGER DEFAULT 0,
    total_earnings NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spots table (simplified - using lat/lng floats)
CREATE TABLE spots (
    id SERIAL PRIMARY KEY,
    pulser_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    photo_url TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'matched', 'verified', 'expired', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_spots_status ON spots(status);
CREATE INDEX idx_spots_expires ON spots(expires_at);
CREATE INDEX idx_spots_pulser ON spots(pulser_id);

-- Requests table (simplified)
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    destination_latitude DOUBLE PRECISION NOT NULL,
    destination_longitude DOUBLE PRECISION NOT NULL,
    destination_address TEXT,
    radius_meters INTEGER NOT NULL,
    max_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'verified', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_requests_driver ON requests(driver_id);
CREATE INDEX idx_requests_status ON requests(status);

-- Matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    spot_id INTEGER REFERENCES spots(id) ON DELETE CASCADE,
    distance_meters NUMERIC(10, 2),
    score NUMERIC(10, 4),
    amount NUMERIC(10, 2) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'refunded', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_matches_request ON matches(request_id);
CREATE INDEX idx_matches_spot ON matches(spot_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Verifications table
CREATE TABLE verifications (
    id SERIAL PRIMARY KEY,
    match_id INTEGER UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    found BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verifications_match ON verifications(match_id);

-- Payouts table
CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    pulser_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL,
    stripe_transfer_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payouts_match ON payouts(match_id);
CREATE INDEX idx_payouts_pulser ON payouts(pulser_id);

-- Function to create default reputation for new users
CREATE OR REPLACE FUNCTION create_default_reputation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reputations (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_reputation
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_reputation();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    R CONSTANT DOUBLE PRECISION := 6371000; -- Earth radius in meters
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2) * SIN(dlon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;
