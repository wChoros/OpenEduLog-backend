// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: "coverage",
  moduleDirectories: ["node_modules", "src"],
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/__tests__/**/*.test.ts"
  ],
};