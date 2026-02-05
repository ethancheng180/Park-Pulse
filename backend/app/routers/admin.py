"""Admin endpoints for refunds and bans."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Match
from ..schemas import RefundRequest, BanUserRequest
from ..auth import get_current_user
from ..stripe_utils import refund_payment

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is an admin (stub - all users are admins for MVP)."""
    # In production, check for admin role
    # For MVP, allow all authenticated users to access admin endpoints
    return current_user


@router.post("/refund")
def admin_refund(
    refund_data: RefundRequest,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin: Manually refund a match."""
    match = db.query(Match).filter(Match.id == refund_data.match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    if match.status == 'refunded':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match already refunded"
        )
    
    # Process refund
    if match.stripe_payment_intent_id:
        try:
            refund_payment(match.stripe_payment_intent_id, reason="requested_by_customer")
            match.status = 'refunded'
            db.commit()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Refund failed: {str(e)}"
            )
    
    return {
        "success": True,
        "match_id": match.id,
        "reason": refund_data.reason
    }


@router.post("/ban")
def admin_ban_user(
    ban_data: BanUserRequest,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin: Ban a user from the platform."""
    user = db.query(User).filter(User.id == ban_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.banned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already banned"
        )
    
    user.banned = True
    db.commit()
    
    return {
        "success": True,
        "user_id": user.id,
        "reason": ban_data.reason
    }
