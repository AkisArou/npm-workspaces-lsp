import { getCatalogsFromWorkspaceManifest } from "@pnpm/catalogs.config";
import { readWorkspaceManifest } from "@pnpm/workspace.read-manifest";
import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import * as tools from "workspace-tools";
import * as fs from "node:fs";

type CompletionItemProvider = () => Promise<CompletionItem[]>;

function detectPackageManagerByLockfile() {
  if (fs.existsSync("yarn.lock")) return "yarn";
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
  if (fs.existsSync("package-lock.json")) return "npm";

  return "unknown";
}

export function createCompletionItemProvider(
  workspaceRoot: string,
  workspaces: tools.WorkspaceInfo
): CompletionItemProvider {
  switch (detectPackageManagerByLockfile()) {
    case "yarn":
    case "pnpm":
    case "npm":
    case "unknown":
      return createPnpmCompletionItemProvider(workspaceRoot, workspaces);
  }
}

export function createPnpmCompletionItemProvider(
  workspaceRoot: string,
  workspaces: tools.WorkspaceInfo
): CompletionItemProvider {
  return async function getCompletionItems() {
    const workspaceItems = workspaces.map(w => ({
      label: `"${w.name}"`,
      kind: CompletionItemKind.Module,
      data: w.name,
      insertText: `"${w.name}": "workspace:*"`
    }));

    let dependencyItems: CompletionItem[] = [];

    const manifest = await readWorkspaceManifest(workspaceRoot);

    if (manifest) {
      const catalogs = getCatalogsFromWorkspaceManifest(manifest);

      for (const catalog in catalogs) {
        const catalogNameValue = catalog === "default" ? "" : catalog;

        const deps = Object.keys(catalogs[catalog]);

        deps.forEach(dep => {
          dependencyItems.push({
            label: `"${dep}"`,
            kind: CompletionItemKind.Module,
            data: dep,
            insertText: `"${dep}": "catalog:${catalogNameValue}"`
          });
        });
      }
    }

    return [...workspaceItems, ...dependencyItems];
  };
}
