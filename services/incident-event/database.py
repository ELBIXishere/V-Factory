"""
V-Factory - 데이터베이스 연결 설정
비동기 SQLAlchemy 설정
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config import settings


# 비동기 데이터베이스 엔진 생성
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# 비동기 세션 팩토리
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy ORM 기본 클래스"""
    pass


async def get_db() -> AsyncSession:
    """데이터베이스 세션 의존성 주입"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
