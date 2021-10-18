import type { Config } from '@jest/types';

export default async (): Promise<Config.InitialOptions> => {
  return {
    rootDir: '.',
    verbose: false,
    roots: ['<rootDir>/src'],
    testMatch: ['**/__test__/**/(*.)+(spec|test).+(ts|tsx|js)'],
    testEnvironment: "jsdom",
    transform: {
      '^.+\\.[jt]sx?$': 'ts-jest',
    },
    moduleNameMapper: {
      '^lodash-es$': 'lodash',
      '\\.(css|less|scss|sss|styl)$': '<rootDir>/node_modules/jest-css-modules',
      '^.+\\.svg$': '<rootDir>/test-utils/svgTransform.ts',
    },
    transformIgnorePatterns: ['/node_modules/', '\\.(css|less|scss|sss|styl)$'],
    modulePaths: ['node_modules', '<rootDir>/src'],
    setupFilesAfterEnv: ['./test-utils/setupTests.ts'],
    collectCoverageFrom: [
      './src/**/*.{ts,tsx}',
    ],
    coveragePathIgnorePatterns: [
    ],
    coverageReporters: [
      'cobertura',
      'text',
    ],
    setupFiles: ['dotenv/config']
  };
};
