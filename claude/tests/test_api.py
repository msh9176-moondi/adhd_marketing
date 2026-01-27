import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import date

from app.main import app
from app.config import ADMIN_API_KEY

client = TestClient(app)


def make_kakao_payload(user_key: str = "test_user_123", params: dict = None, utterance: str = ""):
    return {
        "userRequest": {
            "user": {"id": user_key},
            "utterance": utterance
        },
        "action": {
            "params": params or {}
        }
    }


class TestRoot:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "에디봇" in response.json()["message"]


class TestAdminHealth:
    def test_health(self):
        response = client.get("/admin/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestAdminAuth:
    def test_daily_summary_no_key(self):
        response = client.get("/admin/daily_summary?date=2024-01-01")
        assert response.status_code == 401

    def test_weekly_report_no_key(self):
        response = client.get("/admin/weekly_report?week_start=2024-01-01")
        assert response.status_code == 401


class TestKakaoResponse:
    def test_response_format(self):
        from app.services.kakao_response import simple_text, quick_reply

        response = simple_text("테스트 메시지")
        assert response["version"] == "2.0"
        assert "template" in response
        assert response["template"]["outputs"][0]["simpleText"]["text"] == "테스트 메시지"

    def test_quick_reply_format(self):
        from app.services.kakao_response import quick_reply

        qr = quick_reply("라벨", "메시지")
        assert qr["label"] == "라벨"
        assert qr["messageText"] == "메시지"
        assert qr["action"] == "message"


class TestUtils:
    def test_get_week_start_kst(self):
        from app.utils import get_week_start_kst

        # Wednesday 2024-01-03 -> Monday 2024-01-01
        d = date(2024, 1, 3)
        assert get_week_start_kst(d) == date(2024, 1, 1)

        # Monday 2024-01-01 -> Monday 2024-01-01
        d = date(2024, 1, 1)
        assert get_week_start_kst(d) == date(2024, 1, 1)

        # Sunday 2024-01-07 -> Monday 2024-01-01
        d = date(2024, 1, 7)
        assert get_week_start_kst(d) == date(2024, 1, 1)

    def test_extract_user_key(self):
        from app.utils import extract_user_key

        payload = make_kakao_payload("user_abc")
        assert extract_user_key(payload) == "user_abc"

        assert extract_user_key({}) is None
        assert extract_user_key({"userRequest": {}}) is None

    def test_extract_params(self):
        from app.utils import extract_params

        payload = make_kakao_payload(params={"nickname": "테스트"})
        assert extract_params(payload) == {"nickname": "테스트"}

        assert extract_params({}) == {}

    def test_extract_utterance(self):
        from app.utils import extract_utterance

        payload = make_kakao_payload(utterance="안녕하세요")
        assert extract_utterance(payload) == "안녕하세요"

        assert extract_utterance({}) == ""
