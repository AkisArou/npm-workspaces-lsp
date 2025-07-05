#!/usr/bin/env node

import {
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { createOnDefinition } from "./on-definition";
import * as tools from "workspace-tools";
import { createValidateTextDocument } from "./validate-dependencies";
import { createCompletionItemProvider } from "./completion-item-provider";

const workspaceRoot = tools.getWorkspaceRoot(process.cwd());

if (!workspaceRoot) {
  throw new Error(`No workspace root for ${process.cwd()}`);
}

const workspaces = tools.getWorkspaces(workspaceRoot);

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
  createCompletionItemProvider(workspaceRoot, workspaces)
);

connection.onDefinition(
  createOnDefinition(workspaceRoot, workspaces, documents)
);

documents.onDidOpen(createValidateTextDocument(workspaceRoot, connection));

connection.listen();
