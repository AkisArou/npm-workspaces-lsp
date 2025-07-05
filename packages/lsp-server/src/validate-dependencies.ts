import { readdir } from "node:fs/promises";
import path from "path/win32";
import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  TextDocumentChangeEvent
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

export function createValidateTextDocument(
  workspaceRoot: string,
  connection: Connection
) {
  return async function validateTextDocument({
    document
  }: TextDocumentChangeEvent<TextDocument>): Promise<void> {
    if (!document.uri.endsWith("package.json")) {
      return;
    }

    const text = document.getText();

    try {
      const packageJson = JSON.parse(text);

      if (!packageJson.dependencies && !packageJson.dependencies) {
        return;
      }

      const nodeModulesPath = document.uri
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
              start: document.positionAt(dep.start),
              end: document.positionAt(dep.end)
            },
            message: `${depName} in not installed`,
            source: "npm-workspaces-lsp"
          } satisfies Diagnostic);
        }
      }

      connection.sendDiagnostics({ uri: document.uri, diagnostics });
    } catch (err) {
      connection.console.error((err as Error).message);
    }
  };
}

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
