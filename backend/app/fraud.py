from typing import Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from .models import User, Spot, Reputation
import hashlib


def validate_gps_coordinates(latitude: float, longitude: float) -> Tuple[bool, str]:
    """
    Validate GPS coordinates are plausible.
    
    Returns:
        (is_valid, error_message)
    """
    if not (-90 <= latitude <= 90):
        return False, "Invalid latitude: must be between -90 and 90"
    
    if not (-180 <= longitude <= 180):
        return False, "Invalid longitude: must be between -180 and 180"
    
    # Check for exact 0,0 (often indicates GPS error)
    if latitude == 0 and longitude == 0:
        return False, "Invalid coordinates: GPS may not be enabled"
    
    return True, ""


def check_photo_reuse(db: Session, photo_url: str, user_id: int) -> bool:
    """
    Check if a photo has been used before (stub implementation).
    
    In production, this would:
    - Hash the image
    - Check against database of previous photo hashes
    - Flag if same photo used multiple times
    
    Returns:
        True if photo appears to be reused, False otherwise
    """
    if not photo_url:
        return False
    
    # Simple hash of URL (in production, hash actual image content)
    photo_hash = hashlib.md5(photo_url.encode()).hexdigest()
    
    # Check if this hash was used recently by this user
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    existing_spots = db.query(Spot).filter(
        Spot.pulser_id == user_id,
        Spot.created_at > recent_cutoff,
        Spot.photo_url.like(f"%{photo_hash}%")
    ).count()
    
    return existing_spots > 0


def check_rate_limit(db: Session, user_id: int, window_minutes: int = 10, max_reports: int = 5) -> Tuple[bool, str]:
    """
    Check if user is exceeding rate limits.
    
    Args:
        user_id: User to check
        window_minutes: Time window in minutes
        max_reports: Maximum reports allowed in window
    
    Returns:
        (is_allowed, error_message)
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    
    recent_reports = db.query(Spot).filter(
        Spot.pulser_id == user_id,
        Spot.created_at > cutoff
    ).count()
    
    if recent_reports >= max_reports:
        return False, f"Rate limit exceeded: max {max_reports} reports per {window_minutes} minutes"
    
    return True, ""


def check_reputation_threshold(reputation: Reputation) -> Tuple[bool, str]:
    """
    Check if user's reputation is above minimum threshold to report spots.
    
    Returns:
        (is_allowed, error_message)
    """
    # Allow new users (no reputation yet)
    if reputation is None:
        return True, ""
    
    # Block users with very low rating
    if reputation.rating < 1.0:
        return False, "Reputation too low: please improve accuracy to continue reporting"
    
    # Check success rate for experienced users
    total_reports = reputation.successful_reports + reputation.failed_reports
    if total_reports >= 10:
        success_rate = reputation.successful_reports / total_reports
        if success_rate < 0.3:  # 30% threshold
            return False, "Accuracy too low: please improve verification rate"
    
    return True, ""


def validate_spot_report(
    db: Session,
    user: User,
    latitude: float,
    longitude: float,
    photo_url: str = None
) -> Tuple[bool, str]:
    """
    Run all fraud checks before accepting a spot report.
    
    Returns:
        (is_valid, error_message)
    """
    # GPS validation
    is_valid, error = validate_gps_coordinates(latitude, longitude)
    if not is_valid:
        return False, error
    
    # Rate limiting
    is_allowed, error = check_rate_limit(db, user.id)
    if not is_allowed:
        return False, error
    
    # Reputation check
    if user.reputation:
        is_allowed, error = check_reputation_threshold(user.reputation)
        if not is_allowed:
            return False, error
    
    # Photo reuse check (if photo provided)
    if photo_url:
        is_reused = check_photo_reuse(db, photo_url, user.id)
        if is_reused:
            return False, "Photo appears to be reused from previous report"
    
    return True, ""
