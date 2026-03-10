from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Point to the correct database file
db_path = r"C:\Users\casel\OneDrive\Desktop\pollution webapp\Backend\pollution.db"
engine = create_engine(f"sqlite:///{db_path}")
Session = sessionmaker(bind=engine)
session = Session()

try:
    # Check if table exists and count rows
    result = session.execute(text("SELECT count(*) FROM pollution_data"))
    count = result.scalar()
    print(f"Row count in pollution_data: {count}")
    
    # Also print first row if exists
    if count > 0:
        first = session.execute(text("SELECT * FROM pollution_data LIMIT 1")).fetchone()
        print(f"First row: {first}")
        
except Exception as e:
    print(f"Error: {e}")

session.close()
