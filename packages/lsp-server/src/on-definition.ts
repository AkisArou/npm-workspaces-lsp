import {
  TextDocumentPositionParams,
  Location,
  Range,
  Position,
  TextDocuments
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { WorkspaceInfo } from "workspace-tools";
import * as fs from "node:fs";
import path from "node:path";

export function createOnDefinition(
  workspaceRoot: string,
  workspaces: WorkspaceInfo,
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

    // Try node_modules
    let targetPath = path.join(
      workspaceRoot,
      "node_modules",
      packageName,
      "package.json"
    );

    if (!fs.existsSync(targetPath)) {
      // Check if it's in a local workspace (e.g., yarn/npm workspaces)
      const workspacePkg = workspaces.find(
        workspace => workspace.name === packageName
      );

      if (workspacePkg) {
        targetPath = path.join(workspacePkg.path, "package.json");
      } else {
        return null;
      }
    }

    return [
      Location.create(
        pathToUri(targetPath),
        Range.create(Position.create(0, 0), Position.create(0, 0))
      )
    ];
  };

  function pathToUri(p: string): string {
    return "file://" + p;
  }
}
