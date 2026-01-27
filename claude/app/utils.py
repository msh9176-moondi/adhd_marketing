from datetime import datetime, date, timedelta
import pytz

KST = pytz.timezone("Asia/Seoul")


def get_now_kst() -> datetime:
    return datetime.now(KST)


def get_today_kst() -> date:
    return get_now_kst().date()


def get_week_start_kst(d: date) -> date:
    """Return Monday of the week containing date d (KST)."""
    return d - timedelta(days=d.weekday())


def extract_user_key(payload: dict) -> str | None:
    """Extract user_key from Kakao skill payload."""
    try:
        return payload.get("userRequest", {}).get("user", {}).get("id")
    except Exception:
        return None


def extract_params(payload: dict) -> dict:
    """Extract action params from Kakao skill payload."""
    try:
        return payload.get("action", {}).get("params", {})
    except Exception:
        return {}


def extract_utterance(payload: dict) -> str:
    """Extract utterance from Kakao skill payload."""
    try:
        return payload.get("userRequest", {}).get("utterance", "").strip()
    except Exception:
        return ""
