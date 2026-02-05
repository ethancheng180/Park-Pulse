"""User profile and history router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Spot, Match, Payout
from ..schemas import UserResponse, HistoryResponse, HistoryItem
from ..auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile with balance and reputation."""
    # Refresh to get updated reputation
    db.refresh(current_user)
    return current_user


@router.get("/history", response_model=HistoryResponse)
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's transaction history."""
    items = []
    
    # Get spots reported (if pulser)
    if current_user.role in ["pulser", "both"]:
        spots = db.query(Spot).filter(
            Spot.pulser_id == current_user.id
        ).order_by(Spot.created_at.desc()).limit(50).all()
        
        for spot in spots:
            items.append(HistoryItem(
                id=spot.id,
                type="spot",
                amount=None,
                status=spot.status,
                created_at=spot.created_at,
                details={
                    "address": spot.address,
                    "expires_at": spot.expires_at.isoformat() if spot.expires_at else None
                }
            ))
    
    # Get parking requests (if driver)
    if current_user.role in ["driver", "both"]:
        requests = db.query(Match).join(
            Match.request
        ).filter(
            Match.request.has(driver_id=current_user.id)
        ).order_by(Match.created_at.desc()).limit(50).all()
        
        for match in requests:
            items.append(HistoryItem(
                id=match.id,
                type="request",
                amount=match.amount,
                status=match.status,
                created_at=match.created_at
            ))
    
    # Get payouts received (if pulser)
    if current_user.role in ["pulser", "both"]:
        payouts = db.query(Payout).filter(
            Payout.pulser_id == current_user.id
        ).order_by(Payout.created_at.desc()).limit(50).all()
        
        for payout in payouts:
            items.append(HistoryItem(
                id=payout.id,
                type="payout",
                amount=payout.amount,
                status=payout.status,
                created_at=payout.created_at,
                details={
                    "platform_fee": str(payout.platform_fee)
                }
            ))
    
    # Sort all items by created_at
    items.sort(key=lambda x: x.created_at, reverse=True)
    
    return HistoryResponse(items=items[:50])  # Limit to 50 most recent
