from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import secrets
from pathlib import Path
from ..config import get_settings

router = APIRouter(prefix="/upload", tags=["upload"])
settings = get_settings()

UPLOAD_DIR = Path("backend/static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file and return the URL.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate random filename to prevent collisions and traversal attacks
    token = secrets.token_hex(8)
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{token}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
        
    # Return full URL or relative path
    # Using relative path that works with the static mount
    return {"url": f"/static/uploads/{filename}"}
