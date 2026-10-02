const nextJest = require("next/jest");

// Make date formatting deterministic regardless of the machine's timezone.
process.env.TZ = "UTC";

const createJestConfig = nextJest({ dir: "./" });

// ESM-only packages that must be transpiled for Jest.
const esmPackages = [
  "query-string",
  "decode-uri-component",
  "split-on-first",
  "filter-obj",
];

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/ui/shared/**/*.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
};

module.exports = async () => {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!(${esmPackages.join("|")})/)`,
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};
