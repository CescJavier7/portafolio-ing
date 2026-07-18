"""
db/session.py

Motor async de SQLAlchemy. Se usa asyncpg como driver porque FastAPI es
async de punta a punta: un driver síncrono aquí bloquearía el event loop
y anularía la ventaja de usar FastAPI en primer lugar.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=not settings.is_production,  # log de queries solo en dev
    pool_pre_ping=True,               # evita usar conexiones muertas tras un restart de Postgres
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session