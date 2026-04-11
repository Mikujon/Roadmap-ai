import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    // Resolve .js ESM imports to .ts in Jest (ts-jest runs TS directly)
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@roadmap/core$":           "<rootDir>/../core/src/index.ts",
    "^@roadmap/core/types$":     "<rootDir>/../core/src/types/index.ts",
    "^@roadmap/core/schemas$":   "<rootDir>/../core/src/schemas/index.ts",
    "^@roadmap/core/constants$": "<rootDir>/../core/src/constants/index.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        // Relax for tests only
        exactOptionalPropertyTypes: false,
        noUncheckedIndexedAccess:   false,
      },
    }],
  },
  coverageThreshold: {
    global: {
      lines:     90,
      functions: 90,
      branches:  85,
    },
  },
};

export default config;
