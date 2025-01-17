import { type ExtensionContext, workspace } from "vscode";
import {
  type ServerOptions,
  type LanguageClientOptions,
  TransportKind,
  LanguageClient
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const module = context.asAbsolutePath("./dist/server.js");

  const serverOptions: ServerOptions = {
    run: {
      module,
      transport: TransportKind.pipe
    },
    debug: {
      module,
      transport: TransportKind.pipe
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", pattern: "**/package.json" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/package.json")
    }
  };

  client = new LanguageClient(
    "coc-npm-workspaces",
    "coc npm workspaces",
    serverOptions,
    clientOptions,
    true
  );

  client.start();
}

export function deactivate() {
  if (!client) {
    return undefined;
  }

  return client.stop();
}
