// Capacidades por rol, ESPEJO exacto de los require_role() del backend
// (services/api/app/api/v1/targets.py). El backend es la autoridad real
// —esto solo evita mostrar botones que igual fallarían con 403, para que
// un Analista/Miembro no choque contra errores en vez de una UI honesta.
//
// OWNER (único) > ADMIN > ANALYST > MEMBER.

export function canManageTargets(role: string): boolean {
  // Crear/eliminar dominios y activar/desactivar monitoreo.
  return role === 'OWNER' || role === 'ADMIN';
}

export function canRunActions(role: string): boolean {
  // Verificar, escanear, descubrir superficie, analizar exposición,
  // guardar informe IA. MEMBER queda fuera: solo lectura.
  return role === 'OWNER' || role === 'ADMIN' || role === 'ANALYST';
}
