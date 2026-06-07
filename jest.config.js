/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        // NodeNext module kind is intentional; silence ts-jest's isolatedModules advisory.
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
};

export default config;
