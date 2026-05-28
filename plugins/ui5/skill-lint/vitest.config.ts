import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        'bin/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/harness-validator.ts', // Integration adapter - requires real Claude CLI execution
        'src/cli/index.ts', // CLI orchestration - tested via integration
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75, // Lower threshold for CLI-heavy codebase with integration adapters
        statements: 80,
      },
    },
  },
});
