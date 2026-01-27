FastAPI로 카카오 오픈빌더 스킬 서버(에디봇)를 만든다. DB는 Supabase Postgres를 사용한다(이미 users/checkins/weekly_state 테이블이 있음).

환경변수:

- SUPABASE_DB_URL (postgresql://...)
- ADMIN_API_KEY (admin API 보호)
- TZ=Asia/Seoul

카카오 스킬 엔드포인트(POST):

- /kakao/user/nickname : payload에서 user_key 추출. nickname 파라미터가 있으면 사용하고 없으면 userRequest.utterance를 nickname으로 사용. trim, 1~20자 제한. users upsert.
- /kakao/user/public_on : is_public=true
- /kakao/user/public_off : is_public=false
- /kakao/checkin/wakeup | /exercise | /clean | /plan : checkins에 insert. created_at은 now(). date_kst와 week_start_kst는 서버에서 KST로 계산해 넣는다.
- /kakao/status : 이번 주(week_start_kst) 기준으로 count_total/타입별 counts/users.yellow_cards/users.level 반환.

응답은 카카오 스킬 v2.0 JSON:
{"version":"2.0","template":{"outputs":[{"simpleText":{"text":"..."}}],"quickReplies":[...]}}
quickReplies는 label+messageText.

운영자 API(GET, X-ADMIN-KEY로 보호):

- /admin/daily_summary?date=YYYY-MM-DD : 오픈채팅 복붙용 텍스트 생성(공개 ON은 닉네임 리스트, 비공개는 숫자만)
- /admin/weekly_report?week_start=YYYY-MM-DD : 주간 리포트(공개 ON만 닉네임 표시, 미달은 숫자)
- /admin/health

추가:

- get_week_start_kst(date_kst): 월요일 반환
- extract_user_key(payload) 유틸
- SQLAlchemy 2.0 + async 아니어도 됨(동기 OK)
- README/.env.example/pytest 최소 테스트 포함
- 로컬 실행 uvicorn app.main:app --reload

프로젝트 파일을 실제로 생성하고, 바로 실행 가능하게 완성해라.
