#!/usr/bin/env node

import {
  CompletionItem,
  CompletionItemKind, InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import * as tools from "workspace-tools";

import fs from "fs";
import path from "path";

type WorkspacesType = "npm-yarn" | "pnpm";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.

const workspacesType: WorkspacesType | null = (() => {
  const workspaceRoot = tools.getWorkspaceRoot(process.cwd());

  if (!workspaceRoot) {
    return null;
  }

  const parentPackageJSONPath = path.join(workspaceRoot, "package.json");

  const parentPackageJSON = JSON.parse(
    fs.readFileSync(parentPackageJSONPath, "utf-8")
  );

  if ("workspaces" in parentPackageJSON) {
    return "npm-yarn"
  }

  const pnpmWorkspaceYamlExists = fs.existsSync(path.join(process.cwd(), "pnpm-workspace.yaml"))

  if (pnpmWorkspaceYamlExists) {
    return "pnpm"
  }

  return null
})();

if (workspacesType) {
  init();
}

function init() {
  const packageProtocol = workspacesType === "npm-yarn" ? "*" : "workspace:*"

  const connection = createConnection(ProposedFeatures.all);
  // Create a simple text document manager.
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

  connection.onInitialize((_: InitializeParams) => {
    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        // Tell the client that this server supports code completion.
        completionProvider: {
          resolveProvider: true
        }
      }
    };

    return result;
  });

  // This handler provides the initial list of the completion items.
  connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
      const workspaces = tools.getWorkspaces(process.cwd())

      return workspaces.map((w, idx) => ({
        label: w.name,
        kind: CompletionItemKind.File,
        detail: w.path,
        labelDetails: w.packageJson.description,
        data: idx,
        insertText: `"${w.name}": "${packageProtocol}"`
      }))
    }
  );

  // Make the text document manager listen on the connection
  // for open, change and close text document events
  documents.listen(connection);

  // Listen on the connection
  connection.listen();
}
