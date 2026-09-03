import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./__tests__/setup/test-env.ts'],
    include: [
      '__tests__/unit/**/*.test.ts',
      '__tests__/integration/**/*.test.ts',
      '__tests__/security/**/*.test.ts',
    ],
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'coverage',
      '__tests__/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'app/api/**/*.{ts,tsx}',
        'app/**/components/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'middleware.ts',
      ],
      exclude: [
        'node_modules',
        '.next',
        'dist',
        'coverage',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        'app/og-image.tsx',
        'app/sitemap.ts',
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/**/not-found.tsx',
        '__tests__/**',
        'scripts/**',
        'drizzle/**',
        'lib/types.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
