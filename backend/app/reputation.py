"""Reputation scoring and update logic."""
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from .models import Reputation, User


def update_reputation_after_verification(
    db: Session,
    pulser_id: int,
    found: bool,
    amount_earned: Decimal = Decimal("0")
) -> Reputation:
    """
    Update pulser reputation after verification.
    
    Args:
        pulser_id: User ID of the pulser
        found: True if spot was verified as real, False otherwise
        amount_earned: Amount earned if successful
    """
    reputation = db.query(Reputation).filter(Reputation.user_id == pulser_id).first()
    
    if not reputation:
        # Create new reputation if doesn't exist
        reputation = Reputation(user_id=pulser_id)
        db.add(reputation)
    
    # Update counts
    if found:
        reputation.successful_reports += 1
        reputation.total_earnings += amount_earned
        
        # Increase rating (max 5.0)
        # Each success increases rating by 0.1, capped at 5.0
        new_rating = min(Decimal("5.0"), reputation.rating + Decimal("0.1"))
        reputation.rating = new_rating
    else:
        reputation.failed_reports += 1
        
        # Decrease rating (min 0.0)
        # Each failure decreases rating by 0.3
        new_rating = max(Decimal("0.0"), reputation.rating - Decimal("0.3"))
        reputation.rating = new_rating
    
    reputation.last_report_at = datetime.utcnow()
    
    db.commit()
    db.refresh(reputation)
    
    return reputation


def should_throttle_user(reputation: Reputation) -> bool:
    """
    Determine if a user should be throttled from reporting spots.
    
    Throttle if:
    - Rating below 2.0
    - More than 3 failed reports in a row (would need to track this separately)
    - Success rate below 50% with more than 10 reports
    """
    if reputation.rating < Decimal("2.0"):
        return True
    
    total_reports = reputation.successful_reports + reputation.failed_reports
    if total_reports >= 10:
        success_rate = reputation.successful_reports / total_reports
        if success_rate < 0.5:
            return True
    
    return False


def calculate_earnings_multiplier(reputation: Reputation) -> Decimal:
    """
    Calculate earnings multiplier based on reputation.
    Higher reputation = higher multiplier (future feature).
    
    For now, returns 1.0 for everyone.
    """
    return Decimal("1.0")
