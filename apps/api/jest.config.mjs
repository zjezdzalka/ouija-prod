export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['./tests'],

  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
        useESM: true,
        isolatedModules: true,
        diagnostics: {
          ignoreCodes: [151002]
        }
      }
    ]
  },

  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',

  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@routers/(.*)$': '<rootDir>/src/routers/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1'
  },

  setupFiles: ['./tests/setup.ts']
}
