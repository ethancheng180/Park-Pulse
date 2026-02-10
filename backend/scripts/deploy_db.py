import os
import sys
import sqlalchemy
from sqlalchemy import text

# Add parent directory to path to import app modules if needed, 
# but here we just need sqlalchemy
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def deploy_db(db_url, sql_file_path):
    print(f"Deploying to {db_url.split('@')[-1]}...") # Hide credentials in log
    
    # Fix postgres:// for sqlalchemy
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    try:
        engine = sqlalchemy.create_engine(db_url)
        with engine.connect() as connection:
            with open(sql_file_path, 'r') as f:
                sql_content = f.read()
                
            # Split by simple logic (this schema is simple enough)
            # Or just execute the whole block if using psycopg2 directly.
            # SQLAlchemy text() might handle multiple statements if supported by driver,
            # but usually it's safer to execute statement by statement or using a raw connection.
            # However, for this specific file which contains $$ blocks for functions, 
            # simple splitting by ';' is dangerous.
            # Let's try executing the whole block.
            
            # Since we have CREATE EXTENSION and multiple DDLs, let's try raw execution.
            print("Executing SQL schema...")
            connection.execute(text(sql_content))
            connection.commit()
            print("Schema deployed successfully!")
            
    except Exception as e:
        print(f"Error deploying database: {e}")
        # Fallback to splitting if the single block failed (PostgreSQL sometimes allows it)
        # But really, psycopg2 supports executing script.
        # Let's try raw cursor if engine fails.
        raise e

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy_db.py <sql_file_path>")
        sys.exit(1)
        
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL environment variable required")
        sys.exit(1)
        
    sql_file = sys.argv[1]
    deploy_db(db_url, sql_file)
