# 에디봇 (Edibot) - 카카오 오픈빌더 스킬 서버

오픈채팅 인증/기록/집계 시스템을 위한 카카오 i 오픈빌더 스킬 서버 백엔드입니다.

## 기술 스택

- Python 3.11+
- FastAPI
- SQLAlchemy 2.0
- Supabase PostgreSQL
- pytest

## 설치

```bash
# 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

## 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 값을 설정합니다.

```bash
cp .env.example .env
```

```env
SUPABASE_DB_URL=postgresql://user:password@host:5432/postgres
ADMIN_API_KEY=your-admin-api-key-here
TZ=Asia/Seoul
```

## 실행

```bash
uvicorn app.main:app --reload
```

서버가 시작되면 http://localhost:8000 에서 접근 가능합니다.
API 문서는 http://localhost:8000/docs 에서 확인할 수 있습니다.

## API 엔드포인트

### 카카오 스킬 (POST)

| 엔드포인트 | 설명 |
|-----------|------|
| `/kakao/user/nickname` | 닉네임 설정 (1~20자) |
| `/kakao/user/public_on` | 닉네임 공개 ON |
| `/kakao/user/public_off` | 닉네임 공개 OFF |
| `/kakao/checkin/wakeup` | 기상 인증 |
| `/kakao/checkin/exercise` | 운동 인증 |
| `/kakao/checkin/clean` | 정리 인증 |
| `/kakao/checkin/plan` | 계획 인증 |
| `/kakao/status` | 내 현황 조회 |

### 운영자 API (GET, X-ADMIN-KEY 헤더 필요)

| 엔드포인트 | 설명 |
|-----------|------|
| `/admin/health` | 서버 상태 확인 |
| `/admin/daily_summary?date=YYYY-MM-DD` | 일일 인증 요약 |
| `/admin/weekly_report?week_start=YYYY-MM-DD` | 주간 리포트 (week_start는 월요일) |

## 테스트

```bash
pytest
```

## 카카오 응답 형식

모든 카카오 스킬 응답은 v2.0 포맷을 따릅니다:

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {"simpleText": {"text": "응답 메시지"}}
    ],
    "quickReplies": [
      {"label": "버튼 라벨", "messageText": "버튼 클릭 시 전송될 메시지", "action": "message"}
    ]
  }
}
```

## DB 스키마

### users
- `user_key` (PK): 카카오 사용자 식별키
- `nickname`: 닉네임 (1~20자)
- `is_public`: 닉네임 공개 여부
- `yellow_cards`: 옐로카드 수
- `level`: 레벨

### checkins
- `id` (PK): 자동 증가
- `user_key`: 사용자 식별키
- `checkin_type`: 인증 타입 (wakeup/exercise/clean/plan)
- `date_kst`: 인증 날짜 (KST)
- `week_start_kst`: 해당 주의 월요일 날짜

### weekly_state
- `id` (PK): 자동 증가
- `user_key`: 사용자 식별키
- `week_start_kst`: 주 시작일 (월요일)
- `total_count`: 총 인증 횟수
- 각 타입별 인증 횟수
- `is_success`: 주간 미션 성공 여부
