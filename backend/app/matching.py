"""Matching algorithm for pairing drivers with available spots."""
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from decimal import Decimal
from .models import Spot, Request, Match, User, Reputation
from .config import get_settings

settings = get_settings()


import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r


def calculate_score(
    distance_meters: float,
    seconds_since_report: float,
    pulser_rating: float
) -> float:
    """
    Calculate match score. Lower is better.
    
    score = distance_weight * meters + freshness_weight * seconds - reputation_weight * rating
    """
    score = (
        settings.distance_weight * float(distance_meters) +
        settings.freshness_weight * seconds_since_report -
        settings.reputation_weight * pulser_rating
    )
    return score


def find_best_match(
    db: Session,
    request: Request
) -> Optional[Tuple[Spot, float, float]]:
    """
    Find the best available spot for a request.
    
    Returns:
        Tuple of (Spot, distance_meters, score) or None if no match found
    """
    # Calculate expiration cutoff
    now = datetime.now(timezone.utc)
    expiration_cutoff = now - timedelta(minutes=settings.spot_expiration_minutes)
    
    # Get request coordinates
    dest_lat = float(request.destination_latitude)
    dest_lng = float(request.destination_longitude)
    
    # Query available spots within reasonable timeframe
    query = db.query(
        Spot,
        User,
        Reputation
    ).join(
        User, Spot.pulser_id == User.id
    ).outerjoin(
        Reputation, User.id == Reputation.user_id
    ).filter(
        and_(
            Spot.status == 'available',
            Spot.expires_at > now,
            Spot.reported_at > expiration_cutoff
        )
    )
    
    # Get all candidates and calculate distances
    candidates = []
    for spot, user, reputation in query.all():
        # Calculate distance using Haversine
        distance = haversine_distance(
            dest_lat, dest_lng, 
            float(spot.latitude), float(spot.longitude)
        )
        
        # Check if within radius
        if distance > float(request.radius_meters):
            continue
        
        # Calculate freshness
        seconds_since_report = (now - spot.reported_at).total_seconds()
        
        # Get pulser rating (default 5.0 if no reputation)
        pulser_rating = float(reputation.rating) if reputation else 5.0
        
        # Calculate score
        score = calculate_score(distance, seconds_since_report, pulser_rating)
        
        candidates.append((spot, distance, score))
    
    # Return best match (lowest score)
    if not candidates:
        return None
    
    candidates.sort(key=lambda x: x[2])  # Sort by score
    return candidates[0]


def create_match(
    db: Session,
    request: Request,
    spot: Spot,
    distance_meters: float,
    score: float,
    amount: Decimal
) -> Match:
    """Create a match record."""
    match = Match(
        request_id=request.id,
        spot_id=spot.id,
        distance_meters=Decimal(str(distance_meters)),
        score=Decimal(str(score)),
        amount=amount,
        status='pending'
    )
    db.add(match)
    
    # Update spot status
    spot.status = 'matched'
    
    # Update request status
    request.status = 'matched'
    
    db.commit()
    db.refresh(match)
    
    return match
