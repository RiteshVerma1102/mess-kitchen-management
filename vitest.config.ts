import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Coverage gate applies to pure domain/service logic (CES: >= 70%).
      include: ['src/lib/money.ts', 'src/lib/errors.ts', 'src/lib/time.ts', 'src/core/rbac/**', 'src/core/tenant/**', 'src/config/env.ts'],
      thresholds: { statements: 70, branches: 60, functions: 70, lines: 70 },
    },
  },
});
