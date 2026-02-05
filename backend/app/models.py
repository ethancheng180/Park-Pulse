"""SQLAlchemy database models."""
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    balance = Column(Numeric(10, 2), default=0.00)
    stripe_customer_id = Column(String(255))
    stripe_account_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    banned = Column(Boolean, default=False)
    ban_reason = Column(String(255), nullable=True)
    appeal_status = Column(String(20), default="none")  # none, pending, approved, rejected
    
    # Relationships
    reputation = relationship("Reputation", back_populates="user", uselist=False)
    spots = relationship("Spot", back_populates="pulser")
    requests = relationship("Request", back_populates="driver")
    
    __table_args__ = (
        CheckConstraint("role IN ('driver', 'pulser', 'both')", name="check_user_role"),
        CheckConstraint("appeal_status IN ('none', 'pending', 'approved', 'rejected')", name="check_appeal_status"),
    )


class Reputation(Base):
    __tablename__ = "reputations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    rating = Column(Numeric(3, 2), default=5.00)
    successful_reports = Column(Integer, default=0)
    failed_reports = Column(Integer, default=0)
    total_earnings = Column(Numeric(10, 2), default=0.00)
    last_report_at = Column(DateTime(timezone=True))
    false_report_strikes = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="reputation")
    
    __table_args__ = (
        CheckConstraint("rating >= 0 AND rating <= 5", name="check_rating_range"),
    )


class Spot(Base):
    __tablename__ = "spots"
    
    id = Column(Integer, primary_key=True, index=True)
    pulser_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    address = Column(Text)
    photo_url = Column(Text)
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="available")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    pulser = relationship("User", back_populates="spots")
    matches = relationship("Match", back_populates="spot")
    
    __table_args__ = (
        CheckConstraint("status IN ('available', 'matched', 'verified', 'expired', 'failed')", name="check_spot_status"),
    )


class Request(Base):
    __tablename__ = "requests"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    destination_latitude = Column(Numeric(10, 8), nullable=False)
    destination_longitude = Column(Numeric(11, 8), nullable=False)
    destination_address = Column(Text)
    radius_meters = Column(Numeric(10, 2), nullable=False)
    max_price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    driver = relationship("User", back_populates="requests")
    matches = relationship("Match", back_populates="request")
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'matched', 'verified', 'failed', 'expired')", name="check_request_status"),
    )


class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id", ondelete="CASCADE"))
    spot_id = Column(Integer, ForeignKey("spots.id", ondelete="CASCADE"))
    distance_meters = Column(Numeric(10, 2), nullable=False)
    score = Column(Numeric(10, 2), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    stripe_payment_intent_id = Column(String(255))
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    request = relationship("Request", back_populates="matches")
    spot = relationship("Spot", back_populates="matches")
    verification = relationship("Verification", back_populates="match", uselist=False)
    payout = relationship("Payout", back_populates="match", uselist=False)
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'paid', 'verified', 'refunded')", name="check_match_status"),
    )


class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), unique=True)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    found = Column(Boolean, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="verification")


class Payout(Base):
    __tablename__ = "payouts"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"))
    pulser_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    amount = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2), nullable=False)
    stripe_transfer_id = Column(String(255))
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    match = relationship("Match", back_populates="payout")
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'processing', 'completed', 'failed')", name="check_payout_status"),
    )
