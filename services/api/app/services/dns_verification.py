"""
services/dns_verification.py

Verificación de propiedad de dominio por registro DNS TXT. El usuario debe
publicar en su DNS:

    _sentra-challenge.<dominio>   TXT   "sentra-verify=<token>"

Si lo encontramos, controla el DNS del dominio → puede auditarlo. Es el
mismo mecanismo que usan Google Search Console, Cloudflare, etc.
"""
import dns.asyncresolver
import dns.exception

CHALLENGE_PREFIX = "_sentra-challenge"
TOKEN_PREFIX = "sentra-verify="


def challenge_record_name(domain: str) -> str:
    return f"{CHALLENGE_PREFIX}.{domain}"


def expected_txt_value(token: str) -> str:
    return f"{TOKEN_PREFIX}{token}"


async def check_dns_txt(domain: str, token: str) -> bool:
    """
    True si el TXT esperado existe. Cualquier fallo de resolución (dominio
    inexistente, sin registro, timeout) devuelve False: la ausencia de la
    prueba NO es "verificado". Nunca lanza — el router traduce False a un
    mensaje de "aún no lo vemos, revisa el registro".
    """
    record_name = challenge_record_name(domain)
    expected = expected_txt_value(token)

    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = 5.0  # segundos totales; no colgar el request

    try:
        answers = await resolver.resolve(record_name, "TXT")
    except (dns.exception.DNSException, Exception):
        return False

    for rdata in answers:
        # Un TXT puede venir partido en varias cadenas; se concatenan.
        value = "".join(
            part.decode() if isinstance(part, bytes) else str(part)
            for part in rdata.strings
        )
        if value == expected:
            return True

    return False
