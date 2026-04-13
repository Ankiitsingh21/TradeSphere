module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterFramework: ["./src/__mocks__/prisma.ts"],
  moduleNameMapper: {
    "^../../config/db$": "<rootDir>/src/__mocks__/prisma.ts",
  },
  testMatch: ["**/*.test.ts"],
};