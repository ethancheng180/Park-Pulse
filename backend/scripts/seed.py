"""Database seeding script for testing."""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User, Spot, Reputation
from app.auth import get_password_hash
from sqlalchemy import text
from datetime import datetime, timedelta

def seed_database():
    """Seed the database with test data."""
    db = SessionLocal()
    
    try:
        print("Seeding database...")
        
        # Clear existing data to prevent zombies
        print("Clearing existing data...")
        db.query(Spot).delete()
        db.query(Reputation).delete()
        db.query(User).delete()
        db.commit()
        print("✓ Tables cleared")
        
        # Create test users
        print("Creating test users...")
        
        # Driver user
        driver = User(
            email="driver@test.com",
            password_hash=get_password_hash("password123"),
            role="driver"
        )
        db.add(driver)
        
        # Pulser user
        pulser = User(
            email="pulser@test.com",
            password_hash=get_password_hash("password123"),
            role="pulser"
        )
        db.add(pulser)
        
        # Both roles user
        both = User(
            email="both@test.com",
            password_hash=get_password_hash("password123"),
            role="both",
            balance=25.00
        )
        db.add(both)
        
        db.commit()
        db.refresh(driver)
        db.refresh(pulser)
        db.refresh(both)
        
        print(f"✓ Created driver: {driver.email} (ID: {driver.id})")
        print(f"✓ Created pulser: {pulser.email} (ID: {pulser.id})")
        print(f"✓ Created both: {both.email} (ID: {both.id})")
        
        # Update reputation for pulser
        print("\nUpdating reputation...")
        pulser_rep = db.query(Reputation).filter(Reputation.user_id == pulser.id).first()
        if pulser_rep:
            pulser_rep.successful_reports = 10
            pulser_rep.rating = 4.8
            pulser_rep.total_earnings = 50.00
            db.commit()
            print(f"✓ Updated reputation for pulser (Rating: {pulser_rep.rating})")
        
        # Create sample spots
        print("\nCreating sample parking spots...")
        
        # Downtown LA spot
        spot1 = Spot(
            pulser_id=pulser.id,
            address="Downtown LA, 123 Main St",
            expires_at=datetime.utcnow() + timedelta(minutes=4),
            status='available',
            latitude=34.0522,
            longitude=-118.2437
        )
        db.add(spot1)
        db.flush()
        
        # Santa Monica spot
        spot2 = Spot(
            pulser_id=pulser.id,
            address="Santa Monica, 456 Beach Blvd",
            expires_at=datetime.utcnow() + timedelta(minutes=3),
            status='available',
            latitude=34.0195,
            longitude=-118.4912
        )
        db.add(spot2)
        db.flush()
        
        db.commit()
        print(f"✓ Created spot 1: {spot1.address}")
        print(f"✓ Created spot 2: {spot2.address}")
        
        print("\n✅ Database seeded successfully!")
        print("\n📝 Test Credentials:")
        print("   Driver: driver@test.com / password123")
        print("   Pulser: pulser@test.com / password123")
        print("   Both: both@test.com / password123")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
