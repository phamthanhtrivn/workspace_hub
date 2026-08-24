module.exports = {
  roots: ['<rootDir>/test'],
  testRegex: '.*\.integration-spec\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testEnvironment: 'node',
  maxWorkers: 1,
  testTimeout: 30000,
};
