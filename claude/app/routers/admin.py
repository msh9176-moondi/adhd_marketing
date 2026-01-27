from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, CheckIn
from app.config import ADMIN_API_KEY
from app.utils import get_week_start_kst

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin_key(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return True


@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@router.get("/daily_summary")
async def daily_summary(
    date: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all checkins for the date
    checkins = db.query(CheckIn).filter(CheckIn.date_kst == target_date).all()

    if not checkins:
        return {
            "date": date,
            "text": f"📅 {date} 인증 요약\n\n인증 기록이 없습니다."
        }

    # Get unique users who checked in
    user_keys = list(set(c.user_key for c in checkins))
    users = db.query(User).filter(User.user_key.in_(user_keys)).all()
    user_map = {u.user_key: u for u in users}

    # Count by type
    type_counts = {}
    for c in checkins:
        type_counts[c.type] = type_counts.get(c.type, 0) + 1

    # Build user list (public only show nickname, others count)
    public_nicknames = []
    private_count = 0

    for user_key in user_keys:
        user = user_map.get(user_key)
        if user and user.is_public and user.nickname:
            public_nicknames.append(user.nickname)
        else:
            private_count += 1

    type_labels = {"wakeup": "기상", "exercise": "운동", "clean": "정리", "plan": "계획"}

    lines = [f"📅 {date} 인증 요약", ""]
    lines.append(f"총 참여자: {len(user_keys)}명")
    lines.append("")

    for t, label in type_labels.items():
        cnt = type_counts.get(t, 0)
        if cnt > 0:
            lines.append(f"  • {label}: {cnt}건")

    lines.append("")
    if public_nicknames:
        lines.append(f"🎉 참여자: {', '.join(sorted(public_nicknames))}")
    if private_count > 0:
        lines.append(f"  + 비공개 {private_count}명")

    return {
        "date": date,
        "text": "\n".join(lines)
    }


@router.get("/weekly_report")
async def weekly_report(
    week_start: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    try:
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Validate it's a Monday
    if week_start_date.weekday() != 0:
        raise HTTPException(status_code=400, detail="week_start must be a Monday")

    # Get all checkins for the week
    checkins = db.query(CheckIn).filter(CheckIn.week_start_kst == week_start_date).all()

    if not checkins:
        return {
            "week_start": week_start,
            "text": f"📊 주간 리포트 ({week_start}~)\n\n인증 기록이 없습니다."
        }

    # Aggregate by user
    user_stats = {}
    for c in checkins:
        if c.user_key not in user_stats:
            user_stats[c.user_key] = {"total": 0, "types": {}}
        user_stats[c.user_key]["total"] += 1
        t = c.type
        user_stats[c.user_key]["types"][t] = user_stats[c.user_key]["types"].get(t, 0) + 1

    # Get users
    user_keys = list(user_stats.keys())
    users = db.query(User).filter(User.user_key.in_(user_keys)).all()
    user_map = {u.user_key: u for u in users}

    # Sort by total count desc
    sorted_users = sorted(user_stats.items(), key=lambda x: x[1]["total"], reverse=True)

    lines = [f"📊 주간 리포트 ({week_start}~)", ""]
    lines.append(f"총 참여자: {len(user_keys)}명")
    lines.append(f"총 인증: {len(checkins)}건")
    lines.append("")
    lines.append("🏆 랭킹:")

    rank = 1
    for user_key, stats in sorted_users[:10]:
        user = user_map.get(user_key)
        if user and user.is_public and user.nickname:
            name = user.nickname
        else:
            name = f"익명{rank}"
        lines.append(f"  {rank}. {name}: {stats['total']}회")
        rank += 1

    return {
        "week_start": week_start,
        "text": "\n".join(lines)
    }
