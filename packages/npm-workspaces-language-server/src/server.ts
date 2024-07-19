#!/usr/bin/env node

import {
	CompletionItemKind,
	InitializeResult,
	ProposedFeatures,
	TextDocumentSyncKind,
	TextDocuments,
	createConnection,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import YAML from "yaml";

import * as tools from "workspace-tools";

import fs from "fs";
import path from "path";

type WorkspacesType = "npm-yarn" | "pnpm";

const workspaceRoot = tools.getWorkspaceRoot(process.cwd());

const workspacesType: WorkspacesType | null = (() => {
	if (!workspaceRoot) {
		return null;
	}

	const parentPackageJSONPath = path.join(workspaceRoot, "package.json");

	const parentPackageJSON = JSON.parse(
		fs.readFileSync(parentPackageJSONPath, "utf-8"),
	);

	if ("workspaces" in parentPackageJSON) {
		return "npm-yarn";
	}

	const pnpmWorkspaceYamlExists = fs.existsSync(
		path.join(process.cwd(), "pnpm-workspace.yaml"),
	);

	if (pnpmWorkspaceYamlExists) {
		return "pnpm";
	}

	return null;
})();

if (!workspacesType) {
	throw new Error("Not using workspaces");
}

const dependencies = (() => {
	if (!workspaceRoot || workspacesType === "npm-yarn") {
		return [];
	}

	const pnpmWorkspacesFilePath = path.join(
		workspaceRoot,
		"pnpm-workspace.yaml",
	);

	const file = fs.readFileSync(pnpmWorkspacesFilePath, "utf8");
	const pnpmWorkspacesFile = YAML.parse(file);

	if (!pnpmWorkspacesFile.catalog) {
		return [];
	}

	return Object.keys(pnpmWorkspacesFile.catalog);
})();

const completionItems = (() => {
	const workspaces = tools.getWorkspaces(process.cwd());

	const packageProtocol = workspacesType === "npm-yarn" ? "*" : "workspace:*";

	const workspaceItems = workspaces.map((w) => ({
		label: `"${w.name}"`,
		kind: CompletionItemKind.Module,
		data: w.name,
		insertText: `"${w.name}": "${packageProtocol}"`,
	}));

	const dependenciesItems = dependencies.map((key) => {
		return {
			label: `"${key}"`,
			kind: CompletionItemKind.Module,
			data: key,
			insertText: `"${key}": "catalog:"`,
		};
	});

	return [...workspaceItems, ...dependenciesItems];
})();

const connection = createConnection(ProposedFeatures.all);

const documents = new TextDocuments(TextDocument);

documents.listen(connection);

connection.onInitialize((_) => {
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
			inlineCompletionProvider: true,
			completionProvider: {
				// triggerCharacters: ["@"],
				completionItem: {
					// labelDetailsSupport: true,
				},
				resolveProvider: true,
			},
		},
	};

	return result;
});

connection.onCompletion((_textDocumentPosition) => {
	return completionItems;
});

connection.listen();
