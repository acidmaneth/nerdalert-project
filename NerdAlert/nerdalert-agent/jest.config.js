/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          target: 'es2022',
          module: 'es2022',
          moduleResolution: 'node',
          allowImportingTsExtensions: false,
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
}; 
