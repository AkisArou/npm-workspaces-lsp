import * as vscode from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient/node";

import path from "path";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("dist", "ls.js"));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: "json" }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/package.json")
    }
  };

  client = new LanguageClient(
    "vscode-npm-workspaces",
    "VSCode npm workspaces",
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate() {
  if (!client) {
    return undefined;
  }

  return client.stop();
}
