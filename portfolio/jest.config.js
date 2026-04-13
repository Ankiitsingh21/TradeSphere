module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/__mocks__/prisma.ts"],
  testMatch: ["**/*.test.ts"],
};