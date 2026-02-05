"""Authentication router - register and login endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserRegister, UserLogin, Token
from ..auth import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token."""
    # Find user
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if user.banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been banned"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/password-reset-request")
def request_password_reset(data: dict, db: Session = Depends(get_db)):
    """
    Request a password reset link.
    Always returns 200 OK to prevent account enumeration.
    """
    email = data.get("email", "")
    
    # Check if user exists (but don't reveal this to client)
    user = db.query(User).filter(User.email == email).first()
    if user:
        # MVP: Just log, no actual email sending
        print(f"[PASSWORD RESET] Request for: {email}")
    
    # Always return success to prevent enumeration
    return {"message": "If an account exists, a reset link will be sent."}


@router.post("/find-account")
def find_account(data: dict, db: Session = Depends(get_db)):
    """
    Find an account by email or phone.
    Returns whether account exists (for account recovery flow).
    """
    identifier = data.get("identifier", "")
    
    # Check by email
    user = db.query(User).filter(User.email == identifier).first()
    
    if user:
        return {"found": True, "recovery_method": "email"}
    
    # MVP: No phone support yet, always return not found for non-email
    return {"found": False}


@router.post("/google", response_model=Token)
def google_login(data: dict, db: Session = Depends(get_db)):
    """
    Login with Google ID Token.
    Verifies the token with Google and gets user info.
    """
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    import os

    token = data.get("idToken")
    if not token:
        raise HTTPException(status_code=400, detail="ID Token missing")

    try:
        # Verify the ID token
        # You need to set GOOGLE_CLIENT_ID in your .env
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)

        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        email = idinfo['email']
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user if not exists
            user = User(
                email=email,
                password_hash="SOCIAL_LOGIN", # Placeholder for social login
                role="both" # Default role
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        if user.banned:
            raise HTTPException(status_code=403, detail="Account has been banned")

        # Create ParkPulse access token
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print(f"Google login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during Google login")


