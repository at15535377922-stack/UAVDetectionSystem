from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

if settings.USE_SQLITE:
    db_url = settings.SQLITE_URL
    engine = create_async_engine(db_url, echo=settings.DEBUG, connect_args={"check_same_thread": False})
else:
    db_url = settings.DATABASE_URL
    engine = create_async_engine(db_url, echo=settings.DEBUG)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
