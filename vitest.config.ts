import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@akg/types': resolve(__dirname, 'packages/types/src/index.ts'),
      '@akg/schema': resolve(__dirname, 'packages/schema/src/index.ts'),
      '@akg/core': resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
