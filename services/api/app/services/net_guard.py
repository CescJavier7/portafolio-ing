"""
services/net_guard.py

Defensa anti-SSRF para el escaneo PÚBLICO (sin auth). El escáner hace una
petición HTTPS y un handshake TLS contra el dominio que pida un desconocido;
si ese dominio resuelve a una IP interna (127.0.0.1, 169.254.169.254 de
metadata cloud, la red privada del VPS…), estaríamos usando nuestro propio
servidor para tocar servicios internos. Por eso, antes de escanear, resolvemos
el dominio y RECHAZAMOS si alguna IP no es pública/global.

(En el escaneo autenticado el dominio ya está verificado como propio del
usuario, así que este guard aplica sobre todo al endpoint público.)
"""
import ipaddress
import socket


def resolves_to_public_ip(domain: str) -> bool:
    try:
        infos = socket.getaddrinfo(domain, 443, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError, OSError):
        return False

    if not infos:
        return False

    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False
        # is_global excluye privadas, loopback, link-local, reservadas,
        # multicast y no asignadas. Una sola IP no-pública descalifica el
        # dominio completo (no vaya a ser un round-robin mezclado).
        if not ip.is_global:
            return False

    return True
