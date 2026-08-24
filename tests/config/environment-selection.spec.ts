import path from "node:path";
import { expect, test } from "@playwright/test";
import { env } from "../../config/environment";

test("separates the test-data client from the authentication profile", () => {
  const selectedAuthenticationAlias =
    process.env.AUTHENTICATION_ALIAS?.trim().toLowerCase() || env.clientAlias;
  const expectedEnvironmentFile = path.resolve(
    process.cwd(),
    "environments",
    `.env.${selectedAuthenticationAlias}.${env.environment}`,
  );

  expect(env.clientAlias).toBe(process.env.CLIENT_ALIAS?.toLowerCase());
  expect(env.authenticationAlias).toBe(selectedAuthenticationAlias);
  expect(env.envFilePath).toBe(expectedEnvironmentFile);
});
