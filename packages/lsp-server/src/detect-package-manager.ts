import * as fs from "node:fs";
import path from "node:path";

type PackageManager = "yarn" | "pnpm" | "npm" | "bun";

export const lockfiles = {
  yarn: "yarn.lock",
  pnpm: "pnpm-lock.yaml",
  npm: "package-lock.json",
  bun: "bun.lock"
} as const satisfies Record<PackageManager, string>;

export function detectPackageManager(workspaceRoot: string) {
  return Object.entries(lockfiles).find(([_, lockfile]) =>
    fs.existsSync(path.join(workspaceRoot, lockfile))
  )?.[0] as PackageManager | undefined;
}
