from sqlalchemy import Column, String, Boolean, Integer, DateTime, Date, func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_key = Column(String, primary_key=True)
    nickname = Column(String(20), nullable=True)
    is_public = Column(Boolean, default=True)
    yellow_cards = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_key = Column(String, nullable=False)
    type = Column(String(20), nullable=False)  # wakeup, exercise, clean, plan
    date_kst = Column(Date, nullable=False)
    week_start_kst = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class WeeklyState(Base):
    __tablename__ = "weekly_state"

    user_key = Column(String, primary_key=True)
    week_start_kst = Column(Date, primary_key=True)
    count_total = Column(Integer, default=0)
    count_wakeup = Column(Integer, default=0)
    count_exercise = Column(Integer, default=0)
    count_clean = Column(Integer, default=0)
    count_plan = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
