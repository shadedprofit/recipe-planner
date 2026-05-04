module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/node_modules/**'],
  coverageThreshold: {
    global: {
      lines: 85,
      branches: 85,
      functions: 85,
      statements: 85,
    },
  },
};
