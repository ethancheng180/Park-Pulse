"""Parking request and verification router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from decimal import Decimal
from ..database import get_db
from ..models import User, Request, Match, Spot, Verification
from ..schemas import (
    ParkingRequestCreate, 
    ParkingRequestResponse, 
    MatchResponse, 
    SpotResponse,
    VerificationCreate,
    VerificationResponse
)
from ..auth import get_current_driver
from ..matching import find_best_match, create_match
from ..stripe_utils import create_payment_intent, ensure_stripe_customer, capture_payment, refund_payment, create_payout_to_pulser
from ..reputation import update_reputation_after_verification

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=ParkingRequestResponse, status_code=status.HTTP_201_CREATED)
def create_parking_request(
    request_data: ParkingRequestCreate,
    current_user: User = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Create a parking request and find best match."""
    # Create request
    parking_request = Request(
        driver_id=current_user.id,
        destination_latitude=request_data.destination_latitude,
        destination_longitude=request_data.destination_longitude,
        destination_address=request_data.destination_address,
        radius_meters=request_data.radius_meters,
        max_price=request_data.max_price,
        status='pending'
    )
    db.add(parking_request)
    db.commit()
    db.refresh(parking_request)
    
    # Find best match
    match_result = find_best_match(db, parking_request)
    
    if not match_result:
        # No match found
        parking_request.status = 'failed'
        db.commit()
        return ParkingRequestResponse(
            id=parking_request.id,
            status=parking_request.status,
            match=None,
            created_at=parking_request.created_at
        )
    
    spot, distance, score = match_result
    
    # For MVP, use simple flat pricing based on distance
    base_price = Decimal("3.00")
    distance_price = Decimal(str(distance / 1000)) * Decimal("1.00")
    total_price = min(base_price + distance_price, request_data.max_price)
    
    # Create Stripe PaymentIntent
    customer_id = ensure_stripe_customer(db, current_user)
    payment_intent = create_payment_intent(
        amount=total_price,
        customer_id=customer_id,
        metadata={
            "request_id": parking_request.id,
            "spot_id": spot.id,
            "driver_id": current_user.id
        }
    )
    
    # Create match
    match = create_match(
        db=db,
        request=parking_request,
        spot=spot,
        distance_meters=distance,
        score=score,
        amount=total_price
    )
    match.stripe_payment_intent_id = payment_intent["id"]
    db.commit()
    db.refresh(match)
    
    match_response = MatchResponse(
        id=match.id,
        spot_id=match.spot_id,
        distance_meters=match.distance_meters,
        amount=match.amount,
        spot=SpotResponse(
            id=spot.id,
            pulser_id=spot.pulser_id,
            latitude=float(spot.latitude),
            longitude=float(spot.longitude),
            address=spot.address,
            photo_url=spot.photo_url,
            reported_at=spot.reported_at,
            expires_at=spot.expires_at,
            status=spot.status
        ),
        stripe_client_secret=payment_intent.get("client_secret")
    )
    
    return ParkingRequestResponse(
        id=parking_request.id,
        status=parking_request.status,
        match=match_response,
        created_at=parking_request.created_at
    )


@router.post("/verify", response_model=VerificationResponse)
def verify_parking_spot(
    verification_data: VerificationCreate,
    current_user: User = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Verify whether the matched parking spot was found or not."""
    # Get match
    match = db.query(Match).filter(Match.id == verification_data.match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Verify ownership
    if match.request.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only verify your own requests"
        )
    
    # Check if already verified
    existing = db.query(Verification).filter(Verification.match_id == match.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match already verified"
        )
    
    # Create verification
    verification = Verification(
        match_id=match.id,
        verified_by=current_user.id,
        found=verification_data.found,
        notes=verification_data.notes
    )
    db.add(verification)
    
    # Update match status
    match.status = 'verified' if verification_data.found else 'refunded'
    
    # Update spot status
    spot = match.spot
    spot.status = 'verified' if verification_data.found else 'failed'
    
    # Update request status
    match.request.status = 'verified' if verification_data.found else 'failed'
    
    db.commit()
    
    # Process payment
    if verification_data.found:
        # Capture payment
        if match.stripe_payment_intent_id:
            capture_payment(match.stripe_payment_intent_id)
        
        # Create payout to pulser
        pulser = spot.pulser
        payout = create_payout_to_pulser(db, match, pulser)
        
        # Update reputation (success)
        update_reputation_after_verification(
            db,
            pulser.id,
            found=True,
            amount_earned=payout.amount
        )
    else:
        # Refund payment
        if match.stripe_payment_intent_id:
            refund_payment(match.stripe_payment_intent_id, reason="fraudulent")
        
        # Update reputation (failure)
        update_reputation_after_verification(
            db,
            spot.pulser_id,
            found=False
        )
    
    db.refresh(verification)
    
    return VerificationResponse(
        id=verification.id,
        match_id=verification.match_id,
        found=verification.found,
        created_at=verification.created_at
    )
