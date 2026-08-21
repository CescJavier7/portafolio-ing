import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests unitarios de la lógica DETERMINISTA del frontend (p. ej. lib/sentra/
// cvQuality.ts: cobertura ATS, chequeos de calidad, estimador de 1 página).
// Resuelve el alias "@/" igual que tsconfig (paths "@/*" -> "./*").
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': root } },
  test: {
    include: ['lib/**/*.test.ts', 'components/**/*.test.ts'],
    environment: 'node',
  },
});
