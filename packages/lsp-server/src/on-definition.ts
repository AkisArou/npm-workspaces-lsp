import {
  type TextDocumentPositionParams,
  Location,
  Range,
  Position,
  TextDocuments
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as fs from "node:fs";
import path from "node:path";
import type { WorkspacesGetter } from "./workspaces-provider.js";

export function createOnDefinition(
  workspaceRoot: string,
  workspacesGetter: WorkspacesGetter,
  documents: TextDocuments<TextDocument>
) {
  return async function onDefinition(
    params: TextDocumentPositionParams
  ): Promise<Location[] | null> {
    if (!workspaceRoot) {
      return null;
    }

    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const lines = text.split(/\r?\n/g);
    const line = lines[params.position.line];

    // Check if it's a dependency line in package.json
    const match = line?.match(/"([^"]+)":\s*"[^"]+"/);
    if (!match) return null;

    const packageName = match[1];

    if (!packageName) {
      return null;
    }

    // Default is root node_modules
    const rootNodeModulesPath = path.join(
      workspaceRoot,
      "node_modules",
      packageName,
      "package.json"
    );

    const foundWorkspace = workspacesGetter().find(
      workspace => workspace.name === packageName
    );

    const workspacePath = foundWorkspace
      ? path.join(foundWorkspace.path, "package.json")
      : undefined;

    const localNodeModulePath = path.join(
      params.textDocument.uri.replace("package.json", ""),
      "node_modules",
      packageName,
      "package.json"
    );

    const resolvedPaths = [
      workspacePath,
      localNodeModulePath,
      rootNodeModulesPath
    ].filter(p => p !== undefined && fs.existsSync(p));

    const firstPath = resolvedPaths[0];

    return firstPath
      ? [
          Location.create(
            pathToUri(firstPath),
            Range.create(Position.create(0, 0), Position.create(0, 0))
          )
        ]
      : null;
  };

  function pathToUri(p: string): string {
    return "file://" + p;
  }
}
