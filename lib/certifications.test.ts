import { describe, expect, it } from 'vitest';
import es from '@/dictionaries/es.json';
import en from '@/dictionaries/en.json';
import { CERT_META, buildCertifications, earliestYear, groupByArea } from './certifications';

describe('certificaciones', () => {
  it('cada credencial del diccionario tiene metadata, en ambos idiomas', () => {
    for (const dict of [es, en]) {
      const ids = dict.certifications.items.map((i) => i.id);
      expect(ids.every((id) => id in CERT_META)).toBe(true);
      expect(buildCertifications(dict.certifications.items)).toHaveLength(ids.length);
    }
  });

  it('es y en tienen los mismos ids en el mismo orden', () => {
    expect(es.certifications.items.map((i) => i.id)).toEqual(en.certifications.items.map((i) => i.id));
  });

  it('agrupa sin perder ni duplicar credenciales y pone las destacadas primero', () => {
    const certs = buildCertifications(es.certifications.items);
    const groups = groupByArea(certs);
    expect(groups.flatMap((g) => g.items)).toHaveLength(certs.length);
    for (const g of groups) {
      const firstNormal = g.items.findIndex((c) => !c.featured);
      if (firstNormal >= 0) expect(g.items.slice(firstNormal).some((c) => c.featured)).toBe(false);
    }
  });

  it('omite ítems sin metadata en lugar de romper', () => {
    const certs = buildCertifications([{ id: 'no-existe', title: 'x', issuer: 'y', date: '2020', description: '' }]);
    expect(certs).toEqual([]);
  });

  it('calcula el primer año desde fechas en texto libre', () => {
    const certs = buildCertifications(es.certifications.items);
    expect(earliestYear(certs)).toBe(2024);
    expect(earliestYear([])).toBeNull();
  });
});
