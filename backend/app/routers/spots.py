"""Parking spot reporting router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List
from ..database import get_db
from ..models import User, Spot
from ..schemas import SpotCreate, SpotResponse
from ..auth import get_current_pulser
from ..fraud import validate_spot_report
from ..config import get_settings

router = APIRouter(prefix="/spots", tags=["spots"])
settings = get_settings()


@router.post("", response_model=SpotResponse, status_code=status.HTTP_201_CREATED)
def report_spot(
    spot_data: SpotCreate,
    current_user: User = Depends(get_current_pulser),
    db: Session = Depends(get_db)
):
    """Report a new available parking spot."""
    # Fraud checks
    is_valid, error = validate_spot_report(
        db,
        current_user,
        spot_data.latitude,
        spot_data.longitude,
        spot_data.photo_url
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Calculate expiration time
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=settings.spot_expiration_minutes)
    
    # Create spot with PostGIS POINT
    spot = Spot(
        pulser_id=current_user.id,
        address=spot_data.address,
        photo_url=spot_data.photo_url,
        expires_at=expires_at,
        status='available'
    )
    db.add(spot)
    db.flush()  # Get the ID before setting location
    
    # Update location using raw SQL (PostGIS)
    db.execute(
        text("""
            UPDATE spots 
            SET location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            WHERE id = :spot_id
        """),
        {
            "lat": spot_data.latitude,
            "lng": spot_data.longitude,
            "spot_id": spot.id
        }
    )
    db.commit()
    db.refresh(spot)
    
    # Get coordinates for response
    coords = db.execute(
        text("""
            SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
            FROM spots WHERE id = :spot_id
        """),
        {"spot_id": spot.id}
    ).first()
    
    return SpotResponse(
        id=spot.id,
        pulser_id=spot.pulser_id,
        latitude=coords.lat,
        longitude=coords.lng,
        address=spot.address,
        photo_url=spot.photo_url,
        reported_at=spot.reported_at,
        expires_at=spot.expires_at,
        status=spot.status
    )


@router.get("", response_model=List[SpotResponse])
def get_my_spots(
    current_user: User = Depends(get_current_pulser),
    db: Session = Depends(get_db)
):
    """Get all spots reported by current user."""
    spots = db.query(Spot).filter(
        Spot.pulser_id == current_user.id
    ).order_by(Spot.created_at.desc()).limit(50).all()
    
    result = []
    for spot in spots:
        coords = db.execute(
            text("""
                SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
                FROM spots WHERE id = :spot_id
            """),
            {"spot_id": spot.id}
        ).first()
        
        result.append(SpotResponse(
            id=spot.id,
            pulser_id=spot.pulser_id,
            latitude=coords.lat,
            longitude=coords.lng,
            address=spot.address,
            photo_url=spot.photo_url,
            reported_at=spot.reported_at,
            expires_at=spot.expires_at,
            status=spot.status
        ))
    
    return result
