import os
import sys

# Add parent dir to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def migrate():
    print("Migrating database...")
    with engine.connect() as connection:
        with open("migrations/002_reputation_schema.sql", "r") as f:
            sql = f.read()
            # Split by statement if needed, or execute block
            # For simple alters, execute valid SQL
            try:
                connection.execute(text(sql))
                connection.commit()
                print("Migration 002 applied successfully.")
            except Exception as e:
                print(f"Migration failed: {e}")
                # It might fail if columns exist, but IF NOT EXISTS handles that roughly. 
                # Constraints might fail if exist.
                
if __name__ == "__main__":
    migrate()
