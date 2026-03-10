from sqlalchemy import Column, Integer, Float, String
from database import Base

class PollutionData(Base):
    __tablename__ = "pollution_data"

    id = Column(Integer, primary_key=True, index=True)
    region = Column(String)
    sample_type = Column(String)
    date = Column(String)

    Pb = Column(Float)
    Cd = Column(Float)
    Hg = Column(Float)
    As = Column(Float)
    Cr = Column(Float)
