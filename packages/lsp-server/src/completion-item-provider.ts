import { getCatalogsFromWorkspaceManifest } from "@pnpm/catalogs.config";
import { readWorkspaceManifest } from "@pnpm/workspace.read-manifest";
import { type CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { detectPackageManagerByLockfile } from "./detect-package-manager.js";
import type { WorkspacesGetter } from "./workspaces-provider.js";

type CompletionItemProvider = () => Promise<CompletionItem[]>;

export function createCompletionItemProvider(
  workspaceRoot: string,
  workspacesGetter: WorkspacesGetter
): CompletionItemProvider {
  switch (detectPackageManagerByLockfile(workspaceRoot)) {
    case "yarn":
      return createYarnCompletionItemProvider(workspacesGetter);
    case "pnpm":
      return createPnpmCompletionItemProvider(workspaceRoot, workspacesGetter);
    case "npm":
      return createNpmCompletionItemProvider(workspacesGetter);
    case undefined:
      return () => Promise.resolve([]);
  }
}

function createNpmCompletionItemProvider(
  workspacesGetter: WorkspacesGetter
): CompletionItemProvider {
  return async function getCompletionItems() {
    return workspacesGetter().map(w => makeCompletionItem(w.name, "*"));
  };
}

function createYarnCompletionItemProvider(
  workspacesGetter: WorkspacesGetter
): CompletionItemProvider {
  return async function getCompletionItems() {
    return workspacesGetter().map(w =>
      makeCompletionItem(w.name, "workspace:*")
    );
  };
}

function createPnpmCompletionItemProvider(
  workspaceRoot: string,
  workspacesGetter: WorkspacesGetter
): CompletionItemProvider {
  return async function getCompletionItems() {
    const workspaceItems = workspacesGetter().map(w =>
      makeCompletionItem(w.name, "workspace:*")
    );

    let dependencyItems: CompletionItem[] = [];

    const manifest = await readWorkspaceManifest(workspaceRoot);

    if (manifest) {
      const catalogs = getCatalogsFromWorkspaceManifest(manifest);

      for (const catalog in catalogs) {
        const catalogNameValue = catalog === "default" ? "" : catalog;

        const deps = Object.keys(catalogs[catalog]);

        deps.forEach(dep => {
          dependencyItems.push(
            makeCompletionItem(dep, `catalog:${catalogNameValue}`)
          );
        });
      }
    }

    return [...workspaceItems, ...dependencyItems];
  };
}

function makeCompletionItem(depName: string, value: string) {
  return {
    label: `"${depName}"`,
    kind: CompletionItemKind.Module,
    data: depName,
    insertText: `"${depName}": "catalog:${value}"`
  };
}
