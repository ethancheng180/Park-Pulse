"""Application configuration from environment variables."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://parkpulse:parkpulse123@localhost:5432/parkpulse"
    
    # JWT
    secret_key: str = "change-this-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_days: int = 7
    
    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    
    # Google Maps
    google_maps_api_key: str = ""
    
    # Google OAuth
    google_client_id: str = ""
    
    # App Config
    environment: str = "development"
    platform_fee_percent: int = 20
    spot_expiration_minutes: int = 4
    
    # Matching Algorithm Weights
    distance_weight: float = 1.0
    freshness_weight: float = 0.5
    reputation_weight: float = 100.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def sync_database_url(self) -> str:
        """Ensure database URL is compatible with SQLAlchemy."""
        if self.database_url and self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql://", 1)
        return self.database_url


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
