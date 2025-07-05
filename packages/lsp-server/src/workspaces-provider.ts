import * as tools from "workspace-tools";
import {
  detectPackageManagerByLockfile,
  lockfiles
} from "./detect-package-manager.js";
import { watchFile } from "node:fs";
import path from "node:path";

export type WorkspacesGetter = () => tools.WorkspaceInfo;

export function createWorkspacesProvider(workspaceRoot: string) {
  let workspaces = tools.getWorkspaces(workspaceRoot);

  function watch() {
    const packageManager = detectPackageManagerByLockfile(workspaceRoot);

    if (!packageManager) {
      return;
    }

    watchFile(path.join(workspaceRoot, lockfiles[packageManager]), () => {
      workspaces = tools.getWorkspaces(workspaceRoot);
    });
  }

  function getWorkspaces() {
    return workspaces;
  }

  return {
    getWorkspaces,
    watch
  };
}
