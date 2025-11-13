/** @type {import('jest').Config} */
export default {
  // Use ts-jest preset for TypeScript
  preset: 'ts-jest/presets/default-esm',

  // Test environment
  testEnvironment: 'node',

  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // File extensions to consider
  extensionsToTreatAsEsm: ['.ts'],

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/__tests__/**/*.test.ts',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Exclude main entry point
  ],

  // Coverage thresholds (optional - can adjust later)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
