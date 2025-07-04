#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { readdir } from "node:fs/promises";

import {
  type Diagnostic,
  type InitializeResult,
  DiagnosticSeverity,
  CompletionItemKind,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
  Location,
  Position,
  Range,
  TextDocumentPositionParams
} from "vscode-languageserver/node";

import * as tools from "workspace-tools";
import { TextDocument } from "vscode-languageserver-textdocument";
import YAML from "yaml";

type WorkspacesType = "npm-yarn" | "pnpm";

const workspaceRoot = tools.getWorkspaceRoot(process.cwd());

const workspacesType: WorkspacesType | null = (() => {
  if (!workspaceRoot) {
    return null;
  }

  const parentPackageJSONPath = path.join(workspaceRoot, "package.json");

  const parentPackageJSON = JSON.parse(
    fs.readFileSync(parentPackageJSONPath, "utf-8")
  );

  if ("workspaces" in parentPackageJSON) {
    return "npm-yarn";
  }

  const pnpmWorkspaceYamlExists = fs.existsSync(
    path.join(process.cwd(), "pnpm-workspace.yaml")
  );

  if (pnpmWorkspaceYamlExists) {
    return "pnpm";
  }

  return null;
})();

if (!workspacesType) {
  throw new Error("Not using workspaces");
}

const workspaces = tools.getWorkspaces(process.cwd());

const dependencies = (() => {
  if (!workspaceRoot || workspacesType === "npm-yarn") {
    return [];
  }

  const pnpmWorkspacesFilePath = path.join(
    workspaceRoot,
    "pnpm-workspace.yaml"
  );

  const file = fs.readFileSync(pnpmWorkspacesFilePath, "utf8");
  const pnpmWorkspacesFile = YAML.parse(file);

  if (!pnpmWorkspacesFile.catalog) {
    return [];
  }

  return Object.keys(pnpmWorkspacesFile.catalog);
})();

const completionItems = (() => {
  const packageProtocol = workspacesType === "npm-yarn" ? "*" : "workspace:*";

  const workspaceItems = workspaces.map(w => ({
    label: `"${w.name}"`,
    kind: CompletionItemKind.Module,
    data: w.name,
    insertText: `"${w.name}": "${packageProtocol}"`
  }));

  const dependenciesItems = dependencies.map(key => {
    return {
      label: `"${key}"`,
      kind: CompletionItemKind.Module,
      data: key,
      insertText: `"${key}": "catalog:"`
    };
  });

  return [...workspaceItems, ...dependenciesItems];
})();

const connection = createConnection(ProposedFeatures.all);

const documents = new TextDocuments(TextDocument);

documents.listen(connection);

connection.onInitialize(_ => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      inlineCompletionProvider: true,
      definitionProvider: true,
      completionProvider: {
        // triggerCharacters: ["@"],
        completionItem: {
          // labelDetailsSupport: true,
        },
        resolveProvider: true
      }
    }
  };

  return result;
});

connection.onCompletion(_textDocumentPosition => {
  return completionItems;
});

connection.onDefinition(
  async (params: TextDocumentPositionParams): Promise<Location[] | null> => {
    if (!workspaceRoot) {
      return null;
    }

    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const uri = params.textDocument.uri;
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
  }
);

function pathToUri(p: string): string {
  return "file://" + p;
}

documents.onDidOpen(evt => {
  connection.console.log(`Opened ${evt.document.uri}`);
  validateTextDocument(evt.document);
});

// Function to find the position of dependencies within the content
function findDependenciesPosition(
  content: string,
  dependenciesType: "dependencies" | "devDependencies"
) {
  const positions: Record<
    string,
    { name: string; start: number; end: number }
  > = {};
  const regex = new RegExp(`"${dependenciesType}"\\s*:\\s*{([^}]*)}`, "g");
  let match;
  while ((match = regex.exec(content)) !== null) {
    const section = match[1];

    if (!section) {
      continue;
    }

    let startIndex = match.index + match[0].indexOf("{");
    const dependencyRegex = /"([^"]+)"\s*:/g;
    let depMatch;
    while ((depMatch = dependencyRegex.exec(section)) !== null) {
      const depName = depMatch[1];

      if (!depName) {
        continue;
      }

      const start = startIndex + depMatch.index + 2; // +2 for the quote etc..
      const end = start + depName.length;
      positions[depName] = { name: depName, start, end };
    }
  }
  return positions;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  if (!textDocument.uri.endsWith("package.json")) {
    return;
  }

  const text = textDocument.getText();

  try {
    const packageJson = JSON.parse(text);

    if (!packageJson.dependencies && !packageJson.dependencies) {
      return;
    }

    const nodeModulesPath = textDocument.uri
      .replace("file://", "")
      .replace("package.json", "node_modules");

    const depNames = await (async () => {
      const flat = await Promise.all([
        readdir(nodeModulesPath),
        readdir(path.join(workspaceRoot ?? "", "node_modules"))
      ]);

      const scoped = await Promise.all(
        [
          ...Object.keys(packageJson.dependencies),
          ...Object.keys(packageJson.devDependencies)
        ]
          .filter(d => d.includes("/"))
          .flatMap(async d => {
            const scope = d.split("/")[0];

            if (!scope) {
              return null;
            }

            try {
              const dir = await readdir(path.join(nodeModulesPath, scope));
              return dir.map(v => `${scope}/${v}`);
            } catch (e) {
              const dir = await readdir(
                path.join(workspaceRoot ?? "", "node_modules", scope)
              );

              return dir.map(v => `${scope}/${v}`);
            }
          })
      );

      return new Set([...flat.flat(), ...scoped.flat()]);
    })();

    const deps = {
      ...findDependenciesPosition(text, "dependencies"),
      ...findDependenciesPosition(text, "devDependencies")
    };

    const diagnostics: Diagnostic[] = [];

    for (const depName in deps) {
      if (!depNames.has(depName)) {
        const dep = deps[depName];

        if (!dep) {
          continue;
        }

        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: textDocument.positionAt(dep.start),
            end: textDocument.positionAt(dep.end)
          },
          message: `${depName} in not installed`,
          source: "npm-workspaces-lsp"
        } satisfies Diagnostic);
      }
    }

    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  } catch (err) {
    connection.console.error((err as Error).message);
  }
}

connection.listen();
