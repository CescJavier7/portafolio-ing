import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# 1. Importamos la configuración y la base de metadatos
from app.core.config import settings
from app.db.base import Base

# 2. IMPORTANTE: Importar todos los modelos aquí para que Alembic los detecte
import app.models.organization
import app.models.user
import app.models.refresh_token
import app.models.target
import app.models.scan
import app.models.surface_snapshot
import app.models.exposure_snapshot
import app.models.api_key
import app.models.webhook
import app.models.audit_log
import app.models.scan_observation

# Configuración de logging de Alembic
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Ejecuta migraciones en modo 'offline' (generación de scripts SQL)."""
    url = str(settings.DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    """Ejecución real de la migración utilizando la conexión síncrona extraída."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    """Configura el motor asíncrono inyectando la URL desde Pydantic Settings."""
    configuration = config.get_section(config.config_ini_section, {})
    # Sobrescribimos sqlalchemy.url ignorando alembic.ini
    configuration["sqlalchemy.url"] = str(settings.DATABASE_URL)

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    """Punto de entrada para modo online."""
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()