"""Parking spot reporting router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
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
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.spot_expiration_minutes)
    
    # Create spot
    spot = Spot(
        pulser_id=current_user.id,
        latitude=spot_data.latitude,
        longitude=spot_data.longitude,
        address=spot_data.address,
        photo_url=spot_data.photo_url,
        expires_at=expires_at,
        status='available'
    )
    db.add(spot)
    db.commit()
    db.refresh(spot)
    
    return SpotResponse(
        id=spot.id,
        pulser_id=spot.pulser_id,
        latitude=float(spot.latitude),
        longitude=float(spot.longitude),
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
        result.append(SpotResponse(
            id=spot.id,
            pulser_id=spot.pulser_id,
            latitude=float(spot.latitude),
            longitude=float(spot.longitude),
            address=spot.address,
            photo_url=spot.photo_url,
            reported_at=spot.reported_at,
            expires_at=spot.expires_at,
            status=spot.status
        ))
    
    return result
