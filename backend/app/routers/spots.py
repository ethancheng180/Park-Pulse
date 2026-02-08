"""Parking spot reporting router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
from typing import List
from decimal import Decimal
from ..database import get_db
from ..models import User, Spot, Reputation
from ..schemas import SpotCreate, SpotResponse
from ..auth import get_current_pulser, get_current_user
from ..fraud import validate_spot_report
from ..config import get_settings

router = APIRouter(prefix="/spots", tags=["spots"])
settings = get_settings()


def calculate_confidence(spot: Spot, db: Session) -> str:
    """
    Calculate confidence score based on:
    - Reporter rating (0-5) -> +0 to +30 points
    - Has photo -> +15 points
    - Recency penalty (< 2min = 0, 2-5min = -5, > 5min = -15)
    
    Thresholds: Low (< 60), Medium (60-80), High (> 80)
    """
    score = 50  # Base score
    
    # Get reporter's reputation
    reputation = db.query(Reputation).filter(Reputation.user_id == spot.pulser_id).first()
    if reputation:
        # Rating from 0-5, contribute 0-30 points
        rating = float(reputation.rating) if reputation.rating else 0
        score += rating * 6  # Max +30
    else:
        # New user with no reputation - give benefit of doubt
        score += 15
    
    # Photo bonus
    if spot.photo_url:
        score += 15
    
    # Recency penalty
    now = datetime.now(timezone.utc)
    reported_at = spot.reported_at
    if reported_at.tzinfo is None:
        reported_at = reported_at.replace(tzinfo=timezone.utc)
    
    age_minutes = (now - reported_at).total_seconds() / 60
    
    if age_minutes <= 2:
        pass  # No penalty
    elif age_minutes <= 5:
        score -= 5
    else:
        score -= 15
    
    # Determine label
    if score >= 80:
        return "High"
    elif score >= 60:
        return "Medium"
    else:
        return "Low"


def spot_to_response(spot: Spot, db: Session) -> SpotResponse:
    """Convert Spot model to SpotResponse with confidence."""
    return SpotResponse(
        id=spot.id,
        pulser_id=spot.pulser_id,
        latitude=float(spot.latitude),
        longitude=float(spot.longitude),
        address=spot.address,
        photo_url=spot.photo_url,
        reported_at=spot.reported_at,
        expires_at=spot.expires_at,
        status=spot.status,
        price=float(spot.price) if spot.price else 5.0,
        confidence=calculate_confidence(spot, db),
        claimed_by_user_id=spot.claimed_by_user_id,
        claimed_at=spot.claimed_at,
        claim_expires_at=spot.claim_expires_at,
        taken_confirmed_at=spot.taken_confirmed_at,
    )


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
        price=spot_data.price,
        expires_at=expires_at,
        status='available'
    )
    db.add(spot)
    db.commit()
    db.refresh(spot)
    
    return spot_to_response(spot, db)


@router.get("", response_model=List[SpotResponse])
def get_my_spots(
    current_user: User = Depends(get_current_pulser),
    db: Session = Depends(get_db)
):
    """Get all spots reported by current user."""
    spots = db.query(Spot).filter(
        Spot.pulser_id == current_user.id
    ).order_by(Spot.created_at.desc()).limit(50).all()
    
    return [spot_to_response(spot, db) for spot in spots]


@router.get("/available", response_model=List[SpotResponse])
def get_available_spots(
    db: Session = Depends(get_db)
):
    """Get all currently available spots for drivers to view on map."""
    now = datetime.now(timezone.utc)
    
    # Get spots that are available and not expired
    spots = db.query(Spot).filter(
        Spot.status == 'available',
        Spot.expires_at > now
    ).order_by(Spot.created_at.desc()).limit(100).all()
    
    return [spot_to_response(spot, db) for spot in spots]


@router.delete("/{spot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_spot(
    spot_id: int,
    current_user: User = Depends(get_current_pulser),
    db: Session = Depends(get_db)
):
    """Delete a spot reported by the current user."""
    spot = db.query(Spot).filter(Spot.id == spot_id).first()
    
    if not spot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spot not found"
        )
        
    if spot.pulser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this spot"
        )
    
    db.delete(spot)
    db.commit()
    return None


@router.post("/{spot_id}/claim", response_model=SpotResponse)
def claim_spot(
    spot_id: int,
    current_user: User = Depends(get_current_user),  # Any auth user can claim for MVP
    db: Session = Depends(get_db)
):
    """Claim a spot (Atomic)."""
    # Select for update to prevent race conditions
    spot = db.query(Spot).filter(Spot.id == spot_id).with_for_update().first()
    
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
        
    if spot.status != 'available':
        raise HTTPException(status_code=409, detail="Spot is no longer available")
        
    now = datetime.now(timezone.utc)
    if spot.expires_at < now:
         raise HTTPException(status_code=400, detail="Spot has expired")

    # Update state
    spot.status = 'claimed'
    spot.claimed_by_user_id = current_user.id
    spot.claimed_at = now
    spot.claim_expires_at = now + timedelta(minutes=2)
    
    db.commit()
    db.refresh(spot)
    return spot_to_response(spot, db)


@router.post("/{spot_id}/take", response_model=SpotResponse)
def mark_spot_taken(
    spot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm spot is taken."""
    spot = db.query(Spot).filter(Spot.id == spot_id).first()
    
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
        
    if spot.claimed_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized (not the claimer)")
        
    spot.status = 'taken'
    spot.taken_confirmed_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(spot)
    return spot_to_response(spot, db)


@router.post("/{spot_id}/release", response_model=SpotResponse)
def release_spot(
    spot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Release a claim."""
    spot = db.query(Spot).filter(Spot.id == spot_id).first()
    
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
        
    if spot.claimed_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized (not the claimer)")
        
    # Revert to available
    spot.status = 'available'
    spot.claimed_by_user_id = None
    spot.claimed_at = None
    spot.claim_expires_at = None
    
    db.commit()
    db.refresh(spot)
    return spot_to_response(spot, db)
