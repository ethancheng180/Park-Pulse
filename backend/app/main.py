"""FastAPI main application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import auth, users, spots, requests, admin, upload
from .config import get_settings

settings = get_settings()

app = FastAPI(
    title="ParkPulse API",
    description="Two-sided parking marketplace API",
    version="0.1.0"
)

# CORS middleware for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (ensure directory exists first)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(spots.router)
app.include_router(requests.router)
app.include_router(admin.router)
app.include_router(upload.router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "ParkPulse API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}
