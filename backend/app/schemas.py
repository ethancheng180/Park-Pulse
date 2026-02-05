"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(driver|pulser|both)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# User Schemas
class ReputationResponse(BaseModel):
    rating: Decimal
    successful_reports: int
    failed_reports: int
    total_earnings: Decimal
    false_report_strikes: int
    
    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    balance: Decimal
    reputation: Optional[ReputationResponse] = None
    banned: bool = False
    ban_reason: Optional[str] = None
    appeal_status: str = "none"
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Spot Schemas
class SpotCreate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: Optional[str] = None
    photo_url: Optional[str] = None


class SpotResponse(BaseModel):
    id: int
    pulser_id: int
    latitude: float
    longitude: float
    address: Optional[str]
    photo_url: Optional[str]
    reported_at: datetime
    expires_at: datetime
    status: str
    
    model_config = ConfigDict(from_attributes=True)


# Request Schemas
class ParkingRequestCreate(BaseModel):
    destination_latitude: float = Field(ge=-90, le=90)
    destination_longitude: float = Field(ge=-180, le=180)
    destination_address: Optional[str] = None
    radius_meters: Decimal = Field(gt=0, le=5000)  # Max 5km
    max_price: Decimal = Field(gt=0, le=100)  # Max $100


class MatchResponse(BaseModel):
    id: int
    spot_id: int
    distance_meters: Decimal
    amount: Decimal
    spot: SpotResponse
    stripe_client_secret: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ParkingRequestResponse(BaseModel):
    id: int
    status: str
    match: Optional[MatchResponse] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Verification Schemas
class VerificationCreate(BaseModel):
    match_id: int
    found: bool
    notes: Optional[str] = None


class VerificationResponse(BaseModel):
    id: int
    match_id: int
    found: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# History Schemas
class HistoryItem(BaseModel):
    id: int
    type: str  # 'spot', 'request', 'payout'
    amount: Optional[Decimal]
    status: str
    created_at: datetime
    details: Optional[dict] = None
    
    model_config = ConfigDict(from_attributes=True)


class HistoryResponse(BaseModel):
    items: List[HistoryItem]


# Admin Schemas
class RefundRequest(BaseModel):
    match_id: int
    reason: str



class BanUserRequest(BaseModel):
    user_id: int
    reason: str


class AppealCreate(BaseModel):
    message: str = Field(min_length=10)
    attachment_url: Optional[str] = None
