from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, CheckIn
from app.utils import (
    extract_user_key, extract_params, extract_utterance,
    get_today_kst, get_week_start_kst
)
from app.services.kakao_response import simple_text, quick_reply

router = APIRouter(prefix="/kakao", tags=["kakao"])


def get_or_create_user(db: Session, user_key: str) -> User:
    user = db.query(User).filter(User.user_key == user_key).first()
    if not user:
        user = User(user_key=user_key)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/user/nickname")
async def set_nickname(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    user_key = extract_user_key(payload)
    if not user_key:
        return simple_text("사용자 정보를 확인할 수 없습니다.")

    params = extract_params(payload)
    nickname = params.get("nickname") or extract_utterance(payload)
    nickname = nickname.strip()

    if not nickname or len(nickname) < 1 or len(nickname) > 20:
        return simple_text("닉네임은 1~20자로 입력해주세요.")

    user = get_or_create_user(db, user_key)
    user.nickname = nickname
    db.commit()

    return simple_text(
        f"닉네임이 '{nickname}'(으)로 설정되었습니다!",
        [
            quick_reply("공개 ON", "공개 ON"),
            quick_reply("공개 OFF", "공개 OFF"),
            quick_reply("내 현황", "내 현황")
        ]
    )


@router.post("/user/public_on")
async def public_on(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    user_key = extract_user_key(payload)
    if not user_key:
        return simple_text("사용자 정보를 확인할 수 없습니다.")

    user = get_or_create_user(db, user_key)
    user.is_public = True
    db.commit()

    return simple_text("닉네임 공개가 ON 되었습니다. 랭킹/요약에 닉네임이 표시됩니다.")


@router.post("/user/public_off")
async def public_off(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    user_key = extract_user_key(payload)
    if not user_key:
        return simple_text("사용자 정보를 확인할 수 없습니다.")

    user = get_or_create_user(db, user_key)
    user.is_public = False
    db.commit()

    return simple_text("닉네임 공개가 OFF 되었습니다. 랭킹/요약에 닉네임이 표시되지 않습니다.")


async def do_checkin(request: Request, db: Session, type: str):
    payload = await request.json()
    user_key = extract_user_key(payload)
    if not user_key:
        return simple_text("사용자 정보를 확인할 수 없습니다.")

    user = get_or_create_user(db, user_key)
    today = get_today_kst()
    week_start = get_week_start_kst(today)

    # Check duplicate
    existing = db.query(CheckIn).filter(
        CheckIn.user_key == user_key,
        CheckIn.type == type,
        CheckIn.date_kst == today
    ).first()

    if existing:
        return simple_text(f"오늘 이미 {type} 인증을 완료했습니다!")

    checkin = CheckIn(
        user_key=user_key,
        type=type,
        date_kst=today,
        week_start_kst=week_start
    )
    db.add(checkin)
    db.commit()

    type_labels = {
        "wakeup": "기상",
        "exercise": "운동",
        "clean": "정리",
        "plan": "계획"
    }
    label = type_labels.get(type, type)

    # Count today's checkins
    today_count = db.query(CheckIn).filter(
        CheckIn.user_key == user_key,
        CheckIn.date_kst == today
    ).count()

    return simple_text(
        f"✅ {label} 인증 완료! (오늘 {today_count}개)",
        [
            quick_reply("기상 인증", "기상 인증"),
            quick_reply("운동 인증", "운동 인증"),
            quick_reply("정리 인증", "정리 인증"),
            quick_reply("계획 인증", "계획 인증"),
            quick_reply("내 현황", "내 현황")
        ]
    )


@router.post("/checkin/wakeup")
async def checkin_wakeup(request: Request, db: Session = Depends(get_db)):
    return await do_checkin(request, db, "wakeup")


@router.post("/checkin/exercise")
async def checkin_exercise(request: Request, db: Session = Depends(get_db)):
    return await do_checkin(request, db, "exercise")


@router.post("/checkin/clean")
async def checkin_clean(request: Request, db: Session = Depends(get_db)):
    return await do_checkin(request, db, "clean")


@router.post("/checkin/plan")
async def checkin_plan(request: Request, db: Session = Depends(get_db)):
    return await do_checkin(request, db, "plan")


@router.post("/status")
async def get_status(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    user_key = extract_user_key(payload)
    if not user_key:
        return simple_text("사용자 정보를 확인할 수 없습니다.")

    user = get_or_create_user(db, user_key)
    today = get_today_kst()
    week_start = get_week_start_kst(today)

    # Get weekly counts by type
    weekly_checkins = db.query(
        CheckIn.type,
        func.count(CheckIn.id).label("cnt")
    ).filter(
        CheckIn.user_key == user_key,
        CheckIn.week_start_kst == week_start
    ).group_by(CheckIn.type).all()

    counts = {row.type: row.cnt for row in weekly_checkins}
    total = sum(counts.values())

    nickname_display = user.nickname or "(미설정)"
    public_status = "공개 ON" if user.is_public else "공개 OFF"

    text = f"""📊 {nickname_display}님의 현황

🗓️ 이번 주 인증 현황 (총 {total}개)
  • 기상: {counts.get('wakeup', 0)}회
  • 운동: {counts.get('exercise', 0)}회
  • 정리: {counts.get('clean', 0)}회
  • 계획: {counts.get('plan', 0)}회

🎖️ 레벨: {user.level}
🟡 옐로카드: {user.yellow_cards}장
🔓 닉네임 공개: {public_status}"""

    return simple_text(
        text,
        [
            quick_reply("기상 인증", "기상 인증"),
            quick_reply("운동 인증", "운동 인증"),
            quick_reply("내 현황", "내 현황")
        ]
    )
