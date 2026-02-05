"""User management router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import AppealCreate, UserResponse, HistoryResponse
from ..auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user details."""
    return current_user


@router.get("/history", response_model=HistoryResponse)
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user history (spots and requests)."""
    # TODO: Implement actual history aggregation from Spots and Requests tables
    return {"items": []}


@router.post("/appeal", status_code=status.HTTP_201_CREATED)
def submit_appeal(
    appeal_data: AppealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an appeal for a banned account."""
    if not current_user.banned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not banned."
        )
        
    if current_user.appeal_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appeal already pending."
        )
        
    # In MVP, just update the status. In future, create Appeal model.
    # For now, we store appeal status on User. 
    # Ideally we'd log the message somewhere, but for MVP updating status is enough 
    # to show "Pending" UI.
    
    current_user.appeal_status = "pending"
    # We could log the message to a new table "Appeal" later, or just print it for now/MVP
    print(f"Appeal from User {current_user.id}: {appeal_data.message}")
    
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Appeal submitted successfully", "status": "pending"}
