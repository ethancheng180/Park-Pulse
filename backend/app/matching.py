"""Matching algorithm for pairing drivers with available spots."""
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from decimal import Decimal
from .models import Spot, Request, Match, User, Reputation
from .config import get_settings
from geoalchemy2.functions import ST_Distance, ST_GeogFromText

settings = get_settings()


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
        settings.distance_weight * distance_meters +
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
    now = datetime.utcnow()
    expiration_cutoff = now - timedelta(minutes=settings.spot_expiration_minutes)
    
    # Get destination point as WKT
    dest_lat = db.execute(text(
        "SELECT ST_Y(destination::geometry) FROM requests WHERE id = :request_id"
    ), {"request_id": request.id}).scalar()
    
    dest_lng = db.execute(text(
        "SELECT ST_X(destination::geometry) FROM requests WHERE id = :request_id"
    ), {"request_id": request.id}).scalar()
    
    # Query available spots within radius
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
        # Get spot coordinates
        spot_coords = db.execute(text(
            """
            SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
            FROM spots WHERE id = :spot_id
            """
        ), {"spot_id": spot.id}).first()
        
        if not spot_coords:
            continue
        
        # Calculate distance using PostGIS
        distance = db.execute(text(
            """
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint(:lng1, :lat1), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lng2, :lat2), 4326)::geography
            )
            """
        ), {
            "lat1": dest_lat,
            "lng1": dest_lng,
            "lat2": spot_coords.lat,
            "lng2": spot_coords.lng
        }).scalar()
        
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
