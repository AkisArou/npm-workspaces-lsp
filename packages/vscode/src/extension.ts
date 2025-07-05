import { type ExtensionContext } from "vscode";
import {
  type ServerOptions,
  type LanguageClientOptions,
  LanguageClient,
  TransportKind
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(_: ExtensionContext) {
  const serverOptions: ServerOptions = {
    command: "npm-workspaces-lsp",
    transport: TransportKind.stdio
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", pattern: "**/package.json" }]
  };

  client = new LanguageClient(
    "npm-workspaces-vscode",
    "npm workspaces vscode",
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
