import fs from "node:fs";
import path from "node:path";
import type { AuthenticationProfile } from "./authentication-profile";

interface RunProfileUser {
  username: string;
  password: string;
}

interface RunProfileFile {
  testDataPath: string;
  baseUrl: string;
  users: Record<string, RunProfileUser>;
}

export interface RunProfile {
  name: string;
  testDataPath: string;
  baseUrl: string;
  user(name: string): AuthenticationProfile;
}

function requireText(value: unknown, field: string, filePath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Run profile field '${field}' is required: ${filePath}`);
  }

  return value.trim();
}

let cachedRunProfile: RunProfile | undefined;

export function requireRunProfile(): RunProfile {
  if (cachedRunProfile) {
    return cachedRunProfile;
  }

  const selectedProfile = process.env.RUN_PROFILE?.trim().toLowerCase();

  if (!selectedProfile) {
    throw new Error("RUN_PROFILE is required. Example: demo-dev");
  }

  if (!/^[a-z0-9_-]+$/.test(selectedProfile)) {
    throw new Error(`Invalid run profile name: ${selectedProfile}`);
  }

  const filePath = path.resolve(
    process.cwd(),
    "environments",
    "run-profiles",
    `${selectedProfile}.json`,
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Run profile not found: ${filePath}`);
  }

  let parsed: RunProfileFile;

  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as RunProfileFile;
  } catch (error) {
    throw new Error(`Run profile is not valid JSON: ${filePath}`, {
      cause: error,
    });
  }

  const testDataPath = requireText(
    parsed.testDataPath,
    "testDataPath",
    filePath,
  );
  const baseUrl = requireText(parsed.baseUrl, "baseUrl", filePath);

  if (
    !parsed.users ||
    typeof parsed.users !== "object" ||
    Array.isArray(parsed.users)
  ) {
    throw new Error(`Run profile field 'users' is required: ${filePath}`);
  }

  cachedRunProfile = {
    name: selectedProfile,
    testDataPath: path.resolve(process.cwd(), testDataPath),
    baseUrl,
    user(name: string): AuthenticationProfile {
      const selectedUser = parsed.users[name];

      if (!selectedUser) {
        throw new Error(
          `Run profile user '${name}' was not found. Available users: ${Object.keys(parsed.users).join(", ")}`,
        );
      }

      if (typeof selectedUser !== "object" || Array.isArray(selectedUser)) {
        throw new Error(
          `Run profile user '${name}' must be an object: ${filePath}`,
        );
      }

      return {
        baseUrl,
        username: requireText(
          selectedUser.username,
          `users.${name}.username`,
          filePath,
        ),
        password: requireText(
          selectedUser.password,
          `users.${name}.password`,
          filePath,
        ),
      };
    },
  };

  return cachedRunProfile;
}
