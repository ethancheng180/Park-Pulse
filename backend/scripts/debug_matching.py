import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, and_
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta, timezone
from app.models import Spot, Request, User, Reputation
from app.config import get_settings
from app.matching import haversine_distance, calculate_score

settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def debug():
    print("--- Debugging Matching ---")
    
    # get request
    req = db.query(Request).order_by(Request.id.desc()).first()
    print(f"Request ID: {req.id}, Status: {req.status}")
    print(f"Request Destination: {req.destination_latitude}, {req.destination_longitude}")
    print(f"Request Radius: {req.radius_meters}")
    
    # get spot
    spot = db.query(Spot).order_by(Spot.id.desc()).first()
    print(f"Spot ID: {spot.id}, Status: {spot.status}")
    print(f"Spot Location: {spot.latitude}, {spot.longitude}")
    print(f"Spot Reported: {spot.reported_at} (tzinfo: {spot.reported_at.tzinfo})")
    print(f"Spot Expires: {spot.expires_at} (tzinfo: {spot.expires_at.tzinfo})")
    
    # check time
    now = datetime.now(timezone.utc)
    print(f"Now (UTC-aware): {now}")
    
    cutoff = now - timedelta(minutes=settings.spot_expiration_minutes)
    print(f"Cutoff (UTC): {cutoff}")
    
    # Check filters individually
    print("\n--- Checking Filters ---")
    
    # 1. Status
    f1 = spot.status == 'available'
    print(f"Status == available: {f1}")
    
    # 2. Expires
    # Comparison might fail if offsets mixed?
    try:
        f2 = spot.expires_at.replace(tzinfo=None) > now if spot.expires_at.tzinfo else spot.expires_at > now
        print(f"Expires > Now (naive check): {f2}")
    except Exception as e:
        print(f"Expires check error: {e}")
        
    # 3. Reported
    try:
        # DB returns aware, cutoff is naive
        # We need to make cutoff aware or spot naive. 
        # SQLAlchemy usually handles compare if one is aware and other isn't? 
        # Wait, if DB is tz-aware, we should use tz-aware comparisons.
        f3 = spot.reported_at.replace(tzinfo=None) > cutoff if spot.reported_at.tzinfo else spot.reported_at > cutoff
        print(f"Reported > Cutoff (naive check): {f3}")
    except Exception as e:
        print(f"Reported check error: {e}")

    # Run actual query
    print("\n--- Running Query ---")
    query = db.query(Spot).filter(
        and_(
            Spot.status == 'available',
            Spot.expires_at > now,
            Spot.reported_at > cutoff
        )
    )
    results = query.all()
    print(f"Query returned {len(results)} spots")
    
    if len(results) > 0:
        s = results[0]
        dist = haversine_distance(
            float(req.destination_latitude), float(req.destination_longitude),
            float(s.latitude), float(s.longitude)
        )
        print(f"Distance: {dist} meters")
        print(f"Radius: {req.radius_meters}")
        
if __name__ == "__main__":
    debug()
