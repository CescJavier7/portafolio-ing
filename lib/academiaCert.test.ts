import { describe, it, expect, beforeEach } from 'vitest';
import { signCertificate, verifyCertificate, subjectHash, type CertPayload } from './academiaCert.server';

// El certificado es un código PÚBLICO firmado con HMAC: cualquiera lo verifica,
// nadie lo falsifica. Estos tests cubren exactamente esa promesa.
const payload = (over: Partial<CertPayload> = {}): CertPayload => ({
  v: 1,
  u: subjectHash('user-123'),
  n: 'Kevin Montatixe',
  t: 'ciberseguridad',
  c: 12,
  d: '2026-09-06',
  ...over,
});

describe('academiaCert', () => {
  beforeEach(() => {
    process.env.ACADEMY_CERT_SECRET = 'un-secreto-de-pruebas-suficientemente-largo';
  });

  it('firma y verifica un certificado (ida y vuelta)', () => {
    const code = signCertificate(payload())!;
    expect(code).toContain('.');
    expect(verifyCertificate(code)).toEqual(payload());
  });

  it('rechaza una firma manipulada', () => {
    const code = signCertificate(payload())!;
    const [body, sig] = code.split('.');
    const tampered = `${body}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`;
    expect(verifyCertificate(tampered)).toBeNull();
  });

  it('rechaza un payload manipulado (cambiar el nombre invalida la firma)', () => {
    const code = signCertificate(payload())!;
    const sig = code.split('.')[1];
    const fakeBody = Buffer.from(JSON.stringify(payload({ n: 'Otra Persona' })), 'utf8').toString('base64url');
    expect(verifyCertificate(`${fakeBody}.${sig}`)).toBeNull();
  });

  it('rechaza un código firmado con otro secreto', () => {
    const code = signCertificate(payload())!;
    process.env.ACADEMY_CERT_SECRET = 'otro-secreto-completamente-distinto';
    expect(verifyCertificate(code)).toBeNull();
  });

  it('rechaza basura sin lanzar excepciones', () => {
    for (const bad of ['', '.', 'abc', 'a.b', 'a.'.repeat(3000), 'no-tiene-punto', '$$$.###']) {
      expect(verifyCertificate(bad)).toBeNull();
    }
  });

  it('sin secreto configurado no emite ni valida (falla cerrado)', () => {
    const code = signCertificate(payload())!;
    delete process.env.ACADEMY_CERT_SECRET;
    delete process.env.AUTH_SECRET;
    expect(signCertificate(payload())).toBeNull();
    expect(verifyCertificate(code)).toBeNull();
  });

  it('el hash del usuario es estable y NO expone el id real', () => {
    const h = subjectHash('user-123');
    expect(h).toBe(subjectHash('user-123'));
    expect(h).not.toContain('user-123');
    expect(h).toHaveLength(10);
    expect(subjectHash('user-124')).not.toBe(h);
  });
});
