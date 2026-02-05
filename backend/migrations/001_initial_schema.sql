-- ParkPulse v0 Database Schema
-- Requires PostgreSQL with PostGIS extension

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('driver', 'pulser', 'both')),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255), -- For Connect payouts (pulsers)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    banned BOOLEAN DEFAULT FALSE
);

-- Reputation tracking
CREATE TABLE reputations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    successful_reports INTEGER DEFAULT 0,
    failed_reports INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    last_report_at TIMESTAMP,
    UNIQUE(user_id)
);

-- Parking spots reported by pulsers
CREATE TABLE spots (
    id SERIAL PRIMARY KEY,
    pulser_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS geography type
    address TEXT,
    photo_url TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'matched', 'verified', 'expired', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for location-based queries
CREATE INDEX idx_spots_location ON spots USING GIST(location);
CREATE INDEX idx_spots_status ON spots(status);
CREATE INDEX idx_spots_expires_at ON spots(expires_at);

-- Parking requests from drivers
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    destination GEOGRAPHY(POINT, 4326) NOT NULL,
    destination_address TEXT,
    radius_meters DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'verified', 'failed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requests_driver_id ON requests(driver_id);
CREATE INDEX idx_requests_status ON requests(status);

-- Matches between requests and spots
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    spot_id INTEGER REFERENCES spots(id) ON DELETE CASCADE,
    distance_meters DECIMAL(10, 2) NOT NULL,
    score DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL, -- Amount driver will pay
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'verified', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_request_id ON matches(request_id);
CREATE INDEX idx_matches_spot_id ON matches(spot_id);

-- Verifications by drivers
CREATE TABLE verifications (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    verified_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    found BOOLEAN NOT NULL, -- TRUE if spot was there, FALSE if gone
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id)
);

-- Payouts to pulsers
CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    pulser_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL, -- Amount pulser receives (after platform fee)
    platform_fee DECIMAL(10, 2) NOT NULL,
    stripe_transfer_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_payouts_pulser_id ON payouts(pulser_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Insert default reputations for new users (trigger)
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

-- Function to calculate distance between two points (in meters)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    );
END;
$$ LANGUAGE plpgsql;
