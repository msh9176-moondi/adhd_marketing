from fastapi import FastAPI
from app.routers import kakao, admin

app = FastAPI(
    title="에디봇 API",
    description="카카오 오픈빌더 스킬 서버 - 인증/기록/집계 시스템",
    version="1.0.0"
)

app.include_router(kakao.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"message": "에디봇 API 서버가 실행 중입니다.", "docs": "/docs"}
