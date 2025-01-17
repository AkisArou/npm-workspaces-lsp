# npm workspaces language server

## Features

- npm, yarn & pnpm workspaces autocompletion in package.json, for cross-dependencies across workspaces.
- pnpm catalog support
- warning about not installed packages in a workspace

## Installation

### nvim

- Download the npm module globally

```sh
 npm i -g npm-workspaces-language-server
```

- Add to lspconfig

```lua
  lspconfig["npm_workspaces_language_server"].setup({
    capabilities = capabilities,
    on_attach = on_attach,
    filetypes = { "json", "packagejson" },
  })
```

### vim (coc.nvim)

- With Plug

```vim
  Plug 'AkisArou/npm-workspaces-lsp', {'do': 'pnpm install && pnpm run build-coc'}
```

- Set runtime path for coc.vim

```vim
set runtimepath^=~/.vim/plugged/npm-workspaces-lsp/packages/coc
```

### VSCode

There is no published extension.

- Clone the repository
- Run the build script

```sh
pnpm --filter npm-workspaces-autocompletion-vscode package
```

- Open VS Code.
- Press Ctrl+Shift+P (or Cmd+Shift+P on macOS) to open the Command Palette.
- Type Extensions: Install from VSIX... and select it.
- Navigate to the .vsix file at **$PATH_OF_REPOSITORY/packages/vscode/\*.vsix** and select it.
  The extension will be installed locally.
