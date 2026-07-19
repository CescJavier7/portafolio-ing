// lib/sentra/domainData.ts
//
// Carga compartida de dominios + su historial de escaneos, para las
// secciones del panel (Resumen, Reportes). Cada sección la llama en su
// propio efecto: al montarse (solo la sección activa se monta) obtiene
// datos frescos, sin estado global que sincronizar.
import { sentraListScans, sentraListTargets, type SentraScan, type SentraTarget } from '@/lib/sentra/api';

export interface DomainData {
  targets: SentraTarget[];
  scans: Record<string, SentraScan[]>; // por targetId, orden descendente
}

export async function loadDomainData(): Promise<DomainData> {
  const targets = await sentraListTargets();
  const verified = targets.filter((t) => t.verified);
  const entries = await Promise.all(
    verified.map((t) =>
      sentraListScans(t.id)
        .then((sc) => [t.id, sc] as [string, SentraScan[]])
        .catch(() => [t.id, [] as SentraScan[]] as [string, SentraScan[]]),
    ),
  );
  const scans: Record<string, SentraScan[]> = {};
  for (const [id, sc] of entries) if (sc.length) scans[id] = sc;
  return { targets, scans };
}

// Color por nota (severidad ordinal A→F, verde→rojo). Compartido por las
// gráficas y tiles del panel para consistencia.
export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#16a34a';
    case 'B': return '#65a30d';
    case 'C': return '#ca8a04';
    case 'D': return '#ea580c';
    default: return '#dc2626'; // F
  }
}

export function scoreGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
