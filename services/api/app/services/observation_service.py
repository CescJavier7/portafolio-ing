"""
services/observation_service.py

Alimenta el motor de datos (models/scan_observation.py). Se llama en CADA
escaneo — autenticado, del cron, y del escáner público — para acumular el
flujo agregado y longitudinal de la postura de seguridad de Internet.

Es BEST-EFFORT y desacoplado: un fallo aquí NUNCA debe romper el escaneo que
lo dispara. Por eso captura sus propias excepciones y comitea en su propia
transacción (no cuelga del commit del caller), para no arrastrar al escaneo
si el insert agregado falla.
"""
import hashlib

from app.models.scan_observation import ScanObservation


async def record_observation(db, domain: str, result: dict, source: str) -> None:
    try:
        failed = [f["id"] for f in result.get("findings", []) if not f.get("passed")]
        obs = ScanObservation(
            # SHA-256 del dominio: identidad longitudinal sin guardar el dominio
            # en claro (ver el modelo para el porqué).
            domain_hash=hashlib.sha256(domain.encode()).hexdigest(),
            score=result["score"],
            grade=result["grade"],
            failed_checks=failed,
            source=source,
        )
        db.add(obs)
        await db.commit()
    except Exception as exc:  # jamás romper el escaneo por el motor de datos
        print(f"[OBSERVATION] no se pudo registrar ({source}): {exc}")
        try:
            await db.rollback()
        except Exception:
            pass
