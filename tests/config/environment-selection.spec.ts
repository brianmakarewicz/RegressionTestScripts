import path from "node:path";
import { expect, test } from "@playwright/test";
import { env, requireTestDataAlias } from "../../config/environment";

test("separates the test-data alias from the client credential alias", () => {
  const selectedClientAlias = process.env.CLIENT_ALIAS?.trim().toLowerCase();
  const selectedTestDataAlias = process.env.TEST_DATA_ALIAS
    ?.trim()
    .toLowerCase();
  const expectedEnvironmentFile = path.resolve(
    process.cwd(),
    "environments",
    `.env.${selectedClientAlias}.${env.environment}`,
  );

  expect(env.testDataAlias).toBe(selectedTestDataAlias);
  expect(env.clientAlias).toBe(selectedClientAlias);
  expect(env.envFilePath).toBe(expectedEnvironmentFile);
});

test("requires a test-data alias only when client JSON is requested", () => {
  if (env.testDataAlias) {
    expect(requireTestDataAlias()).toBe(env.testDataAlias);
    return;
  }

  expect(() => requireTestDataAlias()).toThrow(
    "TEST_DATA_ALIAS is required for tests that load client JSON data",
  );
});
