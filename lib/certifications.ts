// ─── CERTIFICACIONES: DATOS NO TRADUCIBLES + LÓGICA PURA ─────────────────────
// El texto (título, emisor, fecha, descripción) vive en `dictionaries/{es,en}.json`
// y se enlaza por `id`, no por posición: reordenar el JSON ya no desalinea
// imágenes ni categorías. Aquí solo va lo que no cambia entre idiomas.

export type CertArea = 'cyber' | 'ai' | 'education' | 'languages';

// Naturaleza real de cada credencial (no es lo mismo asistir que aprobar).
export type CertKind =
  | 'participation'
  | 'attendance'
  | 'proficiency'
  | 'completion'
  | 'badge'
  | 'webinar'
  | 'course'
  | 'program';

export interface CertMeta {
  image: string;
  area: CertArea;
  kind: CertKind;
  featured?: boolean;
  // Etiquetas secundarias solo cuando aclaran el contenido (por idioma).
  tags?: { es: string; en: string }[];
  // Enlace público de verificación (p. ej. Credly). Solo si existe de verdad.
  verifyUrl?: string;
}

// Orden de presentación de las áreas (de la especialidad principal a lo complementario).
export const CERT_AREAS: CertArea[] = ['cyber', 'ai', 'education', 'languages'];

export const CERT_META: Record<string, CertMeta> = {
  'cisco-cyber-games-2026': {
    image: '/cisco-ctf.jpg',
    area: 'cyber',
    kind: 'participation',
    featured: true,
    tags: [{ es: 'Capture The Flag', en: 'Capture The Flag' }],
  },
  'big-hacking-etico': { image: '/hacking-etico-big.jpg', area: 'cyber', kind: 'attendance' },
  'english-itsup': {
    image: '/english-certificates.jpg',
    area: 'languages',
    kind: 'proficiency',
    featured: true,
  },
  'prompters-10000': { image: '/prompts-ia.jpg', area: 'ai', kind: 'completion' },
  'cisco-ethical-hacker': {
    image: '/cisco-ethical-hacker.jpg',
    area: 'cyber',
    kind: 'badge',
    featured: true,
  },
  'puce-neurociencias': { image: '/neurociencias-puce.jpg', area: 'education', kind: 'webinar' },
  'big-desarrollo-ia': { image: '/desarrollo-ia-big.jpg', area: 'ai', kind: 'attendance' },
  'progenios-proteccion-datos': {
    image: '/proteccion-datos.jpg',
    area: 'cyber',
    kind: 'course',
    tags: [{ es: 'Privacidad y normativa', en: 'Privacy & compliance' }],
  },
  'telefonica-intro-ciber': {
    image: '/intro-ciberseguridad-telefonica.jpg',
    area: 'cyber',
    kind: 'completion',
  },
  'cisco-intro-cybersecurity': { image: '/cisco-intro-cyber.jpg', area: 'cyber', kind: 'badge' },
  'ubicua-abp': { image: '/ubicua-abp.jpg', area: 'education', kind: 'program' },
};

export interface CertText {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export type Certification = CertText & CertMeta;

// Une el texto del diccionario con su metadata. Descarta (sin romper la
// página) los ítems cuyo id no tenga metadata, para no mostrar tarjetas sin imagen.
export function buildCertifications(items: CertText[]): Certification[] {
  return items.flatMap((item) => {
    const meta = CERT_META[item.id];
    return meta ? [{ ...item, ...meta }] : [];
  });
}

// Agrupa por área respetando CERT_AREAS y, dentro de cada área, el orden del
// diccionario. Las destacadas van primero en su grupo. Áreas vacías se omiten.
export function groupByArea(certs: Certification[]): { area: CertArea; items: Certification[] }[] {
  return CERT_AREAS.map((area) => {
    const inArea = certs.filter((c) => c.area === area);
    return { area, items: [...inArea.filter((c) => c.featured), ...inArea.filter((c) => !c.featured)] };
  }).filter((g) => g.items.length > 0);
}

// Primer año que aparece en las fechas (texto libre: "Enero 2024", "2025 - Mayo 2026").
export function earliestYear(certs: Certification[]): number | null {
  const years = certs.flatMap((c) => (c.date.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number));
  return years.length ? Math.min(...years) : null;
}
