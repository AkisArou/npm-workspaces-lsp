#!/usr/bin/env node

import {
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { createOnDefinition } from "./on-definition.js";
import * as tools from "workspace-tools";
import { createValidateDependencies } from "./validate-dependencies.js";
import { createCompletionItemProvider } from "./completion-item-provider.js";
import { createWorkspacesProvider } from "./workspaces-provider.js";

const workspaceRoot = tools.getWorkspaceRoot(process.cwd());

if (!workspaceRoot) {
  throw new Error(`No workspace root for ${process.cwd()}`);
}

const { getWorkspaces, watch } = createWorkspacesProvider(workspaceRoot);

const connection = createConnection(ProposedFeatures.all);

const documents = new TextDocuments(TextDocument);

documents.listen(connection);

connection.onInitialize(_ => ({
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
}));

connection.onCompletion(
  createCompletionItemProvider(workspaceRoot, getWorkspaces)
);

connection.onDefinition(
  createOnDefinition(workspaceRoot, getWorkspaces, documents)
);

documents.onDidOpen(createValidateDependencies(workspaceRoot, connection));

connection.onInitialized(watch);

connection.listen();
