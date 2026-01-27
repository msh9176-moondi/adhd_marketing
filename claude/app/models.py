from sqlalchemy import Column, String, Boolean, Integer, DateTime, Date, func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_key = Column(String, primary_key=True)
    nickname = Column(String(20), nullable=True)
    is_public = Column(Boolean, default=False)
    yellow_cards = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_key = Column(String, nullable=False)
    checkin_type = Column(String(20), nullable=False)  # wakeup, exercise, clean, plan
    date_kst = Column(Date, nullable=False)
    week_start_kst = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class WeeklyState(Base):
    __tablename__ = "weekly_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_key = Column(String, nullable=False)
    week_start_kst = Column(Date, nullable=False)
    total_count = Column(Integer, default=0)
    wakeup_count = Column(Integer, default=0)
    exercise_count = Column(Integer, default=0)
    clean_count = Column(Integer, default=0)
    plan_count = Column(Integer, default=0)
    is_success = Column(Boolean, default=False)
